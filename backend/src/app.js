import express from 'express';
import cors from 'cors';
import authRouter from './modules/auth/auth.router.js';
import userRouter from './modules/user/users.router.js';
import { errorHandlerMiddleware } from './common/middleware/errorHandler.Middleware.js';
import taskRouter from './modules/tasks/task.router.js';
import integrationRouter from './modules/integrations/integration.router.js';
import eventRouter from './modules/events/event.router.js';
import notificationRouter from './modules/notifications/notification.router.js';
import aiRouter from './modules/ai/ai.router.js';
import cookieParser from 'cookie-parser';
const app = express();

// CORS Configuration - match with Socket.io CORS
app.use(
	cors({
		origin: process.env.FRONTEND_URL || 'http://localhost:5173',
		methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
		credentials: true,
	}),
);

app.use(cookieParser());

app.use(
	express.json({
		verify: (req, res, buf) => {
			req.rawBody = buf;
		},
	}),
);
// app.use(express.urlencoded({ extended: true }));
app.use('/v1/api/auth', authRouter);
app.use('/v1/api/user', userRouter);
app.use('/v1/api/tasks', taskRouter);
app.use('/v1/api/integrations', integrationRouter);
app.use('/v1/api/events', eventRouter);
app.use('/v1/api/calendar/events', eventRouter);
app.use('/v1/api/notifications', notificationRouter);
app.use('/v1/api/ai', aiRouter);

app.get('/health', (req, res) => {
	res.json({ status: 'OK' });
});

app.use(errorHandlerMiddleware);
export default app;
