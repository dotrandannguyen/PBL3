import {StatusCodes} from 'http-status-codes';

export class HttpResponse {
    constructor(res) {
        this.res = res;
    }

    success(data) {
        return this.res.status(StatusCodes.OK).json(
            {
                success :true,
                data,
            }
        );
    }

    created(data) {
        return this.res.status(StatusCodes.CREATED).json( {
                success :true,
                data,
            });
    }

    exception(exception) {
        return this.res.status(exception.status).json({
            success: false,
            message: exception.message,
        });
    }
}