import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards,
} from '@nestjs/common';
import { SistemaService } from './sistema.service';
import {
  CreateCursoDto, UpdateCursoDto,
  CreateAsignaturaDto, UpdateAsignaturaDto,
  CreateSalaDto, UpdateSalaDto,
  UpdateEstablecimientoDto,
} from './dto/sistema.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SistemaController {
  constructor(private readonly sistemaService: SistemaService) {}

  // ─── ESTABLECIMIENTO ──────────────────────────────────────────

  @Get('sistema/establecimiento')
  @Permissions('sistema:config:read')
  getEstablecimiento() {
    return this.sistemaService.getEstablecimiento();
  }

  @Patch('sistema/establecimiento')
  @Permissions('sistema:config:write')
  updateEstablecimiento(@Body() dto: UpdateEstablecimientoDto, @CurrentUser() user: JwtPayload) {
    return this.sistemaService.updateEstablecimiento(dto, user.sub);
  }

  // ─── CURSOS ───────────────────────────────────────────────────

  @Get('sistema/cursos')
  @Permissions('sistema:cursos:read')
  getCursos(@Query('anio') anio?: string) {
    return this.sistemaService.getCursos(anio ? parseInt(anio) : undefined);
  }

  @Get('sistema/cursos/:id')
  @Permissions('sistema:cursos:read')
  getCurso(@Param('id') id: string) {
    return this.sistemaService.getCurso(id);
  }

  @Post('sistema/cursos')
  @Permissions('sistema:cursos:write')
  createCurso(@Body() dto: CreateCursoDto, @CurrentUser() user: JwtPayload) {
    return this.sistemaService.createCurso(dto, user.sub);
  }

  @Patch('sistema/cursos/:id')
  @Permissions('sistema:cursos:write')
  updateCurso(@Param('id') id: string, @Body() dto: UpdateCursoDto, @CurrentUser() user: JwtPayload) {
    return this.sistemaService.updateCurso(id, dto, user.sub);
  }

  // ─── ASIGNATURAS ──────────────────────────────────────────────

  @Get('sistema/asignaturas')
  @Permissions('sistema:asignaturas:read')
  getAsignaturas() {
    return this.sistemaService.getAsignaturas();
  }

  @Post('sistema/asignaturas')
  @Permissions('sistema:asignaturas:write')
  createAsignatura(@Body() dto: CreateAsignaturaDto, @CurrentUser() user: JwtPayload) {
    return this.sistemaService.createAsignatura(dto, user.sub);
  }

  @Patch('sistema/asignaturas/:id')
  @Permissions('sistema:asignaturas:write')
  updateAsignatura(@Param('id') id: string, @Body() dto: UpdateAsignaturaDto, @CurrentUser() user: JwtPayload) {
    return this.sistemaService.updateAsignatura(id, dto, user.sub);
  }

  // ─── SALAS ────────────────────────────────────────────────────

  @Get('sistema/salas')
  @Permissions('sistema:config:read')
  getSalas(@Query('establecimientoId') establecimientoId: string) {
    return this.sistemaService.getSalas(establecimientoId);
  }

  @Post('sistema/salas')
  @Permissions('sistema:config:write')
  createSala(@Body() dto: CreateSalaDto, @CurrentUser() user: JwtPayload) {
    return this.sistemaService.createSala(dto, user.sub);
  }

  @Patch('sistema/salas/:id')
  @Permissions('sistema:config:write')
  updateSala(@Param('id') id: string, @Body() dto: UpdateSalaDto, @CurrentUser() user: JwtPayload) {
    return this.sistemaService.updateSala(id, dto, user.sub);
  }
}
