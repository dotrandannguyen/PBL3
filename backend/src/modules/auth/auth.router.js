import express from 'express';
import { authController } from './auth.controller.js';
import {
	validateRequestMiddleware,
	loginLimiter,
	refreshLimiter,
	authGuard,
} from '../../common/middleware/index.js';
import { registerSchema } from './dto/requests/register.request.js';
import { loginSchema } from './dto/requests/login.request.js';
import { googleCallbackSchema } from './dto/requests/google-login.request.js';
import { refreshSchema } from './dto/requests/refresh.request.js';

const authRouter = express.Router();

// register và login
authRouter.post(
	'/register',
	validateRequestMiddleware(registerSchema),
	authController.register,
);

authRouter.post(
	'/login',
	loginLimiter,
	validateRequestMiddleware(loginSchema),
	authController.login,
);
authRouter.post('/logout', authGuard, authController.logout);
authRouter.post(
	'/refresh',
	// refreshLimiter,
	validateRequestMiddleware(refreshSchema),
	authController.refresh,
);

// Google login
authRouter.get('/google/url', authController.getGoogleUrl);

authRouter.get(
	'/google/callback',

	authController.googleCallback,
);

// Github login
authRouter.get('/github/url', authController.getGithubUrl);
authRouter.get('/github/callback', authController.githubCallback);

// Slack login
authRouter.get('/slack/url', authController.getSlackUrl);
authRouter.get('/slack/callback', authController.slackCallback);

export default authRouter;
