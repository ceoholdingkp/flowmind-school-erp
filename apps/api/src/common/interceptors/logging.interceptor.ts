import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = res.statusCode;
          const logFn = duration > 1000
            ? (msg: string) => this.logger.warn(msg)
            : (msg: string) => this.logger.log(msg);

          if (process.env.NODE_ENV === 'production') {
            logFn(JSON.stringify({ method, url, status, duration_ms: duration }));
          } else {
            logFn(`${method} ${url} ${status} +${duration}ms${duration > 1000 ? ' ⚠️ SLOW' : ''}`);
          }
        },
        error: (err: Error) => {
          const duration = Date.now() - start;
          this.logger.error(
            process.env.NODE_ENV === 'production'
              ? JSON.stringify({ method, url, status: 500, duration_ms: duration, error: err.message })
              : `${method} ${url} ERROR +${duration}ms — ${err.message}`,
            err.stack,
          );
        },
      }),
    );
  }
}
