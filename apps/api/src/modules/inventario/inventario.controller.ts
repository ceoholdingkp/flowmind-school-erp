import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateBienDto, UpdateBienDto, DarDeBajaDto, BienQueryDto } from './inventario.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bienes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Get('dashboard')
  @Permissions('inventario:read')
  getDashboard() { return this.service.getDashboard(); }

  @Get()
  @Permissions('inventario:read')
  findAll(@Query() query: BienQueryDto) { return this.service.findAll(query); }

  @Get(':id')
  @Permissions('inventario:read')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Permissions('inventario:write')
  create(@Body() body: CreateBienDto) { return this.service.create(body); }

  @Patch(':id')
  @Permissions('inventario:write')
  update(@Param('id') id: string, @Body() body: UpdateBienDto) { return this.service.update(id, body); }

  @Post(':id/baja')
  @Permissions('inventario:baja')
  darDeBaja(@Param('id') id: string, @Body() body: DarDeBajaDto, @CurrentUser() user: any) {
    return this.service.darDeBaja(id, body, user.sub);
  }
}
