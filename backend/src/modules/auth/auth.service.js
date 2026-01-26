import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository.js';
import {
	ClientException,
	ForbiddenException,
	UnauthorizedException,
} from '../../common/exceptions/index.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-pbl3';
const ACCESS_TOKEN_EXPIRES = '1d';
const REFRESH_TOKEN_EXPIRES = '7d';

export const authService = {
	register: async (dto) => {
		// 1. Check email
		const existUser = await authRepository.findUserByEmail(dto.email);
		if (existUser) {
			throw new ClientException(409, 'Email đã tồn tại.');
		}

		// 2. Hash password
		const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

		// 3. Create User
		const newUser = await authRepository.createUser({
			email: dto.email,
			passwordHash,
			fullName: dto.name,
			avatarUrl: null,
		});

		return {
			id: newUser.id,
			email: newUser.email,
			fullName: newUser.fullName,
		};
	},

	login: async (dto) => {
		const user = await authRepository.findUserByEmail(dto.email);

		// Check user tồn tại & có password (tránh trường hợp user chỉ đăng ký bằng Google mà ko có pass)
		if (!user || !user.passwordHash) {
			throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
		}

		const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
		if (!isMatch) {
			throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
		}

		if (!user.isActive) {
			throw new ForbiddenException('Tài khoản đã bị khóa.');
		}

		// Generate Tokens
		const payload = { sub: user.id, email: user.email };
		const accessToken = jwt.sign(payload, JWT_SECRET, {
			expiresIn: ACCESS_TOKEN_EXPIRES,
		});
		const refreshToken = jwt.sign(payload, JWT_SECRET, {
			expiresIn: REFRESH_TOKEN_EXPIRES,
		});

		return {
			user: {
				id: user.id,
				email: user.email,
				fullName: user.fullName,
				avatarUrl: user.avatarUrl,
			},
			accessToken,
			refreshToken,
		};
	},
};
