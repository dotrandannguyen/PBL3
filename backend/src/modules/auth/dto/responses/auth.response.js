export class AuthResponse {
	constructor(data, token = null) {
		((this.id = data.id), (this.name = data.name), (this.email = data.email));

		if (token) {
			this.accessToken = token;
		}
	}
}
