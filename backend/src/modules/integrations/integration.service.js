import { google } from 'googleapis';
import {
	NotFoundException,
	UnauthorizedException,
} from '../../common/exceptions/index.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { integrationRepository } from './integration.repository.js';
import axios from 'axios';

export const integrationService = {
	getGmailPreview: async (userId) => {
		// Logic to fetch Gmail preview for the user
		const integration = await integrationRepository.getIntegrationGmailPreview(
			userId,
			'GOOGLE',
		);

		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với Google.');
		}

		// Giải mã access token nếu cần thiết và gọi API của Google để lấy preview
		const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);

		// console.log('Decrypted Access Token:', accessToken);

		// Khởi tạo client Google API
		// Cấp đủ Client ID, Secret và Refresh Token để googleapis tự động gia hạn Access Token khi hết hạn (sau 1h)
		const oauth2Client = new google.auth.OAuth2(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET
		);
		
		const credentials = { access_token: accessToken };
		if (integration.refreshTokenEncrypted) {
			credentials.refresh_token = encryptionUtils.decrypt(integration.refreshTokenEncrypted);
		}
		oauth2Client.setCredentials(credentials);
		
		const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

		try {
			const response = await gmail.users.messages.list({
				userId: 'me',
				labelIds: ['INBOX'],
				maxResults: 10,
				// q: 'task is:unread', // BỎ BỘ LỌC NÀY ĐI vì nếu email không có chữ "task" hoặc đã đọc thì sẽ không ra gì cả
			});

			const messages = response.data.messages || [];
			if (messages.length === 0) return [];

			// Bước B: Lấy chi tiết từng email (Vì list chỉ trả về ID)
			const detailedMessages = await Promise.all(
				messages.map(async (msg) => {
					const msgDetail = await gmail.users.messages.get({
						userId: 'me',
						id: msg.id,
						format: 'metadata', // Chỉ lấy metadata (Subject, From, Date) cho nhẹ
						metadataHeaders: ['Subject', 'From', 'Date'],
					});

					const headers = msgDetail.data.payload.headers;
					const subject =
						headers.find((h) => h.name === 'Subject')?.value ||
						'(Không có tiêu đề)';
					const from =
						headers.find((h) => h.name === 'From')?.value || 'Unknown';
					const date = headers.find((h) => h.name === 'Date')?.value || '';

					return {
						id: msg.id,
						subject: subject,
						from: from,
						date: date,
						snippet: msgDetail.data.snippet, // Đoạn text xem trước ngắn
						link: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
					};
				}),
			);

			return detailedMessages;
		} catch (error) {
			console.error('Error fetching Gmail preview:', error);
			throw new UnauthorizedException(
				'Không thể lấy thông tin Gmail. Vui lòng kiểm tra kết nối và quyền truy cập.',
			);
		}
	},

	getGithubPreview: async (userId) => {
		// Logic to fetch Github preview for the
		const integration = await integrationRepository.getIntegrationGmailPreview(
			userId,
			'GITHUB',
		);
		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với Github.');
		}
		// giải mã access token
		const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);

		try {
			// Lấy các issue đang open được assign cho user này
			const response = await axios.get('https://api.github.com/user/issues', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/vnd.github.v3+json',
				},
				params: {
					filter: 'assigned', // Chỉ lấy issue giao cho mình
					state: 'open',
					per_page: 10,
				},
			});

			// Format lại dữ liệu cho sạch đẹp trước khi trả về
			const formattedIssues = response.data.map((issue) => ({
				id: issue.id,
				title: issue.title,
				state: issue.state,
				repository: issue.repository.full_name,
				creator: issue.user.login,
				link: issue.html_url,
				createdAt: issue.created_at,
			}));

			return formattedIssues;
		} catch (error) {
			console.error('Lỗi gọi GitHub API:', {
				status: error.response?.status,
				message: error.response?.data?.message || error.message,
				documentation_url: error.response?.data?.documentation_url,
				token_preview: accessToken?.substring(0, 10) + '...',
			});
			throw new UnauthorizedException(
				'Không thể lấy dữ liệu GitHub. Vui lòng kiểm tra scope quyền và token hợp lệ.',
			);
		}
	},
};
