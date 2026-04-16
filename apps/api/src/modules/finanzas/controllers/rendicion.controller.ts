import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RendicionService } from '../rendicion.service';
import { CreateRendicionDto, AprobarRendicionDto, EnviarRendicionDto, RendicionQueryDto } from '../dto/rendicion.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('finanzas/rendicion')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RendicionController {
  constructor(private readonly rendicionService: RendicionService) {}

  @Get()
  @Permissions('finanzas:rendicion')
  findAll(@Query() query: RendicionQueryDto) {
    return this.rendicionService.findAll(query);
  }

  @Get(':id')
  @Permissions('finanzas:rendicion')
  findOne(@Param('id') id: string) {
    return this.rendicionService.findOne(id);
  }

  @Post()
  @Permissions('finanzas:rendicion')
  create(@Body() dto: CreateRendicionDto, @CurrentUser() user: any) {
    return this.rendicionService.create(dto, user.sub);
  }

  @Post(':id/aprobar')
  @Permissions('finanzas:rendicion:aprobar')
  aprobar(@Param('id') id: string, @Body() dto: AprobarRendicionDto, @CurrentUser() user: any) {
    return this.rendicionService.aprobar(id, dto, user.sub);
  }

  @Post(':id/enviar')
  @Permissions('finanzas:rendicion')
  enviar(@Param('id') id: string, @Body() dto: EnviarRendicionDto, @CurrentUser() user: any) {
    return this.rendicionService.enviar(id, dto, user.sub);
  }
}
