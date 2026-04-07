/**
 * Schedule Task Request DTO
 *
 * PATCH /tasks/:id/schedule
 * Body: { startAt: string (ISO datetime) | null }
 */
import { z } from 'zod';

export const scheduleTaskSchema = {
	body: z
		.object({
			startAt: z.string().datetime().nullable(),
		})
		.strict(),
};
