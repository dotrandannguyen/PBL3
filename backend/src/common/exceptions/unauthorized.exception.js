import {ClientException} from './client.exception.js';
import {StatusCodes} from 'http-status-codes';

export class UnauthorizedException extends ClientException {
    constructor() {
        super(
            StatusCodes.UNAUTHORIZED,
            'You are not authenticated because the token is missing or invalid.',
        )
    }
}