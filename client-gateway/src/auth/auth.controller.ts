import { Body, Controller, Get, HttpStatus, Inject, Post, Req, UseGuards } from '@nestjs/common';

import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { LoginUserDto, RegisterUserDto } from './dto';
import { catchError, throwError } from 'rxjs';
import { AuthGuard } from './guards/auth.guard';
import { User } from './decorators/user.decorator';
import type { CurrentUserInterface } from './interfaces/current-user.interface';
import { Token } from './decorators/token.decorator';



@Controller('auth')
export class AuthController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}


  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.client.send('auth.register.user', registerUserDto).pipe(
      catchError((error) => {
        return throwError(() => new RpcException({ status: HttpStatus.BAD_REQUEST, message: error.message }));
      })
    );
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.client.send('auth.login.user', loginUserDto).pipe(
      catchError((error) => {
        return throwError(() => new RpcException({ status: HttpStatus.BAD_REQUEST, message: error.message }));
      })
    );
  }

  @UseGuards(AuthGuard)
  @Get('verify')
  async verifyToken(@User() user: CurrentUserInterface, @Token() token: string) {
    return { user, token }
  }
}
