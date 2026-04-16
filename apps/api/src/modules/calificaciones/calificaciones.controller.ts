import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CalificacionesService } from './calificaciones.service';
import {
  CreateNotaDto,
  UpdateNotaDto,
  BulkCreateNotaDto,
  NotaQueryDto,
  CerrarPeriodoDto,
  DashboardNotasQueryDto,
} from './dto/calificaciones.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('calificaciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalificacionesController {
  constructor(private readonly calificacionesService: CalificacionesService) {}

  // ─── DASHBOARD ───────────────────────────────────────────────
  @Get('dashboard')
  @Permissions('notas:dashboard')
  getDashboard(@Query() query: DashboardNotasQueryDto) {
    return this.calificacionesService.getDashboard(query);
  }

  // ─── EXPORT ACTAS SIGE ───────────────────────────────────────
  @Get('export/actas')
  @Permissions('notas:export')
  async exportActas(
    @Query('semestre') semestre: string,
    @Query('anio') anio: string,
    @Query('cursoId') cursoId: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.calificacionesService.exportActas(
      parseInt(semestre ?? '1'),
      parseInt(anio ?? String(new Date().getFullYear())),
      cursoId,
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="actas_${semestre}_${anio}.xlsx"`);
    res.send(buffer);
  }

  // ─── IMPORT MASIVO ───────────────────────────────────────────
  @Post('import')
  @Permissions('notas:import')
  bulkCreate(@Body() dto: BulkCreateNotaDto, @CurrentUser() user: any) {
    return this.calificacionesService.bulkCreate(dto, user.sub);
  }

  // ─── CERRAR PERIODO ──────────────────────────────────────────
  @Post('cerrar-periodo')
  @Permissions('notas:bloquear')
  cerrarPeriodo(@Body() dto: CerrarPeriodoDto, @CurrentUser() user: any) {
    return this.calificacionesService.cerrarPeriodo(dto, user.sub);
  }

  // ─── PROMEDIOS DE UN ALUMNO ──────────────────────────────────
  @Get('alumno/:alumnoId/promedios')
  @Permissions('notas:read')
  getPromedios(
    @Param('alumnoId') alumnoId: string,
    @Query('semestre') semestre: string | undefined,
    @Query('anio') anio: string | undefined,
  ) {
    return this.calificacionesService.getPromedios(
      alumnoId,
      semestre ? parseInt(semestre) : undefined,
      anio ? parseInt(anio) : undefined,
    );
  }

  // ─── LISTAR NOTAS ────────────────────────────────────────────
  @Get()
  @Permissions('notas:read')
  findAll(@Query() query: NotaQueryDto) {
    return this.calificacionesService.findAll(query);
  }

  // ─── VER NOTA ────────────────────────────────────────────────
  @Get(':id')
  @Permissions('notas:read')
  findOne(@Param('id') id: string) {
    return this.calificacionesService.findOne(id);
  }

  // ─── INGRESAR NOTA ───────────────────────────────────────────
  @Post()
  @Permissions('notas:write')
  create(@Body() dto: CreateNotaDto, @CurrentUser() user: any) {
    return this.calificacionesService.create(dto, user.sub);
  }

  // ─── ACTUALIZAR NOTA ─────────────────────────────────────────
  @Patch(':id')
  @Permissions('notas:write')
  update(@Param('id') id: string, @Body() dto: UpdateNotaDto, @CurrentUser() user: any) {
    return this.calificacionesService.update(id, dto, user.sub);
  }

  // ─── ELIMINAR NOTA ───────────────────────────────────────────
  @Delete(':id')
  @Permissions('notas:write')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.calificacionesService.remove(id, user.sub);
  }
}
