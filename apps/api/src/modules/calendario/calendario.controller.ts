import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CalendarioService } from './calendario.service';
import { CreateEventoDto, UpdateEventoDto, EventoQueryDto } from './calendario.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('calendario')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalendarioController {
  constructor(private readonly service: CalendarioService) {}

  @Get()
  @Permissions('calendario:read')
  findAll(@Query() query: EventoQueryDto) {
    return this.service.findAll(query);
  }

  @Get('proximos')
  @Permissions('calendario:read')
  getProximos() {
    return this.service.getProximos();
  }

  @Get(':id')
  @Permissions('calendario:read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('calendario:write')
  create(@Body() body: CreateEventoDto, @CurrentUser() user: any) {
    return this.service.create(body, user.sub);
  }

  @Patch(':id')
  @Permissions('calendario:write')
  update(@Param('id') id: string, @Body() body: UpdateEventoDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Permissions('calendario:write')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
