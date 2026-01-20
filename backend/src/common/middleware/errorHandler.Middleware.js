import { HttpResponse } from "../dtos/index.js";
export const errorHandlerMiddleware =(err,req,res,next) => {
    if ( err&& err.status) {
        return new HttpResponse(res).exception(err);
    }
    return next(err);
    
}