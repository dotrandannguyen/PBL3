export class ClientException extends Error {
	constructor(status, message, code = null) {
		super(message);
		this.status = status;
		this.message = message;
		this.code = code;
		this.name = 'ClientException';
	}
}
