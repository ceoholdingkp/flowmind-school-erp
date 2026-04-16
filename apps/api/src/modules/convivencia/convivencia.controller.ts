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
import { ConvivenciaService } from './convivencia.service';
import {
  CreateAnotacionDto,
  UpdateAnotacionDto,
  ActivarProtocoloDto,
  AddEntrevistaDto,
  AddCompromisoDto,
  UpdateCompromisoDto,
  AnotacionQueryDto,
} from './dto/convivencia.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('convivencia')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConvivenciaController {
  constructor(private readonly convivenciaService: ConvivenciaService) {}

  // ─── LISTAR ANOTACIONES ──────────────────────────────────────
  @Get()
  @Permissions('convivencia:read')
  findAll(@Query() query: AnotacionQueryDto) {
    return this.convivenciaService.findAll(query);
  }

  // ─── RESUMEN DE UN ALUMNO ────────────────────────────────────
  @Get('alumno/:alumnoId/resumen')
  @Permissions('convivencia:read')
  getResumenAlumno(@Param('alumnoId') alumnoId: string) {
    return this.convivenciaService.getResumenAlumno(alumnoId);
  }

  // ─── VER ANOTACIÓN ───────────────────────────────────────────
  @Get(':id')
  @Permissions('convivencia:read')
  findOne(@Param('id') id: string) {
    return this.convivenciaService.findOne(id);
  }

  // ─── CREAR ANOTACIÓN ─────────────────────────────────────────
  @Post()
  @Permissions('convivencia:write')
  create(@Body() dto: CreateAnotacionDto, @CurrentUser() user: any) {
    return this.convivenciaService.create(dto, user.sub);
  }

  // ─── ACTUALIZAR ANOTACIÓN ────────────────────────────────────
  @Patch(':id')
  @Permissions('convivencia:write')
  update(@Param('id') id: string, @Body() dto: UpdateAnotacionDto, @CurrentUser() user: any) {
    return this.convivenciaService.update(id, dto, user.sub);
  }

  // ─── ACTIVAR PROTOCOLO ───────────────────────────────────────
  @Post(':id/protocolo')
  @Permissions('convivencia:protocolos')
  activarProtocolo(@Param('id') id: string, @Body() dto: ActivarProtocoloDto, @CurrentUser() user: any) {
    return this.convivenciaService.activarProtocolo(id, dto, user.sub);
  }

  // ─── ENTREVISTAS ─────────────────────────────────────────────
  @Post(':id/entrevistas')
  @Permissions('convivencia:write')
  addEntrevista(@Param('id') id: string, @Body() dto: AddEntrevistaDto, @CurrentUser() user: any) {
    return this.convivenciaService.addEntrevista(id, dto, user.sub);
  }

  // ─── COMPROMISOS ─────────────────────────────────────────────
  @Post(':id/compromisos')
  @Permissions('convivencia:write')
  addCompromiso(@Param('id') id: string, @Body() dto: AddCompromisoDto, @CurrentUser() user: any) {
    return this.convivenciaService.addCompromiso(id, dto, user.sub);
  }

  @Patch(':id/compromisos')
  @Permissions('convivencia:write')
  updateCompromiso(@Param('id') id: string, @Body() dto: UpdateCompromisoDto, @CurrentUser() user: any) {
    return this.convivenciaService.updateCompromiso(id, dto, user.sub);
  }
}
