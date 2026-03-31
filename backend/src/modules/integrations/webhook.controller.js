import crypto from 'crypto';
import { google } from 'googleapis';
import prisma from '../../config/database.js';
import { integrationService } from './integration.service.js';
import { integrationRepository } from './integration.repository.js';
import { encryptionUtils } from '../../common/utils/encryption.js';

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
				console.error('🚨 [WEBHOOK] Thiếu chữ ký hoặc Secret Key.');
				return;
			}

			const hmac = crypto.createHmac('sha256', secret);
			// Hàm băm dùng dữ liệu gốc (rawBody) đã được cấu hình trong app.js
			const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

			if (signature !== digest) {
				console.error('🚨 [WEBHOOK] Chữ ký không hợp lệ! Bỏ qua request.');
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
				// Người liên quan: ưu tiên người được giao, nếu chưa có ai thì tính người tạo
				const targetUser = payload.assignee || issue.user;

				if (!targetUser) return;

				// 4. Tìm xem GitHub ID này thuộc về User nào trong Database của bạn
				const integration = await prisma.integration.findFirst({
					where: {
						provider: 'GITHUB',
						providerUserId: String(targetUser.id), // Tìm người được gán trong hệ thống
					},
				});

				if (integration) {
					console.log('====================================');
					console.log('🎉 [WEBHOOK] GITHUB VỪA BẮN DATA VỀ!');
					console.log('📌 Tiêu đề:', issue.title);
					console.log('👤 Người xử lý:', targetUser.login);
					console.log('====================================');

					// 5. Lưu thẳng vào bảng Tasks
					await prisma.task.create({
						data: {
							userId: integration.userId,
							title: `[GitHub] ${issue.title}`,
							description: issue.body || 'Không có mô tả chi tiết.',
							status: 'PENDING',
							priority: 'MEDIUM',
							sourceType: 'GITHUB',
							sourceId: String(issue.id),
							sourceLink: issue.html_url,
						},
					});

					console.log('✅ [WEBHOOK] Đồng bộ thành Task mới thành công!');
				} else {
					console.log(
						`⚠️ [WEBHOOK] Bỏ qua: User GitHub ID ${targetUser.id} chưa liên kết với tài khoản nào trên App.`,
					);
				}
			}
		} catch (error) {
			console.error('❌ Lỗi xử lý Webhook GitHub:', error);
		}
	},
	handleGmail: async (req, res) => {
		// 1. Phản hồi 200 OK ngay lập tức cho Google Cloud Pub/Sub
		// Google cực kỳ khắt khe, nếu không trả về 200 nhanh, nó sẽ gửi lại liên tục.
		res.status(200).send('OK');

		try {
			// 2. Lấy data từ Pub/Sub
			const message = req.body.message;
			if (!message || !message.data) return;

			// 3. Dữ liệu Google gửi bị mã hóa Base64, ta phải giải mã nó ra
			const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
			const payload = JSON.parse(decodedData);

			const emailAddress = payload.emailAddress;
			const historyId = payload.historyId;

			console.log('====================================');
			console.log('📬 [GMAIL WEBHOOK] TÀI KHOẢN VỪA CÓ SỰ THAY ĐỔI!');
			console.log('📧 Email:', emailAddress);
			console.log('🔢 History ID:', historyId);
			console.log('====================================');

			// 4. Tìm user có email này trong DB
			const integration = await integrationRepository.findIntegrationByEmailAddress(
				emailAddress,
				'GOOGLE',
			);

			if (!integration) {
				console.log(
					`⚠️ [WEBHOOK] Email ${emailAddress} chưa liên kết với tài khoản nào trên App.`,
				);
				return;
			}

			// 5. Lấy Access Token và decrypt
			const accessToken = encryptionUtils.decrypt(integration.accessTokenEncrypted);

			// 6. Khởi tạo OAuth2 client với access token
			const oauth2Client = new google.auth.OAuth2();
			oauth2Client.setCredentials({ access_token: accessToken });

			// 7. Lấy danh sách message IDs từ history
			const messageIds = await integrationService.fetchEmailDetailsFromHistory(
				oauth2Client,
				historyId,
			);

			if (messageIds.length === 0) {
				console.log('📭 [GMAIL] Không có email mới để xử lý.');
				return;
			}

			// 8. Lấy chi tiết đầy đủ của mỗi email
			const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
			const emailDetails = await Promise.all(
				messageIds.map((id) => integrationService.getFullEmailDetails(gmail, id)),
			);

			// 9. Lọc emails theo điều kiện (chưa đọc + có chữ "task")
			const filteredEmails = await integrationService.filterEmails(
				emailDetails,
				gmail,
			);

			if (filteredEmails.length === 0) {
				console.log('📭 [GMAIL] Không có email nào đáp ứng điều kiện lọc.');
				return;
			}

			// 10. Lưu mỗi email đó vào bảng Tasks
			for (const email of filteredEmails) {
				await prisma.task.create({
					data: {
						userId: integration.userId,
						title: `[Gmail] ${email.subject}`,
						description: email.body || 'Không có nội dung chi tiết.',
						status: 'PENDING',
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
					},
				});

				console.log(`✅ [GMAIL] Đã lưu email "${email.subject}" thành Task.`);
			}

			console.log(
				`✨ [GMAIL WEBHOOK] Đồng bộ ${filteredEmails.length} email thành công!`,
			);
		} catch (error) {
			console.error('❌ Lỗi xử lý Webhook Gmail:', error);
		}
	},
};
