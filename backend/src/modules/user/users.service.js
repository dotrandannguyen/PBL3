import usersRepository from './users.repository.js';
import { ClientException, NotFoundException } from '../../common/exceptions/index.js';

class UserService {
	resolveProvider(accounts) {
		if (!Array.isArray(accounts) || accounts.length === 0) {
			return 'local';
		}
		const oauthAccount = accounts.find((account) => account.type === 'oauth');
		return (oauthAccount || accounts[0]).provider || 'local';
	}

	async getAllUserService() {
		const allUser = await usersRepository.getAllUserRepository();
		return allUser;
	}
	async getMe(userId) {
		if (!userId) {
			throw new ClientException(400, 'User ID is required');
		}
		const user = await usersRepository.getUserProfileById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		const { accounts, ...profile } = user;
		return {
			...profile,
			provider: this.resolveProvider(accounts),
		};
	}
	async updateMe(userId, payload) {
		if (!userId) {
			throw new ClientException(400, 'User ID is required');
		}
		const updateData = {};
		if (Object.prototype.hasOwnProperty.call(payload, 'fullName')) {
			const trimmed =
				typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
			updateData.fullName = trimmed || null;
		}
		if (Object.prototype.hasOwnProperty.call(payload, 'avatarUrl')) {
			const trimmed =
				typeof payload.avatarUrl === 'string' ? payload.avatarUrl.trim() : '';
			updateData.avatarUrl = trimmed || null;
		}
		if (Object.prototype.hasOwnProperty.call(payload, 'bio')) {
			const trimmed = typeof payload.bio === 'string' ? payload.bio.trim() : '';
			updateData.bio = trimmed || null;
		}
		if (Object.prototype.hasOwnProperty.call(payload, 'theme')) {
			const trimmed = typeof payload.theme === 'string' ? payload.theme.trim() : '';
			updateData.theme = trimmed || null;
		}
		if (Object.prototype.hasOwnProperty.call(payload, 'language')) {
			const trimmed =
				typeof payload.language === 'string' ? payload.language.trim() : '';
			updateData.language = trimmed || null;
		}
		if (Object.prototype.hasOwnProperty.call(payload, 'timeFormat')) {
			const trimmed =
				typeof payload.timeFormat === 'string' ? payload.timeFormat.trim() : '';
			updateData.timeFormat = trimmed || null;
		}
		if (Object.prototype.hasOwnProperty.call(payload, 'timezone')) {
			const trimmed =
				typeof payload.timezone === 'string' ? payload.timezone.trim() : '';
			updateData.timezone = trimmed || null;
		}

		const user = await usersRepository.findUserByID(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const updated = await usersRepository.updateUserProfile(userId, updateData);
		const { accounts, ...profile } = updated;
		return {
			...profile,
			provider: this.resolveProvider(accounts),
		};
	}
	async deleteUserService(userId) {
		if (!userId) {
			throw new ClientException(400, 'User ID is required');
		}
		const user = await usersRepository.findUserByID(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return await usersRepository.deleteUserById(userId);
	}

	async getNotificationPreferences(userId) {
		if (!userId) {
			throw new ClientException(400, 'User ID is required');
		}
		return usersRepository.getNotificationPreferences(userId);
	}

	async updateNotificationPreferences(userId, payload) {
		if (!userId) {
			throw new ClientException(400, 'User ID is required');
		}
		
		const updateData = {};
		if (typeof payload.email === 'boolean') updateData.email = payload.email;
		if (typeof payload.push === 'boolean') updateData.push = payload.push;
		if (typeof payload.sound === 'boolean') updateData.sound = payload.sound;
		if (typeof payload.digest === 'boolean') updateData.digest = payload.digest;

		return usersRepository.updateNotificationPreferences(userId, updateData);
	}
}
export default new UserService();
