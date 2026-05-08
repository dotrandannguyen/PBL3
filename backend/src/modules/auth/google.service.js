import { google } from 'googleapis';
import bcrypt from 'bcrypt';
import { ClientException } from '../../common/exceptions/index.js';
import prisma from '../../config/database.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { generateTokens } from './auth.service.js';
import axios from 'axios';
import { normalizeEmail } from '../../common/utils/normalizeEmail.js';
import { buildOauthState, parseOauthState } from '../../common/utils/oauthState.js';

// ---------tài liệu học tập ----------
// https://www.npmjs.com/package/googleapis
// Generating an authentication URL

const oauth2Client = new google.auth.OAuth2(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_REDIRECT_URI,
);

//// QUAN TRỌNG: Scope xin quyền
// - userinfo: Để đăng nhập
// - gmail.readonly: "Đặc quyền" user yêu cầu
const SCOPES = [
	'https://www.googleapis.com/auth/userinfo.profile',
	'https://www.googleapis.com/auth/userinfo.email',
	'https://www.googleapis.com/auth/gmail.readonly',
];

const handleLoginAccount = async (googleUser, tokens) => {
	const providerUserId = googleUser.id;

	const result = await prisma.$transaction(async (tx) => {
		const existingAccount = await tx.account.findUnique({
			where: {
				provider_providerAccountId: {
					provider: 'google',
					providerAccountId: providerUserId,
				},
			},
		});
		const existingIntegration = await tx.integration.findUnique({
			where: {
				provider_providerUserId: {
					provider: 'GOOGLE',
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
			user = await tx.user.findUnique({ where: { email: googleUser.email } });
		}

		if (!user) {
			user = await tx.user.create({
				data: {
					email: googleUser.email,
					fullName: googleUser.name,
					avatarUrl: googleUser.picture,
					isActive: true,
				},
			});
		}

		await tx.account.upsert({
			where: {
				provider_providerAccountId: {
					provider: 'google',
					providerAccountId: providerUserId,
				},
			},
			update: { updatedAt: new Date() },
			create: {
				userId: user.id,
				type: 'oauth',
				provider: 'google',
				providerAccountId: providerUserId,
			},
		});

		const accessTokenEncrypted = encryptionUtils.encrypt(tokens.access_token);
		const refreshTokenEncrypted = tokens.refresh_token
			? encryptionUtils.encrypt(tokens.refresh_token)
			: undefined;

		await tx.integration.upsert({
			where: {
				userId_provider: {
					userId: user.id,
					provider: 'GOOGLE',
				},
			},
			update: {
				accessTokenEncrypted,
				...(refreshTokenEncrypted && { refreshTokenEncrypted }),
				status: 'ACTIVE',
				updatedAt: new Date(),
				profileData: googleUser,
			},
			create: {
				userId: user.id,
				provider: 'GOOGLE',
				providerUserId,
				accessTokenEncrypted,
				refreshTokenEncrypted,
				profileData: googleUser,
				status: 'ACTIVE',
			},
		});

		return user;
	});

	return result;
};

const handleLinkAccount = async (userId, googleUser, tokens) => {
	const providerUserId = googleUser.id;

	const result = await prisma.$transaction(async (tx) => {
		const user = await tx.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new ClientException(404, 'Nguoi dung khong ton tai.');
		}

		const normalizedUserEmail = normalizeEmail(user.email);
		const normalizedProviderEmail = normalizeEmail(googleUser.email);
		if (
			normalizedUserEmail &&
			normalizedProviderEmail &&
			normalizedUserEmail !== normalizedProviderEmail
		) {
			throw new ClientException(
				409,
				'Email Google khong trung khop voi tai khoan hien tai.',
				'PROVIDER_EMAIL_MISMATCH',
			);
		}

		const existingUserWithEmail = await tx.user.findUnique({
			where: { email: googleUser.email },
		});
		if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
			throw new ClientException(
				409,
				'Email Google da duoc lien ket voi tai khoan khac.',
			);
		}

		const existingAccount = await tx.account.findUnique({
			where: {
				provider_providerAccountId: {
					provider: 'google',
					providerAccountId: providerUserId,
				},
			},
		});
		if (existingAccount && existingAccount.userId !== userId) {
			throw new ClientException(
				409,
				'Tai khoan Google nay da lien ket voi user khac.',
			);
		}

		const existingIntegration = await tx.integration.findUnique({
			where: {
				provider_providerUserId: {
					provider: 'GOOGLE',
					providerUserId,
				},
			},
		});
		if (existingIntegration && existingIntegration.userId !== userId) {
			throw new ClientException(
				409,
				'Tai khoan Google nay da lien ket voi user khac.',
			);
		}

		await tx.account.upsert({
			where: {
				provider_providerAccountId: {
					provider: 'google',
					providerAccountId: providerUserId,
				},
			},
			update: { updatedAt: new Date() },
			create: {
				userId: user.id,
				type: 'oauth',
				provider: 'google',
				providerAccountId: providerUserId,
			},
		});

		const accessTokenEncrypted = encryptionUtils.encrypt(tokens.access_token);
		const refreshTokenEncrypted = tokens.refresh_token
			? encryptionUtils.encrypt(tokens.refresh_token)
			: undefined;

		await tx.integration.upsert({
			where: {
				userId_provider: {
					userId: user.id,
					provider: 'GOOGLE',
				},
			},
			update: {
				accessTokenEncrypted,
				...(refreshTokenEncrypted && { refreshTokenEncrypted }),
				status: 'ACTIVE',
				updatedAt: new Date(),
				profileData: googleUser,
			},
			create: {
				userId: user.id,
				provider: 'GOOGLE',
				providerUserId,
				accessTokenEncrypted,
				refreshTokenEncrypted,
				profileData: googleUser,
				status: 'ACTIVE',
			},
		});

		return user;
	});

	return result;
};

export const googleService = {
	// lấy link url
	getAuthUrl: (options = {}) => {
		const state = buildOauthState(options);
		const url = oauth2Client.generateAuthUrl({
			// 'online' (default) or 'offline' (gets refresh_token)
			access_type: 'offline',
			// If you only need one scope, you can pass it as a string
			scope: SCOPES,
			prompt: 'consent', // Luôn hỏi để đảm bảo Google trả Refresh Token
			state,
			//ép Google luôn hiện màn hình xin quyền, nhờ đó bắt buộc trả về refresh_token mỗi lần user đăng nhập.
		});

		return url;
	},
	//Khởi tạo Google Client có khả năng tự Refresh Token
	getValidGoogleClient: (integration) => {
		const client = new google.auth.OAuth2(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			process.env.GOOGLE_REDIRECT_URI,
		);

		let accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);

		//THÊM DÒNG NÀY ĐỂ MÔ PHỎNG TOKEN BỊ GOOGLE TỪ CHỐI (HẾT HẠN)
		// accessToken = accessToken + 'co_tinh_lam_sai_token_de_test';

		// Giải mã Refresh Token nếu có
		const refreshToken = integration.refreshTokenEncrypted
			? encryptionUtils.decrypt(integration.refreshTokenEncrypted)
			: null;

		// Cấp quyền bằng CẢ HAI token
		client.setCredentials({
			access_token: accessToken,
			refresh_token: refreshToken,
		});

		// Lắng nghe sự kiện cấp mới Token từ thư viện googleapis
		client.on('tokens', async (tokens) => {
			if (tokens.access_token) {
				console.log('[GOOGLE API] Đã tự động cấp mới Access Token hết hạn!');
				try {
					const newEncryptedToken = encryptionUtils.encrypt(
						tokens.access_token,
					);

					await prisma.integration.update({
						where: { id: integration.id },
						data: {
							accessTokenEncrypted: newEncryptedToken,
							updatedAt: new Date(),
						},
					});
				} catch (err) {
					console.error('[GOOGLE API] Lỗi lưu Token mới:', err.message);
				}
			}
		});

		return client;
	},

	// HÀM TỰ ĐỘNG ĐĂNG KÝ WATCH CHO GMAIL
	registerGmailWatch: async (accessToken) => {
		try {
			const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
			if (!PROJECT_ID) {
				console.error(
					'[GMAIL] GOOGLE_PROJECT_ID không được thiết lập trong .env',
				);
				return null;
			}

			const TOPIC_NAME = 'gmail-webhook-pbl3';

			const response = await axios.post(
				'https://gmail.googleapis.com/gmail/v1/users/me/watch',
				{
					topicName: `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`,
					labelIds: ['INBOX'],
				},
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				},
			);

			console.log('[GMAIL] Tự động đăng ký Watch thành công:', {
				expiration: response.data.expiration,
				historyId: response.data.historyId,
			});

			return {
				expiration: response.data.expiration,
				historyId: response.data.historyId,
			};
		} catch (error) {
			// Nếu topic không tồn tại (error 404/409), chỉ log warning
			if (error.response?.status === 404 || error.response?.status === 409) {
				console.warn(
					'[GMAIL] Pub/Sub topic chưa được khởi tạo. Vui lòng tạo topic "gmail-webhook-pbl3" tại Google Cloud Console',
					error.response?.data?.error?.message,
				);
				return null;
			}
			console.error(
				'[GMAIL] Lỗi tự động đăng ký Watch:',
				error.response?.data || error.message,
			);
			return null;
		}
	},

	// https://googleapis.dev/nodejs/googleapis/latest/oauth2/classes/Resource%24Userinfo.html?utm_source=chatgpt.com
	handleCallback: async (code, state) => {
		const statePayload = parseOauthState(state);
		const { tokens } = await oauth2Client.getToken(code);
		oauth2Client.setCredentials(tokens);
		// FIX BUG-07: ĐÃ XÓA các dòng console.log in Access Token (bảo mật)
		// lấy thông tin user từ gg
		const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
		const { data: googleUser } = await oauth2.userinfo.get();

		if (!googleUser.email) {
			throw new ClientException(400, 'Google đã không trả về email!');
		}

		const result =
			statePayload.action === 'link' && statePayload.userId
				? await handleLinkAccount(statePayload.userId, googleUser, tokens)
				: await handleLoginAccount(googleUser, tokens);

		// TỰ ĐỘNG ĐĂNG KÝ GMAIL WATCH NGAY SAU KHI LƯU INTEGRATION THÀNH CÔNG
		try {
			const watchData = await googleService.registerGmailWatch(tokens.access_token);

			// Lưu webhook data vào Integration nếu Watch thành công
			if (watchData) {
				await prisma.integration.update({
					where: {
						userId_provider: {
							userId: result.id,
							provider: 'GOOGLE',
						},
					},
					data: {
						webhookData: {
							gmail: watchData,
						},
					},
				});
			}
		} catch (watchError) {
			// Log warning nhưng không crash - Gmail Watch là optional feature
			console.warn(
				'[GMAIL] Gmail Watch registration failed, continuing anyway:',
				watchError.message,
			);
		}

		// Tạo JWT cho hệ thống
		const jwtTokens = generateTokens(result);

		const refreshTokenHash = await bcrypt.hash(jwtTokens.refreshToken, 10);
		await prisma.user.update({
			where: { id: result.id },
			data: { refreshTokenHash },
		});

		return {
			user: result,
			...jwtTokens,
		};
	},
};
