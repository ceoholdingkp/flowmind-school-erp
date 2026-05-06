import {
  Controller, Post, Get, Body, UseGuards,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('admin/onboarding')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('nuevo-colegio')
  @Permissions('onboarding:write')
  @HttpCode(HttpStatus.CREATED)
  nuevoColegio(
    @Body('nombre') nombre: string,
    @Body('rbd') rbd: string,
    @Body('direccion') direccion: string,
    @Body('comuna') comuna: string,
    @Body('region') region: string,
    @Body('telefono') telefono: string,
    @Body('email') email: string,
    @Body('nombreDirector') nombreDirector: string,
    @Body('rutDirector') rutDirector: string,
    @Body('emailDirector') emailDirector: string,
  ) {
    return this.onboardingService.nuevoColegio({
      nombre, rbd, direccion, comuna, region, telefono, email,
      nombreDirector, rutDirector, emailDirector,
    });
  }

  @Post('importar-alumnos')
  @Permissions('onboarding:write')
  @UseInterceptors(FileInterceptor('archivo'))
  importarAlumnos(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Archivo requerido');
    return this.onboardingService.importarAlumnos(file.buffer, file.mimetype);
  }

  @Post('importar-funcionarios')
  @Permissions('onboarding:write')
  @UseInterceptors(FileInterceptor('archivo'))
  importarFuncionarios(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Archivo requerido');
    return this.onboardingService.importarFuncionarios(file.buffer);
  }

  @Get('progreso')
  @Permissions('onboarding:write')
  getProgreso() {
    return this.onboardingService.getProgreso();
  }
}
