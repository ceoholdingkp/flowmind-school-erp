import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { TenantService } from '../../prisma/tenant.service';

function validarRut(run: string): boolean {
  const cleaned = run.replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = 11 - (sum % 11);
  const expected = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem);
  return dv === expected;
}

function normalizarRut(run: string): string {
  const cleaned = run.replace(/[.\s]/g, '').toUpperCase();
  if (!cleaned.includes('-')) {
    return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
  }
  return cleaned;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() {
    return this.tenantService.getClient();
  }

  // ── Crear nuevo colegio ──────────────────────────────────────

  async nuevoColegio(dto: {
    nombre: string;
    rbd: string;
    direccion: string;
    comuna: string;
    region: string;
    telefono?: string;
    email?: string;
    nombreDirector: string;
    rutDirector: string;
    emailDirector: string;
  }) {
    const slug = `rbd_${dto.rbd.replace(/\D/g, '')}`;
    const dbName = `flowmind_${slug}`;

    // Validate director RUT
    const rutLimpio = normalizarRut(dto.rutDirector);
    if (!validarRut(dto.rutDirector)) {
      throw new BadRequestException(`RUT del director inválido: ${dto.rutDirector}`);
    }

    // Check if DB already exists
    const baseUrl = process.env.DATABASE_URL!;
    const adminUrl = baseUrl.replace(/\/([^/?]+)(\?.*)?$/, '/postgres$2');

    const adminClient = new PrismaClient({ datasources: { db: { url: adminUrl } } });
    try {
      await adminClient.$connect();
      const existing = await adminClient.$queryRawUnsafe(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        dbName,
      ) as any[];
      if (existing.length > 0) {
        throw new BadRequestException(`Ya existe un colegio con RBD ${dto.rbd} (base de datos: ${dbName})`);
      }

      // Create database
      await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
      this.logger.log(`Base de datos ${dbName} creada`);
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException(`Error creando base de datos: ${e.message}`);
    } finally {
      await adminClient.$disconnect();
    }

    // Run migrations
    const tenantUrl = (process.env.TENANT_DATABASE_URL || baseUrl).replace('{tenantId}', slug);
    const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');

    try {
      execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
        env: { ...process.env, DATABASE_URL: tenantUrl },
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '../../../../'),
      });
      this.logger.log(`Migraciones aplicadas en ${dbName}`);
    } catch (e: any) {
      throw new InternalServerErrorException(`Error ejecutando migraciones: ${e.stderr?.toString() ?? e.message}`);
    }

    // Seed data
    const tenantClient = new PrismaClient({ datasources: { db: { url: tenantUrl } } });
    const passwordTemporal = `Colegio${dto.rbd}!`;
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    try {
      await tenantClient.$connect();

      // Crear Establecimiento
      const establecimiento = await tenantClient.establecimiento.create({
        data: {
          nombre: dto.nombre,
          rbd: dto.rbd,
          direccion: dto.direccion,
          comuna: dto.comuna,
          region: dto.region,
          telefono: dto.telefono,
          email: dto.email,
          sostenedorRut: dto.rutDirector,
          sostenedorNombre: dto.nombreDirector,
          tipo: 'PARTICULAR_SUBVENCIONADO' as any,
          anioEscolarActivo: new Date().getFullYear(),
        },
      });

      // Seed asignaturas base
      const ASIGNATURAS_BASE = [
        { nombre: 'Lenguaje y Comunicación', codigo: 'LEN', horasSemanales: 6 },
        { nombre: 'Matemática', codigo: 'MAT', horasSemanales: 6 },
        { nombre: 'Ciencias Naturales', codigo: 'CN', horasSemanales: 4 },
        { nombre: 'Historia, Geografía y Cs. Sociales', codigo: 'HIS', horasSemanales: 4 },
        { nombre: 'Inglés', codigo: 'ING', horasSemanales: 3 },
        { nombre: 'Educación Física y Salud', codigo: 'EDF', horasSemanales: 3 },
        { nombre: 'Artes Visuales', codigo: 'ART', horasSemanales: 2 },
        { nombre: 'Música', codigo: 'MUS', horasSemanales: 2 },
        { nombre: 'Tecnología', codigo: 'TEC', horasSemanales: 2 },
        { nombre: 'Orientación', codigo: 'ORI', horasSemanales: 1 },
        { nombre: 'Religión', codigo: 'REL', horasSemanales: 2 },
        { nombre: 'Consejo de Curso', codigo: 'CON', horasSemanales: 1 },
      ];
      await tenantClient.asignatura.createMany({ data: ASIGNATURAS_BASE, skipDuplicates: true });

      // Seed configuración previsional base
      const PREV_BASE = [
        { nombre: 'AFP_CAPITAL', tipo: 'AFP', tasa: 11.44 },
        { nombre: 'AFP_CUPRUM', tipo: 'AFP', tasa: 11.48 },
        { nombre: 'AFP_HABITAT', tipo: 'AFP', tasa: 11.27 },
        { nombre: 'AFP_MODELO', tipo: 'AFP', tasa: 10.77 },
        { nombre: 'AFP_PLANVITAL', tipo: 'AFP', tasa: 11.16 },
        { nombre: 'AFP_PROVIDA', tipo: 'AFP', tasa: 11.45 },
        { nombre: 'AFP_UNO', tipo: 'AFP', tasa: 10.49 },
        { nombre: 'FONASA', tipo: 'SALUD', tasa: 7.0 },
        { nombre: 'CESANTIA_TRABAJADOR', tipo: 'SEGURO_CESANTIA', tasa: 0.6 },
        { nombre: 'CESANTIA_EMPLEADOR', tipo: 'SEGURO_CESANTIA', tasa: 2.4 },
      ];
      for (const p of PREV_BASE) {
        await (tenantClient.configuracionPrevisional as any).upsert({
          where: { nombre: p.nombre },
          create: { nombre: p.nombre, tipo: p.tipo, tasa: p.tasa },
          update: {},
        });
      }

      // Crear usuario director
      await tenantClient.usuario.create({
        data: {
          email: dto.emailDirector,
          passwordHash,
          nombre: dto.nombreDirector,
          apellidos: '',
          run: rutLimpio,
          rol: 'DIRECTOR' as any,
          estado: 'ACTIVO' as any,
        },
      });

      this.logger.log(`Colegio ${dto.nombre} configurado exitosamente`);
      return {
        tenantId: slug,
        dbName,
        establecimientoId: establecimiento.id,
        credenciales: { email: dto.emailDirector, passwordTemporal },
        url: `/?tenant=${slug}`,
      };
    } catch (e: any) {
      throw new InternalServerErrorException(`Error configurando datos del colegio: ${e.message}`);
    } finally {
      await tenantClient.$disconnect();
    }
  }

  // ── Importar alumnos ─────────────────────────────────────────

  async importarAlumnos(buffer: Buffer, mimetype: string) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      throw new BadRequestException('El archivo no contiene datos');
    }

    const header = (rows[0] as string[]).map((h) => String(h).trim().toLowerCase());
    const findCol = (names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;

    const colRun = findCol(['run', 'rut', 'rut_alumno', 'run_alumno']);
    const colNombres = findCol(['nombres', 'nombre']);
    const colApPat = findCol(['apellido_paterno', 'ap_paterno', 'apellidopaterno', 'ap paterno']);
    const colApMat = findCol(['apellido_materno', 'ap_materno', 'apellidomaterno', 'ap materno']);
    const colFechaNac = findCol(['fecha_nacimiento', 'fechanacimiento', 'fecha nacimiento', 'fnac']);
    const colGenero = findCol(['genero', 'género', 'sexo']);
    const colCurso = findCol(['curso']);
    const colNivel = findCol(['nivel']);

    if ([colRun, colNombres, colApPat].includes(-1)) {
      throw new BadRequestException('Columnas requeridas: RUN, Nombres, Apellido_Paterno');
    }

    // Find or create establecimiento
    const establecimientos = await this.db.establecimiento.findMany({ take: 1 });
    if (!establecimientos.length) {
      throw new BadRequestException('No hay establecimiento configurado en este tenant');
    }
    const establecimiento = establecimientos[0];

    const importados: string[] = [];
    const errores: { fila: number; campo: string; mensaje: string }[] = [];
    const duplicados: string[] = [];
    const cursosCreados: Map<string, string> = new Map(); // nombre → id

    const anioActual = new Date().getFullYear();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      if (!row || !row[colRun]) continue;

      const fila = i + 1;
      const runRaw = String(row[colRun] ?? '').trim();

      if (!runRaw) continue;

      const run = normalizarRut(runRaw);
      if (!validarRut(runRaw)) {
        errores.push({ fila, campo: 'RUN', mensaje: `RUN inválido: ${runRaw}` });
        continue;
      }

      // Check duplicate
      const existing = await this.db.alumno.findUnique({ where: { run } });
      if (existing) {
        duplicados.push(run);
        continue;
      }

      const nombres = String(row[colNombres] ?? '').trim();
      const apellidoPaterno = String(row[colApPat] ?? '').trim();
      const apellidoMaterno = colApMat >= 0 ? String(row[colApMat] ?? '').trim() : '';

      if (!nombres) { errores.push({ fila, campo: 'Nombres', mensaje: 'Nombres vacío' }); continue; }
      if (!apellidoPaterno) { errores.push({ fila, campo: 'ApellidoPaterno', mensaje: 'Apellido paterno vacío' }); continue; }

      // Fecha nacimiento
      let fechaNacimiento = new Date('2010-01-01');
      if (colFechaNac >= 0 && row[colFechaNac]) {
        const fn = row[colFechaNac];
        const parsed = typeof fn === 'number'
          ? new Date(Math.round((fn - 25569) * 86400 * 1000)) // Excel serial date
          : new Date(fn);
        if (!isNaN(parsed.getTime())) fechaNacimiento = parsed;
      }

      // Género
      let genero: 'MASCULINO' | 'FEMENINO' | 'OTRO' = 'OTRO';
      if (colGenero >= 0 && row[colGenero]) {
        const g = String(row[colGenero]).toUpperCase().trim();
        if (['M', 'MASCULINO', 'HOMBRE', '1'].includes(g)) genero = 'MASCULINO';
        else if (['F', 'FEMENINO', 'MUJER', '2'].includes(g)) genero = 'FEMENINO';
      }

      // Curso / Nivel
      let cursoId: string | undefined;
      if (colCurso >= 0 && row[colCurso]) {
        const nombreCurso = String(row[colCurso]).trim();
        const nivel = colNivel >= 0 ? String(row[colNivel] ?? '').trim() : '1B';

        if (cursosCreados.has(nombreCurso)) {
          cursoId = cursosCreados.get(nombreCurso)!;
        } else {
          const cursoExisting = await this.db.curso.findFirst({
            where: { nombre: nombreCurso, anio: anioActual, establecimientoId: establecimiento.id },
          });
          if (cursoExisting) {
            cursoId = cursoExisting.id;
          } else {
            const match = nombreCurso.match(/^(\d+)([A-Z])$/i);
            const nuevoCurso = await this.db.curso.create({
              data: {
                nombre: nombreCurso,
                nivel: nivel || (match ? `${match[1]}B` : 'EB'),
                letra: match ? match[2].toUpperCase() : 'A',
                tipoEnsenanza: 'BASICA',
                capacidad: 45,
                anio: anioActual,
                establecimientoId: establecimiento.id,
              },
            });
            cursoId = nuevoCurso.id;
          }
          cursosCreados.set(nombreCurso, cursoId);
        }
      }

      // Número de matrícula auto
      const lastMatricula = await this.db.alumno.count();

      try {
        await this.db.alumno.create({
          data: {
            run,
            nombres,
            apellidoPaterno,
            apellidoMaterno: apellidoMaterno || '',
            fechaNacimiento,
            genero,
            fechaMatricula: new Date(),
            estadoMatricula: 'ACTIVA',
            numeroMatricula: lastMatricula + 1000 + i,
            cursoId,
          },
        });
        importados.push(run);
      } catch (e: any) {
        errores.push({ fila, campo: 'DB', mensaje: e.message });
      }
    }

    return { importados: importados.length, duplicados: duplicados.length, errores };
  }

  // ── Importar funcionarios ────────────────────────────────────

  async importarFuncionarios(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) throw new BadRequestException('El archivo no contiene datos');

    const header = (rows[0] as string[]).map((h) => String(h).trim().toLowerCase());
    const findCol = (names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;

    const colRun = findCol(['run', 'rut']);
    const colNombres = findCol(['nombres', 'nombre']);
    const colApellidos = findCol(['apellidos', 'apellido']);
    const colCargo = findCol(['cargo']);
    const colEmail = findCol(['email', 'correo']);
    const colAfp = findCol(['afp']);
    const colSalud = findCol(['salud', 'isapre', 'fonasa']);
    const colSueldo = findCol(['sueldo_base', 'sueldobase', 'sueldo']);

    if ([colRun, colNombres, colApellidos].includes(-1)) {
      throw new BadRequestException('Columnas requeridas: RUN, Nombres, Apellidos');
    }

    const importados: string[] = [];
    const errores: { fila: number; campo: string; mensaje: string }[] = [];
    const duplicados: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      if (!row || !row[colRun]) continue;

      const fila = i + 1;
      const runRaw = String(row[colRun] ?? '').trim();
      if (!runRaw) continue;

      const run = normalizarRut(runRaw);
      if (!validarRut(runRaw)) {
        errores.push({ fila, campo: 'RUN', mensaje: `RUN inválido: ${runRaw}` });
        continue;
      }

      const existing = await this.db.funcionario.findUnique({ where: { run } });
      if (existing) { duplicados.push(run); continue; }

      const nombres = String(row[colNombres] ?? '').trim();
      const apellidos = String(row[colApellidos] ?? '').trim();
      const cargo = colCargo >= 0 ? String(row[colCargo] ?? 'Docente').trim() : 'Docente';
      const afp = colAfp >= 0 ? String(row[colAfp] ?? '').trim() : undefined;
      const isapre = colSalud >= 0 ? String(row[colSalud] ?? '').trim() : undefined;
      const sueldoBase = colSueldo >= 0 && row[colSueldo] ? parseFloat(String(row[colSueldo])) : 0;

      if (!nombres || !apellidos) {
        errores.push({ fila, campo: 'Nombres/Apellidos', mensaje: 'Campos requeridos vacíos' });
        continue;
      }

      // Create email from name + RBD if not provided
      const email = colEmail >= 0 && row[colEmail]
        ? String(row[colEmail]).trim()
        : `${run.replace('-', '')}@colegio.cl`;

      try {
        await this.db.funcionario.create({
          data: {
            run,
            nombres,
            apellidos,
            tipo: 'DOCENTE' as any,
            cargo,
            tipoContrato: 'INDEFINIDO' as any,
            fechaIngreso: new Date(),
            afp: afp || undefined,
            isapre: isapre || undefined,
            sueldoBase: sueldoBase > 0 ? sueldoBase : undefined,
            horasContrato: 44,
          },
        });

        // Create user account
        const passHash = await bcrypt.hash('Temporal123!', 10);
        await this.db.usuario.create({
          data: {
            email,
            passwordHash: passHash,
            nombre: nombres,
            apellidos,
            run,
            rol: 'DOCENTE' as any,
            estado: 'ACTIVO' as any,
          },
        }).catch(() => {}); // ignore if email already exists

        importados.push(run);
      } catch (e: any) {
        errores.push({ fila, campo: 'DB', mensaje: e.message });
      }
    }

    return { importados: importados.length, duplicados: duplicados.length, errores };
  }

  // ── Progreso del onboarding ──────────────────────────────────

  async getProgreso() {
    const [estabs, alumnos, funcionarios, cursos, asignaciones] = await Promise.all([
      this.db.establecimiento.count(),
      this.db.alumno.count(),
      this.db.funcionario.count(),
      this.db.curso.count(),
      this.db.asignaturaDocente.count(),
    ]);

    return {
      pasos: [
        {
          paso: 1,
          nombre: 'Datos del colegio',
          completado: estabs > 0,
        },
        {
          paso: 2,
          nombre: 'Importar alumnos',
          completado: alumnos > 0,
          total: alumnos,
        },
        {
          paso: 3,
          nombre: 'Importar funcionarios',
          completado: funcionarios > 0,
          total: funcionarios,
        },
        {
          paso: 4,
          nombre: 'Configurar cursos',
          completado: cursos > 0,
          total: cursos,
        },
        {
          paso: 5,
          nombre: 'Asignar docentes a asignaturas',
          completado: asignaciones > 0,
          total: asignaciones,
        },
      ],
      porcentaje: Math.round(
        ([estabs, alumnos, funcionarios, cursos, asignaciones].filter((n) => n > 0).length / 5) * 100,
      ),
    };
  }
}
