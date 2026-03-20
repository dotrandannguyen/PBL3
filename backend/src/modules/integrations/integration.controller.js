import { HttpResponse } from '../../common/dtos/index.js';
import { integrationService } from './integration.service.js';

export const integrationController = {
	previewGmail: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const emails = await integrationService.getGmailPreview(userId);

			return new HttpResponse(res).success({
				message: 'Lấy 10 email mới nhất thành công',
				total: emails.length,
				data: emails,
			});
		} catch (error) {
			next(error);
		}
	},

	previewGithub: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const issues = await integrationService.getGithubPreview(userId);
			return new HttpResponse(res).success({
				message: 'Lấy 10 issues mới nhất thành công',
				total: issues.length,
				data: issues,
			});
		} catch (error) {
			next(error);
		}
	},
};
