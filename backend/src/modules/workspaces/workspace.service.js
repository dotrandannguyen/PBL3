import * as workspaceRepository from './workspace.repository.js';
import { NotFoundException } from '../../common/exceptions/index.js';

export const createWorkspace = async (userId, name, description, color, icon) => {
  if (!name) throw new Error('Workspace name is required');
  return await workspaceRepository.createWorkspace({
    userId,
    name,
    description,
    color,
    icon
  });
};

export const getWorkspaces = async (userId) => {
  return await workspaceRepository.getWorkspacesByUserId(userId);
};

export const updateWorkspace = async (userId, id, data) => {
  return await workspaceRepository.updateWorkspace(id, data);
};

export const deleteWorkspace = async (userId, id) => {
  return await workspaceRepository.deleteWorkspace(id);
};
