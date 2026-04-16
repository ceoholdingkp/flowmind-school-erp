import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import {
  CreateCursoDto, UpdateCursoDto,
  CreateAsignaturaDto, UpdateAsignaturaDto,
  CreateSalaDto, UpdateSalaDto,
  UpdateEstablecimientoDto,
} from './dto/sistema.dto';

@Injectable()
export class SistemaService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── ESTABLECIMIENTO ──────────────────────────────────────────

  async getEstablecimiento() {
    const establecimiento = await this.db.establecimiento.findFirst();
    if (!establecimiento) throw new NotFoundException('Establecimiento no configurado');
    return { data: establecimiento };
  }

  async updateEstablecimiento(dto: UpdateEstablecimientoDto, usuarioId: string) {
    const establecimiento = await this.db.establecimiento.findFirst();
    if (!establecimiento) throw new NotFoundException('Establecimiento no configurado');

    const updated = await this.db.$transaction(async (tx) => {
      const result = await tx.establecimiento.update({
        where: { id: establecimiento.id },
        data: dto,
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Establecimiento',
          entidadId: result.id,
          datosDespues: dto as object,
        },
      });
      return result;
    });
    return { data: updated };
  }

  // ─── CURSOS ───────────────────────────────────────────────────

  async getCursos(anio?: number) {
    const where = anio ? { anio } : {};
    const cursos = await this.db.curso.findMany({
      where,
      include: { docenteJefe: { select: { id: true, nombres: true, apellidos: true } } },
      orderBy: [{ nivel: 'asc' }, { letra: 'asc' }],
    });
    return { data: cursos };
  }

  async getCurso(id: string) {
    const curso = await this.db.curso.findUnique({
      where: { id },
      include: {
        docenteJefe: { select: { id: true, nombres: true, apellidos: true } },
        alumnos: { where: { deletedAt: null, estadoMatricula: 'ACTIVA' }, select: { id: true } },
      },
    });
    if (!curso) throw new NotFoundException(`Curso ${id} no encontrado`);
    return { data: curso };
  }

  async createCurso(dto: CreateCursoDto, usuarioId: string) {
    const establecimiento = await this.db.establecimiento.findFirst();
    if (!establecimiento) throw new NotFoundException('Establecimiento no configurado');

    const result = await this.db.$transaction(async (tx) => {
      const curso = await tx.curso.create({
        data: { ...dto, establecimientoId: establecimiento.id },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Curso',
          entidadId: curso.id,
          datosDespues: dto as object,
        },
      });
      return curso;
    });
    return { data: result };
  }

  async updateCurso(id: string, dto: UpdateCursoDto, usuarioId: string) {
    await this.getCurso(id);
    const result = await this.db.$transaction(async (tx) => {
      const curso = await tx.curso.update({ where: { id }, data: dto });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Curso',
          entidadId: id,
          datosDespues: dto as object,
        },
      });
      return curso;
    });
    return { data: result };
  }

  // ─── ASIGNATURAS ──────────────────────────────────────────────

  async getAsignaturas() {
    const asignaturas = await this.db.asignatura.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { data: asignaturas };
  }

  async createAsignatura(dto: CreateAsignaturaDto, usuarioId: string) {
    if (dto.codigo) {
      const exists = await this.db.asignatura.findUnique({ where: { codigo: dto.codigo } });
      if (exists) throw new ConflictException(`Código de asignatura '${dto.codigo}' ya existe`);
    }
    const result = await this.db.$transaction(async (tx) => {
      const asignatura = await tx.asignatura.create({ data: dto });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Asignatura',
          entidadId: asignatura.id,
          datosDespues: dto as object,
        },
      });
      return asignatura;
    });
    return { data: result };
  }

  async updateAsignatura(id: string, dto: UpdateAsignaturaDto, usuarioId: string) {
    const exists = await this.db.asignatura.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Asignatura ${id} no encontrada`);

    const result = await this.db.$transaction(async (tx) => {
      const asignatura = await tx.asignatura.update({ where: { id }, data: dto });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Asignatura',
          entidadId: id,
          datosDespues: dto as object,
        },
      });
      return asignatura;
    });
    return { data: result };
  }

  // ─── SALAS ────────────────────────────────────────────────────

  async getSalas(establecimientoId: string) {
    const salas = await this.db.sala.findMany({
      where: { establecimientoId },
      orderBy: { nombre: 'asc' },
    });
    return { data: salas };
  }

  async createSala(dto: CreateSalaDto, usuarioId: string) {
    const result = await this.db.$transaction(async (tx) => {
      const sala = await tx.sala.create({ data: dto });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Sala',
          entidadId: sala.id,
          datosDespues: dto as object,
        },
      });
      return sala;
    });
    return { data: result };
  }

  async updateSala(id: string, dto: UpdateSalaDto, usuarioId: string) {
    const exists = await this.db.sala.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Sala ${id} no encontrada`);

    const result = await this.db.$transaction(async (tx) => {
      const sala = await tx.sala.update({ where: { id }, data: dto });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Sala',
          entidadId: id,
          datosDespues: dto as object,
        },
      });
      return sala;
    });
    return { data: result };
  }
}
