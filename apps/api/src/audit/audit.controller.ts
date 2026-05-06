import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/audit-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('sistema:config:read')
  async getAuditLog(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('accion') accion?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = {};

    if (desde || hasta) {
      where.timestamp = {};
      if (desde) where.timestamp.gte = new Date(desde);
      if (hasta) where.timestamp.lte = new Date(hasta);
    }
    if (usuarioId) where.usuarioId = usuarioId;
    if (accion) where.accion = accion;

    const events = await this.prisma.eventoAuditoria.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(parseInt(limit ?? '100'), 500),
    });

    const stats = await this.prisma.eventoAuditoria.groupBy({
      by: ['accion'],
      _count: { id: true },
      where,
    });

    return {
      eventos: events,
      stats: stats.map((s) => ({ accion: s.accion, count: s._count.id })),
      total: events.length,
    };
  }
}
