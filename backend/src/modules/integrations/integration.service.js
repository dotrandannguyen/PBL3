import { google } from 'googleapis';
import {
	NotFoundException,
	UnauthorizedException,
} from '../../common/exceptions/index.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { integrationRepository } from './integration.repository.js';
import { githubService } from '../auth/github.service.js';
import { taskRepository } from '../tasks/task.repository.js';
import axios from 'axios';
import prisma from '../../config/database.js';

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

		// Khởi tạo client Google API và lấy preview (ví dụ: tên tài khoản, email, avatar)
		// phải enable Gmail API trong Google Cloud Console và cấp quyền phù hợp
		const oauth2Client = new google.auth.OAuth2();
		oauth2Client.setCredentials({ access_token: accessToken });
		const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

		try {
			const response = await gmail.users.messages.list({
				userId: 'me',
				labelIds: ['INBOX'],
				maxResults: 10,
				q: 'task is:unread', // Chỉ lấy email chưa đọc để preview
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

			// === BƯỚC MỚI: Lọc và lưu emails có "task" vào database ===
			// Lọc emails có từ "task" trong subject hoặc snippet
			const emailsWithTask = detailedMessages.filter((email) => {
				const searchText = `${email.subject} ${email.snippet}`.toLowerCase();
				return searchText.includes('task');
			});

			if (emailsWithTask.length > 0) {
				// Lấy full details của emails có "task"
				const emailsWithTaskFullDetails = await Promise.all(
					emailsWithTask.map((email) =>
						integrationService.getFullEmailDetails(gmail, email.id),
					),
				);

				// Lưu vào database
				await integrationService.saveTasksToInbox(
					userId,
					emailsWithTaskFullDetails,
					'GMAIL',
				);
			}

			// Trả về metadata của tất cả 10 emails cho Frontend preview
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
				description: issue.body || '', // Thêm description từ GitHub API
			}));

			// === BƯỚC MỚI: Lưu tất cả issues vào database ===
			await integrationService.saveTasksToInbox(userId, formattedIssues, 'GITHUB');

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

	// ========== GMAIL WEBHOOK FUNCTIONS ==========

	/**
	 * Lấy chi tiết email từ Gmail History API
	 * @param {object} oauth2Client - Google OAuth2 client (đã set credentials)
	 * @param {string} historyId - History ID từ webhook payload
	 * @returns {Array} Array of message IDs từ history
	 */
	fetchEmailDetailsFromHistory: async (oauth2Client, historyId) => {
		const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

		try {
			// Lấy lịch sử thay đổi từ historyId (nơi email mới được nhận)
			const historyResponse = await gmail.users.history.list({
				userId: 'me',
				startHistoryId: historyId,
				// Chỉ lấy email chưa đọc (UNREAD label)
			});

			const historyRecords = historyResponse.data.history || [];
			if (historyRecords.length === 0) {
				console.log('📭 [GMAIL] Không có history mới.');
				return [];
			}

			// Extract messageId từ history records
			// History có thể chứa ADDED, MODIFIED, DELETED actions
			const messageIds = [];
			historyRecords.forEach((record) => {
				if (record.messagesAdded) {
					record.messagesAdded.forEach((item) => {
						messageIds.push(item.message.id);
					});
				}
			});

			console.log(`📬 [GMAIL] Tìm thấy ${messageIds.length} email mới từ history.`);
			return messageIds;
		} catch (error) {
			console.error('❌ Lỗi lấy Gmail history:', error);
			throw error;
		}
	},

	/**
	 * Lấy chi tiết đầy đủ của 1 email (Subject, From, To, Date, Body, Attachments)
	 * @param {object} gmail - Gmail API client
	 * @param {string} messageId - Message ID
	 * @returns {object} Email object với chi tiết đầy đủ
	 */
	getFullEmailDetails: async (gmail, messageId) => {
		try {
			const msgResponse = await gmail.users.messages.get({
				userId: 'me',
				id: messageId,
				format: 'full', // Lấy toàn bộ dữ liệu (headers + body + attachments)
			});

			const message = msgResponse.data;
			const headers = message.payload.headers || [];

			// Extract headers
			const getHeader = (name) => headers.find((h) => h.name === name)?.value || '';

			const subject = getHeader('Subject') || '(Không có tiêu đề)';
			const from = getHeader('From') || 'Unknown';
			const to = getHeader('To') || '';
			const date = getHeader('Date') || '';

			// Extract body content
			let bodyContent = '';
			if (message.payload.parts) {
				// Email multipart (có text + HTML)
				const textPart = message.payload.parts.find(
					(p) => p.mimeType === 'text/plain',
				);
				const htmlPart = message.payload.parts.find(
					(p) => p.mimeType === 'text/html',
				);

				if (textPart && textPart.body.data) {
					bodyContent = Buffer.from(textPart.body.data, 'base64').toString(
						'utf-8',
					);
				} else if (htmlPart && htmlPart.body.data) {
					// Nếu chỉ có HTML, convert to text (simple)
					bodyContent = Buffer.from(htmlPart.body.data, 'base64').toString(
						'utf-8',
					);
				}
			} else if (message.payload.body && message.payload.body.data) {
				// Simple email (không multipart)
				bodyContent = Buffer.from(message.payload.body.data, 'base64').toString(
					'utf-8',
				);
			}

			// Extract attachments metadata
			const attachments = [];
			if (message.payload.parts) {
				message.payload.parts.forEach((part) => {
					if (part.filename && part.body.attachmentId) {
						attachments.push({
							filename: part.filename,
							mimeType: part.mimeType,
							size: part.body.size || 0, // Size in bytes
						});
					}
				});
			}

			return {
				id: messageId,
				subject,
				from,
				to,
				date,
				body: bodyContent,
				attachments,
				snippet: message.snippet,
				link: `https://mail.google.com/mail/u/0/#inbox/${messageId}`,
			};
		} catch (error) {
			console.error(`❌ Lỗi lấy chi tiết email ${messageId}:`, error);
			throw error;
		}
	},

	/**
	 * Lọc emails theo điều kiện: chỉ giữ email chưa đọc + có chữ "task" trong Subject/Body
	 * @param {Array} emails - Array of email objects
	 * @param {object} gmail - Gmail API client (để remove UNREAD label sau)
	 * @returns {Array} Filtered emails
	 */
	filterEmails: async (emails, gmail = null) => {
		console.log(`🔍 [GMAIL] Lọc ${emails.length} email theo điều kiện...`);

		const filteredEmails = emails.filter((email) => {
			const searchText = `${email.subject} ${email.body}`.toLowerCase();
			const hasTaskKeyword = searchText.includes('task');

			if (hasTaskKeyword) {
				console.log(`✅ [GMAIL] Email "${email.subject}" chứa từ "task"`);
				return true;
			} else {
				console.log(
					`⏭️ [GMAIL] Email "${email.subject}" không chứa từ "task" - bỏ qua`,
				);
				return false;
			}
		});

		console.log(
			`✨ [GMAIL] Kết quả: ${filteredEmails.length}/${emails.length} emails đáp ứng điều kiện`,
		);
		return filteredEmails;
	},

	// ========== GITHUB WEBHOOK FUNCTIONS ==========

	/**
	 * Lấy danh sách repositories của user
	 * @param {string} userId - User ID
	 * @returns {Array} Array of repositories
	 */
	getGithubRepositories: async (userId) => {
		// Lấy integration GitHub của user
		const integration = await integrationRepository.getIntegrationGmailPreview(
			userId,
			'GITHUB',
		);

		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với GitHub.');
		}

		// Giải mã access token
		const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);

		try {
			// Gọi githubService để lấy danh sách repositories
			const repositories = await githubService.getUserRepositories(accessToken);
			return repositories;
		} catch (error) {
			console.error('❌ [GITHUB] Lỗi lấy danh sách repositories:', error.message);
			throw new UnauthorizedException(
				'Không thể lấy danh sách repositories. Vui lòng kiểm tra kết nối GitHub.',
			);
		}
	},

	/**
	 * Cài đặt webhooks cho các repositories
	 * @param {string} userId - User ID
	 * @param {Array} repositoryIds - Array of repository IDs
	 * @returns {Object} Setup results
	 */
	setupGithubWebhooks: async (userId, repositoryIds) => {
		// Lấy integration GitHub của user
		const integration = await integrationRepository.getIntegrationGmailPreview(
			userId,
			'GITHUB',
		);

		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với GitHub.');
		}

		// Giải mã access token
		const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);

		try {
			// Lấy danh sách repositories của user
			const allRepositories = await githubService.getUserRepositories(accessToken);

			// Filter chỉ lấy các repo theo repositoryIds
			const selectedRepositories = allRepositories.filter((repo) =>
				repositoryIds.includes(repo.id),
			);

			if (selectedRepositories.length === 0) {
				throw new NotFoundException(
					'Không tìm thấy repositories với ID được cung cấp.',
				);
			}

			// Cài webhook cho các repositories
			const setupResult = await githubService.setupWebhooksForRepositories(
				accessToken,
				selectedRepositories,
			);

			// Lưu webhook data vào Integration nếu setup thành công
			if (setupResult.success.length > 0) {
				// Khởi tạo webhookData nếu chưa có
				const currentWebhookData = integration.webhookData || {};
				if (!currentWebhookData.github) {
					currentWebhookData.github = {};
				}
				if (!currentWebhookData.github.hookIds) {
					currentWebhookData.github.hookIds = {};
				}

				// Thêm thông tin webhook mới vào
				setupResult.success.forEach((item) => {
					currentWebhookData.github.hookIds[item.repo] = {
						hookId: item.webhookId,
						createdAt: new Date().toISOString(),
					};
				});

				// Cập nhật Integration với webhook data mới
				await prisma.integration.update({
					where: {
						userId_provider: {
							userId: userId,
							provider: 'GITHUB',
						},
					},
					data: {
						webhookData: currentWebhookData,
					},
				});

				console.log(
					`✅ [GITHUB] Đã lưu webhook data cho ${setupResult.success.length} repositories`,
				);
			}

			return setupResult;
		} catch (error) {
			console.error('❌ [GITHUB] Lỗi setup webhooks:', error.message);
			throw error;
		}
	},

	/**
	 * Lưu tasks vào INBOX database
	 * Hàm chung cho cả Sync Preview và Webhook
	 * @param {String} userId - ID của user
	 * @param {Array} tasksToSave - Mảng tasks đã được lọc (từ Gmail hoặc GitHub)
	 * @param {String} sourceType - 'GMAIL' hoặc 'GITHUB'
	 * @returns {Array} Mảng tasks đã được lưu vào database
	 */
	saveTasksToInbox: async (userId, tasksToSave, sourceType) => {
		const savedTasks = [];

		for (const task of tasksToSave) {
			try {
				let taskData = {};

				if (sourceType === 'GMAIL') {
					// Format Gmail task
					taskData = {
						title: `[Gmail] ${task.subject}`,
						description: task.body || 'Không có nội dung chi tiết.',
						priority: 'MEDIUM',
						sourceType: 'GMAIL',
						sourceId: task.id,
						sourceLink: task.link,
						sourceMetadata: {
							subject: task.subject,
							from: task.from,
							to: task.to,
							date: task.date,
							attachments: task.attachments,
						},
					};
				} else if (sourceType === 'GITHUB') {
					// Format GitHub task
					taskData = {
						title: `[GitHub] ${task.title}`,
						description: task.description || `Issue in ${task.repository} - State: ${task.state}`,
						priority: 'MEDIUM',
						sourceType: 'GITHUB',
						sourceId: String(task.id),
						sourceLink: task.link,
						sourceMetadata: {
							title: task.title,
							state: task.state,
							repository: task.repository,
							creator: task.creator,
							createdAt: task.createdAt,
						},
					};
				}

				// UPSERT vào database
				const savedTask = await taskRepository.upsertTaskToInbox(userId, taskData);
				savedTasks.push(savedTask);

				console.log(
					`✅ [SYNC] Đã lưu task "${taskData.title}" (${sourceType}) vào INBOX.`,
				);
			} catch (error) {
				console.error(
					`❌ [SYNC] Lỗi lưu task từ ${sourceType}:`,
					error.message,
				);
			}
		}

		return savedTasks;
	},
};
