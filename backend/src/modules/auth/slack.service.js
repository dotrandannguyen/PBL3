import bcrypt from 'bcrypt';
import axios from 'axios';
import { ClientException } from '../../common/exceptions/index.js';
import prisma from '../../config/database.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { generateTokens } from './auth.service.js';
import { normalizeEmail } from '../../common/utils/normalizeEmail.js';
import { buildOauthState, parseOauthState } from '../../common/utils/oauthState.js';

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

const handleLoginAccount = async (userProfile, slackUserId, userToken, team) => {
	const email = userProfile?.profile?.email;
	if (!email) {
		throw new ClientException(400, 'Slack account must have a verified email.');
	}

	const result = await prisma.$transaction(async (tx) => {
		const providerUserId = String(slackUserId);
		const existingAccount = await tx.account.findUnique({
			where: {
				provider_providerAccountId: {
					provider: 'slack',
					providerAccountId: providerUserId,
				},
			},
		});
		const existingIntegration = await tx.integration.findUnique({
			where: {
				provider_providerUserId: {
					provider: 'SLACK',
					providerUserId,
				},
			},
		});

		let user = null;
		if (existingAccount) {
			user = await tx.user.findUnique({ where: { id: existingAccount.userId } });
		} else if (existingIntegration) {
			user = await tx.user.findUnique({
				where: { id: existingIntegration.userId },
			});
		} else {
			user = await tx.user.findUnique({ where: { email } });
		}

		if (!user) {
			user = await tx.user.create({
				data: {
					email,
					fullName:
						userProfile.real_name || userProfile.name || email.split('@')[0],
					avatarUrl: userProfile.profile?.image_192 || null,
					isActive: true,
				},
			});
		}

		await tx.account.upsert({
			where: {
				provider_providerAccountId: {
					provider: 'slack',
					providerAccountId: providerUserId,
				},
			},
			update: { updatedAt: new Date() },
			create: {
				userId: user.id,
				type: 'oauth',
				provider: 'slack',
				providerAccountId: providerUserId,
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
					team,
				},
			},
			create: {
				userId: user.id,
				provider: 'SLACK',
				providerUserId: providerUserId,
				accessTokenEncrypted,
				status: 'ACTIVE',
				profileData: {
					user: userProfile,
					team,
				},
			},
		});

		return user;
	});

	return result;
};

const handleLinkAccount = async (userId, userProfile, slackUserId, userToken, team) => {
	const email = userProfile?.profile?.email;
	if (!email) {
		throw new ClientException(400, 'Slack account must have a verified email.');
	}

	const result = await prisma.$transaction(async (tx) => {
		const providerUserId = String(slackUserId);
		const user = await tx.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new ClientException(404, 'Nguoi dung khong ton tai.');
		}

		const normalizedUserEmail = normalizeEmail(user.email);
		const normalizedProviderEmail = normalizeEmail(email);
		if (
			normalizedUserEmail &&
			normalizedProviderEmail &&
			normalizedUserEmail !== normalizedProviderEmail
		) {
			throw new ClientException(
				409,
				'Email Slack khong trung khop voi tai khoan hien tai.',
				'PROVIDER_EMAIL_MISMATCH',
			);
		}

		const existingUserWithEmail = await tx.user.findUnique({
			where: { email },
		});
		if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
			throw new ClientException(
				409,
				'Email Slack da duoc lien ket voi tai khoan khac.',
			);
		}

		const existingAccount = await tx.account.findUnique({
			where: {
				provider_providerAccountId: {
					provider: 'slack',
					providerAccountId: providerUserId,
				},
			},
		});
		if (existingAccount && existingAccount.userId !== userId) {
			throw new ClientException(
				409,
				'Tai khoan Slack nay da lien ket voi user khac.',
			);
		}

		const existingIntegration = await tx.integration.findUnique({
			where: {
				provider_providerUserId: {
					provider: 'SLACK',
					providerUserId,
				},
			},
		});
		if (existingIntegration && existingIntegration.userId !== userId) {
			throw new ClientException(
				409,
				'Tai khoan Slack nay da lien ket voi user khac.',
			);
		}

		await tx.account.upsert({
			where: {
				provider_providerAccountId: {
					provider: 'slack',
					providerAccountId: providerUserId,
				},
			},
			update: { updatedAt: new Date() },
			create: {
				userId: user.id,
				type: 'oauth',
				provider: 'slack',
				providerAccountId: providerUserId,
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
					team,
				},
			},
			create: {
				userId: user.id,
				provider: 'SLACK',
				providerUserId: providerUserId,
				accessTokenEncrypted,
				status: 'ACTIVE',
				profileData: {
					user: userProfile,
					team,
				},
			},
		});

		return user;
	});

	return result;
};

export const slackService = {
	getAuthUrl: (options = {}) => {
		const clientId = process.env.SLACK_CLIENT_ID;
		const redirectUri = process.env.SLACK_REDIRECT_URI;

		if (!clientId || !redirectUri) {
			console.error('[SLACK] Missing credentials:', {
				clientId: !!clientId,
				redirectUri: !!redirectUri,
			});
			throw new ClientException(
				500,
				'Slack credentials not configured. Contact administrator.',
			);
		}

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			user_scope: USER_SCOPES.join(' '),
			state: buildOauthState(options),
		});

		return `${SLACK_AUTH_URL}?${params.toString()}`;
	},

	handleCallback: async (code, state) => {
		const statePayload = parseOauthState(state);
		let oauthData;

		const clientId = process.env.SLACK_CLIENT_ID;
		const clientSecret = process.env.SLACK_CLIENT_SECRET;
		const redirectUri = process.env.SLACK_REDIRECT_URI;

		if (!clientId || !clientSecret || !redirectUri) {
			console.error('[SLACK] Missing callback credentials:', {
				clientId: !!clientId,
				clientSecret: !!clientSecret,
				redirectUri: !!redirectUri,
			});
			throw new ClientException(500, 'Slack credentials not configured');
		}

		try {
			const payload = new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri,
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

		const result =
			statePayload.action === 'link' && statePayload.userId
				? await handleLinkAccount(
						statePayload.userId,
						userProfile,
						slackUserId,
						userToken,
						oauthData?.team || null,
					)
				: await handleLoginAccount(
						userProfile,
						slackUserId,
						userToken,
						oauthData?.team || null,
					);

		const jwtTokens = generateTokens(result);
		const refreshTokenHash = await bcrypt.hash(jwtTokens.refreshToken, 10);
		await prisma.user.update({
			where: { id: result.id },
			data: { refreshTokenHash },
		});

		return { user: result, ...jwtTokens };
	},
};
