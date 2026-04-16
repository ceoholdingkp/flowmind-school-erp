import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AsistenciaRRHHService } from '../asistencia-rrhh.service';
import {
  MarcarEntradaDto, MarcarSalidaDto, RegistrarLicenciaDto, AsistenciaRRHHQueryDto,
} from '../dto/asistencia-rrhh.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('rrhh/asistencia')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AsistenciaRRHHController {
  constructor(private readonly asistenciaService: AsistenciaRRHHService) {}

  @Get(':funcionarioId')
  @Permissions('rrhh:marcas:read')
  findAll(
    @Param('funcionarioId') funcionarioId: string,
    @Query() query: AsistenciaRRHHQueryDto,
  ) {
    return this.asistenciaService.findAll(funcionarioId, query);
  }

  @Get(':funcionarioId/reporte')
  @Permissions('rrhh:marcas:read')
  getReporte(
    @Param('funcionarioId') funcionarioId: string,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    return this.asistenciaService.getReporteMensual(
      funcionarioId,
      parseInt(mes ?? String(new Date().getMonth() + 1)),
      parseInt(anio ?? String(new Date().getFullYear())),
    );
  }

  @Post(':funcionarioId/entrada')
  @Permissions('rrhh:marcas:write')
  marcarEntrada(
    @Param('funcionarioId') funcionarioId: string,
    @Body() dto: MarcarEntradaDto,
    @CurrentUser() user: any,
  ) {
    return this.asistenciaService.marcarEntrada(funcionarioId, dto, user.sub);
  }

  @Post(':funcionarioId/salida')
  @Permissions('rrhh:marcas:write')
  marcarSalida(
    @Param('funcionarioId') funcionarioId: string,
    @Body() dto: MarcarSalidaDto,
    @CurrentUser() user: any,
  ) {
    return this.asistenciaService.marcarSalida(funcionarioId, dto, user.sub);
  }

  @Post(':funcionarioId/licencia')
  @Permissions('rrhh:marcas:write')
  registrarLicencia(
    @Param('funcionarioId') funcionarioId: string,
    @Body() dto: RegistrarLicenciaDto,
    @CurrentUser() user: any,
  ) {
    return this.asistenciaService.registrarLicencia(funcionarioId, dto, user.sub);
  }
}
