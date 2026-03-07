// Task Controller

export const taskController = {
	create: async (req, res, next) => {
		try {
			const result = await taskService.createTask(req.user.id, req.body);
			return new HttpResponse(res).created(result);
		} catch (error) {
			next(error);
		}
	},

	getAll: async (req, res, next) => {},
	getOne: async (req, res, next) => {},
	update: async (req, res, next) => {},
	delete: async (req, res, next) => {},
};
