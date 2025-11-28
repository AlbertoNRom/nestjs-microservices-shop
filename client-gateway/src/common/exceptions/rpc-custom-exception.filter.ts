
import { Catch, ArgumentsHost, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const rpcError = exception.getError();

    if(rpcError.toString().includes('Empty response')) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        status: HttpStatus.INTERNAL_SERVER_ERROR, 
        message: 'Empty response' 
      });
    }

    let status: number;
    let message: string;

    if(typeof rpcError === 'object' && 'status' in rpcError && 'message' in rpcError) {
      const { status: rpcStatus, message: rpcMessage } = rpcError as { status: number, message: string };
      status = rpcStatus;
      message = rpcMessage;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = rpcError as string;
    }

    response.status(status).json({
      status,
      message,
    });
  }
}
