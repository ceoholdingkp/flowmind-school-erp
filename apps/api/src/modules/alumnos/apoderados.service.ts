import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { AlumnosService } from './alumnos.service';
import {
  CreateApoderadoV2Dto, UpdateApoderadoDto, ApoderadoQueryDto, CreateContactoEmergenciaDto,
} from './dto/apoderados.dto';

@Injectable()
export class ApoderadosService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ── Lista paginada ──────────────────────────────────────────

  async findAll(query: ApoderadoQueryDto) {
    const { q, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (q) {
      where['OR'] = [
        { run: { contains: q, mode: 'insensitive' } },
        { nombres: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { apellidoPaterno: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.apoderado.count({ where }),
      this.db.apoderado.findMany({
        where,
        skip,
        take: limit,
        include: {
          alumnos: {
            include: {
              alumno: { select: { id: true, run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
            },
          },
        },
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Detalle con alumnos ─────────────────────────────────────

  async findOne(id: string) {
    const apoderado = await this.db.apoderado.findUnique({
      where: { id },
      include: {
        alumnos: {
          include: {
            alumno: {
              include: {
                curso: { select: { id: true, nombre: true, nivel: true } },
                matriculas: { where: { anio: new Date().getFullYear() }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!apoderado) throw new NotFoundException(`Apoderado ${id} no encontrado`);
    return { data: apoderado };
  }

  // ── Crear apoderado ─────────────────────────────────────────

  async create(dto: CreateApoderadoV2Dto) {
    const run = AlumnosService.formatRUN(dto.run);
    if (!AlumnosService.validarRUN(run)) {
      throw new ConflictException('RUN inválido (dígito verificador incorrecto)');
    }
    const existing = await this.db.apoderado.findUnique({ where: { run } });
    if (existing) throw new ConflictException(`Ya existe un apoderado con RUN ${run}`);

    const apoderado = await this.db.apoderado.create({
      data: {
        run,
        nombres: dto.nombres,
        apellidos: `${dto.apellidoPaterno} ${dto.apellidoMaterno}`,
        apellidoPaterno: dto.apellidoPaterno,
        apellidoMaterno: dto.apellidoMaterno,
        telefono: dto.telefono,
        telefonoAlt: dto.telefonoAlt ?? null,
        email: dto.email ?? null,
        direccion: dto.direccion ?? null,
        comuna: dto.comuna ?? null,
        ocupacion: dto.ocupacion ?? null,
        parentesco: dto.parentesco,
      },
    });
    return { data: apoderado };
  }

  // ── Actualizar apoderado ────────────────────────────────────

  async update(id: string, dto: UpdateApoderadoDto) {
    const apoderado = await this.db.apoderado.findUnique({ where: { id } });
    if (!apoderado) throw new NotFoundException(`Apoderado ${id} no encontrado`);

    const data: Record<string, unknown> = { ...dto };
    if (dto.apellidoPaterno || dto.apellidoMaterno) {
      data['apellidos'] = `${dto.apellidoPaterno ?? apoderado.apellidoPaterno ?? ''} ${dto.apellidoMaterno ?? apoderado.apellidoMaterno ?? ''}`.trim();
    }

    const updated = await this.db.apoderado.update({ where: { id }, data });
    return { data: updated };
  }

  // ── Contactos de emergencia ─────────────────────────────────

  async addContacto(alumnoId: string, dto: CreateContactoEmergenciaDto) {
    const alumno = await this.db.alumno.findFirst({ where: { id: alumnoId, deletedAt: null } });
    if (!alumno) throw new NotFoundException(`Alumno ${alumnoId} no encontrado`);

    const contacto = await this.db.contactoEmergencia.create({
      data: {
        alumnoId,
        nombre: dto.nombre,
        telefono: dto.telefono,
        parentesco: dto.parentesco,
        prioridad: dto.prioridad ?? 1,
      },
    });
    return { data: contacto };
  }

  async deleteContacto(alumnoId: string, contactoId: string) {
    const contacto = await this.db.contactoEmergencia.findFirst({
      where: { id: contactoId, alumnoId },
    });
    if (!contacto) throw new NotFoundException(`Contacto ${contactoId} no encontrado`);
    await this.db.contactoEmergencia.delete({ where: { id: contactoId } });
    return { data: { message: 'Contacto eliminado' } };
  }
}
