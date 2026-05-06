/**
 * AI Service - Xử lý Business Logic & SSE Streaming
 *
 * File: backend/src/modules/ai/ai.service.js
 *
 * SDK: @google/genai
 * Chiến lược:
 * - Lần 1: generateContent (non-stream) để detect Function Call
 * - Nếu có Function Call → thực thi → generateContentStream để stream câu trả lời cuối
 * - Nếu chỉ text → generateContentStream ngay từ đầu
 */
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { taskService } from '../tasks/task.service.js';
import { aiTools } from './tools.js';

// Danh sách model hợp lệ (Gemini 1.5 đã bị retire từ 24/09/2025)
const ALLOWED_MODELS = [
	'gemini-2.5-flash', // ✅ Mới nhất, thông minh
	'gemini-2.0-flash', // ✅ Stable, nhanh
	'gemini-2.0-flash-lite', // ✅ Siêu nhanh
];
const DEFAULT_MODEL = 'gemini-2.0-flash';

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
const isValidDateString = (value) => !Number.isNaN(Date.parse(value));

const createTaskArgsSchema = z
	.object({
		title: z
			.string()
			.min(1, 'Title không được để trống')
			.max(255, 'Title không được vượt quá 255 ký tự'),
		description: z.string().max(1000).optional(),
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
		dueDate: z.preprocess(
			(value) => (value === null || value === undefined ? value : String(value)),
			z
				.string()
				.refine(isValidDateString, {
					message: 'dueDate phải là datetime hợp lệ theo ISO 8601',
				})
				.optional()
				.nullable(),
		),
	})
	.passthrough();

const getTasksArgsSchema = z
	.object({
		limit: z.preprocess(
			(value) => (value === undefined ? undefined : Number(value)),
			z.number().int().positive().optional(),
		),
		completed: z.preprocess(
			(value) => (typeof value === 'string' ? value === 'true' : value),
			z.boolean().optional(),
		),
	})
	.passthrough();

const formatZodError = (error) =>
	error.issues?.map((issue) => issue.message).join('; ') || 'Dữ liệu không hợp lệ';

const getErrorStatus = (error) =>
	error?.status ||
	error?.response?.status ||
	error?.statusCode ||
	error?.response?.statusCode;

const withExponentialBackoff = async (operation, maxRetries = 3, baseDelay = 1000) => {
	let attempt = 0;
	while (attempt < maxRetries) {
		try {
			return await operation();
		} catch (error) {
			const status = getErrorStatus(error);
			const isRetryable = status === 429 || (status >= 500 && status < 600);
			if (!isRetryable) {
				throw error;
			}

			attempt += 1;
			if (attempt >= maxRetries) {
				throw error;
			}

			const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
			console.warn(
				`[AI] Lỗi ${status ?? 'unknown'}, thử lại lần ${attempt} sau ${Math.round(delay)}ms...`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
};

export const aiService = {
	chatStream: async (userId, apiKey, modelName, messages, res) => {
		// Validate model
		const resolvedModel = ALLOWED_MODELS.includes(modelName)
			? modelName
			: DEFAULT_MODEL;
		if (modelName && modelName !== resolvedModel) {
			console.warn(
				`[AI] Model "${modelName}" không hợp lệ → fallback: ${resolvedModel}`,
			);
		}
		console.log(
			`[AI] chatStream — userId=${userId}, model=${resolvedModel}, msgs=${messages.length}`,
		);

		if (!messages || messages.length === 0) {
			return res.status(400).json({ message: 'Không có tin nhắn.' });
		}

		// ── Chuẩn bị contents ────────────────────────────────────────────────
		let allMessages = messages.filter(
			(msg) => msg.content && msg.content.trim().length > 0,
		);

		// Gemini yêu cầu bắt đầu bằng 'user'
		while (allMessages.length > 0 && allMessages[0].role !== 'user') {
			console.warn(`[AI] Trim leading non-user: role=${allMessages[0].role}`);
			allMessages.shift();
		}

		if (allMessages.length === 0) {
			return res.status(400).json({ message: 'Không có tin nhắn hợp lệ.' });
		}

		const contents = allMessages.map((msg) => ({
			role: msg.role === 'model' ? 'model' : 'user',
			parts: [{ text: msg.content }],
		}));

		console.log(`[AI] Contents = ${contents.length} messages`);

		const ai = new GoogleGenAI({ apiKey });

		const systemInstruction = `Bạn là trợ lý AI quản lý công việc TaskNexus thông minh và thân thiện.
Thời gian hiện tại: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Múi giờ: GMT+7.
Luôn trả lời ngắn gọn, súc tích và thân thiện bằng tiếng Việt.
Chỉ gọi tool createTask khi người dùng YÊU CẦU RÕ RÀNG việc tạo task/lịch/nhắc nhở và đã đủ thông tin tối thiểu (title).
Nếu thông tin chưa đủ rõ (ví dụ thiếu title hoặc thời gian mơ hồ), hãy hỏi lại để xác nhận trước khi gọi tool.
Khi người dùng hỏi về công việc, tiến độ hay lịch sắp tới, hãy gọi tool getTasks để lấy dữ liệu thực.`;

		// ── Thiết lập SSE ────────────────────────────────────────────────────
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');

		try {
			// ── BƯỚC 1: Gọi generateContent (non-stream) để detect Function Call ──
			console.log('[AI] Step 1: generateContent (detect function call)...');
			const firstResponse = await withExponentialBackoff(() =>
				ai.models.generateContent({
					model: resolvedModel,
					contents,
					config: {
						systemInstruction,
						tools: [aiTools],
					},
				}),
			);

			console.log(
				'[AI] Step 1 OK. FinishReason:',
				firstResponse.candidates?.[0]?.finishReason,
			);

			// Lấy function calls từ response
			const functionCalls = firstResponse.functionCalls;
			const modelParts = firstResponse.candidates?.[0]?.content?.parts;
			console.log('[AI] functionCalls:', JSON.stringify(functionCalls ?? null));

			if (
				(!functionCalls || functionCalls.length === 0) &&
				(!modelParts || modelParts.length === 0) &&
				!firstResponse.text
			) {
				res.write(
					`data: ${JSON.stringify({
						error: 'Câu hỏi bị chặn bởi bộ lọc an toàn của AI.',
					})}\n\n`,
				);
				res.write('data: [DONE]\n\n');
				res.end();
				return;
			}

			if (functionCalls && functionCalls.length > 0) {
				// ── BƯỚC 2: Thực thi Function Calls ──────────────────────────────
				const functionResponseParts = [];

				for (const call of functionCalls) {
					console.log(
						`[AI] Function Call: ${call.name}`,
						JSON.stringify(call.args),
					);

					// Thông báo frontend đang thực thi
					res.write(
						`data: ${JSON.stringify({
							action: call.name,
							status: 'running',
							args: call.args,
						})}\n\n`,
					);

					let functionResponse;
					try {
						if (call.name === 'createTask') {
							const parsedArgs = createTaskArgsSchema.safeParse(
								call.args ?? {},
							);
							if (!parsedArgs.success) {
								functionResponse = {
									status: 'error',
									message: formatZodError(parsedArgs.error),
								};
							} else {
								const newTask = await taskService.createTask(
									userId,
									parsedArgs.data,
								);
								functionResponse = {
									status: 'success',
									task: {
										id: newTask.id,
										title: newTask.title,
										priority: newTask.priority,
										dueDate: newTask.dueDate,
									},
								};
								console.log(
									`[AI] createTask OK: taskId=${newTask.id}, title="${newTask.title}"`,
								);
							}
						} else if (call.name === 'getTasks') {
							const parsedArgs = getTasksArgsSchema.safeParse(
								call.args ?? {},
							);
							if (!parsedArgs.success) {
								functionResponse = {
									status: 'error',
									message: formatZodError(parsedArgs.error),
								};
							} else {
								const rawLimit = Number(parsedArgs.data.limit ?? 10);
								const safeLimit = clampNumber(
									Number.isNaN(rawLimit) ? 10 : rawLimit,
									1,
									50,
								);
								if (!Number.isNaN(rawLimit) && rawLimit !== safeLimit) {
									console.warn(
										`[AI] getTasks limit clamped: ${rawLimit} -> ${safeLimit}`,
									);
								}
								const tasks = await taskService.getTasks(userId, {
									limit: safeLimit,
									completed: parsedArgs.data.completed,
								});
								functionResponse = {
									status: 'success',
									total: tasks.pagination.totalItems,
									data: tasks.data.map((t) => ({
										id: t.id,
										title: t.title,
										priority: t.priority,
										dueDate: t.dueDate,
										completed: t.completed,
										status: t.status,
									})),
								};
								console.log(
									`[AI] getTasks OK: ${tasks.pagination.totalItems} tasks`,
								);
							}
						} else {
							functionResponse = {
								status: 'error',
								message: `Tool không hỗ trợ: ${call.name}`,
							};
						}
					} catch (fnError) {
						console.error(
							`[AI] Function "${call.name}" FAILED:`,
							fnError.message,
						);
						functionResponse = {
							status: 'error',
							message: fnError.message,
						};
					}

					const actionPayload = {
						action: call.name,
						status: functionResponse.status,
						args: call.args,
					};
					if (functionResponse.task) {
						actionPayload.task = functionResponse.task;
					}
					if (functionResponse.data) {
						actionPayload.data = functionResponse.data;
					}
					if (functionResponse.total) {
						actionPayload.total = functionResponse.total;
					}
					if (functionResponse.message) {
						actionPayload.message = functionResponse.message;
					}
					res.write(`data: ${JSON.stringify(actionPayload)}\n\n`);

					functionResponseParts.push({
						functionResponse: {
							name: call.name,
							response: functionResponse,
						},
					});
				}

				// ── BƯỚC 3: Gửi kết quả về AI và STREAM câu trả lời cuối ─────────
				const safeModelParts =
					modelParts && modelParts.length > 0 ? modelParts : [{ text: '' }];
				const contentsWithResult = [
					...contents,
					// Turn của AI (function call)
					{ role: 'model', parts: safeModelParts },
					// Turn kết quả function
					{ role: 'user', parts: functionResponseParts },
				];

				console.log('[AI] Step 3: Stream final response after function call...');
				const finalStream = await withExponentialBackoff(() =>
					ai.models.generateContentStream({
						model: resolvedModel,
						contents: contentsWithResult,
						config: {
							systemInstruction: `Bạn là trợ lý AI quản lý công việc TaskNexus. Luôn trả lời ngắn gọn, thân thiện bằng tiếng Việt.`,
						},
					}),
				);

				for await (const chunk of finalStream) {
					if (chunk.text) {
						res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
					}
				}
			} else {
				// ── Không có Function Call → STREAM text bình thường ─────────────
				const textContent = firstResponse.text;
				console.log(
					'[AI] No function call. Text preview:',
					textContent?.substring(0, 80),
				);

				// Dùng generateContentStream để stream text tự nhiên
				const textStream = await withExponentialBackoff(() =>
					ai.models.generateContentStream({
						model: resolvedModel,
						contents,
						config: {
							systemInstruction,
							tools: [aiTools],
						},
					}),
				);

				for await (const chunk of textStream) {
					if (chunk.text) {
						res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
					}
				}
			}

			console.log('[AI] Stream completed successfully');
			res.write('data: [DONE]\n\n');
			res.end();
		} catch (error) {
			console.error('[AI] Error:', error.message);
			console.error('[AI] Stack:', error.stack?.split('\n').slice(0, 4).join('\n'));

			if (res.headersSent) {
				res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
				res.end();
			} else {
				res.status(500).json({
					message: error.message || 'Lỗi AI không xác định.',
				});
			}
		}
	},
};
