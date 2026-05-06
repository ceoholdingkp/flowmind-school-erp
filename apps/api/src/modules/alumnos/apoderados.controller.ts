import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApoderadosService } from './apoderados.service';
import {
  CreateApoderadoV2Dto, UpdateApoderadoDto, ApoderadoQueryDto, CreateContactoEmergenciaDto,
} from './dto/apoderados.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('apoderados')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApoderadosController {
  constructor(private readonly service: ApoderadosService) {}

  // GET /api/v1/apoderados
  @Get()
  @Permissions('alumnos:read')
  findAll(@Query() query: ApoderadoQueryDto) {
    return this.service.findAll(query);
  }

  // GET /api/v1/apoderados/:id
  @Get(':id')
  @Permissions('alumnos:read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // POST /api/v1/apoderados
  @Post()
  @Permissions('alumnos:write')
  create(@Body() dto: CreateApoderadoV2Dto) {
    return this.service.create(dto);
  }

  // PATCH /api/v1/apoderados/:id
  @Patch(':id')
  @Permissions('alumnos:write')
  update(@Param('id') id: string, @Body() dto: UpdateApoderadoDto) {
    return this.service.update(id, dto);
  }
}

// Separate controller for contactos emergencia (nested under alumnos)
@Controller('alumnos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactosEmergenciaController {
  constructor(private readonly service: ApoderadosService) {}

  // POST /api/v1/alumnos/:id/contactos
  @Post(':id/contactos')
  @Permissions('alumnos:write')
  addContacto(
    @Param('id') alumnoId: string,
    @Body() dto: CreateContactoEmergenciaDto,
  ) {
    return this.service.addContacto(alumnoId, dto);
  }

  // DELETE /api/v1/alumnos/:id/contactos/:cid
  @Delete(':id/contactos/:cid')
  @Permissions('alumnos:write')
  @HttpCode(HttpStatus.OK)
  deleteContacto(@Param('id') alumnoId: string, @Param('cid') cid: string) {
    return this.service.deleteContacto(alumnoId, cid);
  }
}
