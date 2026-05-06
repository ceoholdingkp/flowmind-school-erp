import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AcademicoService } from './academico.service';
import {
  CreateAsignaturaDto, UpdateAsignaturaDto, AsignaturaDocenteDto,
  CreateEvaluacionDto, UpdateEvaluacionDto, EvaluacionQueryDto,
  RegistrarNotasBulkDto,
} from './dto/academico.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('academico')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AcademicoController {
  constructor(private readonly academicoService: AcademicoService) {}

  // ─── ASIGNATURAS ─────────────────────────────────────────────

  @Get('asignaturas')
  @Permissions('academico:read')
  getAsignaturas(@Query('todas') todas?: string) {
    return this.academicoService.getAsignaturas(todas !== 'true');
  }

  @Post('asignaturas')
  @Permissions('academico:write')
  createAsignatura(@Body() dto: CreateAsignaturaDto) {
    return this.academicoService.createAsignatura(dto);
  }

  @Patch('asignaturas/:id')
  @Permissions('academico:write')
  updateAsignatura(@Param('id') id: string, @Body() dto: UpdateAsignaturaDto) {
    return this.academicoService.updateAsignatura(id, dto);
  }

  // ─── DOCENTES-CURSO ──────────────────────────────────────────

  @Get('docentes-curso')
  @Permissions('academico:read')
  getDocentesCurso(@Query('anio') anio?: string) {
    return this.academicoService.getDocentesCurso(parseInt(anio ?? String(new Date().getFullYear()), 10));
  }

  @Post('docentes-curso')
  @Permissions('academico:write')
  createDocenteCurso(@Body() dto: AsignaturaDocenteDto) {
    return this.academicoService.createDocenteCurso(dto);
  }

  // ─── EVALUACIONES ────────────────────────────────────────────

  @Get('evaluaciones')
  @Permissions('academico:read')
  getEvaluaciones(@Query() query: EvaluacionQueryDto) {
    return this.academicoService.getEvaluaciones(query);
  }

  @Post('evaluaciones')
  @Permissions('academico:write')
  createEvaluacion(@Body() dto: CreateEvaluacionDto) {
    return this.academicoService.createEvaluacion(dto);
  }

  @Patch('evaluaciones/:id')
  @Permissions('academico:write')
  updateEvaluacion(@Param('id') id: string, @Body() dto: UpdateEvaluacionDto) {
    return this.academicoService.updateEvaluacion(id, dto);
  }

  // ─── NOTAS ───────────────────────────────────────────────────

  @Get('notas/curso/:cursoId/asignatura/:asignaturaId')
  @Permissions('academico:read')
  getNotasCursoAsignatura(
    @Param('cursoId') cursoId: string,
    @Param('asignaturaId') asignaturaId: string,
    @Query('semestre') semestre?: string,
    @Query('anio') anio?: string,
  ) {
    return this.academicoService.getNotasCursoAsignatura(
      cursoId,
      asignaturaId,
      semestre ? parseInt(semestre, 10) : undefined,
      anio ? parseInt(anio, 10) : undefined,
    );
  }

  @Post('notas/evaluacion/:evaluacionId')
  @Permissions('academico:write')
  registrarNotasBulk(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: RegistrarNotasBulkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.academicoService.registrarNotasBulk(evaluacionId, dto, user.sub);
  }

  @Get('notas/alumno/:alumnoId')
  @Permissions('academico:read')
  getNotasAlumno(
    @Param('alumnoId') alumnoId: string,
    @Query('semestre') semestre?: string,
    @Query('anio') anio?: string,
  ) {
    return this.academicoService.getNotasAlumno(
      alumnoId,
      semestre ? parseInt(semestre, 10) : undefined,
      anio ? parseInt(anio, 10) : undefined,
    );
  }

  @Get('notas/informe/:cursoId')
  @Permissions('academico:read')
  getInformeCurso(
    @Param('cursoId') cursoId: string,
    @Query('semestre') semestre?: string,
    @Query('anio') anio?: string,
  ) {
    return this.academicoService.getInformeCurso(
      cursoId,
      semestre ? parseInt(semestre, 10) : undefined,
      anio ? parseInt(anio, 10) : undefined,
    );
  }
}
