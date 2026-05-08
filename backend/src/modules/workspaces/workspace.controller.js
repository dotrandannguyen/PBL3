import * as workspaceService from './workspace.service.js';

export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description, color, icon } = req.body;
    const workspace = await workspaceService.createWorkspace(req.user.id, name, description, color, icon);
    res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await workspaceService.getWorkspaces(req.user.id);
    res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workspace = await workspaceService.updateWorkspace(req.user.id, id, req.body);
    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    await workspaceService.deleteWorkspace(req.user.id, id);
    res.status(200).json({ success: true, message: 'Workspace deleted successfully' });
  } catch (error) {
    next(error);
  }
};
