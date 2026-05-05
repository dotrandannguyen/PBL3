import { authGuard, validateRequestMiddleware } from '../../common/middleware/index.js';
import { Router } from 'express';
import { integrationController } from './integration.controller.js';
import { webhookController } from './webhook.controller.js';

const integrationRouter = Router();

integrationRouter.post('/webhook/github', webhookController.handleGithub);
integrationRouter.post('/webhook/gmail', webhookController.handleGmail);
// Yêu cầu phải đăng nhập (có Token của hệ thống) mới được xem
integrationRouter.use(authGuard);

// GET /integrations/preview/gmail
integrationRouter.get('/preview/gmail', integrationController.previewGmail);

// GET /integrations/preview/github
integrationRouter.get('/preview/github', integrationController.previewGithub);

// GET /integrations/preview/slack
integrationRouter.get('/preview/slack', integrationController.previewSlack);

// GET /integrations/github/repositories
integrationRouter.get(
	'/github/repositories',
	integrationController.getGithubRepositories,
);

// POST /integrations/github/setup-webhooks
integrationRouter.post(
	'/github/setup-webhooks',
	integrationController.setupGithubWebhooks,
);

// DELETE /integrations/github/webhooks
integrationRouter.delete('/github/webhooks', integrationController.disableGithubWebhook);

export default integrationRouter;
