import { authService } from './auth.service.js';
import { HttpResponse } from '../../common/dtos/httpResponse.dto.js';
import { googleService } from './google.service.js';
import { ClientException } from '../../common/exceptions/index.js';
import { githubService } from './github.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const authController = {
	register: async (req, res, next) => {
		try {
			const result = await authService.register(req.body);
			return new HttpResponse(res).created(result);
		} catch (error) {
			next(error);
		}
	},

	login: async (req, res, next) => {
		try {
			const result = await authService.login(req.body);
			return new HttpResponse(res).success(result);
		} catch (error) {
			next(error);
		}
	},
	logout: async (req, res, next) => {
		try{
			const userId = req.user.id;
			const result = await authService.logout(userId);
			return new HttpResponse(res).success(result);
		}catch(error){
			next(error);
		}
	},

	refresh: async (req, res, next) => {
		try {
			const result = await authService.refreshToken(req.body);
			return new HttpResponse(res).success(result);
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
				return res.redirect(`${FRONTEND_URL}/login?error=google_denied`);
			}
			const data = await googleService.handleCallback(code);
			const params = new URLSearchParams({
				accessToken: data.accessToken,
				refreshToken: data.refreshToken,
				user: JSON.stringify(data.user),
			});
			console.log('Google callback data:', data.accessToken);
			return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
		} catch {
			return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
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
				return res.redirect(`${FRONTEND_URL}/login?error=github_denied`);
			}
			if (!code) {
				return res.redirect(`${FRONTEND_URL}/login?error=github_no_code`);
			}

			const data = await githubService.handleCallback(code);
			const params = new URLSearchParams({
				accessToken: data.accessToken,
				refreshToken: data.refreshToken,
				user: JSON.stringify(data.user),
			});
			console.log('GitHub callback data:', data.accessToken);
			return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
		} catch {
			return res.redirect(`${FRONTEND_URL}/login?error=github_failed`);
		}
	},
};
