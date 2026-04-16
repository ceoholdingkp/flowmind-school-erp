import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreateAlumnoDto, UpdateAlumnoDto, RetirarAlumnoDto,
  CreateApoderadoDto, AlumnoQueryDto,
} from './dto/alumnos.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AlumnosService {
  private readonly logger = new Logger(AlumnosService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── RUN VALIDATION (módulo 11) ──────────────────────────────

  static validarRUN(run: string): boolean {
    const cleaned = run.replace(/[.\-]/g, '').toUpperCase();
    if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
    const digits = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = digits.length - 1; i >= 0; i--) {
      sum += parseInt(digits[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = 11 - (sum % 11);
    const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
    return dv === expected;
  }

  static formatRUN(run: string): string {
    return run.replace(/[.\-]/g, '').toUpperCase();
  }

  // ─── LISTADO ──────────────────────────────────────────────────

  async findAll(query: AlumnoQueryDto) {
    const { q, cursoId, estado, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (estado) where['estadoMatricula'] = estado;
    else where['estadoMatricula'] = 'ACTIVA';
    if (cursoId) where['cursoId'] = cursoId;
    if (q) {
      where['OR'] = [
        { run: { contains: q, mode: 'insensitive' } },
        { nombres: { contains: q, mode: 'insensitive' } },
        { apellidoPaterno: { contains: q, mode: 'insensitive' } },
        { apellidoMaterno: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, alumnos] = await Promise.all([
      this.db.alumno.count({ where }),
      this.db.alumno.findMany({
        where,
        skip,
        take: limit,
        include: {
          curso: { select: { id: true, nombre: true, nivel: true } },
          apoderados: {
            include: { apoderado: { select: { id: true, nombres: true, apellidos: true, telefono: true, email: true } } },
            where: { esTitular: true },
          },
        },
        orderBy: [{ apellidoPaterno: 'asc' }, { apellidoMaterno: 'asc' }],
      }),
    ]);

    return {
      data: alumnos,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── DETALLE ──────────────────────────────────────────────────

  async findOne(id: string) {
    const alumno = await this.db.alumno.findFirst({
      where: { id, deletedAt: null },
      include: {
        curso: { select: { id: true, nombre: true, nivel: true } },
        apoderados: { include: { apoderado: true } },
        fichaNEE: true,
      },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${id} no encontrado`);
    return { data: alumno };
  }

  // ─── CREAR ────────────────────────────────────────────────────

  async create(dto: CreateAlumnoDto, usuarioId: string) {
    const run = AlumnosService.formatRUN(dto.run);
    if (!AlumnosService.validarRUN(run)) {
      throw new BadRequestException('RUN inválido (dígito verificador incorrecto)');
    }

    const exists = await this.db.alumno.findFirst({ where: { run, deletedAt: null } });
    if (exists) throw new ConflictException(`Ya existe un alumno con RUN ${run}`);

    let cursoNombre = '';
    const apoderadoEmail: string | null = null;
    const apoderadoTelefono: string | null = null;

    if (dto.cursoId) {
      const curso = await this.db.curso.findUnique({ where: { id: dto.cursoId } });
      if (!curso) throw new NotFoundException(`Curso ${dto.cursoId} no encontrado`);
      cursoNombre = curso.nombre;
    }

    const alumno = await this.db.$transaction(async (tx) => {
      const created = await tx.alumno.create({
        data: {
          ...dto,
          run,
          fechaNacimiento: new Date(dto.fechaNacimiento),
          fechaMatricula: new Date(dto.fechaMatricula),
          estadoMatricula: 'ACTIVA',
          esPIE: dto.esPIE ?? false,
          esPrioritario: dto.esPrioritario ?? false,
          esPreferente: dto.esPreferente ?? false,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Alumno',
          entidadId: created.id,
          datosDespues: { ...dto, run } as object,
        },
      });
      return created;
    });

    // Publish event ALUMNO_MATRICULADO
    await this.eventBus.publish({
      type: 'ALUMNO_MATRICULADO',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        alumnoId: alumno.id,
        run: alumno.run,
        nombreCompleto: `${alumno.nombres} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`,
        cursoId: alumno.cursoId ?? '',
        cursoNombre,
        esPIE: alumno.esPIE,
        esPrioritario: alumno.esPrioritario,
        esPreferente: alumno.esPreferente,
        apoderadoEmail,
        apoderadoTelefono,
      },
    });

    this.logger.log(`ALUMNO_MATRICULADO publicado: ${alumno.run} - ${alumno.nombres} ${alumno.apellidoPaterno}`);

    return { data: alumno };
  }

  // ─── ACTUALIZAR ───────────────────────────────────────────────

  async update(id: string, dto: UpdateAlumnoDto, usuarioId: string) {
    const alumno = await this.db.alumno.findFirst({ where: { id, deletedAt: null } });
    if (!alumno) throw new NotFoundException(`Alumno ${id} no encontrado`);

    const camposModificados = Object.keys(dto);

    const updated = await this.db.$transaction(async (tx) => {
      const result = await tx.alumno.update({
        where: { id },
        data: {
          ...dto,
          fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Alumno',
          entidadId: id,
          datosAntes: { ...alumno } as object,
          datosDespues: dto as object,
        },
      });
      return result;
    });

    await this.eventBus.publish({
      type: 'ALUMNO_ACTUALIZADO',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: { alumnoId: id, camposModificados },
    });

    return { data: updated };
  }

  // ─── RETIRAR ──────────────────────────────────────────────────

  async retirar(id: string, dto: RetirarAlumnoDto, usuarioId: string) {
    const alumno = await this.db.alumno.findFirst({
      where: { id, deletedAt: null },
      include: {
        apoderados: {
          where: { esTitular: true },
          include: { apoderado: { select: { email: true, telefono: true } } },
        },
        curso: { select: { id: true, nombre: true } },
      },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${id} no encontrado`);
    if (alumno.estadoMatricula !== 'ACTIVA') {
      throw new BadRequestException(`Alumno ya está en estado ${alumno.estadoMatricula}`);
    }

    const estadoFinal = dto.estado ?? 'RETIRADO';

    await this.db.$transaction(async (tx) => {
      await tx.alumno.update({
        where: { id },
        data: {
          estadoMatricula: estadoFinal,
          motivoRetiro: dto.motivoRetiro,
          fechaRetiro: new Date(dto.fechaRetiro),
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Alumno',
          entidadId: id,
          datosAntes: { estadoMatricula: 'ACTIVA' } as object,
          datosDespues: { estadoMatricula: estadoFinal, ...dto } as object,
        },
      });
    });

    await this.eventBus.publish({
      type: 'ALUMNO_RETIRADO',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        alumnoId: id,
        run: alumno.run,
        nombreCompleto: `${alumno.nombres} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`,
        cursoId: alumno.cursoId ?? '',
        motivoRetiro: dto.motivoRetiro,
        fechaRetiro: dto.fechaRetiro,
      },
    });

    this.logger.log(`ALUMNO_RETIRADO publicado: ${alumno.run}`);
    return { data: { message: `Alumno ${estadoFinal.toLowerCase()} correctamente` } };
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────

  async softDelete(id: string, usuarioId: string) {
    const alumno = await this.db.alumno.findFirst({ where: { id, deletedAt: null } });
    if (!alumno) throw new NotFoundException(`Alumno ${id} no encontrado`);

    await this.db.$transaction(async (tx) => {
      await tx.alumno.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'DELETE',
          entidad: 'Alumno',
          entidadId: id,
          datosAntes: { run: alumno.run } as object,
        },
      });
    });
    return { data: { message: 'Alumno eliminado (soft delete)' } };
  }

  // ─── APODERADOS ───────────────────────────────────────────────

  async addApoderado(alumnoId: string, dto: CreateApoderadoDto, usuarioId: string) {
    const alumno = await this.db.alumno.findFirst({ where: { id: alumnoId, deletedAt: null } });
    if (!alumno) throw new NotFoundException(`Alumno ${alumnoId} no encontrado`);

    const run = AlumnosService.formatRUN(dto.run);

    const result = await this.db.$transaction(async (tx) => {
      // Upsert apoderado
      let apoderado = await tx.apoderado.findUnique({ where: { run } });
      if (!apoderado) {
        apoderado = await tx.apoderado.create({
          data: { run, nombres: dto.nombres, apellidos: dto.apellidos, telefono: dto.telefono, email: dto.email, direccion: dto.direccion, ocupacion: dto.ocupacion },
        });
      }
      // Vincular
      const vinculo = await tx.apoderadoAlumno.upsert({
        where: { alumnoId_apoderadoId: { alumnoId, apoderadoId: apoderado.id } },
        update: { parentesco: dto.parentesco, esTitular: dto.esTitular ?? false, esEmergencia: dto.esEmergencia ?? false },
        create: { alumnoId, apoderadoId: apoderado.id, parentesco: dto.parentesco, esTitular: dto.esTitular ?? false, esEmergencia: dto.esEmergencia ?? false },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'ApoderadoAlumno',
          entidadId: vinculo.id,
          datosDespues: { alumnoId, apoderadoId: apoderado.id, ...dto } as object,
        },
      });
      return { apoderado, vinculo };
    });

    return { data: result };
  }

  async getApoderados(alumnoId: string) {
    const alumno = await this.db.alumno.findFirst({ where: { id: alumnoId, deletedAt: null } });
    if (!alumno) throw new NotFoundException(`Alumno ${alumnoId} no encontrado`);

    const apoderados = await this.db.apoderadoAlumno.findMany({
      where: { alumnoId },
      include: { apoderado: true },
    });
    return { data: apoderados };
  }

  // ─── IMPORTACIÓN MASIVA EXCEL ────────────────────────────────

  async importarExcel(buffer: Buffer, usuarioId: string) {
    const xlsx = await import('xlsx');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<Record<string, string>>(sheet);

    const resultados = { exitosos: 0, errores: [] as { fila: number; error: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fila = i + 2;
      try {
        const run = AlumnosService.formatRUN(String(row['RUN'] || ''));
        if (!run) throw new Error('RUN vacío');
        if (!AlumnosService.validarRUN(run)) throw new Error(`RUN inválido: ${run}`);

        const exists = await this.db.alumno.findFirst({ where: { run, deletedAt: null } });
        if (exists) throw new Error(`RUN ${run} ya existe`);

        // Find curso by name if provided
        let cursoId: string | undefined;
        if (row['Curso']) {
          const curso = await this.db.curso.findFirst({
            where: { nombre: { contains: String(row['Curso']), mode: 'insensitive' } },
          });
          if (curso) cursoId = curso.id;
        }

        // Get next matricula number
        const lastAlumno = await this.db.alumno.findFirst({
          orderBy: { numeroMatricula: 'desc' },
        });
        const numeroMatricula = (lastAlumno?.numeroMatricula ?? 0) + 1;

        const fechaNac = row['Fecha Nacimiento']
          ? new Date(String(row['Fecha Nacimiento']))
          : new Date('2010-01-01');

        const genero = String(row['Género'] || 'OTRO').toUpperCase();
        const generoValido = ['MASCULINO', 'FEMENINO', 'OTRO'].includes(genero) ? genero : 'OTRO';

        await this.db.$transaction(async (tx) => {
          const alumno = await tx.alumno.create({
            data: {
              run,
              nombres: String(row['Nombres'] || ''),
              apellidoPaterno: String(row['Apellido Paterno'] || ''),
              apellidoMaterno: String(row['Apellido Materno'] || ''),
              fechaNacimiento: fechaNac,
              genero: generoValido as 'MASCULINO' | 'FEMENINO' | 'OTRO',
              cursoId,
              fechaMatricula: new Date(),
              numeroMatricula,
              estadoMatricula: 'ACTIVA',
            },
          });

          // Handle apoderado from Excel
          if (row['Apoderado RUN'] && row['Apoderado Nombre']) {
            const apRun = AlumnosService.formatRUN(String(row['Apoderado RUN']));
            let apoderado = await tx.apoderado.findUnique({ where: { run: apRun } });
            if (!apoderado) {
              apoderado = await tx.apoderado.create({
                data: {
                  run: apRun,
                  nombres: String(row['Apoderado Nombre'] || ''),
                  apellidos: '',
                  telefono: String(row['Apoderado Teléfono'] || ''),
                },
              });
            }
            await tx.apoderadoAlumno.create({
              data: {
                alumnoId: alumno.id,
                apoderadoId: apoderado.id,
                parentesco: 'Apoderado',
                esTitular: true,
              },
            });
          }

          await tx.eventoAuditoria.create({
            data: {
              usuarioId,
              accion: 'CREATE',
              entidad: 'Alumno',
              entidadId: alumno.id,
              datosDespues: { run, fuenteImportacion: 'EXCEL' } as object,
            },
          });
        });

        resultados.exitosos++;
      } catch (err) {
        resultados.errores.push({ fila, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { data: resultados };
  }

  // ─── EXPORTACIÓN SIGE ─────────────────────────────────────────

  async exportarSIGE() {
    const alumnos = await this.db.alumno.findMany({
      where: { deletedAt: null, estadoMatricula: 'ACTIVA' },
      include: {
        curso: { select: { nombre: true, nivel: true } },
        apoderados: {
          where: { esTitular: true },
          include: { apoderado: { select: { run: true, nombres: true, apellidos: true, telefono: true, email: true } } },
        },
      },
      orderBy: [{ apellidoPaterno: 'asc' }],
    });

    const xlsx = await import('xlsx');
    const rows = alumnos.map((a) => ({
      'RUN': a.run,
      'Nombres': a.nombres,
      'Apellido Paterno': a.apellidoPaterno,
      'Apellido Materno': a.apellidoMaterno,
      'Fecha Nacimiento': a.fechaNacimiento.toISOString().split('T')[0],
      'Género': a.genero,
      'Nacionalidad': a.nacionalidad,
      'Curso': a.curso?.nombre ?? '',
      'Nivel': a.curso?.nivel ?? '',
      'N° Matrícula': a.numeroMatricula,
      'Estado': a.estadoMatricula,
      'PIE': a.esPIE ? 'SI' : 'NO',
      'Prioritario': a.esPrioritario ? 'SI' : 'NO',
      'Preferente': a.esPreferente ? 'SI' : 'NO',
      'Apoderado RUN': a.apoderados[0]?.apoderado?.run ?? '',
      'Apoderado Nombre': a.apoderados[0]?.apoderado
        ? `${a.apoderados[0].apoderado.nombres} ${a.apoderados[0].apoderado.apellidos}`
        : '',
      'Apoderado Teléfono': a.apoderados[0]?.apoderado?.telefono ?? '',
      'Apoderado Email': a.apoderados[0]?.apoderado?.email ?? '',
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Alumnos');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}
