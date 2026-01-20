export class ClientException extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.message = message;
    this.name = 'ClientException';
  }
}