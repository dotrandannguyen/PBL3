import { taskRepository } from "./src/modules/tasks/task.repository.js";
import { scheduleTaskV2 } from "./src/modules/notifications/notification.schedule.js";

const userId = "bd2be7d6-6c3e-4e01-ac85-0352f5e01c02";
const tasks = await taskRepository.findMany(userId, { take: 1, skip: 0 });
const task = tasks[0];
console.log("Task sample:", { id: task?.id, userId: task?.userId, title: task?.title, type: task?.type });
await scheduleTaskV2(task);
console.log("scheduleTaskV2 executed");
