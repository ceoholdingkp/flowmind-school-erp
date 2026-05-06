import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AsistenciaService } from './asistencia.service';
import { BulkAsistenciaDto, UpdateAsistenciaDto, AsistenciaQueryDto } from './dto/asistencia.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('asistencia')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Post('bulk')
  @Permissions('asistencia:write')
  registrarBulk(@Body() dto: BulkAsistenciaDto, @CurrentUser() user: JwtPayload) {
    return this.asistenciaService.registrarBulk(dto, user.sub);
  }

  @Get('resumen/diario')
  @Permissions('asistencia:read')
  getResumenDiario(@Query('fecha') fecha?: string) {
    return this.asistenciaService.getResumenDiario(fecha);
  }

  @Get('resumen/mensual')
  @Permissions('asistencia:read')
  getResumenMensual(
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    const mesNum = parseInt(mes ?? String(new Date().getMonth() + 1), 10);
    const anioNum = parseInt(anio ?? String(new Date().getFullYear()), 10);
    return this.asistenciaService.getResumenMensual(mesNum, anioNum);
  }

  @Get('alertas')
  @Permissions('asistencia:read')
  getAlertasAsistencia() {
    return this.asistenciaService.getAlertasAsistencia();
  }

  @Get('dashboard')
  @Permissions('asistencia:dashboard')
  getDashboard() {
    return this.asistenciaService.getDashboard();
  }

  @Get('export/sige')
  @Permissions('asistencia:export')
  async exportSIGE(@Query('mes') mes: string, @Query('anio') anio: string, @Res() res: Response) {
    const mesNum = parseInt(mes ?? String(new Date().getMonth() + 1));
    const anioNum = parseInt(anio ?? String(new Date().getFullYear()));
    const buffer = await this.asistenciaService.exportSIGE(mesNum, anioNum);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="asistencia-sige-${anioNum}-${mesNum}.xlsx"`);
    res.send(buffer);
  }

  @Get('curso/:cursoId')
  @Permissions('asistencia:read')
  getAsistenciaCurso(@Param('cursoId') cursoId: string, @Query('fecha') fecha?: string) {
    return this.asistenciaService.getAsistenciaCurso(cursoId, fecha);
  }

  @Get('alumno/:alumnoId')
  @Permissions('asistencia:read')
  getHistorialAlumno(@Param('alumnoId') alumnoId: string, @Query() query: AsistenciaQueryDto) {
    return this.asistenciaService.getHistorialAlumno(alumnoId, query);
  }

  @Patch(':id')
  @Permissions('asistencia:write')
  update(@Param('id') id: string, @Body() dto: UpdateAsistenciaDto, @CurrentUser() user: JwtPayload) {
    return this.asistenciaService.update(id, dto, user.sub);
  }

  @Post(':id/justificar')
  @Permissions('asistencia:write')
  @UseInterceptors(FileInterceptor('documento'))
  justificar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.asistenciaService.justificarConDocumento(id, file, user.sub);
  }
}
