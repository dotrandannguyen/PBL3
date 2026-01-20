import z from 'zod';
// import {validateRequestMiddleware} from "../../../../middleware/validationRequest.middleware.js";

export class RegisterRequestDto {
	constructor(data) {
		this.email = data.email;
		this.password = data.password;
		this.name = data.name;
	}
}

export const registerRequestValidationSchema = {
	body: z.object({
		email: z.email(),
		password: z.string().min(6).max(20),
		name: z.string().min(4).max(30),
	}),
};
