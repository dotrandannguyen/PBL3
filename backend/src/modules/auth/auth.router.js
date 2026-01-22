import { Router } from 'express';
import authController from './auth.controller.js';
import { LoginSchema, RegisterSchema } from './dto/requests/auth.request.js';
import { validateRequestMiddleware } from '../../common/middleware/index.js';

const authRouter = Router();

authRouter.post(
	'/register',
	validateRequestMiddleware(RegisterSchema),
	authController.register,
);
authRouter.post('/login', validateRequestMiddleware(LoginSchema), authController.login);

export default authRouter;
