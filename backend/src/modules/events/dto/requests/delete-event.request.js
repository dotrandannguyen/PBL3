import { z } from 'zod';

export const deleteEventSchema = {
	params: z.object({
		id: z.string().uuid('Invalid event id'),
	}),
};
