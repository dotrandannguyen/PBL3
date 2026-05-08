import prisma from '../../config/database.js';

export const createWorkspace = async (data) => {
  return await prisma.workspace.create({
    data
  });
};

export const getWorkspacesByUserId = async (userId) => {
  return await prisma.workspace.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });
};

export const updateWorkspace = async (id, data) => {
  return await prisma.workspace.update({
    where: { id },
    data
  });
};

export const deleteWorkspace = async (id) => {
  return await prisma.workspace.delete({
    where: { id }
  });
};
