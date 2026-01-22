import { StatusCodes } from 'http-status-codes';
import { ClientException } from './client.exception.js';
export class InternalServerException extends ClientException {
	constructor() {
		super(StatusCodes.INTERNAL_SERVER_ERROR, 'An internal server error occurred.');
	}
}
