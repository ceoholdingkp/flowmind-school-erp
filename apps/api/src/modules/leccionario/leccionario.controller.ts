import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeccionarioService } from './leccionario.service';
import {
  CreateLeccionarioDto,
  UpdateLeccionarioDto,
  RevisarLeccionarioDto,
  LeccionarioQueryDto,
  ResumenDocenteQueryDto,
} from './dto/leccionario.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('leccionario')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeccionarioController {
  constructor(private readonly leccionarioService: LeccionarioService) {}

  // ─── LISTAR ──────────────────────────────────────────────────
  @Get()
  @Permissions('leccionario:read')
  findAll(@Query() query: LeccionarioQueryDto) {
    return this.leccionarioService.findAll(query);
  }

  // ─── RESUMEN DOCENTE ─────────────────────────────────────────
  @Get('docente/:docenteId/resumen')
  @Permissions('leccionario:read')
  getResumenDocente(@Param('docenteId') docenteId: string, @Query() query: ResumenDocenteQueryDto) {
    return this.leccionarioService.getResumenDocente(docenteId, query);
  }

  // ─── VER UNO ─────────────────────────────────────────────────
  @Get(':id')
  @Permissions('leccionario:read')
  findOne(@Param('id') id: string) {
    return this.leccionarioService.findOne(id);
  }

  // ─── CREAR ───────────────────────────────────────────────────
  @Post()
  @Permissions('leccionario:write')
  create(@Body() dto: CreateLeccionarioDto, @CurrentUser() user: any) {
    return this.leccionarioService.create(dto, user.sub);
  }

  // ─── ACTUALIZAR ──────────────────────────────────────────────
  @Patch(':id')
  @Permissions('leccionario:write')
  update(@Param('id') id: string, @Body() dto: UpdateLeccionarioDto, @CurrentUser() user: any) {
    return this.leccionarioService.update(id, dto, user.sub);
  }

  // ─── FIRMAR ──────────────────────────────────────────────────
  @Post(':id/firmar')
  @Permissions('leccionario:write')
  firmar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leccionarioService.firmar(id, user.sub);
  }

  // ─── REVISAR UTP ─────────────────────────────────────────────
  @Post(':id/revisar')
  @Permissions('leccionario:revision')
  revisar(@Param('id') id: string, @Body() dto: RevisarLeccionarioDto, @CurrentUser() user: any) {
    return this.leccionarioService.revisar(id, dto, user.sub);
  }
}
