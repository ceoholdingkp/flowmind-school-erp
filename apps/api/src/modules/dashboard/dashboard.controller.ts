import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Permissions('dashboard:read')
  getKPIs() {
    return this.dashboardService.getKPIs();
  }

  @Get('director')
  @Permissions('dashboard:read')
  getDirectorDashboard() {
    return this.dashboardService.getDirectorDashboard();
  }

  @Get('actividad-reciente')
  @Permissions('dashboard:read')
  getActividadReciente(@Query('limit') limit: string | undefined) {
    return this.dashboardService.getActividadReciente(limit ? parseInt(limit, 10) : 10);
  }

  @Get('alertas')
  @Permissions('dashboard:alertas')
  getAlertas(@Query('estado') estado: string | undefined) {
    return this.dashboardService.getAlertas(estado);
  }

  @Post('alertas/:id/resolver')
  @Permissions('dashboard:alertas')
  resolverAlerta(@Param('id') id: string, @CurrentUser() user: any) {
    return this.dashboardService.resolverAlerta(id, user.sub);
  }
}
