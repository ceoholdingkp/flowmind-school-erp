import {
  Controller, Get, Post, Body, Query, Res, UseGuards, Request, Ip,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { EdeService } from './ede.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('ede')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EdeController {
  constructor(private readonly service: EdeService) {}

  @Post('validar')
  @Permissions('ede:read')
  validar(@Body('anio') anio: number) {
    return this.service.validar(anio ?? new Date().getFullYear());
  }

  @Post('exportar')
  @Permissions('ede:write')
  async exportar(
    @Body('anio') anio: number,
    @Body('rbd') rbd: string,
    @Res() res: Response,
  ) {
    const zip = await this.service.exportarZip(
      anio ?? new Date().getFullYear(),
      rbd ?? '00000',
    );
    const filename = `EDE_${rbd}_${anio}.zip`;
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zip.length,
    });
    res.end(zip);
  }

  @Post('exportar/json')
  @Permissions('ede:read')
  exportarJson(@Body('anio') anio: number, @Body('rbd') rbd: string) {
    return this.service.exportar(anio ?? new Date().getFullYear(), rbd ?? '00000');
  }

  @Post('firma-otp')
  @Permissions('ede:write')
  @Throttle({ otp: { ttl: 60000, limit: 5 } })
  firmaOtp(
    @Body('rut') rut: string,
    @Body('otp') otp: string,
    @Body('cursoId') cursoId: string,
    @Body('tipo') tipo: string,
    @Body('funcionarioId') funcionarioId: string,
    @Request() req: any,
    @Ip() ip: string,
  ) {
    // funcionarioId from body, fallback resolves via userId in service
    return this.service.firmaOtp(rut, otp, funcionarioId ?? req.user.sub, cursoId, tipo ?? 'ASISTENCIA', ip);
  }

  @Get('firmas/dia')
  @Permissions('ede:read')
  getFirmasDia(@Query('fecha') fecha?: string) {
    return this.service.getFirmasDia(fecha);
  }

  @Get('firmas/mes')
  @Permissions('ede:read')
  getFirmasMes(@Query('mes') mes: string, @Query('anio') anio: string) {
    const now = new Date();
    return this.service.getFirmasMes(
      mes ? parseInt(mes) : now.getMonth() + 1,
      anio ? parseInt(anio) : now.getFullYear(),
    );
  }

  @Get('cursos/pendientes')
  @Permissions('ede:read')
  getCursosPendientes(@Query('fecha') fecha?: string) {
    return this.service.getCursosPendientesFirma(fecha);
  }
}
