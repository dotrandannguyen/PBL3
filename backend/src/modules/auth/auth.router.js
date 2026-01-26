import express from 'express';
import { authController } from './auth.controller.js';

import { registerSchema, loginSchema } from './dto/requests/auth.request.js';
import { validateRequestMiddleware } from '../../common/middleware/index.js';

const router = express.Router();

router.post(
	'/register',
	validateRequestMiddleware(registerSchema),
	authController.register,
);
router.post('/login', validateRequestMiddleware(loginSchema), authController.login);

export default router;
