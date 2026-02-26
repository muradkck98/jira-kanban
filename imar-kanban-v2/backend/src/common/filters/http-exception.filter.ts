import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message || (res as any).error || message;
      if (Array.isArray(message)) message = message[0];
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      // Prisma unique constraint violation
      if ((exception as any).code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Bu kayıt zaten mevcut.';
      } else if ((exception as any).code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Kayıt bulunamadı.';
      }
    }

    response.status(status).json({
      success: false,
      error: message,
      statusCode: status,
    });
  }
}
