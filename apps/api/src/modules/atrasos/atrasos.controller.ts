import {
  Controller, Get, Post, Body, Query,
  UseGuards,
} from '@nestjs/common';
import { AtrasosService } from './atrasos.service';
import { CreateAtrasoDto, AtrasoQueryDto, ReporteAtrasoQueryDto } from './dto/atrasos.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('atrasos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AtrasosController {
  constructor(private readonly atrasosService: AtrasosService) {}

  @Get()
  @Permissions('atrasos:read')
  findAll(@Query() query: AtrasoQueryDto) {
    return this.atrasosService.findAll(query);
  }

  @Get('reporte')
  @Permissions('atrasos:read')
  getReporte(@Query() query: ReporteAtrasoQueryDto) {
    return this.atrasosService.getReporte(query);
  }

  @Post()
  @Permissions('atrasos:write')
  create(@Body() dto: CreateAtrasoDto, @CurrentUser() user: JwtPayload) {
    return this.atrasosService.create(dto, user.sub);
  }
}
