import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequestMiddleware } from '../../middleware/validationRequest.middleware.js';
import { registerRequestValidationSchema } from './dto/requests/register.request.js';


//register
router.post('/register', validateRequestMiddleware(registerRequestValidationSchema), AuthController.register);