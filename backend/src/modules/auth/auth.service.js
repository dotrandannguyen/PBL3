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

// Tách hàm generate token để tái sử dụng cho Google Login sau này
export const generateTokens = (user) => {
	const payload = { sub: user.id, email: user.email }; // sub chứa UUID
	const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
	const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
	return { accessToken, refreshToken };
};

export const authService = {
	register: async (dto) => {
		// 1. Kiểm tra Email tồn tại
		const existingUser = await authRepository.findUserByEmail(dto.email);
		if (existingUser) {
			throw new ClientException(409, 'Email đã được sử dụng.');
		}

		// 2. Hash Password
		const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

		// 3. Tạo User
		const newUser = await authRepository.createUser({
			email: dto.email,
			passwordHash,
			fullName: dto.name,
		});

		// 4. Tạo Token & Trả về (Auto login sau khi đăng ký)
		const tokens = generateTokens(newUser);
		return new AuthResponseDto(newUser, tokens);
	},

	login: async (dto) => {
		// 1. Tìm User
		const user = await authRepository.findUserByEmail(dto.email);

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
		return new AuthResponseDto(user, tokens);
	},
};
