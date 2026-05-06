import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SugerirCuentaDto {
  @IsString()
  @IsNotEmpty()
  glosa: string;

  @IsOptional()
  @IsString()
  proveedorId?: string;
}
