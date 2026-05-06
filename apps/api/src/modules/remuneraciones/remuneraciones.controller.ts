import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { RemuneracionesService } from './remuneraciones.service';
import {
  GenerarMesDto, LiquidacionesQueryDto, AprobacionMesDto, MarcarPagadasDto,
  UpdateLiquidacionDto, UpdateConfiguracionDto,
} from './dto/remuneraciones.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('remuneraciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RemuneracionesController {
  constructor(private readonly remuneracionesService: RemuneracionesService) {}

  // ─── CONFIGURACION ───────────────────────────────────────────

  @Get('configuracion')
  @Permissions('remuneraciones:read')
  getConfiguracion() {
    return this.remuneracionesService.getConfiguracion();
  }

  @Patch('configuracion/:id')
  @Permissions('remuneraciones:write')
  updateConfiguracion(@Param('id') id: string, @Body() dto: UpdateConfiguracionDto) {
    return this.remuneracionesService.updateConfiguracion(id, dto);
  }

  // ─── PREVIRED ────────────────────────────────────────────────

  @Get('previred')
  @Permissions('remuneraciones:read')
  getPreviredData(@Query('mes') mes: string, @Query('anio') anio: string) {
    const mesN = parseInt(mes ?? String(new Date().getMonth() + 1), 10);
    const anioN = parseInt(anio ?? String(new Date().getFullYear()), 10);
    return this.remuneracionesService.getPreviredData(mesN, anioN);
  }

  // ─── RESUMEN ANUAL ────────────────────────────────────────────

  @Get('resumen')
  @Permissions('remuneraciones:read')
  getResumenAnual(@Query('anio') anio?: string) {
    return this.remuneracionesService.getResumenAnual(parseInt(anio ?? String(new Date().getFullYear()), 10));
  }

  // ─── LIBRO DE REMUNERACIONES ──────────────────────────────────

  @Get('libro-remuneraciones')
  @Permissions('remuneraciones:read')
  getLibro(@Query('mes') mes: string, @Query('anio') anio: string) {
    const mesN = parseInt(mes ?? String(new Date().getMonth() + 1), 10);
    const anioN = parseInt(anio ?? String(new Date().getFullYear()), 10);
    return this.remuneracionesService.getLibroRemuneraciones(mesN, anioN);
  }

  // ─── GENERAR MES ─────────────────────────────────────────────

  @Post('liquidaciones/generar')
  @Permissions('remuneraciones:write')
  generarMes(@Body() dto: GenerarMesDto) {
    return this.remuneracionesService.generarMes(dto);
  }

  // ─── APROBAR MES ─────────────────────────────────────────────

  @Post('liquidaciones/aprobar')
  @Permissions('remuneraciones:write')
  aprobarMes(@Body() dto: AprobacionMesDto) {
    return this.remuneracionesService.aprobarMes(dto);
  }

  // ─── MARCAR PAGADAS ──────────────────────────────────────────

  @Post('liquidaciones/marcar-pagadas')
  @Permissions('remuneraciones:write')
  marcarPagadas(@Body() dto: MarcarPagadasDto) {
    return this.remuneracionesService.marcarPagadas(dto);
  }

  // ─── LISTAR ──────────────────────────────────────────────────

  @Get('liquidaciones')
  @Permissions('remuneraciones:read')
  findAll(@Query() query: LiquidacionesQueryDto) {
    return this.remuneracionesService.findAll(query);
  }

  // ─── DETALLE ─────────────────────────────────────────────────

  @Get('liquidaciones/:id')
  @Permissions('remuneraciones:read')
  findOne(@Param('id') id: string) {
    return this.remuneracionesService.findOne(id);
  }

  // ─── EDITAR ──────────────────────────────────────────────────

  @Patch('liquidaciones/:id')
  @Permissions('remuneraciones:write')
  update(@Param('id') id: string, @Body() dto: UpdateLiquidacionDto) {
    return this.remuneracionesService.update(id, dto);
  }
}
