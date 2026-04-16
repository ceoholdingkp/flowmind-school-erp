import {
  Controller, Get, Post, Body, Param, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { RemuneracionesService } from '../remuneraciones.service';
import {
  GenerarLiquidacionDto, GenerarMasivaDto, LiquidacionQueryDto, AprobarLiquidacionDto,
} from '../dto/remuneraciones.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('rrhh/remuneraciones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RemuneracionesController {
  constructor(private readonly remuneracionesService: RemuneracionesService) {}

  // Export Previred
  @Get('export/previred')
  @Permissions('rrhh:export')
  async exportPrevired(
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Res() res: Response,
  ) {
    const buffer = await this.remuneracionesService.exportPrevired(
      parseInt(mes), parseInt(anio),
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="previred_${mes}_${anio}.xlsx"`);
    res.send(buffer);
  }

  // Export LRE
  @Get('export/lre')
  @Permissions('rrhh:export')
  async exportLRE(
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Res() res: Response,
  ) {
    const buffer = await this.remuneracionesService.exportLRE(
      parseInt(mes), parseInt(anio),
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="lre_${mes}_${anio}.xlsx"`);
    res.send(buffer);
  }

  // Listar liquidaciones
  @Get()
  @Permissions('rrhh:liquidaciones:read')
  findAll(@Query() query: LiquidacionQueryDto) {
    return this.remuneracionesService.findAll(query);
  }

  // Ver una liquidación
  @Get(':id')
  @Permissions('rrhh:liquidaciones:read')
  findOne(@Param('id') id: string) {
    return this.remuneracionesService.findOne(id);
  }

  // Generar liquidación individual
  @Post()
  @Permissions('rrhh:liquidaciones:write')
  generar(@Body() dto: GenerarLiquidacionDto, @CurrentUser() user: any) {
    return this.remuneracionesService.generar(dto, user.sub);
  }

  // Generación masiva
  @Post('masiva')
  @Permissions('rrhh:liquidaciones:write')
  generarMasiva(@Body() dto: GenerarMasivaDto, @CurrentUser() user: any) {
    return this.remuneracionesService.generarMasiva(dto, user.sub);
  }

  // Aprobar liquidación
  @Post(':id/aprobar')
  @Permissions('rrhh:liquidaciones:aprobar')
  aprobar(@Param('id') id: string, @Body() dto: AprobarLiquidacionDto, @CurrentUser() user: any) {
    return this.remuneracionesService.aprobar(id, dto, user.sub);
  }
}
