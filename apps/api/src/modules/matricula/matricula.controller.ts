import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { IsString, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class SimularDto {
  @IsInt() @Type(() => Number) totalAlumnos: number;
  @IsInt() @Type(() => Number) pie: number;
  @IsInt() @Type(() => Number) prioritarios: number;
  @IsInt() @Type(() => Number) preferentes: number;
  @IsOptional() @IsString() tipoEnsenanza?: string;
}

@Controller('matricula')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MatriculaController {
  constructor(private readonly service: MatriculaService) {}

  @Get('resumen')
  @Permissions('matricula:read')
  getResumen() { return this.service.getResumenMatriculas(); }

  @Get('proyeccion')
  @Permissions('matricula:read')
  getProyeccion(@Query('anio') anio: string) {
    return this.service.getProyeccion(parseInt(anio) || new Date().getFullYear());
  }

  @Post('simular')
  @Permissions('matricula:read')
  simular(@Body() body: SimularDto) {
    return this.service.simular({
      ...body,
      tipoEnsenanza: body.tipoEnsenanza ?? 'BASICA',
    });
  }
}
