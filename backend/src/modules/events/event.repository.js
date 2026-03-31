import prisma from '../../config/database.js';

const eventSelect = {
	id: true,
	title: true,
	date: true,
	time: true,
	color: true,
	location: true,
	description: true,
	repeat: true,
	reminder: true,
	createdAt: true,
	updatedAt: true,
};

export const eventRepository = {
	findMany: async (userId) => {
		return await prisma.event.findMany({
			where: { userId },
			orderBy: [{ date: 'asc' }, { time: 'asc' }, { createdAt: 'asc' }],
			select: eventSelect,
		});
	},

	findById: async (userId, eventId) => {
		return await prisma.event.findFirst({
			where: {
				id: eventId,
				userId,
			},
			select: eventSelect,
		});
	},

	create: async (userId, eventData) => {
		return await prisma.event.create({
			data: {
				userId,
				...eventData,
			},
			select: eventSelect,
		});
	},

	update: async (userId, eventId, updateData) => {
		return await prisma.event.updateMany({
			where: {
				id: eventId,
				userId,
			},
			data: updateData,
		});
	},
};
