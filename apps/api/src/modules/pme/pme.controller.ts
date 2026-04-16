import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PMEService } from './pme.service';
import { CreatePMEDto, UpdatePMEDto, CreateAccionPMEDto, UpdateAccionPMEDto, AprobarPMEDto } from './pme.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('pme')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PMEController {
  constructor(private readonly service: PMEService) {}

  @Get()
  @Permissions('pme:read')
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Permissions('pme:read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/resumen')
  @Permissions('pme:read')
  getResumen(@Param('id') id: string) { return this.service.getResumenPorDimension(id); }

  @Post()
  @Permissions('pme:write')
  create(@Body() body: CreatePMEDto) { return this.service.create(body); }

  @Post(':id/aprobar')
  @Permissions('pme:aprobar')
  aprobar(@Param('id') id: string, @Body() body: AprobarPMEDto) { return this.service.aprobar(id, body); }

  @Patch(':id')
  @Permissions('pme:write')
  updateEstado(@Param('id') id: string, @Body() body: UpdatePMEDto) { return this.service.updateEstado(id, body); }

  // Acciones
  @Post(':id/acciones')
  @Permissions('pme:write')
  createAccion(@Param('id') pmeId: string, @Body() body: CreateAccionPMEDto) {
    return this.service.createAccion(pmeId, body);
  }

  @Patch('acciones/:accionId')
  @Permissions('pme:write')
  updateAccion(@Param('accionId') accionId: string, @Body() body: UpdateAccionPMEDto) {
    return this.service.updateAccion(accionId, body);
  }

  @Delete('acciones/:accionId')
  @Permissions('pme:write')
  removeAccion(@Param('accionId') accionId: string) { return this.service.removeAccion(accionId); }
}
