// Task Service

import { taskRepository } from './task.repository.js';

export const taskService = {
	createTask: async (userId, taskData) => {
		return await taskRepository.create(userId, taskData);
	},

	getTaks: async () => {},

	getDetailTask: async () => {},

	updateTask: async () => {},

	deleteTask: async () => {},
};
