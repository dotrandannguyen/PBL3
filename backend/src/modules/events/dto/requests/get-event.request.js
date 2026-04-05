import { z } from 'zod';

export const getEventSchema = {
	params: z.object({
		id: z.string().uuid('Invalid event id'),
	}),
};
