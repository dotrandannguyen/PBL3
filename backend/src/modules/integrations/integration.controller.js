import { HttpResponse } from '../../common/dtos/index.js';
import { integrationService } from './integration.service.js';
import { githubService } from '../auth/github.service.js';

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

	// 🚀 LẤY DANH SÁCH REPOSITORIES
	getGithubRepositories: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const repositories = await integrationService.getGithubRepositories(userId);

			return new HttpResponse(res).success({
				message: 'Lấy danh sách repositories thành công',
				total: repositories.length,
				data: repositories,
			});
		} catch (error) {
			next(error);
		}
	},

	// 🚀 CÀI WEBHOOK CHO CÁC REPOSITORIES
	setupGithubWebhooks: async (req, res, next) => {
		try {
			const userId = req.user.id;
			const { repositoryIds } = req.body;

			if (
				!repositoryIds ||
				!Array.isArray(repositoryIds) ||
				repositoryIds.length === 0
			) {
				return new HttpResponse(res).badRequest({
					message: 'Yêu cầu danh sách repositoryIds (mảng các ID)',
				});
			}

			const result = await integrationService.setupGithubWebhooks(
				userId,
				repositoryIds,
			);

			return new HttpResponse(res).success({
				message: 'Cả webhook setup hoàn tất',
				setupCount: result.success.length,
				failureCount: result.failed.length,
				data: result,
			});
		} catch (error) {
			next(error);
		}
	},
};
///