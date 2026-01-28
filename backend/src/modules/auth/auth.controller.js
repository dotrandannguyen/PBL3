import { authService } from './auth.service.js';
import { HttpResponse } from '../../common/dtos/httpResponse.dto.js';
import { googleService } from './google.service.js';
import { ClientException } from '../../common/exceptions/index.js';
import { githubServie } from './github.service.js';

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
	getGoogleUrl: async (req, res) => {
		const url = googleService.getAuthUrl();
		new HttpResponse(res).success({ url });
	},

	googleCallback: async (req, res, next) => {
		try {
			// user bấm "cancel" bên gg
			const query = req.query || {};

			const { code, error } = query;

			// Nếu user bấm "Cancel" bên Google
			if (error) {
				throw new ClientException(400, 'User denied access');
			}
			const data = await googleService.handleCallback(code);
			new HttpResponse(res).success({
				message: 'Google login & integration successful',
				data,
			});
		} catch (error) {
			next(error);
		}
	},

	getGithubUrl: async (req, res) => {
		const url = githubServie.getAuthUrl();
		new HttpResponse(res).success({ url });
	},
	githubCallback: async (req, res, next) => {
		try {
			const query = req.query || {};
			const { code, error } = query;

			if (error) {
				throw new ClientException(400, 'User denied GitHub access');
			}
			if (!code) {
				throw new ClientException(400, 'Authorization code missing');
			}

			const data = await githubServie.handleCallback(code);

			new HttpResponse(res).success({
				message: 'GitHub login & integration successful',
				data,
			});
		} catch (error) {
			next(error);
		}
	},
};
