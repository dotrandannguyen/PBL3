/**
 * AI Chat API - Gọi Backend với SSE Streaming
 *
 * File: frontend/src/features/ai-chat/api/ai.api.js
 *
 * Dùng fetch API gốc thay vì axios vì axios không hỗ trợ stream tốt.
 * Đọc SSE (Server-Sent Events) từng chunk và callback lên component.
 *
 * QUAN TRỌNG: App dùng In-Memory Token (không lưu vào localStorage).
 * Token được quản lý bởi apiClient.js qua biến inMemoryAccessToken.
 * Ta export getter để ai.api.js có thể đọc mà không cần localStorage.
 */
import { getInMemoryToken } from "../../../shared/api/apiClient";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * streamAiChat - Gửi tin nhắn và nhận phản hồi dạng stream từ AI
 *
 * @param {Array}    messages  - Lịch sử chat [{ role: 'user'|'model', content: string }]
 * @param {string}   apiKey   - Gemini API Key của user (BYOK)
 * @param {string}   modelName - Tên model Gemini
 * @param {Function} onChunk  - Callback khi nhận được 1 đoạn text
 * @param {Function} onAction - Callback khi AI thực thi Function Call (optional)
 * @param {Function} onDone   - Callback khi stream kết thúc
 * @param {Function} onError  - Callback khi có lỗi
 */
export const streamAiChat = async (
  messages,
  apiKey,
  modelName,
  onChunk,
  onAction,
  onDone,
  onError,
  options = {},
) => {
  const { signal } = options;
  // Lấy token từ In-Memory store (không phải localStorage)
  const accessToken = getInMemoryToken();
  console.log("[AI API] Sending request:", {
    url: `${API_BASE_URL}/v1/api/ai/chat`,
    hasToken: !!accessToken,
    tokenPrefix: accessToken ? accessToken.substring(0, 20) + "..." : "NULL",
    model: modelName,
    hasApiKey: !!apiKey,
    messages: messages.length,
  });

  try {
    const response = await fetch(`${API_BASE_URL}/v1/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-gemini-key": apiKey, // BYOK: Key của user
        "x-gemini-model": modelName || "gemini-2.0-flash",
      },
      body: JSON.stringify({ messages }),
      signal,
    });

    console.log(
      "[AI API] Response status:",
      response.status,
      response.statusText,
    );

    // Xử lý lỗi HTTP (400, 401, 429, v.v.)
    if (!response.ok) {
      let errMessage = `Lỗi kết nối AI (HTTP ${response.status})`;
      try {
        const errBody = await response.text();
        console.error("[AI API] Error body:", errBody);
        const errJson = JSON.parse(errBody);
        errMessage = errJson.message || errMessage;
      } catch {
        // body không phải JSON
      }
      throw new Error(errMessage);
    }

    if (!response.body) {
      throw new Error("Luồng dữ liệu từ server bị rỗng hoặc bị chặn.");
    }

    // Đọc SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Tách các events (mỗi event cách nhau bởi \n\n)
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || ""; // Giữ lại phần chưa hoàn chỉnh

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;

        const dataStr = line.slice(6);

        if (dataStr === "[DONE]") {
          onDone?.();
          return;
        }

        try {
          const data = JSON.parse(dataStr);
          if (data.error) {
            onError?.(data.error);
            return;
          } else if (data.action) {
            // AI đang thực thi Function Call
            onAction?.(data.action, data.args, {
              status: data.status,
              task: data.task,
              message: data.message,
              data: data.data,
              total: data.total,
            });
          } else if (data.text) {
            // Text chunk bình thường
            onChunk?.(data.text);
          }
        } catch {
          // Bỏ qua JSON parse errors (chunk dở dang)
        }
      }
    }

    onDone?.();
  } catch (error) {
    if (error?.name === "AbortError") return;
    onError?.(error.message || "Lỗi không xác định");
  }
};
