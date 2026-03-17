import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository.js';
import { AuthResponseDto } from './dto/responses/auth.response.js';
import {
	ClientException,
	UnauthorizedException,
	ForbiddenException,
} from '../../common/exceptions/index.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-pbl3';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'secret-pbl3-refresh';

// Tách hàm generate token để tái sử dụng cho Google Login sau này
export const generateTokens = (user) => {
	const payload = { sub: user.id, email: user.email }; // sub chứa UUID
	const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
	const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
	return { accessToken, refreshToken };
};

export const authService = {
	register: async (dto) => {
		// 1. Normalize email
		const normalizedEmail = dto.email.trim().toLowerCase();

		// 2. Kiểm tra Email tồn tại
		const existingUser = await authRepository.findUserByEmail(normalizedEmail);
		if (existingUser) {
			throw new ClientException(409, 'Email đã được sử dụng.');
		}

		// 3. Hash Password
		const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

		// 4. Tạo User
		const newUser = await authRepository.createUser({
			email: normalizedEmail,
			passwordHash,
			fullName: dto.name,
		});

		// 4. Tạo Token & Trả về (Auto login sau khi đăng ký)
		const tokens = generateTokens(newUser);
		return new AuthResponseDto(newUser, tokens);
	},

	login: async (dto) => {
		// 1. Normalize email
		const normalizedEmail = dto.email.trim().toLowerCase();

		// 2. Tìm User
		const user = await authRepository.findUserByEmail(normalizedEmail);

		// Check user và password
		// Lưu ý: Nếu user đk bằng Google, passwordHash có thể null -> Check kỹ
		if (!user || !user.passwordHash) {
			throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
		}

		// 2. Verify Password
		const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
		if (!isMatch) {
			throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
		}

		// 3. Check Active
		if (!user.isActive) {
			throw new ForbiddenException('Tài khoản đã bị khóa.');
		}

		// 4. Generate Token
		const tokens = generateTokens(user);

		// 5. Hash và lưu refresh token vào database
		const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
		await authRepository.updateRefreshTokenHash(user.id, refreshTokenHash);

		return new AuthResponseDto(user, tokens);
	},

	refreshToken: async (dto) => {
		try {
			// 1. Verify refreshToken using JWT_REFRESH_SECRET
			const decoded = jwt.verify(dto.refreshToken, JWT_REFRESH_SECRET);

			// 2. Extract userId from token payload
			const userId = decoded.sub;

			// 3. Find user in database
			const user = await authRepository.findUserById(userId);
			if (!user) {
				throw new UnauthorizedException('Người dùng không tồn tại.');
			}

			// 4. Check if user is active
			if (!user.isActive) {
				throw new ForbiddenException('Tài khoản đã bị khóa.');
			}

			// 5. Compare provided refreshToken with stored refreshTokenHash using bcrypt
			if (!user.refreshTokenHash) {
				throw new UnauthorizedException('Token không hợp lệ.');
			}

			const isTokenValid = await bcrypt.compare(
				dto.refreshToken,
				user.refreshTokenHash,
			);
			if (!isTokenValid) {
				throw new UnauthorizedException('Token không hợp lệ.');
			}

			// 6. Generate new tokens
			const newTokens = generateTokens(user);

			// 7. Hash and store the new refreshToken in database (rotate refresh token)
			const newRefreshTokenHash = await bcrypt.hash(
				newTokens.refreshToken,
				SALT_ROUNDS,
			);
			await authRepository.updateRefreshTokenHash(user.id, newRefreshTokenHash);

			// 8. Return new tokens
			return {
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken,
			};
		} catch (error) {
			if (error.name === 'TokenExpiredError') {
				throw new UnauthorizedException(
					'Refresh token đã hết hạn. Vui lòng đăng nhập lại.',
				);
			}
			throw error;
		}
	},
};
