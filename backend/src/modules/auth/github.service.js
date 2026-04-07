import { ClientException } from '../../common/exceptions/index.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { generateTokens } from './auth.service.js';
import axios from 'axios';
import prisma from '../../config/database.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAIL_URL = 'https://api.github.com/user/emails';

export const githubService = {
	//doc lay link
	// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
	getAuthUrl: () => {
		//URLSearchParams là API chuẩn của JavaScript, không liên quan GitHub.
		/* 
        Ví dụ dễ hiểu
        new URLSearchParams({
            client_id: 'abc',
            scope: 'user:email read:user',
        }).toString()
        
        kq -> client_id=abc&scope=user%3Aemail+read%3Auser
        ;*/
		const params = new URLSearchParams({
			client_id: process.env.GITHUB_CLIENT_ID,
			redirect_uri: process.env.GITHUB_REDIRECT_URI,
			scope: 'user:email read:user repo',
			prompt: 'consent', // Luôn yêu cầu người dùng xác nhận, tránh trường hợp tự động đăng nhập nếu đã từng cấp quyền
		});

		return `${GITHUB_AUTH_URL}?${params.toString()}`;
	},

	// doc
	//https://anonystick.com/blog-developer/trien-khai-oauth-voi-nodejs-va-github-2021051555423600
	handleCallback: async (code) => {
		//Đổi Code lấy Access Token
		let accessToken;
		try {
			const response = await axios.post(
				GITHUB_TOKEN_URL,
				{
					client_id: process.env.GITHUB_CLIENT_ID,
					client_secret: process.env.GITHUB_CLIENT_SECRET,
					code,
				},
				{
					headers: {
						Accept: 'application/json',
					},
				},
			);
			if (response.data.error) {
				throw new Error(response.data.error_description);
			}
			accessToken = response.data.access_token;
			console.log('================ GITHUB ACCESS TOKEN ================');
			console.log(accessToken);
			console.log('====================================================');
		} catch (error) {
			throw new ClientException(400, 'Failed to retrieve access token from GitHub');
		}
		//doc user github rest api
		//https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
		let userProfile;
		try {
			const data = await axios.get(GITHUB_USER_URL, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});
			userProfile = data.data;
		} catch (error) {
			throw new ClientException(400, 'Failed to fetch user profile from GitHub');
		}

		let email = userProfile.email;
		if (!email) {
			const { data: emails } = await axios.get(GITHUB_EMAIL_URL, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});

			// Lấy email chính (primary) và đã xác thực (verified)
			const primaryEmail = emails.find((e) => e.primary && e.verified);
			if (primaryEmail) {
				email = primaryEmail.email;
			} else {
				throw new ClientException(
					400,
					'GitHub account must have a verified primary email.',
				);
			}
		}

		// transaction Database (tuong tu gg)
		const result = await prisma.$transaction(async (tx) => {
			// 1. Tìm hoặc Tạo User
			let user = await tx.user.findUnique({ where: { email } });

			if (!user) {
				user = await tx.user.create({
					data: {
						email,
						fullName: userProfile.name || userProfile.login, // Nếu không có tên thật thì lấy username
						avatarUrl: userProfile.avatar_url,
						isActive: true,
					},
				});
			}

			// 2. Lưu Account (Login)
			await tx.account.upsert({
				where: {
					provider_providerAccountId: {
						provider: 'github',
						providerAccountId: String(userProfile.id), // GitHub ID là số, cần chuyển sang string
					},
				},
				update: { updatedAt: new Date() },
				create: {
					userId: user.id,
					type: 'oauth',
					provider: 'github',
					providerAccountId: String(userProfile.id),
				},
			});

			// 3. Lưu Integration (Sync Data)
			const accessTokenEncrypted = encryptionUtils.encrypt(accessToken);

			await tx.integration.upsert({
				where: {
					userId_provider: {
						userId: user.id,
						provider: 'GITHUB',
					},
				},
				update: {
					accessTokenEncrypted,
					status: 'ACTIVE',
					updatedAt: new Date(),
					profileData: userProfile,
				},
				create: {
					userId: user.id,
					provider: 'GITHUB',
					providerUserId: String(userProfile.id),
					accessTokenEncrypted,
					status: 'ACTIVE',
					profileData: userProfile,
				},
			});

			return user;
		});

		// E. Trả về JWT
		const jwtTokens = generateTokens(result);
		return { user: result, ...jwtTokens };
	},

	// 🚀 HÀM LẤY DANH SÁCH REPOSITORY
	getUserRepositories: async (accessToken) => {
		try {
			const response = await axios.get(
				'https://api.github.com/user/repos?sort=updated&per_page=30&type=owner',
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/vnd.github.v3+json',
					},
				},
			);

			console.log(
				`✅ [GITHUB] Lấy được ${response.data.length} repositories của user`,
			);

			return response.data.map((repo) => ({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				description: repo.description,
				url: repo.html_url,
				private: repo.private,
				owner: repo.owner.login,
			}));
		} catch (error) {
			console.error(
				'❌ [GITHUB] Lỗi khi lấy danh sách repositories:',
				error.response?.data || error.message,
			);
			throw error;
		}
	},

	// 🚀 HÀM TỰ ĐỘNG CÀI WEBHOOK VÀO MỘT REPO
	setupWebhookForRepo: async (accessToken, owner, repo) => {
		try {
			const WEBHOOK_URL = `${process.env.CLOUDFLARE_URL}/v1/api/integrations/webhook/github`;

			const response = await axios.post(
				`https://api.github.com/repos/${owner}/${repo}/hooks`,
				{
					name: 'web',
					active: true,
					events: ['issues', 'pull_request'],
					config: {
						url: WEBHOOK_URL,
						content_type: 'json',
						secret: process.env.GITHUB_WEBHOOK_SECRET,
						insecure_ssl: '0',
					},
				},
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/vnd.github.v3+json',
					},
				},
			);

			console.log(`✅ [GITHUB] Đã tự động cài Webhook cho repo: ${repo}`);

			return {
				id: response.data.id,
				url: response.data.config.url,
				active: response.data.active,
				events: response.data.events,
			};
		} catch (error) {
			// Nếu webhook đã tồn tại (422), bỏ qua lỗi
			if (error.response?.status === 422) {
				console.warn(
					`⚠️ [GITHUB] Webhook đã tồn tại cho repo ${repo}, bỏ qua. ${error.response?.data?.errors?.[0]?.message}`,
				);
				return null;
			}
			console.error(
				`❌ [GITHUB] Lỗi cài Webhook cho ${repo}:`,
				error.response?.data?.message || error.message,
			);
			throw error;
		}
	},

	// 🚀 HÀM TỰ ĐỘNG CÀI WEBHOOK CHO NHIỀU REPO
	setupWebhooksForRepositories: async (accessToken, repositories) => {
		const results = {
			success: [],
			failed: [],
		};

		for (const repo of repositories) {
			try {
				const webhookData = await githubService.setupWebhookForRepo(
					accessToken,
					repo.owner,
					repo.name,
				);
				if (webhookData) {
					results.success.push({
						repo: repo.name,
						webhookId: webhookData.id,
					});
				}
			} catch (error) {
				results.failed.push({
					repo: repo.name,
					error: error.response?.data?.message || error.message,
				});
			}
		}

		return results;
	},
};
