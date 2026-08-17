import { authService } from './auth.service.js';
import { HttpResponse } from '../../common/dtos/httpResponse.dto.js';
import { googleService } from './google.service.js';
import { ClientException } from '../../common/exceptions/index.js';
import { githubService } from './github.service.js';
import { slackService } from './slack.service.js';
import { parseOauthState } from '../../common/utils/oauthState.js';

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

const buildOauthErrorRedirect = (state, fallbackError) => {
	const statePayload = parseOauthState(state);
	const isLink = statePayload.action === 'link';
	const errorParam = fallbackError || 'oauth_failed';

	if (isLink) {
		const params = new URLSearchParams({ error: errorParam, mode: 'link' });
		return `${FRONTEND_URL}/auth/callback?${params.toString()}`;
	}

	return `${FRONTEND_URL}/auth/login?error=${errorParam}`;
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
	// Luồng 1: Dành cho Đăng nhập
	getGoogleUrl: async (req, res) => {
		const url = googleService.getAuthUrl({ action: 'login' });
		new HttpResponse(res).success({ url });
	},
	// Luồng 2: Dành cho Liên kết (Yêu cầu phải có authGuard)
	getGoogleLinkUrl: async (req, res) => {
		const url = googleService.getAuthUrl({
			action: 'link',
			userId: req.user.id,
		});
		new HttpResponse(res).success({ url });
	},

	googleCallback: async (req, res) => {
		try {
			const { code, error, state } = req.query || {};

			if (error) {
				return res.redirect(buildOauthErrorRedirect(state, 'google_denied'));
			}
			const data = await googleService.handleCallback(code, state);
			setRefreshCookie(res, data.refreshToken); //Set Cookie trực tiếp ở Backend
			const statePayload = parseOauthState(state);
			const params = new URLSearchParams({
				accessToken: data.accessToken,
				user: JSON.stringify({ ...data.user, provider: 'google' }),
				mode: statePayload.action,
			});
			return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
		} catch (error) {
			console.error('Google Callback Error:', error);
			const errorKey =
				error instanceof ClientException && error.status === 409
					? error.code === 'PROVIDER_EMAIL_MISMATCH'
						? 'email_mismatch'
						: 'link_conflict'
					: 'google_failed';
			return res.redirect(buildOauthErrorRedirect(req.query?.state, errorKey));
		}
	},

	getGithubUrl: async (req, res) => {
		const url = githubService.getAuthUrl({ action: 'login' });
		new HttpResponse(res).success({ url });
	},
	getGithubLinkUrl: async (req, res) => {
		const url = githubService.getAuthUrl({
			action: 'link',
			userId: req.user.id,
		});
		new HttpResponse(res).success({ url });
	},
	githubCallback: async (req, res) => {
		try {
			const { code, error, state } = req.query || {};

			if (error) {
				return res.redirect(buildOauthErrorRedirect(state, 'github_denied'));
			}
			if (!code) {
				return res.redirect(buildOauthErrorRedirect(state, 'github_no_code'));
			}

			const data = await githubService.handleCallback(code, state);
			const params = new URLSearchParams({
				accessToken: data.accessToken,
				user: JSON.stringify({ ...data.user, provider: 'github' }),
				mode: parseOauthState(state).action,
			});
			setRefreshCookie(res, data.refreshToken);
			return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
		} catch (error) {
			console.error('GitHub Callback Error:', error);
			const errorKey =
				error instanceof ClientException && error.status === 409
					? error.code === 'PROVIDER_EMAIL_MISMATCH'
						? 'email_mismatch'
						: 'link_conflict'
					: 'github_failed';
			return res.redirect(buildOauthErrorRedirect(req.query?.state, errorKey));
		}
	},

	getSlackUrl: async (req, res) => {
		const url = slackService.getAuthUrl({ action: 'login' });
		new HttpResponse(res).success({ url });
	},
	getSlackLinkUrl: async (req, res) => {
		const url = slackService.getAuthUrl({
			action: 'link',
			userId: req.user.id,
		});
		new HttpResponse(res).success({ url });
	},

	slackCallback: async (req, res) => {
		try {
			const { code, error, state } = req.query || {};

			if (error) {
				return res.redirect(buildOauthErrorRedirect(state, 'slack_denied'));
			}
			if (!code) {
				return res.redirect(buildOauthErrorRedirect(state, 'slack_no_code'));
			}

			const data = await slackService.handleCallback(code, state);
			const params = new URLSearchParams({
				accessToken: data.accessToken,
				user: JSON.stringify({ ...data.user, provider: 'slack' }),
				mode: parseOauthState(state).action,
			});
			setRefreshCookie(res, data.refreshToken);
			return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
		} catch (error) {
			console.error('Slack Callback Error:', error);
			const errorKey =
				error instanceof ClientException && error.status === 409
					? error.code === 'PROVIDER_EMAIL_MISMATCH'
						? 'email_mismatch'
						: 'link_conflict'
					: 'slack_failed';
			return res.redirect(buildOauthErrorRedirect(req.query?.state, errorKey));
		}
	},
};
