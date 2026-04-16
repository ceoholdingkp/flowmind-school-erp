import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProveedoresService } from '../proveedores.service';
import { CreateProveedorDto, UpdateProveedorDto, CreateContratoDto, ProveedorQueryDto } from '../dto/proveedores.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('finanzas/proveedores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get('contratos/por-vencer')
  @Permissions('finanzas:proveedores')
  getContratosPorVencer(@CurrentUser() user: any) {
    return this.proveedoresService.getContratosPorVencer(user.sub);
  }

  @Get()
  @Permissions('finanzas:proveedores')
  findAll(@Query() query: ProveedorQueryDto) {
    return this.proveedoresService.findAllProveedores(query);
  }

  @Get(':id')
  @Permissions('finanzas:proveedores')
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOneProveedor(id);
  }

  @Post()
  @Permissions('finanzas:proveedores')
  create(@Body() dto: CreateProveedorDto, @CurrentUser() user: any) {
    return this.proveedoresService.createProveedor(dto, user.sub);
  }

  @Patch(':id')
  @Permissions('finanzas:proveedores')
  update(@Param('id') id: string, @Body() dto: UpdateProveedorDto, @CurrentUser() user: any) {
    return this.proveedoresService.updateProveedor(id, dto, user.sub);
  }

  @Get(':id/contratos')
  @Permissions('finanzas:proveedores')
  getContratos(@Param('id') id: string) {
    return this.proveedoresService.findContratosProveedor(id);
  }

  @Post(':id/contratos')
  @Permissions('finanzas:proveedores')
  createContrato(@Param('id') id: string, @Body() dto: CreateContratoDto, @CurrentUser() user: any) {
    return this.proveedoresService.createContrato(id, dto, user.sub);
  }
}
