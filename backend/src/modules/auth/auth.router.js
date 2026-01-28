import express from 'express';
import { authController } from './auth.controller.js';
import { validateRequestMiddleware } from '../../common/middleware/index.js';
import { registerSchema } from './dto/requests/register.request.js';
import { loginSchema } from './dto/requests/login.request.js';
import { googleCallbackSchema } from './dto/requests/google-login.request.js';

const authRouter = express.Router();

authRouter.post(
	'/register',
	validateRequestMiddleware(registerSchema),
	authController.register,
);

authRouter.post('/login', validateRequestMiddleware(loginSchema), authController.login);

authRouter.get('/google/url', authController.getGoogleUrl);

authRouter.get(
	'/google/callback',

	authController.googleCallback,
);

authRouter.get('/github/url', authController.getGithubUrl);
authRouter.get('/github/callback', authController.githubCallback);

export default authRouter;
