/**
 * FloatingChat Component - Khung chat nổi AI Assistant
 *
 * File: frontend/src/features/ai-chat/components/FloatingChat.jsx
 *
 * Tính năng:
 * - Floating button ở góc phải màn hình
 * - BYOK: User tự nhập Gemini API Key (lưu LocalStorage, không lên DB)
 * - Real-time streaming (SSE) giống ChatGPT
 * - Function Calling: AI có thể tạo task, lấy danh sách tasks trực tiếp
 * - Hiệu ứng đánh máy (typing effect) mượt mà
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Settings, Bot, Zap, ChevronDown } from 'lucide-react';
import { streamAiChat } from '../api/ai.api';
import { toast } from 'sonner';

// Hằng số
const INITIAL_MESSAGE = {
	role: 'model',
	content: 'Chào bạn! 👋 Tôi là AI Assistant của TaskNexus.\n\nTôi có thể giúp bạn:\n• 📝 Tạo task tự động từ câu nói\n• 📋 Xem danh sách công việc\n• 📊 Báo cáo tiến độ\n\nHãy thử: *"Tạo task họp nhóm ngày mai lúc 9h"*',
};

const ACTION_LABELS = {
	createTask: '⚡ Đang tạo task...',
	getTasks: '🔍 Đang lấy dữ liệu...',
};

// Model names hợp lệ (Gemini 1.5 đã bị Google retire từ 24/09/2025)
const VALID_MODELS = [
	'gemini-2.5-flash',      // ✅ Mới nhất
	'gemini-2.0-flash',      // ✅ Stable, nhanh
	'gemini-2.0-flash-lite', // ✅ Siêu nhanh
];
const DEFAULT_MODEL = 'gemini-2.0-flash';

export function FloatingChat() {
	const [isOpen, setIsOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isMinimized, setIsMinimized] = useState(false);

	// BYOK Config - lưu LocalStorage
	const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
	const [model, setModel] = useState(() => {
		const stored = localStorage.getItem('gemini_model');
		// Reset về default nếu model cũ không còn hợp lệ (VD: preview model đã bị remove)
		if (stored && VALID_MODELS.includes(stored)) return stored;
		if (stored) localStorage.removeItem('gemini_model'); // xóa value cũ không hợp lệ
		return DEFAULT_MODEL;
	});
	const [tempApiKey, setTempApiKey] = useState(apiKey);
	const [tempModel, setTempModel] = useState(model);

	// Chat state
	const [messages, setMessages] = useState([INITIAL_MESSAGE]);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [currentAction, setCurrentAction] = useState(null); // Function call đang chạy

	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

	// Auto-scroll xuống cuối khi có tin mới
	useEffect(() => {
		if (isOpen && !isMinimized) {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages, isOpen, isMinimized]);

	// Focus input khi mở chat
	useEffect(() => {
		if (isOpen && !isSettingsOpen && !isMinimized) {
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [isOpen, isSettingsOpen, isMinimized]);

	const handleToggle = () => {
		setIsOpen((prev) => !prev);
		setIsMinimized(false);
	};

	const handleSaveSettings = () => {
		if (!tempApiKey.trim()) {
			toast.error('Vui lòng nhập API Key hợp lệ.');
			return;
		}
		localStorage.setItem('gemini_api_key', tempApiKey.trim());
		localStorage.setItem('gemini_model', tempModel);
		setApiKey(tempApiKey.trim());
		setModel(tempModel);
		setIsSettingsOpen(false);
		toast.success('✅ Đã lưu cấu hình AI thành công!');
	};

	const handleOpenSettings = () => {
		setTempApiKey(apiKey);
		setTempModel(model);
		setIsSettingsOpen(true);
	};

	const handleSend = useCallback(async () => {
		const trimmedInput = input.trim();
		if (!trimmedInput || isLoading) return;

		if (!apiKey) {
			toast.error('Chưa có API Key. Vui lòng cài đặt trước khi chat.');
			setIsSettingsOpen(true);
			setTempApiKey('');
			setTempModel(model);
			return;
		}

		const userMsg = { role: 'user', content: trimmedInput };

		// Giữ tối đa 10 tin gần nhất + tin mới (tiết kiệm token)
		const chatHistory = [...messages.slice(-10), userMsg];

		// Thêm tin user + placeholder tin AI vào UI
		setMessages((prev) => [
			...prev,
			userMsg,
			{ role: 'model', content: '', isStreaming: true },
		]);
		setInput('');
		setIsLoading(true);
		setCurrentAction(null);

		streamAiChat(
			chatHistory,
			apiKey,
			model,
			// onChunk: nối từng chữ vào tin cuối
			(chunkText) => {
				setCurrentAction(null);
				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					updated[updated.length - 1] = {
						...last,
						content: last.content + chunkText,
					};
					return updated;
				});
			},
			// onAction: Hiện trạng thái function call
			(actionName) => {
				setCurrentAction(ACTION_LABELS[actionName] || '⚙️ Đang xử lý...');
			},
			// onDone
			() => {
				setIsLoading(false);
				setCurrentAction(null);
				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					updated[updated.length - 1] = { ...last, isStreaming: false };
					return updated;
				});
			},
			// onError
			(errorMsg) => {
				setIsLoading(false);
				setCurrentAction(null);
				// Xóa placeholder rỗng nếu có lỗi
				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					if (last.isStreaming && !last.content) {
						return updated.slice(0, -1);
					}
					updated[updated.length - 1] = { ...last, isStreaming: false };
					return updated;
				});
				toast.error(`AI Error: ${errorMsg}`);
			},
		);
	}, [input, isLoading, apiKey, model, messages]);

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleClearChat = () => {
		setMessages([INITIAL_MESSAGE]);
		toast.success('Đã xóa lịch sử chat.');
	};

	// Format message content (hỗ trợ basic markdown-like formatting)
	const formatContent = (content) => {
		if (!content) return '';
		return content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:0.85em">$1</code>')
			.replace(/\n/g, '<br/>');
	};

	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
			{/* Chat Window */}
			{isOpen && (
				<div
					className="flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-border-subtle"
					style={{
						width: '360px',
						height: isMinimized ? 'auto' : '540px',
						background: 'rgba(28, 28, 28, 0.97)',
						backdropFilter: 'blur(20px)',
						boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
						animation: 'chatSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
					}}
				>
					{/* ── Header ── */}
					<div
						className="flex items-center justify-between px-4 py-3 flex-shrink-0 cursor-pointer select-none"
						style={{
							background:
								'linear-gradient(135deg, #1a4a8a 0%, #2383e2 50%, #1a6fb0 100%)',
							borderBottom: '1px solid rgba(255,255,255,0.1)',
						}}
						onClick={() => setIsMinimized((p) => !p)}
					>
						<div className="flex items-center gap-2.5">
							<div
								className="w-8 h-8 rounded-lg flex items-center justify-center"
								style={{ background: 'rgba(255,255,255,0.15)' }}
							>
								<Bot size={16} className="text-white" />
							</div>
							<div>
								<div className="font-semibold text-white text-sm leading-tight">
									AI Assistant
								</div>
								<div className="flex items-center gap-1.5">
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
									<span className="text-[10px] text-blue-100 opacity-80">
										{model.replace('gemini-', 'Gemini ').replace('-', ' ')}
									</span>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
							<button
								onClick={handleOpenSettings}
								className="p-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
								style={{ background: 'rgba(255,255,255,0.1)' }}
								title="Cài đặt"
							>
								<Settings size={15} />
							</button>
							<button
								onClick={() => setIsMinimized((p) => !p)}
								className="p-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
								style={{ background: 'rgba(255,255,255,0.1)' }}
								title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
							>
								<ChevronDown
									size={15}
									style={{
										transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
										transition: 'transform 0.2s',
									}}
								/>
							</button>
							<button
								onClick={() => setIsOpen(false)}
								className="p-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
								style={{ background: 'rgba(255,255,255,0.1)' }}
								title="Đóng"
							>
								<X size={15} />
							</button>
						</div>
					</div>

					{/* ── Body (ẩn khi minimized) ── */}
					{!isMinimized && (
						<>
							{/* Settings Panel */}
							{isSettingsOpen ? (
								<div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
									<div className="flex items-center gap-2 mb-1">
										<Zap size={16} className="text-accent-primary" />
										<h3 className="font-semibold text-text-primary text-sm">
											Cấu hình BYOK (Bring Your Own Key)
										</h3>
									</div>

									<div className="flex flex-col gap-1.5">
										<label className="text-xs text-text-secondary font-medium">
											Google Gemini API Key
										</label>
										<input
											type="password"
											value={tempApiKey}
											onChange={(e) => setTempApiKey(e.target.value)}
											placeholder="AIzaSy..."
											className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all text-text-primary"
											style={{
												background: 'rgba(255,255,255,0.05)',
												border: '1px solid rgba(255,255,255,0.1)',
											}}
											onFocus={(e) => {
												e.target.style.borderColor = '#2383e2';
											}}
											onBlur={(e) => {
												e.target.style.borderColor = 'rgba(255,255,255,0.1)';
											}}
										/>
										<p className="text-[11px] text-text-tertiary">
											Lấy key tại{' '}
											<a
												href="https://aistudio.google.com/apikey"
												target="_blank"
												rel="noreferrer"
												className="text-accent-primary hover:underline"
											>
												aistudio.google.com
											</a>
										</p>
									</div>

									<div className="flex flex-col gap-1.5">
										<label className="text-xs text-text-secondary font-medium">
											Chọn Model
										</label>
										<select
											value={tempModel}
											onChange={(e) => setTempModel(e.target.value)}
											className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-text-primary"
											style={{
												background: 'rgba(255,255,255,0.05)',
												border: '1px solid rgba(255,255,255,0.1)',
											}}
										>
											<option value="gemini-2.5-flash">
												🧠 Gemini 2.5 Flash — Mới nhất &amp; Thông minh
											</option>
											<option value="gemini-2.0-flash">
												⚡ Gemini 2.0 Flash — Nhanh &amp; Rẻ
											</option>
											<option value="gemini-2.0-flash-lite">
												🪶 Gemini 2.0 Flash Lite — Siêu nhanh
											</option>
										</select>
									</div>

									<div
										className="p-3 rounded-lg text-[11px] text-text-secondary"
										style={{ background: 'rgba(35,131,226,0.08)', border: '1px solid rgba(35,131,226,0.2)' }}
									>
										🔒 API Key được lưu <strong>cục bộ</strong> trên trình duyệt
										của bạn (LocalStorage). Chúng tôi <strong>không bao giờ</strong>{' '}
										gửi hay lưu key lên server.
									</div>

									<div className="flex gap-2 mt-auto">
										<button
											onClick={() => setIsSettingsOpen(false)}
											className="flex-1 py-2 rounded-lg text-sm text-text-secondary transition-colors"
											style={{ border: '1px solid rgba(255,255,255,0.1)' }}
										>
											Huỷ
										</button>
										<button
											onClick={handleSaveSettings}
											className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
											style={{ background: 'linear-gradient(135deg, #2383e2, #1a6fb0)' }}
										>
											Lưu cấu hình
										</button>
									</div>
								</div>
							) : (
								<>
									{/* ── Messages ── */}
									<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
										{messages.map((msg, idx) => (
											<div
												key={idx}
												className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
											>
												{msg.role === 'model' && (
													<div
														className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
														style={{ background: 'linear-gradient(135deg, #2383e2, #1a6fb0)' }}
													>
														<Bot size={12} className="text-white" />
													</div>
												)}

												<div
													className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
													style={
														msg.role === 'user'
															? {
																background: 'linear-gradient(135deg, #2383e2, #1a6fb0)',
																color: 'white',
																borderBottomRightRadius: '4px',
															}
															: {
																background: 'rgba(255,255,255,0.06)',
																border: '1px solid rgba(255,255,255,0.08)',
																color: '#d4d4d4',
																borderBottomLeftRadius: '4px',
															}
													}
												>
													{msg.content ? (
														<span
															dangerouslySetInnerHTML={{
																__html: formatContent(msg.content),
															}}
														/>
													) : msg.isStreaming ? (
														<span className="flex gap-1 items-center h-4">
															<span
																className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
																style={{ animationDelay: '0ms' }}
															/>
															<span
																className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
																style={{ animationDelay: '150ms' }}
															/>
															<span
																className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
																style={{ animationDelay: '300ms' }}
															/>
														</span>
													) : null}
												</div>
											</div>
										))}

										{/* Function Call status */}
										{currentAction && (
											<div className="flex justify-start gap-2">
												<div
													className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
													style={{ background: 'linear-gradient(135deg, #2383e2, #1a6fb0)' }}
												>
													<Bot size={12} className="text-white" />
												</div>
												<div
													className="px-3.5 py-2.5 rounded-2xl text-xs text-text-secondary animate-pulse"
													style={{
														background: 'rgba(35,131,226,0.1)',
														border: '1px solid rgba(35,131,226,0.2)',
														borderBottomLeftRadius: '4px',
													}}
												>
													{currentAction}
												</div>
											</div>
										)}

										<div ref={messagesEndRef} />
									</div>

									{/* ── Input Bar ── */}
									<div
										className="p-3 flex-shrink-0"
										style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
									>
										{/* No API key warning */}
										{!apiKey && (
											<div
												className="mb-2 px-3 py-2 rounded-lg text-xs text-center cursor-pointer"
												style={{
													background: 'rgba(251,146,60,0.1)',
													border: '1px solid rgba(251,146,60,0.25)',
													color: '#fb923c',
												}}
												onClick={handleOpenSettings}
											>
												⚙️ Chưa có API Key — Nhấn để cài đặt
											</div>
										)}

										<div className="flex gap-2 items-end">
											<textarea
												ref={inputRef}
												value={input}
												onChange={(e) => {
													setInput(e.target.value);
													e.target.style.height = 'auto';
													e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
												}}
												onKeyDown={handleKeyDown}
												placeholder='Thử: "Tạo task họp nhóm ngày mai 9h"'
												rows={1}
												disabled={isLoading}
												className="flex-1 resize-none text-sm text-text-primary outline-none transition-all rounded-xl px-3.5 py-2.5 leading-relaxed"
												style={{
													background: 'rgba(255,255,255,0.06)',
													border: '1px solid rgba(255,255,255,0.1)',
													maxHeight: '100px',
													overflow: 'auto',
												}}
												onFocus={(e) => {
													e.target.style.borderColor = 'rgba(35,131,226,0.6)';
												}}
												onBlur={(e) => {
													e.target.style.borderColor = 'rgba(255,255,255,0.1)';
												}}
											/>
											<button
												onClick={handleSend}
												disabled={isLoading || !input.trim()}
												className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-white transition-all"
												style={{
													background:
														isLoading || !input.trim()
															? 'rgba(255,255,255,0.08)'
															: 'linear-gradient(135deg, #2383e2, #1a6fb0)',
													opacity: isLoading || !input.trim() ? 0.5 : 1,
													cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
												}}
											>
												<Send size={15} />
											</button>
										</div>

										{/* Clear chat */}
										{messages.length > 1 && (
											<button
												onClick={handleClearChat}
												className="mt-2 w-full text-[10px] text-text-tertiary hover:text-text-secondary transition-colors text-center"
											>
												Xóa lịch sử chat
											</button>
										)}
									</div>
								</>
							)}
						</>
					)}
				</div>
			)}

			{/* ── Float Button ── */}
			<button
				id="ai-chat-toggle-btn"
				onClick={handleToggle}
				className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 select-none"
				style={{
					background: isOpen
						? 'linear-gradient(135deg, #374151, #1f2937)'
						: 'linear-gradient(135deg, #2383e2, #1a4a8a)',
					boxShadow: isOpen
						? '0 8px 24px rgba(0,0,0,0.4)'
						: '0 8px 24px rgba(35,131,226,0.45), 0 0 0 1px rgba(35,131,226,0.2)',
					transform: isOpen ? 'scale(0.95)' : 'scale(1)',
				}}
				title={isOpen ? 'Đóng AI Chat' : 'Mở AI Chat'}
			>
				{isOpen ? <X size={22} /> : <MessageSquare size={22} />}
			</button>

			{/* Pulse ring khi chưa mở */}
			{!isOpen && !apiKey && (
				<div
					className="absolute bottom-0 right-0 w-14 h-14 rounded-full pointer-events-none"
					style={{
						background: 'rgba(35,131,226,0.3)',
						animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
					}}
				/>
			)}

			<style>{`
				@keyframes chatSlideUp {
					from { opacity: 0; transform: translateY(16px) scale(0.96); }
					to   { opacity: 1; transform: translateY(0) scale(1); }
				}
				@keyframes ping {
					75%, 100% { transform: scale(2); opacity: 0; }
				}
			`}</style>
		</div>
	);
}
