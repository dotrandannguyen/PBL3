import { ClientException } from './client.exception.js';
import { StatusCodes } from 'http-status-codes';

export class NotFoundException extends ClientException {
	constructor(resource) {
		const message = resource
			? `The requested ${resource} was not found.`
			: 'The requested resource was not found.';

		super(StatusCodes.NOT_FOUND, message);

		this.resource = resource;
	}
}
