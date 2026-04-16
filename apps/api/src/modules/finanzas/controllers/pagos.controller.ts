import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PagosService } from '../pagos.service';
import { CreatePagoDto, UpdatePagoEstadoDto, WebhookPagoDto, PagoQueryDto } from '../dto/pagos.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('finanzas/pagos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('morosos')
  @Permissions('finanzas:pagos:read')
  getMorosos(@CurrentUser() user: any) {
    return this.pagosService.getMorosos(user.sub);
  }

  @Get()
  @Permissions('finanzas:pagos:read')
  findAll(@Query() query: PagoQueryDto) {
    return this.pagosService.findAll(query);
  }

  @Post()
  @Permissions('finanzas:pagos:write')
  create(@Body() dto: CreatePagoDto, @CurrentUser() user: any) {
    return this.pagosService.create(dto, user.sub);
  }

  @Patch(':id/estado')
  @Permissions('finanzas:pagos:write')
  updateEstado(@Param('id') id: string, @Body() dto: UpdatePagoEstadoDto, @CurrentUser() user: any) {
    return this.pagosService.updateEstado(id, dto, user.sub);
  }

  // Webhook sin autenticación (usa secret en query param / header)
  @Post('webhook')
  webhook(@Body() dto: WebhookPagoDto) {
    return this.pagosService.webhook(dto);
  }
}
