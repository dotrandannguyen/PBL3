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

	/**
	 * Tìm integration của user dựa vào email address và provider
	 * @param {string} emailAddress - Email address (từ webhook payload)
	 * @param {string} provider - Provider name (e.g., 'GOOGLE')
	 * @returns {object} Integration object + User info
	 */
	findIntegrationByEmailAddress: async (emailAddress, provider) => {
		// Tìm user có email này trong hệ thống
		const user = await prisma.user.findUnique({
			where: { email: emailAddress },
			include: {
				integrations: {
					where: { provider },
				},
			},
		});

		if (!user || user.integrations.length === 0) {
			return null;
		}

		return user.integrations[0]; // Trả về integration đầu tiên (thường chỉ có 1)
	},
};
