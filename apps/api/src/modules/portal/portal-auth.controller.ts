import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { PortalAuthService } from './portal-auth.service';
import { PortalJwtAuthGuard } from '../../common/guards/portal-jwt-auth.guard';

@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body('run') run: string, @Body('password') password: string) {
    return this.portalAuthService.login(run, password);
  }

  @Post('cambiar-password')
  @UseGuards(PortalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cambiarPassword(
    @Req() req: any,
    @Body('passwordActual') passwordActual: string,
    @Body('passwordNuevo') passwordNuevo: string,
  ) {
    return this.portalAuthService.cambiarPassword(
      req.user.apoderadoId,
      passwordActual,
      passwordNuevo,
    );
  }

  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  recuperar(@Body('run') run: string, @Body('email') email: string) {
    return this.portalAuthService.recuperar(run, email);
  }

  @Post('activar')
  @HttpCode(HttpStatus.OK)
  activarCuenta(
    @Body('run') run: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.portalAuthService.activarCuenta(run, email, password);
  }
}
