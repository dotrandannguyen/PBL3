import { ClientException, UnauthorizedException } from '../../common/exceptions/index.js';
import authRepository from './auth.repository.js';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

class AuthService {
	async register(data) {
		const existUser = await authRepository.findUserByEmail(data.email);

		if (existUser) {
			throw new ClientException(StatusCodes.CONFLICT, 'Email đã tồn tại');
		}
		console.log(data.password);
		const saltRounds = 10;
		const salt = bcrypt.genSaltSync(saltRounds);
		const hashedPassword = await bcrypt.hash(data.password, salt);
		console.log(hashedPassword);

		const newUser = await authRepository.createUser({
			email: data.email,
			name: data.name,
			password: hashedPassword,
		});
		return newUser;
	}
	async login(data) {
		const user = await authRepository.findUserByEmail(data.email);

		if (!user) {
			throw new UnauthorizedException('Email và password không đúng');
		}
		if (!user.account) {
			throw new UnauthorizedException('Tài khoản của bạn không đúng');
		}

		const isMatchPassword = await bcrypt.compare(
			data.password,
			user.account.password,
		);

		if (!isMatchPassword) {
			throw new UnauthorizedException('Email và password không đúng');
		}
		const token = await this.generateToken(user.id);
		return { user, token };
	}

	async generateToken(userId) {
		return await jwt.sign(
			{
				id: userId,
			},
			process.env.JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES },
		);
	}
}

export default new AuthService();
