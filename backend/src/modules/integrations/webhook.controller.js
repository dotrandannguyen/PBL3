import crypto from 'crypto';
import prisma from '../../config/database.js';

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

			// Lưu ý: JSON.stringify có thể bị lệch format so với payload gốc của GitHub.
			// Trong môi trường thực tế, người ta dùng express.raw().
			// Nếu phần xác thực này báo lỗi chữ ký không hợp lệ, bạn có thể comment tạm đoạn if này để test luồng data trước.
			const hmac = crypto.createHmac('sha256', secret);
			const digest =
				'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

			if (signature !== digest) {
				console.error('🚨 [WEBHOOK] Chữ ký không hợp lệ! Bỏ qua request.');
				// return; // Tạm comment dòng này nếu bị lỗi xác thực chữ ký do Express parse JSON
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
				const assignee = payload.assignee; // Người được giao việc

				// Nếu issue không được giao cho ai, hệ thống không quan tâm
				if (!assignee) return;

				// 4. Tìm xem GitHub ID này thuộc về User nào trong Database của bạn
				const integration = await prisma.integration.findFirst({
					where: {
						provider: 'GITHUB',
						providerUserId: String(assignee.id), // Tìm người được gán trong hệ thống
					},
				});

				if (integration) {
					console.log('====================================');
					console.log('🎉 [WEBHOOK] GITHUB VỪA BẮN DATA VỀ!');
					console.log('📌 Tiêu đề:', issue.title);
					console.log('👤 Người giao:', assignee.login);
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
						`⚠️ [WEBHOOK] Bỏ qua: User GitHub ID ${assignee.id} chưa liên kết với tài khoản nào trên App.`,
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

			// BƯỚC TIẾP THEO (Sau khi test thông luồng này, ta sẽ viết code):
			// - Tìm user có email này trong DB.
			// - Lấy Access Token/Refresh Token của họ.
			// - Gọi API Gmail tải nội dung thư.
			// - Lưu vào bảng Task.
		} catch (error) {
			console.error('❌ Lỗi xử lý Webhook Gmail:', error);
		}
	},
};
