import crypto from 'crypto';

export const buildOauthState = (options = {}) => {
	const payload = {
		action: options.action || 'login',
		userId: options.userId || null,
		nonce: crypto.randomUUID(),
	};

	return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

export const parseOauthState = (state) => {
	if (!state) {
		return { action: 'login', userId: null };
	}

	try {
		const payload = JSON.parse(Buffer.from(state, 'base64url').toString());
		return {
			action: payload?.action || 'login',
			userId: payload?.userId || null,
		};
	} catch {
		return { action: 'login', userId: null };
	}
};
