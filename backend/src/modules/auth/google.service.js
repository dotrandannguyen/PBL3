import { google } from 'googleapis';
import { ClientException } from '../../common/exceptions/index.js';
import prisma from '../../config/database.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { generateTokens } from './auth.service.js';

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

export const googleService = {
	// lấy link url
	getAuthUrl: () => {
		const url = oauth2Client.generateAuthUrl({
			// 'online' (default) or 'offline' (gets refresh_token)
			access_type: 'offline',
			// If you only need one scope, you can pass it as a string
			scope: SCOPES,
			prompt: 'consent', // Luôn hỏi để đảm bảo Google trả Refresh Token
			//ép Google luôn hiện màn hình xin quyền, nhờ đó bắt buộc trả về refresh_token mỗi lần user đăng nhập.
		});

		return url;
	},

	//https://googleapis.dev/nodejs/googleapis/latest/oauth2/classes/Resource%24Userinfo.html?utm_source=chatgpt.com
	handleCallback: async (code) => {
		const { tokens } = await oauth2Client.getToken(code);
		oauth2Client.setCredentials(tokens);
		//Từ giờ mày đã đăng nhập Google rồi, đây là access token của mày, cứ dùng nó mà gọi API.

		// lấy thông tin user từ gg
		const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
		const { data: googleUser } = await oauth2.userinfo.get();

		if (!googleUser.email) {
			throw new ClientException(400, 'Google đã không trả về email!');
		}

		// xử lý database
		const result = await prisma.$transaction(async (tx) => {
			let user = await tx.user.findUnique({
				where: { email: googleUser.email },
			});

			if (!user) {
				// sau nay thay user repository vào
				user = await tx.user.create({
					data: {
						email: googleUser.email,
						fullName: googleUser.name,
						avatarUrl: googleUser.picture,
						isActive: true,
					},
				});
			}

			// lưu thông tin đăng nhập vào bảng account
			// upsert: Nếu có rồi thì thôi, chưa có thì tạo
			await tx.account.upsert({
				where: {
					provider_providerAccountId: {
						provider: 'google',
						providerAccountId: googleUser.id,
					},
				},
				update: {}, // Không cần update gì ở bảng account - phải có update vì cái syntax hắn vốn v
				create: {
					userId: user.id,
					type: 'oauth',
					provider: 'google',
					providerAccountId: googleUser.id,
				},
			});
			//Lưu Token vào bảng Integration (Để dùng cho "Đặc quyền" - Sync Gmail)
			const accessTokenEncrypted = encryptionUtils.encrypt(tokens.access_token);

			// Chỉ mã hóa refresh token nếu Google có trả về (thường chỉ trả ở lần đầu hoặc prompt consent)
			const refreshTokenEncrypted = tokens.refresh_token
				? encryptionUtils.encrypt(tokens.refresh_token)
				: undefined;

			await tx.integration.upsert({
				where: {
					userId_provider: {
						// Unique constraint
						userId: user.id,
						provider: 'GOOGLE',
					},
				},
				update: {
					accessTokenEncrypted,
					...(refreshTokenEncrypted && { refreshTokenEncrypted }), // Chỉ update nếu có mới
					status: 'ACTIVE',
					updatedAt: new Date(),
					profileData: googleUser, // Lưu json profile làm cache
				},
				create: {
					userId: user.id,
					provider: 'GOOGLE',
					providerUserId: googleUser.id,
					accessTokenEncrypted,
					refreshTokenEncrypted,
					profileData: googleUser,

					status: 'ACTIVE',
				},
			});
			return user;
		});

		// Tạo JWT cho hệ thống
		const jwtTokens = generateTokens(result);

		return {
			user: result,
			...jwtTokens,
		};
	},
};
