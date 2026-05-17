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
import { googleService } from '../auth/google.service.js';

export const integrationService = {
	getGmailPreview: async (userId) => {
		// Logic to fetch Gmail preview for the user
		const integration = await integrationRepository.getIntegrationByProvider(
			userId,
			'GOOGLE',
		);

		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với Google.');
		}

		// console.log('Decrypted Access Token:', accessToken);

		// Khởi tạo client Google API và lấy preview (ví dụ: tên tài khoản, email, avatar)
		// phải enable Gmail API trong Google Cloud Console và cấp quyền phù hợp
		const oauth2Client = googleService.getValidGoogleClient(integration);
		const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

		try {
			// Sử dụng cú pháp của Gmail: {} nghĩa là OR (hoặc)
			// Tìm các thư chưa đọc VÀ có chứa 1 trong các từ khóa này
			const searchQuery =
				'is:unread {"task" "công việc" "nhiệm vụ" "báo cáo" "deadline" "bug" "fix"}';
			const response = await gmail.users.messages.list({
				userId: 'me',
				labelIds: ['INBOX'],
				maxResults: 10,
				q: searchQuery, // Chỉ lấy email chưa đọc để preview
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
						labelIds: msgDetail.data.labelIds || [],
						link: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
					};
				}),
			);
			const filteredMessages =
				await integrationService.filterEmails(detailedMessages);

			if (filteredMessages.length === 0) return [];

			// === BƯỚC MỚI: Lưu tất cả emails vào database và return task IDs ===
			// Lưu tất cả emails vào INBOX (không filter "task" nữa)
			const tasksBySourceId = await integrationService.saveTasksToInbox(
				userId,
				filteredMessages,
				'GMAIL',
			);

			// Match emails với saved tasks by sourceId (email.id)
			const emailsWithTaskIds = filteredMessages.map((email) => {
				const savedTask = tasksBySourceId[email.id];
				return {
					...email,
					taskId: savedTask?.id || null,
				};
			});

			// Trả về: metadata của tất cả 10 emails + actual task IDs
			return emailsWithTaskIds;
		} catch (error) {
			console.error('Error fetching Gmail preview:', error);
			throw new UnauthorizedException(
				'Không thể lấy thông tin Gmail. Vui lòng kiểm tra kết nối và quyền truy cập.',
			);
		}
	},

	getGithubPreview: async (userId) => {
		// Logic to fetch Github preview for the
		const integration = await integrationRepository.getIntegrationByProvider(
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

			// === Bước Mới: Lưu tất cả issues vào database và return task IDs ===
			const tasksBySourceId = await integrationService.saveTasksToInbox(
				userId,
				formattedIssues,
				'GITHUB',
			);

			// Match issues với saved tasks by sourceId (issue.id)
			const issuesWithTaskIds = formattedIssues.map((issue) => {
				const savedTask = tasksBySourceId[String(issue.id)];
				return {
					...issue,
					taskId: savedTask?.id || null,
				};
			});

			return issuesWithTaskIds;
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

	getSlackPreview: async (userId) => {
		const integration = await integrationRepository.getIntegrationByProvider(
			userId,
			'SLACK',
		);
		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với Slack.');
		}

		const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);
		const slackUserId = integration.providerUserId
			? String(integration.providerUserId)
			: null;
		const slackClient = axios.create({
			baseURL: 'https://slack.com/api',
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		try {
			const listDirect = await slackClient.get('/conversations.list', {
				params: { types: 'im,mpim', limit: 10 },
			});

			const directChannels = listDirect.data?.channels || [];
			let targetChannel = directChannels[0] || null;
			let channelName = targetChannel?.name || 'direct-message';

			if (!targetChannel) {
				const listChannels = await slackClient.get('/conversations.list', {
					params: { types: 'public_channel,private_channel', limit: 10 },
				});

				const channels = listChannels.data?.channels || [];
				targetChannel = channels[0] || null;
				channelName = targetChannel?.name || 'channel';
			}

			if (!targetChannel) {
				return [];
			}

			const history = await slackClient.get('/conversations.history', {
				params: { channel: targetChannel.id, limit: 10 },
			});

			const messages = history.data?.messages || [];
			if (messages.length === 0) return [];

			const formattedMessages = messages
				.filter((message) => Boolean(message?.text))
				.filter((message) => {
					if (!slackUserId) return true;
					const senderId = message.user || message.bot_id || null;
					if (!senderId) return false;
					return String(senderId) !== slackUserId;
				})
				.map((message) => ({
					id: message.ts,
					text: message.text,
					userId: message.user || message.bot_id || 'slack',
					ts: message.ts,
					channelId: targetChannel.id,
					channelName,
					link: `https://slack.com/app_redirect?channel=${targetChannel.id}&message_ts=${message.ts}`,
				}));

			const tasksBySourceId = await integrationService.saveTasksToInbox(
				userId,
				formattedMessages,
				'SLACK',
			);

			return formattedMessages.map((message) => {
				const savedTask = tasksBySourceId[message.id];
				return {
					...message,
					taskId: savedTask?.id || null,
				};
			});
		} catch (error) {
			console.error('Lỗi gọi Slack API:', {
				status: error.response?.status,
				message: error.response?.data?.error || error.message,
			});
			throw new UnauthorizedException(
				'Không thể lấy dữ liệu Slack. Vui lòng kiểm tra scope quyền và token hợp lệ.',
			);
		}
	},

	/**
	 * Lấy dữ liệu Slack Dashboard - 5 loại dữ liệu quan trọng:
	 * 1. Tasks được assign cho mình
	 * 2. Task có mention/tag mình
	 * 3. Deadline sắp tới / overdue
	 * 4. File/link attach trong task
	 * 5. Notification quan trọng (invite, assign, approve...)
	 */
	getSlackDashboard: async (userId) => {
		const integration = await integrationRepository.getIntegrationByProvider(
			userId,
			'SLACK',
		);
		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với Slack.');
		}

		const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);
		const slackUserId = integration.providerUserId
			? String(integration.providerUserId)
			: null;

		const slackClient = axios.create({
			baseURL: 'https://slack.com/api',
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		// ── Helper: lấy tất cả channels user tham gia ────────────────────────
		const getAllChannels = async () => {
			try {
				const [dmRes, chRes] = await Promise.all([
					slackClient.get('/conversations.list', {
						params: { types: 'im,mpim', limit: 200 },
					}),
					slackClient.get('/conversations.list', {
						params: { types: 'public_channel,private_channel', limit: 200 },
					}),
				]);
				return [
					...(dmRes.data?.channels || []),
					...(chRes.data?.channels || []),
				];
			} catch {
				return [];
			}
		};

		// ── Helper: lấy history của 1 channel ────────────────────────────────
		const getHistory = async (channelId, limit = 50) => {
			try {
				const res = await slackClient.get('/conversations.history', {
					params: { channel: channelId, limit },
				});
				return res.data?.messages || [];
			} catch {
				return [];
			}
		};

		// ── Helper: build link Slack ──────────────────────────────────────────
		const buildLink = (channelId, ts) =>
			`https://slack.com/app_redirect?channel=${channelId}&message_ts=${ts}`;

		// ── Helper: extract files/links từ message ────────────────────────────
		const extractFiles = (msg, channelId, channelName) => {
			const items = [];
			// Files đính kèm
			if (msg.files && msg.files.length > 0) {
				msg.files.forEach((f) => {
					items.push({
						id: `file-${f.id}`,
						type: 'file',
						name: f.name || f.title || 'Unnamed file',
						mimeType: f.mimetype || '',
						fileType: f.filetype || '',
						size: f.size || 0,
						url: f.url_private || f.permalink || '',
						previewUrl: f.thumb_360 || f.thumb_80 || null,
						channelId,
						channelName,
						ts: msg.ts,
						link: buildLink(channelId, msg.ts),
						senderUserId: msg.user || msg.bot_id || null,
					});
				});
			}
			// Attachments có URL
			if (msg.attachments && msg.attachments.length > 0) {
				msg.attachments.forEach((att) => {
					if (att.original_url || att.title_link) {
						items.push({
							id: `att-${msg.ts}-${att.id || Math.random()}`,
							type: 'link',
							name: att.title || att.text || att.original_url || 'Link',
							url: att.original_url || att.title_link || '',
							previewUrl: att.image_url || att.thumb_url || null,
							channelId,
							channelName,
							ts: msg.ts,
							link: buildLink(channelId, msg.ts),
							senderUserId: msg.user || msg.bot_id || null,
						});
					}
				});
			}
			return items;
		};

		// ── Helper: phân loại notification quan trọng ─────────────────────────
		const NOTIFICATION_KEYWORDS = [
			'invited you',
			'added you',
			'assigned',
			'approved',
			'rejected',
			'approve',
			'review',
			'lời mời',
			'chấp nhận',
			'phê duyệt',
			'từ chối',
			'bàn giao',
			'giao việc',
			'merge',
			'deploy',
			'release',
		];

		const ASSIGN_KEYWORDS = [
			'assign',
			'giao cho',
			'giao việc cho',
			'bạn phụ trách',
			'bạn cần làm',
			'phân công',
			'responsible',
			'owner',
			'bàn giao',
		];

		const DEADLINE_KEYWORDS = [
			'deadline',
			'due',
			'hạn',
			'hết hạn',
			'ngày mai',
			'tomorrow',
			'today',
			'hôm nay',
			'overdue',
			'quá hạn',
			'urgent',
			'gấp',
			'asap',
			'sắp hết hạn',
		];

		const isNotification = (text) => {
			const lower = (text || '').toLowerCase();
			return NOTIFICATION_KEYWORDS.some((kw) => lower.includes(kw));
		};

		const isAssignedToMe = (text, userId) => {
			if (!userId) return false;
			const lower = (text || '').toLowerCase();
			const mentionMe = text.includes(`<@${userId}>`);
			return mentionMe && ASSIGN_KEYWORDS.some((kw) => lower.includes(kw));
		};

		const isMentionMe = (text, userId) => {
			if (!userId) return false;
			return text.includes(`<@${userId}>`);
		};

		const hasDeadline = (text) => {
			const lower = (text || '').toLowerCase();
			return DEADLINE_KEYWORDS.some((kw) => lower.includes(kw));
		};

		const hasFileOrLink = (msg) => {
			return (
				(msg.files && msg.files.length > 0) ||
				(msg.attachments && msg.attachments.length > 0)
			);
		};

		try {
			const channels = await getAllChannels();
			if (channels.length === 0) {
				return {
					assignedTasks: [],
					mentions: [],
					deadlines: [],
					filesAndLinks: [],
					notifications: [],
					connected: true,
					channelCount: 0,
				};
			}

			// Lấy history song song từ tối đa 10 channels (tránh rate limit)
			const targetChannels = channels.slice(0, 10);
			const allMessagesRaw = await Promise.all(
				targetChannels.map(async (ch) => {
					const msgs = await getHistory(ch.id, 30);
					return msgs.map((m) => ({
						...m,
						_channelId: ch.id,
						_channelName: ch.name || ch.id,
					}));
				}),
			);
			const allMessages = allMessagesRaw.flat();

			// ── Phân loại ─────────────────────────────────────────────────────
			const assignedTasks = [];
			const mentions = [];
			const deadlines = [];
			const filesAndLinks = [];
			const notifications = [];

			const seenTs = new Set(); // tránh trùng lặp

			for (const msg of allMessages) {
				if (!msg.text && !msg.files && !msg.attachments) continue;
				const text = msg.text || '';
				const channelId = msg._channelId;
				const channelName = msg._channelName;
				const ts = msg.ts;
				const key = `${channelId}-${ts}`;
				const baseItem = {
					id: key,
					text,
					ts,
					channelId,
					channelName,
					senderUserId: msg.user || msg.bot_id || null,
					link: buildLink(channelId, ts),
				};

				// 1. Assigned to me
				if (isAssignedToMe(text, slackUserId)) {
					assignedTasks.push({ ...baseItem, category: 'assigned' });
				}

				// 2. Mentions (chỉ mention, không phải assigned)
				if (isMentionMe(text, slackUserId) && !isAssignedToMe(text, slackUserId)) {
					mentions.push({ ...baseItem, category: 'mention' });
				}

				// 3. Deadline
				if (hasDeadline(text)) {
					deadlines.push({ ...baseItem, category: 'deadline' });
				}

				// 4. Files & links
				if (hasFileOrLink(msg)) {
					const files = extractFiles(msg, channelId, channelName);
					filesAndLinks.push(...files);
				}

				// 5. Notifications quan trọng (không phải từ mình)
				const senderIsMe = slackUserId && (msg.user === slackUserId || msg.bot_id === slackUserId);
				if (!senderIsMe && isNotification(text)) {
					notifications.push({ ...baseItem, category: 'notification' });
				}
			}

			// Sort theo ts giảm dần (mới nhất trước)
			const sortByTs = (arr) =>
				arr.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts));

			return {
				assignedTasks: sortByTs(assignedTasks).slice(0, 20),
				mentions: sortByTs(mentions).slice(0, 20),
				deadlines: sortByTs(deadlines).slice(0, 20),
				filesAndLinks: filesAndLinks.slice(0, 20),
				notifications: sortByTs(notifications).slice(0, 20),
				connected: true,
				channelCount: channels.length,
				slackUserId,
			};
		} catch (error) {
			console.error('Lỗi getSlackDashboard:', {
				status: error.response?.status,
				message: error.response?.data?.error || error.message,
			});
			throw new UnauthorizedException(
				'Không thể lấy dữ liệu Slack Dashboard. Vui lòng kiểm tra scope quyền và token hợp lệ.',
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
			// Lấy lịch sử thay đổi từ historyId
			const historyResponse = await gmail.users.history.list({
				userId: 'me',
				startHistoryId: historyId,
				// Bỏ qua filter, lấy mọi thứ thay đổi
			});

			const historyRecords = historyResponse.data.history || [];
			if (historyRecords.length === 0) {
				console.log('[GMAIL] Không có history mới.');
				return [];
			}

			// Dùng Set để tránh trùng lặp messageId
			const messageIdSet = new Set();

			historyRecords.forEach((record) => {
				// Lay tat ca thu moi duoc them vao (khong can nhan ngay luc nay)
				if (record.messagesAdded) {
					record.messagesAdded.forEach((item) => {
						messageIdSet.add(item.message.id);
					});
				}

				// Lay them cac thu vua duoc gan nhan INBOX
				if (record.labelsAdded) {
					record.labelsAdded.forEach((item) => {
						if (item.labelIds && item.labelIds.includes('INBOX')) {
							messageIdSet.add(item.message.id);
						}
					});
				}
			});

			const messageIds = Array.from(messageIdSet);
			console.log(
				`[GMAIL] Tim thay ${messageIds.length} email co bien dong trong history.`,
			);
			return messageIds;
		} catch (error) {
			// NẾU LỖI LÀ DO HISTORY ID HẾT HẠN (404)
			if (error.code === 404 || error.response?.status === 404) {
				console.warn(
					'[GMAIL] HistoryID đã quá hạn, fallback sang quét 5 thư mới nhất.',
				);
				// Lấy 5 thư mới nhất thay vì dùng history
				const fallbackRes = await gmail.users.messages.list({
					userId: 'me',
					maxResults: 5,
					labelIds: ['INBOX'],
				});
				const msgs = fallbackRes.data.messages || [];
				return msgs.map((m) => m.id);
			}

			console.error('Lỗi lấy Gmail history:', error.message);
			return []; // Đừng throw error để tránh treo server
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
			const labelIds = message.labelIds || [];

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
				labelIds,
				link: `https://mail.google.com/mail/u/0/#inbox/${messageId}`,
			};
		} catch (error) {
			console.error(`Lỗi lấy chi tiết email ${messageId}:`, error);
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
		console.log(`[GMAIL] Lọc ${emails.length} email theo điều kiện...`);

		const filteredEmails = emails.filter((email) => {
			if (!email.labelIds || !email.labelIds.includes('INBOX')) {
				console.log(
					`[GMAIL] Bo qua: "${email.subject}" vi khong nam trong INBOX.`,
				);
				return false;
			}

			const bodyText = email.body || email.snippet || '';
			const searchText = `${email.subject} ${bodyText}`.toLowerCase();

			// Mở rộng từ khóa (Tiếng Việt & Anh)
			const keywords = [
				'task',
				'công việc',
				'nhiệm vụ',
				'báo cáo',
				'deadline',
				'bug',
				'fix',
			];
			const hasTaskKeyword = keywords.some((kw) => searchText.includes(kw));

			if (hasTaskKeyword) {
				console.log(`[GMAIL] Giữ lại email: "${email.subject}"`);
				return true;
			}
			return false;
		});

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
		const integration = await integrationRepository.getIntegrationByProvider(
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

			const webhookData = integration.webhookData || {};
			const githubData = webhookData.github || {};
			const hooksByRepoId = githubData.hooks || {};
			const hooksByRepoName = githubData.hookIds || {};

			return repositories.map((repo) => {
				const repoKey = String(repo.id);
				const hookEntry =
					hooksByRepoId[repoKey] || hooksByRepoName[repo.name] || null;
				return {
					...repo,
					webhookEnabled: Boolean(hookEntry?.hookId),
					webhookId: hookEntry?.hookId || null,
				};
			});
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
		const integration = await integrationRepository.getIntegrationByProvider(
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

			const repositoryIdSet = new Set(
				repositoryIds.map((repoId) => String(repoId)),
			);
			// Filter chỉ lấy các repo theo repositoryIds
			const selectedRepositories = allRepositories.filter((repo) =>
				repositoryIdSet.has(String(repo.id)),
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
				if (!currentWebhookData.github.hooks) {
					currentWebhookData.github.hooks = {};
				}
				if (!currentWebhookData.github.hookIds) {
					currentWebhookData.github.hookIds = {};
				}

				// Thêm thông tin webhook mới vào
				setupResult.success.forEach((item) => {
					const repoKey = String(item.repoId);
					currentWebhookData.github.hooks[repoKey] = {
						hookId: item.webhookId,
						repoId: item.repoId,
						owner: item.owner,
						name: item.name,
						fullName: item.fullName,
						enabledAt: new Date().toISOString(),
					};

					if (item.name) {
						currentWebhookData.github.hookIds[item.name] = {
							hookId: item.webhookId,
							createdAt: new Date().toISOString(),
						};
					}
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
					`[GITHUB] Đã lưu webhook data cho ${setupResult.success.length} repositories`,
				);
			}

			return setupResult;
		} catch (error) {
			console.error('❌ [GITHUB] Lỗi setup webhooks:', error.message);
			throw error;
		}
	},

	/**
	 * Tắt webhook cho một repository
	 * @param {string} userId - User ID
	 * @param {string|number} repositoryId - Repo ID
	 * @returns {Object} Disable result
	 */
	disableGithubWebhook: async (userId, repositoryId) => {
		const integration = await integrationRepository.getIntegrationByProvider(
			userId,
			'GITHUB',
		);

		if (!integration) {
			throw new NotFoundException('Bạn chưa kết nối với GitHub.');
		}

		const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);
		const repoKey = String(repositoryId);

		const webhookData = integration.webhookData || {};
		const githubData = webhookData.github || {};
		const hooksByRepoId = githubData.hooks || {};
		let hookEntry = hooksByRepoId[repoKey] || null;

		if (!hookEntry || !hookEntry.hookId || !hookEntry.owner || !hookEntry.name) {
			const allRepositories = await githubService.getUserRepositories(accessToken);
			const targetRepo = allRepositories.find(
				(repo) => String(repo.id) === repoKey,
			);

			if (targetRepo) {
				const fallbackHook = githubData.hookIds?.[targetRepo.name] || null;
				if (fallbackHook?.hookId) {
					hookEntry = {
						hookId: fallbackHook.hookId,
						owner: targetRepo.owner,
						name: targetRepo.name,
						fullName: targetRepo.fullName,
					};
				}
			}
		}

		if (!hookEntry?.hookId) {
			throw new NotFoundException('Webhook chưa được bật cho repository này.');
		}

		await githubService.deleteWebhookForRepo(
			accessToken,
			hookEntry.owner,
			hookEntry.name,
			hookEntry.hookId,
		);

		if (hooksByRepoId[repoKey]) {
			delete hooksByRepoId[repoKey];
		}
		if (hookEntry.name && githubData.hookIds?.[hookEntry.name]) {
			delete githubData.hookIds[hookEntry.name];
		}

		await prisma.integration.update({
			where: {
				userId_provider: {
					userId,
					provider: 'GITHUB',
				},
			},
			data: {
				webhookData: {
					...webhookData,
					github: {
						...githubData,
						hooks: hooksByRepoId,
					},
				},
			},
		});

		return {
			repositoryId: repoKey,
			disabled: true,
		};
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
		// Return map: sourceId -> savedTask (instead of array to avoid index mismatch)
		const tasksBySourceId = {};

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
						description:
							task.description ||
							`Issue in ${task.repository} - State: ${task.state}`,
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
				} else if (sourceType === 'SLACK') {
					const previewText = task.text?.trim() || 'Tin nhan Slack';
					const titleText =
						previewText.length > 80
							? `${previewText.slice(0, 77)}...`
							: previewText;
					taskData = {
						title: `[Slack] ${titleText}`,
						description: task.text || 'Không có nội dung chi tiết.',
						priority: 'MEDIUM',
						sourceType: 'SLACK',
						sourceId: String(task.id),
						sourceLink: task.link,
						sourceMetadata: {
							channelId: task.channelId,
							channelName: task.channelName,
							userId: task.userId,
							ts: task.ts,
						},
					};
				}

				// UPSERT vào database
				const savedTask = await taskRepository.upsertTaskToInbox(
					userId,
					taskData,
				);
				console.log(`[SLACK] Task saved:`, {
					id: savedTask.id,
					title: savedTask.title,
					status: savedTask.status,
					sourceId: savedTask.sourceId,
					isConverted: savedTask.isConverted,
				});
				// ✅ Use sourceId as key to avoid index mismatch
				tasksBySourceId[taskData.sourceId] = savedTask;
			} catch (error) {
				console.error(`❌ [SYNC] Lỗi lưu task từ ${sourceType}:`, error.message);
			}
		}

		return tasksBySourceId;
	},
};
