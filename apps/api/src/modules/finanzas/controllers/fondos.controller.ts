import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FondosService } from '../fondos.service';
import { CreateFondoDto, UpdateFondoDto, FondoQueryDto } from '../dto/fondos.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('finanzas/fondos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FondosController {
  constructor(private readonly fondosService: FondosService) {}

  @Get('semaforo')
  @Permissions('finanzas:read')
  getSemaforo(@Query('anio') anio: string | undefined) {
    return this.fondosService.getSemaforo(anio ? parseInt(anio) : undefined);
  }

  @Get()
  @Permissions('finanzas:read')
  findAll(@Query() query: FondoQueryDto) {
    return this.fondosService.findAll(query);
  }

  @Get(':id')
  @Permissions('finanzas:read')
  findOne(@Param('id') id: string) {
    return this.fondosService.findOne(id);
  }

  @Post()
  @Permissions('finanzas:write')
  create(@Body() dto: CreateFondoDto, @CurrentUser() user: any) {
    return this.fondosService.create(dto, user.sub);
  }

  @Patch(':id')
  @Permissions('finanzas:write')
  update(@Param('id') id: string, @Body() dto: UpdateFondoDto, @CurrentUser() user: any) {
    return this.fondosService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Permissions('finanzas:write')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.fondosService.remove(id, user.sub);
  }
}
