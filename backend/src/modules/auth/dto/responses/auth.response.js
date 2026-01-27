export class AuthResponseDto {
	constructor(user, tokens) {
		this.user = {
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			avatarUrl: user.avatarUrl,
			isActive: user.isActive,
		};
		this.accessToken = tokens.accessToken;
		this.refreshToken = tokens.refreshToken;
	}
}
