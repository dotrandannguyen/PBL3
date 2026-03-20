import prisma from '../../config/database.js';

export const integrationRepository = {
	getIntegrationGmailPreview: async (userId, provider) => {
		return await prisma.integration.findUnique({
			where: {
				userId_provider: {
					userId,
					provider,
				},
			},
		});
	},
};
