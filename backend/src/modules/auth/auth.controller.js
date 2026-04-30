import { authService } from './auth.service.js';
import { HttpResponse } from '../../common/dtos/httpResponse.dto.js';
import { googleService } from './google.service.js';
import { ClientException } from '../../common/exceptions/index.js';
import { githubService } from './github.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const getRefreshCookieOptions = () => {
	const isProduction = process.env.NODE_ENV === 'production';
	return {
		httpOnly: true, // JS không đọc được
		secure: isProduction, // Dev (http) -> false, Prod (https) -> true
		sameSite: isProduction ? 'none' : 'lax', // Localhost cùng site, không cần none
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
	};
};

const setRefreshCookie = (res, refreshToken) => {
	res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
};

export const authController = {
	register: async (req, res, next) => {
		try {
			const result = await authService.register(req.body);
			setRefreshCookie(res, result.refreshToken);
			// Xóa refreshToken khỏi response gửi về client
			const { refreshToken, ...responseData } = result;
			return new HttpResponse(res).created(responseData);
		} catch (error) {
			next(error);
		}
	},

	login: async (req, res, next) => {
		try {
			const result = await authService.login(req.body);
			setRefreshCookie(res, result.refreshToken);
			// Xóa refreshToken khỏi response gửi về client
			const { refreshToken, ...responseData } = result;
			return new HttpResponse(res).success(responseData);
		} catch (error) {
			next(error);
		}
	},
	logout: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const result = await authService.logout(userId);
			res.clearCookie('refreshToken', getRefreshCookieOptions()); // Xóa Cookie khi logout
			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},

	refresh: async (req, res, next) => {
		try {
			const incomingRefreshToken = req.cookies.refreshToken;
			if (!incomingRefreshToken) {
				return res.status(401).json({ message: 'Không tìm thấy Refresh Token' });
			}
			const result = await authService.refreshToken({
				refreshToken: incomingRefreshToken,
			});
			// Set lại cookie mới (Rotate token)
			setRefreshCookie(res, result.refreshToken);
			return new HttpResponse(res).success({ accessToken: result.accessToken });
		} catch (error) {
			next(error);
		}
	},
	getGoogleUrl: async (req, res) => {
		const url = googleService.getAuthUrl();
		new HttpResponse(res).success({ url });
	},

	googleCallback: async (req, res) => {
		try {
			const { code, error } = req.query || {};

			if (error) {
				return res.redirect(`${FRONTEND_URL}/auth/login?error=google_denied`);
			}
			const data = await googleService.handleCallback(code);
			setRefreshCookie(res, data.refreshToken); //Set Cookie trực tiếp ở Backend
			const params = new URLSearchParams({
				accessToken: data.accessToken,
				user: JSON.stringify(data.user),
			});
			console.log('Google callback data:', data.accessToken);
			return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
		} catch (error) {
			console.error('Google Callback Error:', error);
			return res.redirect(`${FRONTEND_URL}/auth/login?error=google_failed`);
		}
	},

	getGithubUrl: async (req, res) => {
		const url = githubService.getAuthUrl();
		new HttpResponse(res).success({ url });
	},
	githubCallback: async (req, res) => {
		try {
			const { code, error } = req.query || {};

			if (error) {
				return res.redirect(`${FRONTEND_URL}/auth/login?error=github_denied`);
			}
			if (!code) {
				return res.redirect(`${FRONTEND_URL}/auth/login?error=github_no_code`);
			}

			const data = await githubService.handleCallback(code);
			const params = new URLSearchParams({
				accessToken: data.accessToken,
				user: JSON.stringify(data.user),
			});
			setRefreshCookie(res, data.refreshToken);
			console.log('GitHub callback data:', data.accessToken);
			return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
		} catch (error) {
			console.error('GitHub Callback Error:', error);
			return res.redirect(`${FRONTEND_URL}/auth/login?error=github_failed`);
		}
	},
};
