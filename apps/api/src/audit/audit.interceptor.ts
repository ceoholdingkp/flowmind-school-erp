import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const auditMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

    if (!auditMethods.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (data: unknown) => {
        try {
          const user = (req as Request & { user?: { id: string } }).user;
          if (!user?.id) return;

          const actionMap: Record<string, string> = {
            POST: 'CREATE',
            PATCH: 'UPDATE',
            PUT: 'UPDATE',
            DELETE: 'DELETE',
          };

          const responseData = data as { data?: { id?: string } };
          const entidadId =
            responseData?.data?.id ||
            req.params?.['id'] ||
            'unknown';

          const urlParts = req.url.split('/').filter(Boolean);
          const entidad = urlParts[urlParts.length - 1] || req.url;

          await this.prisma.eventoAuditoria.create({
            data: {
              usuarioId: user.id,
              accion: actionMap[method] || method,
              entidad,
              entidadId,
              datosDespues: responseData?.data as object ?? {},
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });
        } catch (err) {
          this.logger.warn(`Audit log failed: ${err}`);
        }
      }),
    );
  }
}
