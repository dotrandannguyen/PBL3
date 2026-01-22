import express from 'express';
import cors from 'cors';
import authRouter from './modules/auth/auth.router.js';
import userRouter from './modules/user/users.router.js';
import { errorHandlerMiddleware } from './common/middleware/errorHandler.Middleware.js';
const app = express();

app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use('/v1/api/auth', authRouter);
app.use('/v1/api/user', userRouter);

app.get('/health', (req, res) => {
	res.json({ status: 'OK' });
});

app.use(errorHandlerMiddleware);
export default app;
