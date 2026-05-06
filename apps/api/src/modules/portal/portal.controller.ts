import { Controller, Get, Post, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PortalJwtAuthGuard } from '../../common/guards/portal-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ComunicacionesService } from '../comunicaciones/comunicaciones.service';

// ── Portal V1: auth via Usuario (APODERADO rol) ──────────────
@Controller('portal')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly comunicacionesService: ComunicacionesService,
  ) {}

  @Get('me')
  @Permissions('portal:notas')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.portalService.getMe(user.sub);
  }

  @Get('notas')
  @Permissions('portal:notas')
  getNotas(@CurrentUser() user: JwtPayload, @Query('alumnoId') alumnoId?: string) {
    return this.portalService.getNotas(user.sub, alumnoId);
  }

  @Get('asistencia')
  @Permissions('portal:asistencia')
  getAsistencia(@CurrentUser() user: JwtPayload, @Query('alumnoId') alumnoId?: string) {
    return this.portalService.getAsistencia(user.sub, alumnoId);
  }

  @Get('pagos')
  @Permissions('portal:pagos')
  getPagos(@CurrentUser() user: JwtPayload, @Query('alumnoId') alumnoId?: string) {
    return this.portalService.getPagos(user.sub, alumnoId);
  }

  @Get('comunicados')
  @Permissions('comunicaciones:read')
  getComunicados(@CurrentUser() user: JwtPayload) {
    return this.comunicacionesService.getComunicadosApoderado(user.sub);
  }

  @Post('comunicados/:id/confirmar')
  @Permissions('comunicaciones:read')
  confirmarLectura(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.comunicacionesService.confirmarLectura(id, user.sub);
  }

  @Get('mensajes')
  @Permissions('portal:mensajes')
  getMensajesPortal(@CurrentUser() user: JwtPayload) {
    return this.comunicacionesService.getMensajesApoderado(user.sub);
  }
}

// ── Portal V2: auth directo via Apoderado (RUT + password) ───
@Controller('portal')
@UseGuards(PortalJwtAuthGuard)
export class PortalV2Controller {
  constructor(
    private readonly portalService: PortalService,
    private readonly comunicacionesService: ComunicacionesService,
  ) {}

  @Get('hijos')
  getHijos(@Req() req: any) {
    return this.portalService.getHijos(req.user.apoderadoId);
  }

  @Get('hijos/:alumnoId/notas')
  getNotasHijo(
    @Req() req: any,
    @Param('alumnoId') alumnoId: string,
    @Query('semestre') semestre?: string,
  ) {
    return this.portalService.getNotasHijo(req.user.apoderadoId, alumnoId, semestre);
  }

  @Get('hijos/:alumnoId/asistencia')
  getAsistenciaHijo(
    @Req() req: any,
    @Param('alumnoId') alumnoId: string,
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    return this.portalService.getAsistenciaHijo(req.user.apoderadoId, alumnoId, mes, anio);
  }

  @Get('hijos/:alumnoId/anotaciones')
  getAnotacionesHijo(@Req() req: any, @Param('alumnoId') alumnoId: string) {
    return this.portalService.getAnotacionesHijo(req.user.apoderadoId, alumnoId);
  }

  @Get('hijos/:alumnoId/informe')
  getInformeHijo(@Req() req: any, @Param('alumnoId') alumnoId: string) {
    return this.portalService.getInformeHijo(req.user.apoderadoId, alumnoId);
  }

  @Get('v2/comunicados')
  getComunicados(@Req() req: any) {
    return this.comunicacionesService.getComunicadosApoderado(req.user.apoderadoId);
  }

  @Post('v2/comunicados/:id/confirmar')
  confirmarLectura(@Req() req: any, @Param('id') id: string) {
    return this.comunicacionesService.confirmarLectura(id, req.user.apoderadoId);
  }

  @Get('v2/mensajes')
  getMensajes(@Req() req: any) {
    return this.comunicacionesService.getMensajesApoderado(req.user.apoderadoId);
  }

  @Post('mensajes/responder/:id')
  responderMensaje(
    @Req() req: any,
    @Param('id') mensajeId: string,
    @Body('respuesta') respuesta: string,
  ) {
    return this.portalService.responderMensaje(req.user.apoderadoId, mensajeId, respuesta);
  }
}
