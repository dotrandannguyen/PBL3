// src/common/exceptions/unauthorized.exception.js
import { ClientException } from './client.exception.js';
import { StatusCodes } from 'http-status-codes';

export class UnauthorizedException extends ClientException {
	constructor(message) {
		super(
			StatusCodes.UNAUTHORIZED,
			message ||
				'You are not authenticated because the token is missing or invalid.',
		);
	}
}
