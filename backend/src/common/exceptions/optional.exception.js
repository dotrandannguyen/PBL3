import { ClientException } from './client.exception.js';
import { StatusCodes } from 'http-status-codes';
import { InternalServerException } from './internalServer.exception.js';

export class OptionalException extends ClientException {
  constructor(httpStatusCode, message) {
    // nếu không có status code → lỗi hệ thống (5xx)
    if (!httpStatusCode) {
      throw new InternalServerException();
    }

    // gọi constructor của ClientException (4xx)
    super(httpStatusCode, message);

  }
}
