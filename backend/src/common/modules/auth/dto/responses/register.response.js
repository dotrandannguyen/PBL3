import { UserStatusEnum } from '@prisma/client';
import z from 'zod';



export class RegisterResponseDto {
	constructor(account) {
		this.id = account.id;
		this.userId = account.userId;

		this.email = account.user?.email ?? '';
		this.name = account.user?.name ?? '';
		this.avatar = account.user?.avatar ?? '';
		this.verify = account.user?.verify ?? false;
		this.status = account.user?.status ?? UserStatusEnum.active;
	}
}

export const RegisterResponseDtoSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),

	email: z.string().email(),
	name: z.string(),
	avatar: z.string().url().optional().or(z.literal('')),

	verify: z.boolean(),
	// status: z.nativeEnum(UserStatusEnum),
});
