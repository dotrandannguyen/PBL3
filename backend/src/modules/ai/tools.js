/**
 * AI Tools (Function Declarations) for Gemini Function Calling
 *
 * File: backend/src/modules/ai/tools.js
 *
 * Khai báo các "phép thuật" (tools) mà AI có thể gọi.
 * Mỗi tool tương ứng với một hành động thực tế trên hệ thống.
 */
export const aiTools = {
	functionDeclarations: [
		{
			name: 'createTask',
			description:
				'Tạo một công việc (task) mới cho người dùng vào hệ thống. Gọi tool này khi người dùng muốn tạo task, lịch, công việc, nhắc nhở.',
			parameters: {
				type: 'OBJECT',
				properties: {
					title: {
						type: 'STRING',
						description: 'Tiêu đề của công việc (bắt buộc)',
					},
					description: {
						type: 'STRING',
						description: 'Chi tiết mô tả công việc (nếu có)',
					},
					dueDate: {
						type: 'STRING',
						description:
							'Hạn chót theo chuẩn ISO 8601 (VD: 2026-05-02T17:00:00.000Z). Tính toán dựa trên thời gian hiện tại của hệ thống.',
					},
					priority: {
						type: 'STRING',
						enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
						description:
							'Độ ưu tiên: LOW (thấp), MEDIUM (mặc định), HIGH (cao), URGENT (khẩn cấp)',
					},
				},
				required: ['title'],
			},
		},
		{
			name: 'getTasks',
			description:
				'Lấy danh sách các công việc hiện tại của người dùng để trả lời, phân tích, báo cáo hoặc thống kê. Gọi tool này khi người dùng hỏi về task, tiến độ, lịch sắp tới.',
			parameters: {
				type: 'OBJECT',
				properties: {
					completed: {
						type: 'BOOLEAN',
						description:
							'true nếu muốn lấy task đã hoàn thành, false nếu lấy task chưa xong. Không truyền nếu muốn lấy tất cả.',
					},
					limit: {
						type: 'NUMBER',
						description: 'Số lượng task muốn lấy (mặc định 10, tối đa 50)',
					},
				},
			},
		},
	],
};
