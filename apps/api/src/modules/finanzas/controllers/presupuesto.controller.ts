import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PresupuestoService } from '../presupuesto.service';
import { CreatePresupuestoDto, AprobarPresupuestoDto, ComparativaQueryDto } from '../dto/presupuesto.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('finanzas/presupuesto')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PresupuestoController {
  constructor(private readonly presupuestoService: PresupuestoService) {}

  @Get('comparativa')
  @Permissions('finanzas:presupuesto:read')
  getComparativa(@Query() query: ComparativaQueryDto) {
    return this.presupuestoService.getComparativa(query);
  }

  @Get()
  @Permissions('finanzas:presupuesto:read')
  findAll() {
    return this.presupuestoService.findAll();
  }

  @Get(':id')
  @Permissions('finanzas:presupuesto:read')
  findOne(@Param('id') id: string) {
    return this.presupuestoService.findOne(id);
  }

  @Post()
  @Permissions('finanzas:presupuesto:write')
  create(@Body() dto: CreatePresupuestoDto, @CurrentUser() user: any) {
    return this.presupuestoService.create(dto, user.sub);
  }

  @Post(':id/aprobar')
  @Permissions('finanzas:rendicion:aprobar')
  aprobar(@Param('id') id: string, @Body() dto: AprobarPresupuestoDto, @CurrentUser() user: any) {
    return this.presupuestoService.aprobar(id, dto, user.sub);
  }
}
