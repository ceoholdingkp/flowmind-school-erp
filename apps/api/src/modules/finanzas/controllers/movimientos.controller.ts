import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MovimientosService } from '../movimientos.service';
import { CreateMovimientoDto, MovimientoQueryDto, EERQueryDto } from '../dto/movimientos.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('finanzas/movimientos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Get('categorias')
  @Permissions('finanzas:read')
  getCategorias() {
    return this.movimientosService.getCategorias();
  }

  @Get()
  @Permissions('finanzas:read')
  findAll(@Query() query: MovimientoQueryDto) {
    return this.movimientosService.findAll(query);
  }

  @Post()
  @Permissions('finanzas:write')
  create(@Body() dto: CreateMovimientoDto, @CurrentUser() user: any) {
    return this.movimientosService.create(dto, user.sub);
  }
}

@Controller('finanzas/estado-resultados')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EERController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Get()
  @Permissions('finanzas:eer')
  getEER(@Query() query: EERQueryDto) {
    return this.movimientosService.getEER(query);
  }
}
