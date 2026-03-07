// Task Repository
export const taskRepository = {
	create: async (userId, taskData) => {
		return await prisma.task.create({
			data: {
				...taskData,
				userId: userId,
			},
		});
	},

	findMany: async () => {

	},

	findById: async () => {

	},

	update: async () => {

	}, 
	

	// xóa tạm	thời
	softDelete: async () => {

	},
};
