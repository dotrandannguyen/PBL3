import { StatusCodes } from 'http-status-codes';
import {ServerException} from "./server.exception.js";
export class InternalServerException extends ServerException {
  constructor() {
    super(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'An internal server error occurred.'
    );
  }
}