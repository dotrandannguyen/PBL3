




export class AuthController{
        //register
        constructor(){}
        async register(){
            const registerDto = new RegisterRequestDto(req.body);
            const result = await authService.register(registerDto);
            if ( result instanceof Exception) {
                return new HttpResponseDto().created();
            }
        }
    }
