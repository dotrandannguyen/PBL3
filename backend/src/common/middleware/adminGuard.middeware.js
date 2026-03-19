import { ForbiddenException } from "../exceptions/index.js";


export const adminGuard = (req,res,next) => {
    try {
        const user = req.user;

        if ( user.role !== 'ADMIN') {
            throw new ForbiddenException('Chỉ admin mới có quyền truy cập.');
        }

        next();
    } catch (err){
        next(err);
    }
}

