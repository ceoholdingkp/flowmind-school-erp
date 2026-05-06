import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ComunicacionesService } from './comunicaciones.service';
import { CreateComunicadoDto, UpdateComunicadoDto, CreateMensajeDto, ComunicadoQueryDto } from './dto/comunicaciones.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('comunicaciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ComunicacionesController {
  constructor(private readonly service: ComunicacionesService) {}

  @Get()
  @Permissions('comunicaciones:read')
  getComunicados(@Query() query: ComunicadoQueryDto) {
    return this.service.getComunicados(query);
  }

  @Get('resumen')
  @Permissions('comunicaciones:read')
  getResumen(@Query('mes') mes: string, @Query('anio') anio: string) {
    const now = new Date();
    return this.service.getResumenMes(
      mes ? parseInt(mes) : now.getMonth() + 1,
      anio ? parseInt(anio) : now.getFullYear(),
    );
  }

  @Get('mensajes')
  @Permissions('comunicaciones:read')
  getMensajes(@Request() req: any) {
    return this.service.getMensajes(req.user.sub);
  }

  @Get('mensajes/enviados')
  @Permissions('comunicaciones:read')
  getMensajesEnviados(@Request() req: any) {
    return this.service.getMensajesEnviados(req.user.sub);
  }

  @Get(':id')
  @Permissions('comunicaciones:read')
  getComunicado(@Param('id') id: string) {
    return this.service.getComunicado(id);
  }

  @Get(':id/estadisticas')
  @Permissions('comunicaciones:read')
  getEstadisticas(@Param('id') id: string) {
    return this.service.getEstadisticasLectura(id);
  }

  @Post()
  @Permissions('comunicaciones:write')
  createComunicado(@Body() dto: CreateComunicadoDto, @Request() req: any) {
    return this.service.createComunicado(dto, req.user.sub);
  }

  @Post('mensajes')
  @Permissions('comunicaciones:write')
  createMensaje(@Body() dto: CreateMensajeDto, @Request() req: any) {
    return this.service.createMensaje(dto, req.user.sub);
  }

  @Patch(':id')
  @Permissions('comunicaciones:write')
  updateComunicado(@Param('id') id: string, @Body() dto: UpdateComunicadoDto) {
    return this.service.updateComunicado(id, dto);
  }

  @Patch(':id/marcar-leido')
  @Permissions('comunicaciones:read')
  marcarLeido(@Param('id') id: string, @Body('apoderadoId') apoderadoId: string) {
    return this.service.marcarLeido(id, apoderadoId);
  }
}
