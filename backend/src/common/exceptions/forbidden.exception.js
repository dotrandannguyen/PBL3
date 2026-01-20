import {StatusCodes} from 'http-status-codes';
import {ClientException} from './client.exception.js';

export class ForbiddenException extends ClientException {
    constructor() {
        super(
            StatusCodes.FORBIDDEN,
            'You do not have permission to access this resource.',

        )}
}