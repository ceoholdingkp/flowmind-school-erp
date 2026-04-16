import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, UseInterceptors, UploadedFile,
  Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AlumnosService } from './alumnos.service';
import {
  CreateAlumnoDto, UpdateAlumnoDto, RetirarAlumnoDto,
  CreateApoderadoDto, AlumnoQueryDto,
} from './dto/alumnos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('alumnos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AlumnosController {
  constructor(private readonly alumnosService: AlumnosService) {}

  @Get()
  @Permissions('alumnos:read')
  findAll(@Query() query: AlumnoQueryDto) {
    return this.alumnosService.findAll(query);
  }

  @Get('exportar-sige')
  @Permissions('alumnos:export:sige')
  async exportarSIGE(@Res() res: Response) {
    const buffer = await this.alumnosService.exportarSIGE();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="alumnos-sige-${Date.now()}.xlsx"`);
    res.send(buffer);
  }

  @Get(':id')
  @Permissions('alumnos:read')
  findOne(@Param('id') id: string) {
    return this.alumnosService.findOne(id);
  }

  @Post()
  @Permissions('alumnos:write')
  create(@Body() dto: CreateAlumnoDto, @CurrentUser() user: JwtPayload) {
    return this.alumnosService.create(dto, user.sub);
  }

  @Patch(':id')
  @Permissions('alumnos:write')
  update(@Param('id') id: string, @Body() dto: UpdateAlumnoDto, @CurrentUser() user: JwtPayload) {
    return this.alumnosService.update(id, dto, user.sub);
  }

  @Post(':id/retirar')
  @Permissions('alumnos:retirar')
  @HttpCode(HttpStatus.OK)
  retirar(@Param('id') id: string, @Body() dto: RetirarAlumnoDto, @CurrentUser() user: JwtPayload) {
    return this.alumnosService.retirar(id, dto, user.sub);
  }

  @Delete(':id')
  @Permissions('alumnos:write')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.alumnosService.softDelete(id, user.sub);
  }

  @Get(':id/apoderados')
  @Permissions('alumnos:read')
  getApoderados(@Param('id') id: string) {
    return this.alumnosService.getApoderados(id);
  }

  @Post(':id/apoderados')
  @Permissions('alumnos:write')
  addApoderado(@Param('id') id: string, @Body() dto: CreateApoderadoDto, @CurrentUser() user: JwtPayload) {
    return this.alumnosService.addApoderado(id, dto, user.sub);
  }

  @Post('importar')
  @Permissions('alumnos:import')
  @UseInterceptors(FileInterceptor('file'))
  importar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    if (!file) throw new Error('No se proporcionó archivo');
    return this.alumnosService.importarExcel(file.buffer, user.sub);
  }
}
