import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RendicionSupereducService } from './rendicion.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RegistrarMovimientoSupereducDto } from './dto/registrar-movimiento.dto';
import { GenerarRendicionSupereducDto } from './dto/generar-rendicion.dto';
import { SugerirCuentaDto } from './dto/sugerir-cuenta.dto';

@Controller('finanzas/rendicion/supereduc')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RendicionSupereducController {
  constructor(private readonly rendicionService: RendicionSupereducService) {}

  // GET /api/v1/finanzas/rendicion/supereduc/cuentas
  @Get('cuentas')
  @Permissions('finanzas:read')
  getCuentas(
    @Query('tipo') tipo?: string,
    @Query('subvencion') subvencion?: string,
    @Query('includeAgrupadoras') includeAgrupadoras?: string,
  ) {
    return this.rendicionService.getCuentas({
      tipo,
      subvencion,
      includeAgrupadoras: includeAgrupadoras === 'true',
    });
  }

  // GET /api/v1/finanzas/rendicion/supereduc/cuentas/:codigo
  @Get('cuentas/:codigo')
  @Permissions('finanzas:read')
  getCuenta(@Param('codigo') codigo: string) {
    return this.rendicionService.getCuenta(codigo);
  }

  // GET /api/v1/finanzas/rendicion/supereduc/movimientos
  @Get('movimientos')
  @Permissions('finanzas:read')
  getMovimientos(
    @Query('cuentaCodigo') cuentaCodigo?: string,
    @Query('fondoId') fondoId?: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
  ) {
    return this.rendicionService.getMovimientos({
      cuentaCodigo,
      fondoId,
      anio: anio ? parseInt(anio) : undefined,
      mes: mes ? parseInt(mes) : undefined,
    });
  }

  // POST /api/v1/finanzas/rendicion/supereduc/movimientos
  @Post('movimientos')
  @Permissions('finanzas:rendicion')
  registrarMovimiento(
    @Body() dto: RegistrarMovimientoSupereducDto,
    @CurrentUser() user: any,
  ) {
    return this.rendicionService.registrarMovimiento(dto, user.sub);
  }

  // GET /api/v1/finanzas/rendicion/supereduc/resumen
  @Get('resumen')
  @Permissions('finanzas:read')
  getResumen(
    @Query('fondoId') fondoId?: string,
    @Query('anio') anio?: string,
    @Query('mesInicio') mesInicio?: string,
    @Query('mesFin') mesFin?: string,
  ) {
    return this.rendicionService.getResumen({
      fondoId,
      anio: anio ? parseInt(anio) : undefined,
      mesInicio: mesInicio ? parseInt(mesInicio) : undefined,
      mesFin: mesFin ? parseInt(mesFin) : undefined,
    });
  }

  // POST /api/v1/finanzas/rendicion/supereduc/generar
  @Post('generar')
  @Permissions('finanzas:rendicion')
  generarRendicion(
    @Body() dto: GenerarRendicionSupereducDto,
    @CurrentUser() user: any,
  ) {
    return this.rendicionService.generarRendicion(dto, user.sub);
  }

  // POST /api/v1/finanzas/rendicion/supereduc/validar
  @Post('validar')
  @Permissions('finanzas:read')
  validarPeriodo(@Body() dto: GenerarRendicionSupereducDto) {
    return this.rendicionService.validarPeriodo(dto);
  }

  // POST /api/v1/finanzas/rendicion/supereduc/sugerir-cuenta
  @Post('sugerir-cuenta')
  @Permissions('finanzas:rendicion')
  sugerirCuenta(@Body() dto: SugerirCuentaDto) {
    return this.rendicionService.sugerirCuenta(dto);
  }
}
