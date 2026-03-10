# Task DTOs Documentation

## 📋 Tổng quan

DTOs (Data Transfer Objects) cho Task module, bao gồm:

- **Request DTOs**: Validate input từ client
- **Response DTOs**: Format output trả về client

---

## 📥 REQUEST DTOs

### 1. **CreateTaskSchema** (`create-task.request.js`)

**Endpoint:** `POST /tasks`

**Validation:**

```javascript
{
    title: string (required, min: 1, max: 255),
    completed: boolean (optional, default: false)
}
```

**Example:**

```json
{
	"title": "Learn React Hooks",
	"completed": false
}
```

---

### 2. **UpdateTaskSchema** (`update-task.request.js`)

**Endpoint:** `PATCH /tasks/:id`

**Validation:**

```javascript
{
    title: string (optional, min: 1, max: 255),
    completed: boolean (optional)
}
```

**Rules:**

- Ít nhất phải có 1 trong 2 fields (title hoặc completed)

**Examples:**

```json
// Update title
{ "title": "Learn React Hooks & Context" }

// Toggle completed
{ "completed": true }

// Update both
{ "title": "Master React", "completed": true }
```

---

### 3. **GetTasksSchema** (`get-tasks.request.js`)

**Endpoint:** `GET /tasks`

**Query Params Validation:**

```javascript
{
    page: string → number (optional, default: 1, must > 0),
    limit: string → number (optional, default: 10, range: 1-100),
    completed: 'true' | 'false' (optional),
    search: string (optional, min: 1, max: 255)
}
```

**Examples:**

```
GET /tasks?page=1&limit=10
GET /tasks?completed=false
GET /tasks?search=react&page=1
GET /tasks?search=oauth&completed=true&limit=5
```

---

## 📤 RESPONSE DTOs

### 1. **TaskResponseDto** (`task.response.js`)

**Sử dụng cho:**

- `POST /tasks` (create)
- `GET /tasks/:id` (detail)
- `PATCH /tasks/:id` (update)

**Structure:**

```javascript
{
    id: string (UUID),
    title: string,
    completed: boolean,
    createdAt: DateTime,
    updatedAt: DateTime
}
```

**Example:**

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"title": "Learn OAuth 2.0",
	"completed": false,
	"createdAt": "2026-01-10T10:00:00.000Z",
	"updatedAt": "2026-01-10T12:30:00.000Z"
}
```

---

### 2. **TaskListResponseDto** (`tasks.response.js`)

**Sử dụng cho:**

- `GET /tasks` (list with pagination)

**Structure:**

```javascript
{
    data: TaskResponseDto[],
    pagination: {
        page: number,
        limit: number,
        totalItems: number,
        totalPages: number
    }
}
```

**Example:**

```json
{
	"data": [
		{
			"id": "uuid-1",
			"title": "Learn React",
			"completed": false,
			"createdAt": "2026-01-10T10:00:00Z",
			"updatedAt": "2026-01-10T10:00:00Z"
		},
		{
			"id": "uuid-2",
			"title": "Build API",
			"completed": true,
			"createdAt": "2026-01-09T15:00:00Z",
			"updatedAt": "2026-01-10T09:00:00Z"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 10,
		"totalItems": 25,
		"totalPages": 3
	}
}
```

---

### 3. **DeleteTaskResponseDto** (`delete-task.response.js`)

**Sử dụng cho:**

- `DELETE /tasks/:id`

**Structure:**

```javascript
{
	message: string;
}
```

**Example:**

```json
{
	"message": "Task deleted successfully"
}
```

---

## 🎯 Sử dụng trong Code

### Import DTOs:

```javascript
// Import từ index
import {
	createTaskSchema,
	updateTaskSchema,
	getTasksSchema,
	TaskResponseDto,
	TaskListResponseDto,
	formatTaskResponse,
	formatTaskListResponse,
} from './dto/index.js';
```

### Trong Router (Validation):

```javascript
taskRouter.get('/', validateRequestMiddleware(getTasksSchema), taskController.getAll);

taskRouter.post('/', validateRequestMiddleware(createTaskSchema), taskController.create);
```

### Trong Service (Response Formatting):

```javascript
// Single task
const task = await taskRepository.create(userId, data);
return formatTaskResponse(task);

// Task list
const tasks = await taskRepository.findMany(userId, filters);
return formatTaskListResponse(tasks, paginationMeta);
```

---

## ✅ Checklist

- [x] CreateTaskSchema - validate POST body
- [x] UpdateTaskSchema - validate PATCH body
- [x] GetTasksSchema - validate query params
- [x] TaskResponseDto - format single task
- [x] TaskListResponseDto - format list + pagination
- [x] DeleteTaskResponseDto - format delete message
- [x] Central export (index.js)
- [x] Integration với Router
- [x] Documentation

---

## 📊 Mapping: Endpoint → DTOs

| Endpoint     | Method | Request DTO      | Response DTO          |
| ------------ | ------ | ---------------- | --------------------- |
| `/tasks`     | GET    | GetTasksSchema   | TaskListResponseDto   |
| `/tasks/:id` | GET    | -                | TaskResponseDto       |
| `/tasks`     | POST   | CreateTaskSchema | TaskResponseDto       |
| `/tasks/:id` | PATCH  | UpdateTaskSchema | TaskResponseDto       |
| `/tasks/:id` | DELETE | -                | DeleteTaskResponseDto |

---

## 🚀 Benefits

1. **Type Safety**: Validation đầu vào với Zod schema
2. **Consistent Format**: Response đồng nhất trên tất cả endpoints
3. **Documentation**: Self-documenting code
4. **Maintainability**: Dễ refactor và mở rộng
5. **Security**: Prevent invalid data từ client
