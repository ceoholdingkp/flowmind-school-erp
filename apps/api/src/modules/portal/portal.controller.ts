import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('portal')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('me')
  @Permissions('portal:notas')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.portalService.getMe(user.sub);
  }

  @Get('notas')
  @Permissions('portal:notas')
  getNotas(@CurrentUser() user: JwtPayload, @Query('alumnoId') alumnoId?: string) {
    return this.portalService.getNotas(user.sub, alumnoId);
  }

  @Get('asistencia')
  @Permissions('portal:asistencia')
  getAsistencia(@CurrentUser() user: JwtPayload, @Query('alumnoId') alumnoId?: string) {
    return this.portalService.getAsistencia(user.sub, alumnoId);
  }

  @Get('pagos')
  @Permissions('portal:pagos')
  getPagos(@CurrentUser() user: JwtPayload, @Query('alumnoId') alumnoId?: string) {
    return this.portalService.getPagos(user.sub, alumnoId);
  }
}
