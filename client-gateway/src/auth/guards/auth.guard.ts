
import { Injectable, CanActivate, ExecutionContext, HttpStatus, UnauthorizedException, Inject } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import type { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import {  NATS_SERVICE } from 'src/config';



@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  async canActivate(
    context: ExecutionContext,
  ):  Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try{
     const payload = await firstValueFrom(this.client.send('auth.verify.token', token));
        request['user'] = payload.user;
        request['token'] = payload.token;
    } catch (error) {
        throw new RpcException({ status: HttpStatus.UNAUTHORIZED, message: 'Invalid token (Auth Guard)' });
    }
    
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') || [];
  if (type === 'Bearer' && token) {
    return token;
  }
  return;
}
}



