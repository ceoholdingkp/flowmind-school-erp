import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CumplimientoService } from './cumplimiento.service';
import {
  CreateItemCumplimientoDto, UpdateItemCumplimientoDto,
  CreateFiscalizacionDto, UpdateFiscalizacionDto, ItemQueryDto,
} from './cumplimiento.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('cumplimiento')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CumplimientoController {
  constructor(private readonly service: CumplimientoService) {}

  @Get('resumen')
  @Permissions('cumplimiento:read')
  getResumen() { return this.service.getResumen(); }

  @Get('items')
  @Permissions('cumplimiento:read')
  findItems(@Query() query: ItemQueryDto) { return this.service.findItems(query); }

  @Post('items')
  @Permissions('cumplimiento:write')
  createItem(@Body() body: CreateItemCumplimientoDto) { return this.service.createItem(body); }

  @Patch('items/:id')
  @Permissions('cumplimiento:write')
  updateItem(@Param('id') id: string, @Body() body: UpdateItemCumplimientoDto) {
    return this.service.updateItem(id, body);
  }

  @Get('fiscalizaciones')
  @Permissions('cumplimiento:read')
  findFiscalizaciones() { return this.service.findFiscalizaciones(); }

  @Post('fiscalizaciones')
  @Permissions('cumplimiento:write')
  createFiscalizacion(@Body() body: CreateFiscalizacionDto) { return this.service.createFiscalizacion(body); }

  @Patch('fiscalizaciones/:id')
  @Permissions('cumplimiento:write')
  updateFiscalizacion(@Param('id') id: string, @Body() body: UpdateFiscalizacionDto) {
    return this.service.updateFiscalizacion(id, body);
  }
}
