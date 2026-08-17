import crypto from 'crypto';
import { google } from 'googleapis';
import prisma from '../../config/database.js';
import { integrationService } from './integration.service.js';
import { integrationRepository } from './integration.repository.js';
import { encryptionUtils } from '../../common/utils/encryption.js';
import { taskRepository } from '../tasks/task.repository.js';
import { googleService } from '../auth/google.service.js';

const verifySlackSignature = (req) => {
	const signature = req.headers['x-slack-signature'];
	const timestamp = req.headers['x-slack-request-timestamp'];
	const signingSecret = process.env.SLACK_SIGNING_SECRET;

	if (!signature || !timestamp || !signingSecret || !req.rawBody) {
		return false;
	}

	const now = Math.floor(Date.now() / 1000);
	const reqTs = Number(timestamp);
	if (Number.isNaN(reqTs) || Math.abs(now - reqTs) > 300) {
		return false;
	}

	const baseString = `v0:${timestamp}:${req.rawBody.toString('utf8')}`;
	const digest =
		'v0=' +
		crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');

	const signatureBuffer = Buffer.from(String(signature));
	const digestBuffer = Buffer.from(digest);

	if (signatureBuffer.length !== digestBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
};

export const webhookController = {
	handleGithub: async (req, res) => {
		// 1. NGAY LẬP TỨC trả về 200 OK để GitHub biết Server bạn còn sống
		// Nếu không trả về nhanh, GitHub sẽ báo lỗi Timeout (dấu X màu đỏ)
		res.status(200).send('Webhook received');

		try {
			// 2. Xác minh chữ ký bảo mật (Chống hacker)
			const signature = req.headers['x-hub-signature-256'];
			const secret = process.env.GITHUB_WEBHOOK_SECRET;

			if (!signature || !secret) {
				console.error('[WEBHOOK] Thiếu chữ ký hoặc Secret Key.');
				return;
			}
			// fix lỗi crash khi GitHub gửi payload rỗng (ping test) hoặc không có body
			if (!req.rawBody) {
				console.error('[WEBHOOK] Thiếu rawBody (payload trống). Bỏ qua request.');
				return;
			}

			const hmac = crypto.createHmac('sha256', secret);
			// Hàm băm dùng dữ liệu gốc (rawBody) đã được cấu hình trong app.js
			const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

			//fix timming attack dùng crypto.timingSafeEqual
			// Lưu ý: timingSafeEqual yêu cầu 2 biến phải là dạng Buffer và có cùng độ dài.
			const signatureBuffer = Buffer.from(signature);
			const digestBuffer = Buffer.from(digest);
			if (
				signatureBuffer.length !== digestBuffer.length ||
				!crypto.timingSafeEqual(signatureBuffer, digestBuffer)
			) {
				console.error('[WEBHOOK] Chữ ký không hợp lệ! Bỏ qua request.');
				return;
			}

			// 3. Xử lý Payload từ GitHub
			const event = req.headers['x-github-event'];
			const payload = req.body;

			// Chỉ bắt sự kiện Issue được 'opened' (tạo mới) hoặc 'assigned' (giao việc)
			if (
				event === 'issues' &&
				(payload.action === 'opened' || payload.action === 'assigned')
			) {
				const issue = payload.issue;
				// 3. Xác định đối tượng cần nhận thông báo
				// - Event "assigned": dùng payload.assignee (người vừa được giao)
				// - Event "opened": dùng issue.assignees nếu có, không thì issue.user (người tạo)
				let targetUsers = [];
				if (payload.action === 'assigned' && payload.assignee) {
					targetUsers = [payload.assignee];
				} else if (
					payload.action === 'opened' &&
					issue.assignees &&
					issue.assignees.length > 0
				) {
					targetUsers = issue.assignees;
				} else {
					// Fallback: Thông báo cho chính người tạo issue
					targetUsers = [issue.user];
				}

				for (const targetUser of targetUsers) {
					if (!targetUser) continue;

					// 4. Tìm xem GitHub ID này thuộc về User nào trong Database của bạn
					const integration = await prisma.integration.findFirst({
						where: {
							provider: 'GITHUB',
							providerUserId: String(targetUser.id),
						},
					});

					if (!integration) {
						console.log(
							`[WEBHOOK] Bỏ qua: User GitHub ID ${targetUser.id} chưa liên kết với tài khoản nào trên App.`,
						);
						continue;
					}

					console.log('====================================');
					console.log('[WEBHOOK] GITHUB VỪA BẮN DATA VỀ!');
					console.log('Tiêu đề:', issue.title);
					console.log('Người xử lý:', targetUser.login);
					console.log('====================================');

					// 5. Lưu thẳng vào bảng Tasks (INBOX - chờ duyệt)
					const taskData = {
						title: `[GitHub] ${issue.title}`,
						description: issue.body || 'Không có mô tả chi tiết.',
						priority: 'MEDIUM',
						sourceType: 'GITHUB',
						sourceId: String(issue.id),
						sourceLink: issue.html_url,
					};

					const newTask = await taskRepository.upsertTaskToInbox(
						integration.userId,
						taskData,
					);

					console.log('[WEBHOOK] Đồng bộ thành Task mới thành công!');

					// 6. EMIT SOCKET.IO EVENT CHO USER
					try {
						const io = req.app.get('socketio');
						if (io) {
							io.to(integration.userId).emit('NEW_INBOX_ITEM', {
								message: 'Bạn có một công việc mới từ GitHub!',
								task: newTask,
							});
							console.log(
								`[SOCKET.IO] Đã gửi sự kiện tới user ${integration.userId}`,
							);
						}
					} catch (socketError) {
						console.error(
							'[SOCKET.IO] Lỗi khi emit event:',
							socketError.message,
						);
					}
				}
			}
		} catch (error) {
			console.error('Lỗi xử lý Webhook GitHub:', error);
		}
	},
	handleGmail: async (req, res) => {
		// 1. Phản hồi 200 OK ngay lập tức để Google không spam gửi lại
		res.status(200).send('OK');

		try {
			const message = req.body.message;
			if (!message || !message.data) return;

			const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
			const payload = JSON.parse(decodedData);
			const emailAddress = payload.emailAddress;

			console.log('====================================');
			console.log('[GMAIL WEBHOOK] CÓ SỰ THAY ĐỔI TỪ:', emailAddress);
			console.log('====================================');

			const integration = await integrationRepository.findIntegrationByEmailAddress(
				emailAddress,
				'GOOGLE',
			);

			if (!integration) return;

			// Khởi tạo Google Client
			const oauth2Client = googleService.getValidGoogleClient(integration);
			const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

			// BƯỚC ĐỘT PHÁ: Bỏ qua History lằng nhằng, Query trực tiếp 5 thư mới nhất!
			const searchQuery =
				'is:unread {"task" "công việc" "nhiệm vụ" "báo cáo" "deadline" "bug" "fix"}';

			const listResponse = await gmail.users.messages.list({
				userId: 'me',
				labelIds: ['INBOX'],
				maxResults: 5,
				q: searchQuery,
			});

			const messages = listResponse.data.messages || [];
			if (messages.length === 0) {
				console.log(
					'[GMAIL] Webhook báo thay đổi, nhưng không có thư Task nào chưa đọc.',
				);
				return;
			}

			// Lấy chi tiết và lọc thư
			const messageIds = messages.map((m) => m.id);
			const emailDetails = await Promise.all(
				messageIds.map((id) => integrationService.getFullEmailDetails(gmail, id)),
			);

			const filteredEmails = await integrationService.filterEmails(
				emailDetails,
				gmail,
			);

			if (filteredEmails.length === 0) return;

			// Xử lý lưu và bắn Realtime
			for (const email of filteredEmails) {
				// QUAN TRỌNG: Kiểm tra xem Task này đã tồn tại trong DB chưa
				const existingTask = await prisma.task.findFirst({
					where: {
						userId: integration.userId,
						sourceId: email.id,
						sourceType: 'GMAIL',
					},
				});

				const taskData = {
					title: `[Gmail] ${email.subject}`,
					description: email.body || 'Không có nội dung chi tiết.',
					priority: 'MEDIUM',
					sourceType: 'GMAIL',
					sourceId: email.id,
					sourceLink: email.link,
					sourceMetadata: {
						subject: email.subject,
						from: email.from,
						to: email.to,
						date: email.date,
						attachments: email.attachments,
					},
				};

				const newTask = await taskRepository.upsertTaskToInbox(
					integration.userId,
					taskData,
				);

				// CHỈ bắn Socket nếu đây là thư mới tinh (Chưa có trong DB)
				if (!existingTask) {
					console.log(
						`[GMAIL] Thư mới: "${email.subject}" -> Đang bắn Socket Realtime!`,
					);
					try {
						const io = req.app.get('socketio');
						if (io) {
							io.to(integration.userId).emit('NEW_INBOX_ITEM', {
								message: 'Bạn có một email công việc mới!',
								task: newTask,
							});
						}
					} catch (socketError) {
						console.error('⚠️ [SOCKET.IO] Lỗi:', socketError.message);
					}
				} else {
					console.log(
						`[GMAIL] Thư "${email.subject}" đã xử lý trước đó, Skip Socket.`,
					);
				}
			}
		} catch (error) {
			console.error('Lỗi xử lý Webhook Gmail:', error);
		}
	},
	handleSlack: async (req, res) => {
		const isValidSignature = verifySlackSignature(req);
		if (!isValidSignature) {
			return res.status(401).send('Invalid Slack signature');
		}

		if (req.body?.type === 'url_verification') {
			return res.status(200).json({ challenge: req.body.challenge });
		}

		res.status(200).send('OK');

		try {
			if (req.body?.type !== 'event_callback') {
				return;
			}

			const { event, team_id: teamId } = req.body;
			if (!event || event.type !== 'message' || event.subtype || !event.user) {
				return;
			}

			const slackUserId = String(event.user);
			const text = (event.text || '').trim();
			if (!text) {
				return;
			}

			const channelId = event.channel;
			const ts = event.ts;
			const sourceId = `${channelId}:${ts}`;

			const integration = await prisma.integration.findFirst({
				where: {
					provider: 'SLACK',
					providerUserId: slackUserId,
				},
			});

			if (!integration) {
				console.log(
					`[SLACK WEBHOOK] Bỏ qua: Slack user ${slackUserId} chưa liên kết tài khoản.`,
				);
				return;
			}

			const existingTask = await prisma.task.findFirst({
				where: {
					userId: integration.userId,
					sourceType: 'SLACK',
					sourceId,
				},
			});

			const taskData = {
				title: `[Slack] ${text.substring(0, 100)}`,
				description: text,
				priority: 'MEDIUM',
				sourceType: 'SLACK',
				sourceId,
				sourceLink: `https://slack.com/app_redirect?channel=${channelId}&message_ts=${ts}`,
				sourceMetadata: {
					channelId,
					teamId,
					slackUserId,
					ts,
				},
			};

			const newTask = await taskRepository.upsertTaskToInbox(
				integration.userId,
				taskData,
			);

			if (!existingTask) {
				const io = req.app.get('socketio');
				if (io) {
					io.to(integration.userId).emit('NEW_INBOX_ITEM', {
						message: 'Bạn có một tin nhắn Slack mới!',
						task: newTask,
					});
				}
			}
		} catch (error) {
			console.error('Lỗi xử lý Webhook Slack:', error);
		}
	},
};
