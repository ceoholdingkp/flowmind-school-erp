import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FuncionariosService } from '../funcionarios.service';
import { CreateFuncionarioDto, UpdateFuncionarioDto, FuncionarioQueryDto } from '../dto/funcionarios.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('rrhh/funcionarios')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FuncionariosController {
  constructor(private readonly funcionariosService: FuncionariosService) {}

  @Get()
  @Permissions('rrhh:funcionarios:read')
  findAll(@Query() query: FuncionarioQueryDto) {
    return this.funcionariosService.findAll(query);
  }

  @Get(':id')
  @Permissions('rrhh:funcionarios:read')
  findOne(@Param('id') id: string) {
    return this.funcionariosService.findOne(id);
  }

  @Post()
  @Permissions('rrhh:funcionarios:write')
  create(@Body() dto: CreateFuncionarioDto, @CurrentUser() user: any) {
    return this.funcionariosService.create(dto, user.sub);
  }

  @Patch(':id')
  @Permissions('rrhh:funcionarios:write')
  update(@Param('id') id: string, @Body() dto: UpdateFuncionarioDto, @CurrentUser() user: any) {
    return this.funcionariosService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Permissions('rrhh:funcionarios:write')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.funcionariosService.remove(id, user.sub);
  }
}
