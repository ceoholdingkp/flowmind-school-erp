import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ContratosService } from '../contratos.service';
import {
  CreateContratoLaboralDto, UpdateContratoLaboralDto,
  AddAnexoDto, TerminarContratoDto, ContratoQueryDto,
} from '../dto/contratos.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('rrhh/contratos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  // Contratos próximos a vencer (global)
  @Get('por-vencer')
  @Permissions('rrhh:contratos:read')
  getPorVencer(@CurrentUser() user: any) {
    return this.contratosService.getPorVencer(user.sub);
  }

  @Get(':id')
  @Permissions('rrhh:contratos:read')
  findOne(@Param('id') id: string) {
    return this.contratosService.findOne(id);
  }

  @Patch(':id')
  @Permissions('rrhh:contratos:write')
  update(@Param('id') id: string, @Body() dto: UpdateContratoLaboralDto, @CurrentUser() user: any) {
    return this.contratosService.update(id, dto, user.sub);
  }

  @Post(':id/anexo')
  @Permissions('rrhh:contratos:write')
  addAnexo(@Param('id') id: string, @Body() dto: AddAnexoDto, @CurrentUser() user: any) {
    return this.contratosService.addAnexo(id, dto, user.sub);
  }

  @Post(':id/terminar')
  @Permissions('rrhh:contratos:write')
  terminar(@Param('id') id: string, @Body() dto: TerminarContratoDto, @CurrentUser() user: any) {
    return this.contratosService.terminar(id, dto, user.sub);
  }
}

// Sub-resource: contratos de un funcionario
import { ContratosService as CS } from '../contratos.service';

@Controller('rrhh/funcionarios/:funcionarioId/contratos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FuncionarioContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get()
  @Permissions('rrhh:contratos:read')
  findAll(
    @Param('funcionarioId') funcionarioId: string,
    @Query() query: ContratoQueryDto,
  ) {
    return this.contratosService.findAll(funcionarioId, query);
  }

  @Post()
  @Permissions('rrhh:contratos:write')
  create(
    @Param('funcionarioId') funcionarioId: string,
    @Body() dto: CreateContratoLaboralDto,
    @CurrentUser() user: any,
  ) {
    return this.contratosService.create(funcionarioId, dto, user.sub);
  }
}
