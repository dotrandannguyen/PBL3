import express from 'express';
import { authGuard } from '../../common/middleware/auth.middleware.js';
import * as workspaceController from './workspace.controller.js';

const router = express.Router();

router.use(authGuard);

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);
router.patch('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);

export default router;
