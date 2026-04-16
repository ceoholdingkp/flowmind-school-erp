import {
  Injectable, NotFoundException, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import {
  MarcarEntradaDto, MarcarSalidaDto, RegistrarLicenciaDto, AsistenciaRRHHQueryDto,
} from './dto/asistencia-rrhh.dto';

// Hora inicio jornada (08:30). Minutos de atraso si llega después
const HORA_INICIO = { horas: 8, minutos: 30 };
// Horas estándar de jornada diaria (asumiendo 45h semanales => 9h/día)
const HORAS_JORNADA_STD = 9;

@Injectable()
export class AsistenciaRRHHService {
  private readonly logger = new Logger(AsistenciaRRHHService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── MARCAR ENTRADA ───────────────────────────────────────────

  async marcarEntrada(funcionarioId: string, dto: MarcarEntradaDto, usuarioId: string) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: funcionarioId, deletedAt: null, estado: 'ACTIVO' },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);

    const horaEntrada = new Date(dto.horaEntrada);
    const fecha = new Date(horaEntrada);
    fecha.setHours(0, 0, 0, 0);

    // Check no duplicate for today
    const existing = await this.db.marcaAsistencia.findUnique({
      where: { funcionarioId_fecha: { funcionarioId, fecha } },
    });
    if (existing && existing.horaEntrada) {
      throw new ConflictException('Ya existe una marca de entrada para este día');
    }

    // Calc minutos de atraso
    const inicioJornada = new Date(horaEntrada);
    inicioJornada.setHours(HORA_INICIO.horas, HORA_INICIO.minutos, 0, 0);
    const atrasoMinutos = Math.max(0, Math.floor((horaEntrada.getTime() - inicioJornada.getTime()) / 60000));

    let marca: any;
    if (existing) {
      marca = await this.db.marcaAsistencia.update({
        where: { funcionarioId_fecha: { funcionarioId, fecha } },
        data: { horaEntrada, atrasoMinutos, observacion: dto.observacion ?? null },
      });
    } else {
      marca = await this.db.marcaAsistencia.create({
        data: {
          funcionarioId,
          fecha,
          horaEntrada,
          atrasoMinutos,
          tipoDia: 'NORMAL',
          observacion: dto.observacion ?? null,
        },
      });
    }

    return { data: marca };
  }

  // ─── MARCAR SALIDA ────────────────────────────────────────────

  async marcarSalida(funcionarioId: string, dto: MarcarSalidaDto, usuarioId: string) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: funcionarioId, deletedAt: null },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);

    const horaSalida = new Date(dto.horaSalida);
    const fecha = new Date(horaSalida);
    fecha.setHours(0, 0, 0, 0);

    const marca = await this.db.marcaAsistencia.findUnique({
      where: { funcionarioId_fecha: { funcionarioId, fecha } },
    });
    if (!marca || !marca.horaEntrada) {
      throw new BadRequestException('No existe marca de entrada para este día');
    }
    if (marca.horaSalida) {
      throw new ConflictException('Ya existe una marca de salida para este día');
    }

    const entrada = new Date(marca.horaEntrada);
    const diffMs = horaSalida.getTime() - entrada.getTime();
    const horasTrabajadas = Math.max(0, diffMs / 3600000);
    const horasExtra = Math.max(0, horasTrabajadas - HORAS_JORNADA_STD);

    const updated = await this.db.marcaAsistencia.update({
      where: { funcionarioId_fecha: { funcionarioId, fecha } },
      data: {
        horaSalida,
        horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
        horasExtra: Math.round(horasExtra * 100) / 100,
        observacion: dto.observacion ? `${marca.observacion ?? ''} | Salida: ${dto.observacion}` : marca.observacion,
      },
    });

    return { data: updated };
  }

  // ─── REGISTRAR LICENCIA/PERMISO ───────────────────────────────

  async registrarLicencia(funcionarioId: string, dto: RegistrarLicenciaDto, usuarioId: string) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: funcionarioId, deletedAt: null },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);

    const fecha = new Date(dto.fecha);
    fecha.setHours(0, 0, 0, 0);

    const existing = await this.db.marcaAsistencia.findUnique({
      where: { funcionarioId_fecha: { funcionarioId, fecha } },
    });

    let marca: any;
    const data = {
      funcionarioId,
      fecha,
      tipoDia: dto.tipoDia,
      licenciaTipo: dto.licenciaTipo ?? null,
      licenciaDias: dto.licenciaDias ?? null,
      licenciaFolio: dto.licenciaFolio ?? null,
      observacion: dto.observacion ?? null,
    };

    if (existing) {
      marca = await this.db.marcaAsistencia.update({
        where: { funcionarioId_fecha: { funcionarioId, fecha } },
        data,
      });
    } else {
      marca = await this.db.marcaAsistencia.create({ data });
    }

    // Update funcionario estado if licencia médica
    if (dto.tipoDia === 'LICENCIA_MEDICA') {
      await this.db.funcionario.update({
        where: { id: funcionarioId },
        data: { estado: 'CON_LICENCIA' },
      });
    }

    await this.db.eventoAuditoria.create({
      data: {
        usuarioId,
        accion: 'CREATE',
        entidad: 'MarcaAsistencia',
        entidadId: marca.id,
        datosDespues: { funcionarioId, tipoDia: dto.tipoDia, fecha: dto.fecha } as object,
      },
    });

    return { data: marca };
  }

  // ─── LISTAR MARCAS DE UN FUNCIONARIO ──────────────────────────

  async findAll(funcionarioId: string, query: AsistenciaRRHHQueryDto) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: funcionarioId, deletedAt: null },
      select: { id: true, nombres: true, apellidos: true, horasContrato: true },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);

    const where: Record<string, unknown> = { funcionarioId };
    if (query.mes && query.anio) {
      where['fecha'] = {
        gte: new Date(query.anio, query.mes - 1, 1),
        lte: new Date(query.anio, query.mes, 0, 23, 59, 59),
      };
    } else if (query.fechaDesde || query.fechaHasta) {
      where['fecha'] = {
        ...(query.fechaDesde ? { gte: new Date(query.fechaDesde) } : {}),
        ...(query.fechaHasta ? { lte: new Date(query.fechaHasta) } : {}),
      };
    }

    const marcas = await this.db.marcaAsistencia.findMany({
      where,
      orderBy: { fecha: 'asc' },
    });

    return { data: marcas, funcionario };
  }

  // ─── REPORTE MENSUAL ──────────────────────────────────────────

  async getReporteMensual(funcionarioId: string, mes: number, anio: number) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: funcionarioId, deletedAt: null },
      select: { id: true, nombres: true, apellidos: true, run: true, horasContrato: true, cargo: true },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);

    const inicioMes = new Date(anio, mes - 1, 1);
    const finMes = new Date(anio, mes, 0, 23, 59, 59);

    const marcas = await this.db.marcaAsistencia.findMany({
      where: { funcionarioId, fecha: { gte: inicioMes, lte: finMes } },
      orderBy: { fecha: 'asc' },
    });

    const totalDias = marcas.length;
    const diasNormales = marcas.filter((m: any) => m.tipoDia === 'NORMAL').length;
    const diasLicencia = marcas.filter((m: any) => m.tipoDia === 'LICENCIA_MEDICA').length;
    const diasPermiso = marcas.filter((m: any) => m.tipoDia === 'PERMISO').length;
    const diasAusente = marcas.filter((m: any) => m.tipoDia === 'AUSENTE_INJUSTIFICADO').length;

    const totalHorasTrabajadas = marcas.reduce((s: number, m: any) => s + Number(m.horasTrabajadas ?? 0), 0);
    const totalHorasExtra = marcas.reduce((s: number, m: any) => s + Number(m.horasExtra ?? 0), 0);
    const totalAtrasoMinutos = marcas.reduce((s: number, m: any) => s + Number(m.atrasoMinutos ?? 0), 0);

    return {
      data: {
        funcionario,
        periodo: { mes, anio },
        resumen: {
          totalDias,
          diasNormales,
          diasLicencia,
          diasPermiso,
          diasAusente,
          totalHorasTrabajadas: Math.round(totalHorasTrabajadas * 100) / 100,
          totalHorasExtra: Math.round(totalHorasExtra * 100) / 100,
          totalAtrasoMinutos,
        },
        detalle: marcas,
      },
    };
  }
}
