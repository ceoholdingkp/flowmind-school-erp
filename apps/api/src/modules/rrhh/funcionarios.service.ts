import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import {
  CreateFuncionarioDto, UpdateFuncionarioDto, FuncionarioQueryDto,
} from './dto/funcionarios.dto';

@Injectable()
export class FuncionariosService {
  private readonly logger = new Logger(FuncionariosService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── CRUD ─────────────────────────────────────────────────────

  async create(dto: CreateFuncionarioDto, usuarioId: string) {
    const existing = await this.db.funcionario.findUnique({ where: { run: dto.run } });
    if (existing) throw new ConflictException(`Ya existe un funcionario con RUN ${dto.run}`);

    const funcionario = await this.db.$transaction(async (tx: any) => {
      const f = await tx.funcionario.create({
        data: {
          run: dto.run,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
          tipo: dto.tipo,
          cargo: dto.cargo,
          tituloProfesional: dto.tituloProfesional ?? null,
          universidad: dto.universidad ?? null,
          especialidadPIE: dto.especialidadPIE ?? null,
          tramoCarrera: dto.tramoCarrera ?? null,
          horasContrato: dto.horasContrato,
          horasLectivas: dto.horasLectivas ?? null,
          horasNoLectivas: dto.horasNoLectivas ?? null,
          tipoContrato: dto.tipoContrato,
          fechaIngreso: new Date(dto.fechaIngreso),
          sueldoBase: dto.sueldoBase ?? null,
          afp: dto.afp ?? null,
          isapre: dto.isapre ?? null,
          cuentaBancaria: dto.cuentaBancaria ?? null,
          banco: dto.banco ?? null,
          estado: 'ACTIVO',
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Funcionario',
          entidadId: f.id,
          datosDespues: { run: dto.run, nombres: dto.nombres, tipo: dto.tipo } as object,
        },
      });
      return f;
    });

    return { data: funcionario };
  }

  async findAll(query: FuncionarioQueryDto) {
    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.tipo) where['tipo'] = query.tipo;
    if (query.estado) where['estado'] = query.estado;
    if (query.q) {
      where['OR'] = [
        { run: { contains: query.q, mode: 'insensitive' } },
        { nombres: { contains: query.q, mode: 'insensitive' } },
        { apellidos: { contains: query.q, mode: 'insensitive' } },
        { cargo: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [total, funcionarios] = await Promise.all([
      this.db.funcionario.count({ where }),
      this.db.funcionario.findMany({
        where,
        skip,
        take: query.limit ?? 20,
        include: {
          usuario: { select: { id: true, email: true } },
          cursosJefatura: { select: { id: true, nombre: true } },
        },
        orderBy: { apellidos: 'asc' },
      }),
    ]);

    return {
      data: funcionarios,
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    };
  }

  async findOne(id: string) {
    const f = await this.db.funcionario.findFirst({
      where: { id, deletedAt: null },
      include: {
        usuario: { select: { id: true, email: true, rol: true } },
        cursosJefatura: { select: { id: true, nombre: true, nivel: true } },
        asignaturasImpartidas: {
          include: { asignatura: { select: { id: true, nombre: true } } },
        },
        liquidaciones: {
          orderBy: { anio: 'desc' },
          take: 3,
          select: { id: true, mes: true, anio: true, liquidoAPago: true, estado: true },
        },
        contratos: {
          where: { estado: 'VIGENTE' },
          take: 1,
          orderBy: { fechaInicio: 'desc' },
        },
      },
    });
    if (!f) throw new NotFoundException(`Funcionario ${id} no encontrado`);
    return { data: f };
  }

  async update(id: string, dto: UpdateFuncionarioDto, usuarioId: string) {
    const f = await this.db.funcionario.findFirst({ where: { id, deletedAt: null } });
    if (!f) throw new NotFoundException(`Funcionario ${id} no encontrado`);

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.funcionario.update({
        where: { id },
        data: {
          ...(dto.nombres !== undefined ? { nombres: dto.nombres } : {}),
          ...(dto.apellidos !== undefined ? { apellidos: dto.apellidos } : {}),
          ...(dto.cargo !== undefined ? { cargo: dto.cargo } : {}),
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.tituloProfesional !== undefined ? { tituloProfesional: dto.tituloProfesional } : {}),
          ...(dto.universidad !== undefined ? { universidad: dto.universidad } : {}),
          ...(dto.especialidadPIE !== undefined ? { especialidadPIE: dto.especialidadPIE } : {}),
          ...(dto.tramoCarrera !== undefined ? { tramoCarrera: dto.tramoCarrera } : {}),
          ...(dto.horasContrato !== undefined ? { horasContrato: dto.horasContrato } : {}),
          ...(dto.sueldoBase !== undefined ? { sueldoBase: dto.sueldoBase } : {}),
          ...(dto.afp !== undefined ? { afp: dto.afp } : {}),
          ...(dto.isapre !== undefined ? { isapre: dto.isapre } : {}),
          ...(dto.cuentaBancaria !== undefined ? { cuentaBancaria: dto.cuentaBancaria } : {}),
          ...(dto.banco !== undefined ? { banco: dto.banco } : {}),
          ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Funcionario', entidadId: id, datosDespues: dto as object },
      });
      return u;
    });

    return { data: updated };
  }

  async remove(id: string, usuarioId: string) {
    const f = await this.db.funcionario.findFirst({ where: { id, deletedAt: null } });
    if (!f) throw new NotFoundException(`Funcionario ${id} no encontrado`);

    await this.db.$transaction(async (tx: any) => {
      await tx.funcionario.update({
        where: { id },
        data: { deletedAt: new Date(), estado: 'DESVINCULADO' },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'DELETE', entidad: 'Funcionario', entidadId: id, datosAntes: f as object },
      });
    });

    return { data: { message: 'Funcionario desvinculado' } };
  }
}
