import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { MatriculasV2Service } from './matriculas-v2.service';
import { CrearMatriculaDto, ActualizarMatriculaDto, MatriculaQueryDto } from './dto/matriculas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('matriculas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MatriculasV2Controller {
  constructor(private readonly service: MatriculasV2Service) {}

  // GET /api/v1/matriculas
  @Get()
  @Permissions('matricula:read')
  findAll(@Query() query: MatriculaQueryDto) {
    return this.service.findAll(query);
  }

  // GET /api/v1/matriculas/resumen
  @Get('resumen')
  @Permissions('matricula:read')
  getResumen(@Query('anio') anio?: string) {
    return this.service.getResumen(anio ? parseInt(anio) : undefined);
  }

  // GET /api/v1/matriculas/reporte-sige
  @Get('reporte-sige')
  @Permissions('alumnos:export:sige')
  reporteSige(@Query('anio') anio?: string) {
    return this.service.reporteSige(anio ? parseInt(anio) : undefined);
  }

  // POST /api/v1/matriculas
  @Post()
  @Permissions('alumnos:write')
  create(@Body() dto: CrearMatriculaDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  // PATCH /api/v1/matriculas/:id
  @Patch(':id')
  @Permissions('alumnos:write')
  update(
    @Param('id') id: string,
    @Body() dto: ActualizarMatriculaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }
}
