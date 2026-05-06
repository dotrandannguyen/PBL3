export class AuthResponseDto {
	constructor(user, tokens, provider = 'local') {
		this.user = {
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			avatarUrl: user.avatarUrl,
			bio: user.bio ?? null,
			theme: user.theme ?? null,
			language: user.language ?? null,
			timeFormat: user.timeFormat ?? null,
			timezone: user.timezone ?? null,
			isActive: user.isActive,
			role: user.role,
			provider,
		};
		this.accessToken = tokens.accessToken;
		this.refreshToken = tokens.refreshToken;
	}
}
