# Potential issues for AI floating chat (FE + BE + business)

## Frontend

- XSS risk: FloatingChat renders AI/user content via dangerouslySetInnerHTML without HTML escaping or sanitization. Any HTML returned by the model (or pasted by user) will be executed in the page.
- Stream lifecycle leak: streamAiChat has no AbortController; closing/minimizing the chat or unmounting the component does not cancel the running SSE request.
- Missing stream body guard: streamAiChat assumes response.body exists and calls getReader() directly. If the browser returns a Response without a body (or a proxy strips it), this will throw and skip onError handling.

## Backend

- Unchecked candidates: ai.service.js accesses firstResponse.candidates[0].content.parts without guarding against empty candidates (e.g., safety block or malformed response). This can throw and turn into a 500.
- Unbounded getTasks limit: call.args.limit is used directly (tool text says max 50) but is not clamped; large values may cause heavy queries.
- Function args not validated: createTask/getTasks trust call.args shape. If the model sends missing/invalid fields (date format, priority), taskService may throw; user receives generic error.

## Business / behavior

- Auto-create tasks: the system instruction forces auto-create on any creation intent. This can create unintended tasks if user is ambiguous. Consider a confirmation step or a stricter intent check.
