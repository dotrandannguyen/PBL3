import bcrypt from 'bcrypt';
import axios from 'axios';
import { ClientException } from '../../common/exceptions/index.js';
import prisma from '../../config/database.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { generateTokens } from './auth.service.js';

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const SLACK_USER_INFO_URL = 'https://slack.com/api/users.info';

const USER_SCOPES = [
	'users:read',
	'users:read.email',
	'channels:read',
	'channels:history',
	'groups:read',
	'groups:history',
	'im:read',
	'im:history',
	'mpim:read',
	'mpim:history',
];

export const slackService = {
	getAuthUrl: () => {
		const params = new URLSearchParams({
			client_id: process.env.SLACK_CLIENT_ID,
			redirect_uri: process.env.SLACK_REDIRECT_URI,
			user_scope: USER_SCOPES.join(' '),
		});

		return `${SLACK_AUTH_URL}?${params.toString()}`;
	},

	handleCallback: async (code) => {
		let oauthData;
		try {
			const payload = new URLSearchParams({
				client_id: process.env.SLACK_CLIENT_ID,
				client_secret: process.env.SLACK_CLIENT_SECRET,
				code,
				redirect_uri: process.env.SLACK_REDIRECT_URI,
			});

			const response = await axios.post(SLACK_TOKEN_URL, payload.toString(), {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			oauthData = response.data;

			if (!oauthData?.ok) {
				throw new Error(oauthData?.error || 'Slack OAuth failed');
			}
		} catch (error) {
			console.error(
				'[SLACK] Lỗi lấy access token:',
				error.response?.data || error.message,
			);
			throw new ClientException(400, 'Failed to retrieve access token from Slack');
		}

		const userToken = oauthData?.authed_user?.access_token;
		const slackUserId = oauthData?.authed_user?.id;

		if (!userToken || !slackUserId) {
			throw new ClientException(400, 'Slack không trả về token người dùng.');
		}

		let userProfile;
		try {
			const response = await axios.get(SLACK_USER_INFO_URL, {
				headers: {
					Authorization: `Bearer ${userToken}`,
				},
				params: { user: slackUserId },
			});

			if (!response.data?.ok) {
				throw new Error(response.data?.error || 'Slack user info failed');
			}

			userProfile = response.data.user;
		} catch (error) {
			console.error(
				'[SLACK] Lỗi lấy user profile:',
				error.response?.data || error.message,
			);
			throw new ClientException(400, 'Failed to fetch user profile from Slack');
		}

		const email = userProfile?.profile?.email;
		if (!email) {
			throw new ClientException(400, 'Slack account must have a verified email.');
		}

		const result = await prisma.$transaction(async (tx) => {
			let user = await tx.user.findUnique({ where: { email } });

			if (!user) {
				user = await tx.user.create({
					data: {
						email,
						fullName:
							userProfile.real_name ||
							userProfile.name ||
							email.split('@')[0],
						avatarUrl: userProfile.profile?.image_192 || null,
						isActive: true,
					},
				});
			}

			await tx.account.upsert({
				where: {
					provider_providerAccountId: {
						provider: 'slack',
						providerAccountId: String(slackUserId),
					},
				},
				update: { updatedAt: new Date() },
				create: {
					userId: user.id,
					type: 'oauth',
					provider: 'slack',
					providerAccountId: String(slackUserId),
				},
			});

			const accessTokenEncrypted = encryptionUtils.encrypt(userToken);

			await tx.integration.upsert({
				where: {
					userId_provider: {
						userId: user.id,
						provider: 'SLACK',
					},
				},
				update: {
					accessTokenEncrypted,
					status: 'ACTIVE',
					updatedAt: new Date(),
					profileData: {
						user: userProfile,
						team: oauthData?.team || null,
					},
				},
				create: {
					userId: user.id,
					provider: 'SLACK',
					providerUserId: String(slackUserId),
					accessTokenEncrypted,
					status: 'ACTIVE',
					profileData: {
						user: userProfile,
						team: oauthData?.team || null,
					},
				},
			});

			return user;
		});

		const jwtTokens = generateTokens(result);
		const refreshTokenHash = await bcrypt.hash(jwtTokens.refreshToken, 10);
		await prisma.user.update({
			where: { id: result.id },
			data: { refreshTokenHash },
		});

		return { user: result, ...jwtTokens };
	},
};
