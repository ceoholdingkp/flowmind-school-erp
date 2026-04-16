import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConciliacionService } from '../conciliacion.service';
import { InitConciliacionDto, ConciliacionQueryDto } from '../dto/conciliacion.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('finanzas/conciliacion')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConciliacionController {
  constructor(private readonly conciliacionService: ConciliacionService) {}

  @Get()
  @Permissions('finanzas:conciliacion')
  findAll(@Query() query: ConciliacionQueryDto) {
    return this.conciliacionService.findAll(query);
  }

  @Get(':id')
  @Permissions('finanzas:conciliacion')
  findOne(@Param('id') id: string) {
    return this.conciliacionService.findOne(id);
  }

  @Post('import')
  @Permissions('finanzas:conciliacion')
  @UseInterceptors(FileInterceptor('file'))
  async importarCartola(
    @Body() dto: InitConciliacionDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo Excel/CSV');
    return this.conciliacionService.importarCartola(dto, file.buffer, file.originalname, user.sub);
  }
}
