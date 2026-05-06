import { PrismaClient, Rol, TipoEstablecimiento, PeriodoEval } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { TENANT_CONFIGS, TenantId } from './tenant-configs';

const tenantId = (process.argv[2] || 'colegio_san_andres') as TenantId;

if (!TENANT_CONFIGS[tenantId]) {
  console.error(`Tenant invalido: ${tenantId}`);
  console.error(`Validos: ${Object.keys(TENANT_CONFIGS).join(', ')}`);
  process.exit(1);
}

const cfg = TENANT_CONFIGS[tenantId];
const tenantDbUrl = process.env.TENANT_DATABASE_URL?.replace('{tenantId}', tenantId)
                 || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });

// ─── RUN helpers ──────────────────────────────────────────────────────────────

function dvRUN(num: number): string {
  const digits = String(num);
  let sum = 0;
  let mul = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = 11 - (sum % 11);
  if (rem === 11) return '0';
  if (rem === 10) return 'K';
  return String(rem);
}

function makeRUN(num: number): string {
  const dv = dvRUN(num);
  return `${num}-${dv}`;
}

// ─── Name pools ───────────────────────────────────────────────────────────────

const NOMBRES_M = [
  'Mateo','Sebastián','Nicolás','Diego','Alejandro','Felipe','Ignacio','Tomás','Rodrigo','Cristóbal',
  'Joaquín','Martín','Emilio','Andrés','Jorge','Luis','Carlos','Ricardo','Gabriel','Pablo',
  'Eduardo','Héctor','Ramón','Víctor','Mario','Pedro','Alfredo','Javier','Fernando','Alberto',
];
const NOMBRES_F = [
  'Sofía','Valentina','Camila','Isabella','María','Fernanda','Catalina','Daniela','Javiera','Paula',
  'Constanza','Antonia','Florencia','Isidora','Gabriela','Valeria','Carolina','Claudia','Andrea','Patricia',
  'Bárbara','Natalia','Alejandra','Francisca','Mónica','Lorena','Ximena','Mariana','Beatriz','Rosa',
];
const APELLIDOS = [
  'González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda',
  'Morales','Torres','Flores','Miranda','Castro','Vargas','Fuentes','Herrera','Medina','Aguilera',
  'Núñez','Fernández','López','Ramírez','Vega','Castillo','Ramos','Reyes','Gutiérrez','Espinoza',
  'Pizarro','Bravo','Vera','Araya','Cerda','Valenzuela','Figueroa','Ríos','Carrasco','Sandoval',
  'Correa','Molina','Ortiz','Mendoza','Pino','Cárdenas','León','Ibáñez','Monsalve','Villalobos',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// School days: first 20 working days of 2026 (Jan/Feb)
const SCHOOL_DAYS: Date[] = [];
const startDate = new Date('2026-03-02'); // Start of school year
let d = new Date(startDate);
while (SCHOOL_DAYS.length < 20) {
  const dow = d.getDay();
  if (dow !== 0 && dow !== 6) {
    SCHOOL_DAYS.push(new Date(d));
  }
  d.setDate(d.getDate() + 1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding tenant database (full dataset)...\n');

  // ── 1. Establecimiento ─────────────────────────────────────────
  const establecimiento = await prisma.establecimiento.upsert({
    where: { rbd: cfg.establecimiento.rbd },
    update: {
      nombre: cfg.establecimiento.nombre,
      anioEscolarActivo: cfg.establecimiento.anioEscolarActivo,
    },
    create: {
      nombre: cfg.establecimiento.nombre,
      rbd: cfg.establecimiento.rbd,
      direccion: cfg.establecimiento.direccion,
      comuna: cfg.establecimiento.comuna,
      region: cfg.establecimiento.region,
      telefono: cfg.establecimiento.telefono,
      email: cfg.establecimiento.email,
      sostenedorRut: cfg.establecimiento.sostenedorRut,
      sostenedorNombre: cfg.establecimiento.sostenedorNombre,
      tipo: cfg.establecimiento.tipo,
      anioEscolarActivo: cfg.establecimiento.anioEscolarActivo,
      periodoEvaluacion: cfg.establecimiento.periodoEvaluacion,
      escalaMin: cfg.establecimiento.escalaMin,
      escalaMax: cfg.establecimiento.escalaMax,
      notaAprobacion: cfg.establecimiento.notaAprobacion,
      asistenciaMinima: cfg.establecimiento.asistenciaMinima,
    },
  });
  console.log(`✅ Establecimiento: ${establecimiento.nombre}`);

  // ── 2. Usuarios Staff ──────────────────────────────────────────
  const [adminHash, directorHash, docenteHash, apoderadoHash] = await Promise.all([
    bcrypt.hash('Admin1234!', 10),
    bcrypt.hash('Director123!', 10),
    bcrypt.hash('Docente123!', 10),
    bcrypt.hash('Apoderado123!', 10),
  ]);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@flowmind.cl' },
    update: {},
    create: {
      email: 'admin@flowmind.cl', passwordHash: adminHash,
      nombre: 'Super', apellidos: 'Admin', rol: Rol.SUPER_ADMIN,
    },
  });

  const director = await prisma.usuario.upsert({
    where: { email: cfg.emails.director },
    update: {},
    create: {
      email: cfg.emails.director, passwordHash: directorHash,
      nombre: 'María', apellidos: 'González Pérez',
      run: cfg.runDirector, rol: Rol.DIRECTOR,
    },
  });

  const docenteUser = await prisma.usuario.upsert({
    where: { email: cfg.emails.docente },
    update: {},
    create: {
      email: cfg.emails.docente, passwordHash: docenteHash,
      nombre: 'Carlos', apellidos: 'Muñoz Silva',
      run: cfg.runDocente, rol: Rol.DOCENTE,
    },
  });

  console.log(`✅ Usuarios staff: admin, director, docente`);

  // ── 3. Funcionarios ────────────────────────────────────────────
  const funcionariosData = cfg.funcionarios;

  const funcionarios: any[] = [];
  for (let i = 0; i < funcionariosData.length; i++) {
    const fd = funcionariosData[i];
    const f = await prisma.funcionario.upsert({
      where: { run: fd.run },
      update: {},
      create: {
        run: fd.run,
        nombres: fd.nombres,
        apellidos: fd.apellidos,
        tipo: fd.tipo as any,
        cargo: fd.cargo,
        tramoCarrera: fd.tramo as any ?? null,
        horasContrato: fd.horas,
        tipoContrato: fd.tipoContrato as any,
        fechaIngreso: new Date(fd.fechaIngreso),
        sueldoBase: fd.tipo === 'DOCENTE' ? 1200000 + i * 80000 : 900000 + i * 50000,
        afp: fd.afp,
        isapre: fd.isapre,
        banco: fd.banco,
        estado: 'ACTIVO',
      },
    });
    funcionarios.push(f);
  }

  // Link docente user to first funcionario
  await prisma.usuario.update({
    where: { email: cfg.emails.docente },
    update: { funcionarioId: funcionarios[0].id },
  } as any).catch(() => {});

  console.log(`✅ Funcionarios: ${funcionarios.length}`);

  // ── 4. Asignaturas ─────────────────────────────────────────────
  const asignaturasData = [
    { nombre: 'Matemáticas', codigo: 'MAT', horas: 6 },
    { nombre: 'Lenguaje y Comunicación', codigo: 'LEN', horas: 8 },
    { nombre: 'Ciencias Naturales', codigo: 'CN', horas: 4 },
    { nombre: 'Historia y Cs. Sociales', codigo: 'HCS', horas: 4 },
    { nombre: 'Inglés', codigo: 'ING', horas: 4 },
  ];

  const asignaturas: any[] = [];
  for (const ad of asignaturasData) {
    const a = await prisma.asignatura.upsert({
      where: { codigo: ad.codigo },
      update: {},
      create: { nombre: ad.nombre, codigo: ad.codigo, horasSemanales: ad.horas },
    });
    asignaturas.push(a);
  }
  console.log(`✅ Asignaturas: ${asignaturas.length}`);

  // ── 5. Cursos (8 cursos básica) ────────────────────────────────
  const cursosData = cfg.cursos;

  const cursos: any[] = [];
  for (let i = 0; i < cursosData.length; i++) {
    const cd = cursosData[i];
    const c = await prisma.curso.upsert({
      where: {
        nombre_anio_establecimientoId: {
          nombre: cd.nombre,
          anio: 2026,
          establecimientoId: establecimiento.id,
        },
      },
      update: { docenteJefeId: funcionarios[i % funcionarios.length].id },
      create: {
        nombre: cd.nombre,
        nivel: cd.nivel,
        letra: cd.letra,
        tipoEnsenanza: cd.tipo,
        capacidad: 45,
        anio: 2026,
        establecimientoId: establecimiento.id,
        docenteJefeId: funcionarios[i % funcionarios.length].id,
      },
    });
    cursos.push(c);
  }
  console.log(`✅ Cursos: ${cursos.length}`);

  // ── 6. Alumnos (200 = 25 por curso) ───────────────────────────
  let runCounter = cfg.runCounterStart;
  const allAlumnos: any[] = [];

  for (let ci = 0; ci < cursos.length; ci++) {
    const curso = cursos[ci];
    const baseMatricula = ci * 25 + 1;
    const cursoAlumnos: any[] = [];

    for (let ai = 0; ai < cursosData[ci].alumnos; ai++) {
      const isMale = (ai + ci) % 2 === 0;
      const run = makeRUN(runCounter++);
      const nombres = isMale ? pick(NOMBRES_M) : pick(NOMBRES_F);
      const apellidoPaterno = pick(APELLIDOS);
      const apellidoMaterno = pick(APELLIDOS);
      const birthYear = 2026 - (6 + ci); // age matches grade
      const esPIE = ai < cfg.piePorCurso;
      const esPrioritario = ai < cfg.prioritarioPorCurso;
      const esPreferente = ai >= cfg.prioritarioPorCurso && ai < cfg.prioritarioPorCurso + cfg.preferentePorCurso;

      const alumno = await prisma.alumno.upsert({
        where: { run },
        update: {},
        create: {
          run,
          nombres,
          apellidoPaterno,
          apellidoMaterno,
          fechaNacimiento: new Date(`${birthYear}-${String((ai % 12) + 1).padStart(2, '0')}-${String((ai % 28) + 1).padStart(2, '0')}`),
          genero: isMale ? 'MASCULINO' : 'FEMENINO',
          cursoId: curso.id,
          fechaMatricula: new Date('2026-01-15'),
          estadoMatricula: 'ACTIVA',
          numeroMatricula: baseMatricula + ai,
          esPIE,
          esPrioritario,
          esPreferente,
        },
      });
      cursoAlumnos.push(alumno);
      allAlumnos.push(alumno);
    }

    console.log(`  📚 ${curso.nombre}: ${cursoAlumnos.length} alumnos`);
  }
  console.log(`✅ Alumnos totales: ${allAlumnos.length}`);

  // ── 7. Apoderado (linked to first alumno) ─────────────────────
  const firstAlumno = allAlumnos[0];
  const apoderado = await (prisma.apoderado as any).upsert({
    where: { run: cfg.runApoderado },
    update: { passwordHash: apoderadoHash, activo: true },
    create: {
      run: cfg.runApoderado,
      nombres: 'Carmen',
      apellidos: 'Pérez Morales',
      telefono: '+56 9 8765 4321',
      email: cfg.emails.apoderado,
      ocupacion: 'Profesora',
      passwordHash: apoderadoHash,
      activo: true,
    },
  });

  await prisma.apoderadoAlumno.upsert({
    where: { alumnoId_apoderadoId: { alumnoId: firstAlumno.id, apoderadoId: apoderado.id } },
    update: {},
    create: {
      alumnoId: firstAlumno.id,
      apoderadoId: apoderado.id,
      parentesco: 'Madre',
      esTitular: true,
      esEmergencia: true,
    },
  });

  const apoderadoUsuario = await prisma.usuario.upsert({
    where: { email: cfg.emails.apoderado },
    update: {},
    create: {
      email: cfg.emails.apoderado,
      passwordHash: apoderadoHash,
      nombre: 'Carmen',
      apellidos: 'Pérez Morales',
      run: cfg.runApoderado,
      rol: Rol.APODERADO,
      apoderadoId: apoderado.id,
    },
  });

  console.log(`✅ Apoderado: ${apoderadoUsuario.email} / Apoderado123!`);

  // ── 8. Notas (3 asignaturas × 4 evaluaciones × todos los alumnos) ─
  console.log('📝 Generando notas...');
  const notasAsigs = asignaturas.slice(0, 3); // Mat, Len, CN
  const evaluaciones = [
    { nombre: 'Prueba 1', tipo: 'SUMATIVA', ponderacion: 0.25, daysOffset: 5 },
    { nombre: 'Prueba 2', tipo: 'SUMATIVA', ponderacion: 0.25, daysOffset: 15 },
    { nombre: 'Taller 1', tipo: 'TALLER', ponderacion: 0.20, daysOffset: 8 },
    { nombre: 'Examen', tipo: 'EXAMEN', ponderacion: 0.30, daysOffset: 25 },
  ];

  let notasCreadas = 0;
  const batchSize = 50;
  const notasBatch: any[] = [];

  for (const alumno of allAlumnos) {
    for (const asig of notasAsigs) {
      for (const ev of evaluaciones) {
        // Generate a realistic grade (normal distribution around 5.0)
        const base = 4.0 + Math.random() * 2.8; // 4.0 to 6.8
        const valor = Math.min(7.0, Math.max(1.0, Math.round(base * 10) / 10));

        const fechaBase = new Date('2026-04-01');
        fechaBase.setDate(fechaBase.getDate() + ev.daysOffset + Math.floor(Math.random() * 3));

        notasBatch.push({
          alumnoId: alumno.id,
          asignaturaId: asig.id,
          tipo: ev.tipo as any,
          nombreEvaluacion: ev.nombre,
          ponderacion: ev.ponderacion,
          valor,
          fecha: fechaBase,
          semestre: 1,
          anio: 2026,
          ingresadaPor: director.id,
        });
      }
    }

    if (notasBatch.length >= batchSize) {
      await prisma.nota.createMany({ data: notasBatch, skipDuplicates: true });
      notasCreadas += notasBatch.length;
      notasBatch.length = 0;
    }
  }

  if (notasBatch.length > 0) {
    await prisma.nota.createMany({ data: notasBatch, skipDuplicates: true });
    notasCreadas += notasBatch.length;
  }
  console.log(`✅ Notas creadas: ${notasCreadas}`);

  // ── 9. Asistencia (20 días × todos los alumnos) ────────────────
  console.log('📅 Generando asistencia...');
  let asistCreadas = 0;
  const asistBatch: any[] = [];
  const estadosAsist = ['PRESENTE','PRESENTE','PRESENTE','PRESENTE','PRESENTE','PRESENTE','PRESENTE','PRESENTE','PRESENTE','AUSENTE','ATRASO','JUSTIFICADO'] as const;

  for (const alumno of allAlumnos) {
    for (const dia of SCHOOL_DAYS) {
      const estado = estadosAsist[Math.floor(Math.random() * estadosAsist.length)];
      asistBatch.push({
        alumnoId: alumno.id,
        cursoId: alumno.cursoId,
        fecha: dia,
        estado,
        registradoPor: director.id,
      });

      if (asistBatch.length >= 200) {
        await prisma.asistencia.createMany({ data: asistBatch, skipDuplicates: true });
        asistCreadas += asistBatch.length;
        asistBatch.length = 0;
      }
    }
  }

  if (asistBatch.length > 0) {
    await prisma.asistencia.createMany({ data: asistBatch, skipDuplicates: true });
    asistCreadas += asistBatch.length;
  }
  console.log(`✅ Asistencias creadas: ${asistCreadas}`);

  // ── 10. Fondos financieros ─────────────────────────────────────
  const fondosData = [
    { nombre: 'Subvención General', presupuesto: cfg.fondos.subvGeneral },
    { nombre: 'SEP', presupuesto: cfg.fondos.sep },
    { nombre: 'PIE', presupuesto: cfg.fondos.pie },
    { nombre: 'FAEP', presupuesto: cfg.fondos.faep },
  ];

  const fondos: any[] = [];
  for (const fd of fondosData) {
    const f = await prisma.fondo.upsert({
      where: { nombre_anio_establecimientoId: { nombre: fd.nombre, anio: 2026, establecimientoId: establecimiento.id } },
      update: {},
      create: {
        nombre: fd.nombre,
        presupuestoAnual: fd.presupuesto,
        anio: 2026,
        activo: true,
        establecimientoId: establecimiento.id,
      },
    });
    fondos.push(f);
  }
  console.log(`✅ Fondos: ${fondos.length}`);

  // ── 11. Movimientos financieros (Ene-Mar 2026) ─────────────────
  const [fondoSubv, fondoSEP, fondoPIE, fondoFAEP] = fondos;

  // Ingresos mensuales
  const ingresos = [
    // Enero
    { tipo: 'INGRESO', categoria: 'Subvención', fondoId: fondoSubv.id, monto: 78_000_000, fecha: new Date('2026-01-15'), mes: 1, desc: 'Subvención General Ene 2026' },
    { tipo: 'INGRESO', categoria: 'SEP', fondoId: fondoSEP.id, monto: 18_666_667, fecha: new Date('2026-01-15'), mes: 1, desc: 'Aporte SEP Ene 2026' },
    { tipo: 'INGRESO', categoria: 'PIE', fondoId: fondoPIE.id, monto: 6_000_000, fecha: new Date('2026-01-15'), mes: 1, desc: 'Aporte PIE Ene 2026' },
    // Febrero
    { tipo: 'INGRESO', categoria: 'Subvención', fondoId: fondoSubv.id, monto: 78_000_000, fecha: new Date('2026-02-15'), mes: 2, desc: 'Subvención General Feb 2026' },
    { tipo: 'INGRESO', categoria: 'SEP', fondoId: fondoSEP.id, monto: 18_666_667, fecha: new Date('2026-02-15'), mes: 2, desc: 'Aporte SEP Feb 2026' },
    { tipo: 'INGRESO', categoria: 'PIE', fondoId: fondoPIE.id, monto: 6_000_000, fecha: new Date('2026-02-15'), mes: 2, desc: 'Aporte PIE Feb 2026' },
    // Marzo
    { tipo: 'INGRESO', categoria: 'Subvención', fondoId: fondoSubv.id, monto: 78_000_000, fecha: new Date('2026-03-15'), mes: 3, desc: 'Subvención General Mar 2026' },
    { tipo: 'INGRESO', categoria: 'SEP', fondoId: fondoSEP.id, monto: 18_666_666, fecha: new Date('2026-03-15'), mes: 3, desc: 'Aporte SEP Mar 2026' },
    { tipo: 'INGRESO', categoria: 'PIE', fondoId: fondoPIE.id, monto: 6_000_000, fecha: new Date('2026-03-15'), mes: 3, desc: 'Aporte PIE Mar 2026' },
    // Matrícula
    { tipo: 'INGRESO', categoria: 'Matrícula', fondoId: fondoFAEP.id, monto: 12_000_000, fecha: new Date('2026-01-20'), mes: 1, desc: 'Cobros matrícula 2026 (200 alumnos)' },
  ];

  // Egresos mensuales
  const egresos = [
    // Enero
    { tipo: 'EGRESO', categoria: 'Remuneraciones', fondoId: fondoSubv.id, monto: 38_500_000, fecha: new Date('2026-01-30'), mes: 1, desc: 'Sueldos docentes y asistentes Ene 2026' },
    { tipo: 'EGRESO', categoria: 'Servicios Básicos', fondoId: fondoSubv.id, monto: 1_850_000, fecha: new Date('2026-01-28'), mes: 1, desc: 'Agua, luz, gas Ene 2026' },
    { tipo: 'EGRESO', categoria: 'Materiales', fondoId: fondoSEP.id, monto: 3_200_000, fecha: new Date('2026-01-10'), mes: 1, desc: 'Material didáctico primer semestre' },
    // Febrero
    { tipo: 'EGRESO', categoria: 'Remuneraciones', fondoId: fondoSubv.id, monto: 38_500_000, fecha: new Date('2026-02-28'), mes: 2, desc: 'Sueldos docentes y asistentes Feb 2026' },
    { tipo: 'EGRESO', categoria: 'Servicios Básicos', fondoId: fondoSubv.id, monto: 1_720_000, fecha: new Date('2026-02-26'), mes: 2, desc: 'Agua, luz, gas Feb 2026' },
    { tipo: 'EGRESO', categoria: 'Infraestructura', fondoId: fondoSEP.id, monto: 5_500_000, fecha: new Date('2026-02-15'), mes: 2, desc: 'Reparación sala de computación' },
    // Marzo
    { tipo: 'EGRESO', categoria: 'Remuneraciones', fondoId: fondoSubv.id, monto: 38_500_000, fecha: new Date('2026-03-31'), mes: 3, desc: 'Sueldos docentes y asistentes Mar 2026' },
    { tipo: 'EGRESO', categoria: 'Servicios Básicos', fondoId: fondoSubv.id, monto: 1_900_000, fecha: new Date('2026-03-28'), mes: 3, desc: 'Agua, luz, gas Mar 2026' },
    { tipo: 'EGRESO', categoria: 'PIE Gastos', fondoId: fondoPIE.id, monto: 4_200_000, fecha: new Date('2026-03-20'), mes: 3, desc: 'Honorarios profesionales PIE' },
    { tipo: 'EGRESO', categoria: 'Alimentación', fondoId: fondoSEP.id, monto: 2_800_000, fecha: new Date('2026-03-10'), mes: 3, desc: 'Programa alimentación escolar' },
  ];

  const allMovimientos = [...ingresos, ...egresos];
  for (const m of allMovimientos) {
    await prisma.movimientoFinanciero.create({
      data: {
        tipo: m.tipo as any,
        categoria: m.categoria,
        fondoId: m.fondoId,
        monto: m.monto,
        fecha: m.fecha,
        mes: m.mes,
        anio: 2026,
        descripcion: m.desc,
        fuenteDato: 'MANUAL',
      },
    });
  }
  console.log(`✅ Movimientos financieros: ${allMovimientos.length}`);

  // ── 12. Pagos de alumnos (mensualidades Ene-Mar 2026) ──────────
  const pagosBatch: any[] = [];
  const sampleAlumnos = allAlumnos.slice(0, 40); // 40 alumnos con pagos
  for (const alumno of sampleAlumnos) {
    for (let mes = 1; mes <= 3; mes++) {
      const estado = Math.random() > 0.1 ? 'PAGADO' : 'PENDIENTE';
      const fecha = new Date(`2026-0${mes}-${String(5 + Math.floor(Math.random() * 15)).padStart(2, '0')}`);
      pagosBatch.push({
        alumnoId: alumno.id,
        monto: 85000,
        fecha,
        metodo: ['TRANSFERENCIA', 'EFECTIVO', 'WEBPAY'][Math.floor(Math.random() * 3)] as any,
        estado: estado as any,
        descripcion: `Mensualidad ${['Enero','Febrero','Marzo'][mes - 1]} 2026`,
        mesCorresponde: mes,
      });
    }
  }
  await prisma.pago.createMany({ data: pagosBatch, skipDuplicates: true });
  console.log(`✅ Pagos alumnos: ${pagosBatch.length}`);

  // ── 13. Atrasos (50) ───────────────────────────────────────────
  const atrasosCount = await prisma.atraso.count();
  if (atrasosCount === 0) {
    const atrasoBatch: any[] = [];
    for (let i = 0; i < 50; i++) {
      const alumno = allAlumnos[i * 4 % allAlumnos.length];
      const dia = SCHOOL_DAYS[i % SCHOOL_DAYS.length];
      const minutos = 5 + Math.floor(Math.random() * 25);
      const horaBase = new Date(dia);
      horaBase.setHours(8, minutos, 0, 0);
      atrasoBatch.push({
        alumnoId: alumno.id,
        fecha: dia,
        horaLlegada: horaBase,
        minutosAtraso: minutos,
        bloqueHorario: 1,
        tipo: i % 5 === 0 ? 'ENTRE_BLOQUES' : 'PRIMER_BLOQUE',
        justificado: i % 7 === 0,
        justificacion: i % 7 === 0 ? 'Dificultad de transporte documentada' : null,
        registradoPor: director.id,
        notificacionEnviada: i % 3 !== 0,
      });
    }
    await prisma.atraso.createMany({ data: atrasoBatch });
    console.log(`✅ Atrasos: ${atrasoBatch.length}`);
  } else {
    console.log(`⏭️  Atrasos: ya existen (${atrasosCount})`);
  }

  // ── 14. Anotaciones convivencia (10) ───────────────────────────
  const anotacionesCount = await prisma.anotacion.count();
  if (anotacionesCount === 0) {
    const descripciones = {
      POSITIVA: ['Excelente participación en clase', 'Ayudó a compañeros con dificultades', 'Presentación destacada', 'Liderazgo positivo en actividad grupal', 'Trabajo ejemplar y actitud impecable'],
      NEGATIVA: ['Interrupciones reiteradas en clase', 'No entregó tarea a tiempo', 'Falta de respeto a compañero', 'Uso de celular no autorizado durante clase', 'Conducta disruptiva afectando al curso'],
    };
    const categorias = ['Conducta', 'Rendimiento', 'Asistencia', 'Participación', 'Trabajo en equipo'];
    const anotBatch: any[] = [];
    for (let i = 0; i < 10; i++) {
      const alumno = allAlumnos[i * 7 % allAlumnos.length];
      const tipo = i % 2 === 0 ? 'POSITIVA' : 'NEGATIVA';
      const descs = descripciones[tipo as keyof typeof descripciones];
      anotBatch.push({
        alumnoId: alumno.id,
        tipo: tipo as any,
        gravedad: tipo === 'NEGATIVA' ? (['LEVE', 'GRAVE', 'GRAVISIMA'] as const)[i % 3] : null,
        categoria: categorias[i % categorias.length],
        descripcion: descs[i % descs.length],
        fecha: SCHOOL_DAYS[i % SCHOOL_DAYS.length],
        registradaPor: director.id,
        visiblePortal: true,
      });
    }
    await prisma.anotacion.createMany({ data: anotBatch });
    console.log(`✅ Anotaciones: ${anotBatch.length}`);
  } else {
    console.log(`⏭️  Anotaciones: ya existen (${anotacionesCount})`);
  }

  // ── 15. Leccionarios (20, 10 firmados) ─────────────────────────
  const leccionariosCount = await prisma.leccionario.count();
  if (leccionariosCount === 0) {
    const contenidos = [
      'Fracciones y decimales', 'Álgebra básica', 'Geometría plana', 'Estadística descriptiva',
      'Comprensión lectora', 'Producción de textos narrativos', 'Gramática y ortografía avanzada', 'Argumentación escrita',
      'El sistema solar', 'Estados de la materia', 'Los seres vivos y su clasificación', 'Ecología y medio ambiente',
      'Historia de Chile republicano', 'Geografía de América Latina', 'Ciudadanía y democracia', 'Derechos humanos',
      'Present simple y continuous', 'Vocabulary building', 'Reading comprehension', 'Writing skills',
    ];
    const lecBatch: any[] = [];
    for (let i = 0; i < 20; i++) {
      const curso = cursos[i % cursos.length];
      const asig = asignaturas[i % asignaturas.length];
      const func = funcionarios[i % funcionarios.length];
      const dia = SCHOOL_DAYS[i % SCHOOL_DAYS.length];
      const esFirmado = i < 10;
      const hora = 8 + (i % 4);
      lecBatch.push({
        cursoId: curso.id,
        asignaturaId: asig.id,
        docenteId: func.id,
        fecha: dia,
        bloqueHorario: (i % 8) + 1,
        horaInicio: `${String(hora).padStart(2, '0')}:00`,
        horaFin: `${String(hora).padStart(2, '0')}:45`,
        objetivo: `OA${i + 1}: Comprender y aplicar conceptos fundamentales de la unidad`,
        contenido: contenidos[i],
        actividades: 'Explicación docente, trabajo colaborativo, ejercicios prácticos y puesta en común',
        recursos: 'Libro de texto, pizarrón, material didáctico fotocopiado',
        observaciones: i % 4 === 0 ? 'Clase desarrollada con normalidad. Se aplicó evaluación formativa.' : null,
        estado: esFirmado ? 'FIRMADO' : 'PENDIENTE',
        firmaDigital: esFirmado ? new Date(dia.getTime() + 4 * 60 * 60 * 1000) : null,
      });
    }
    await prisma.leccionario.createMany({ data: lecBatch });
    console.log(`✅ Leccionarios: ${lecBatch.length} (${lecBatch.filter(l => l.estado === 'FIRMADO').length} firmados)`);
  } else {
    console.log(`⏭️  Leccionarios: ya existen (${leccionariosCount})`);
  }

  // ── 16. Liquidaciones marzo 2026 (3 funcionarios) ─────────────
  for (let i = 0; i < 3; i++) {
    const func = funcionarios[i];
    const sueldoBase = Number(func.sueldoBase);
    const gratificacion = Math.round(sueldoBase * 0.25);
    const bonoBienestar = 50000;
    const totalHaberes = sueldoBase + gratificacion + bonoBienestar;
    const afpDesc = Math.round(totalHaberes * 0.1166);
    const saludDesc = Math.round(totalHaberes * 0.07);
    const totalDescuentos = afpDesc + saludDesc;
    const liquidoAPago = totalHaberes - totalDescuentos;
    await prisma.liquidacion.upsert({
      where: { funcionarioId_mes_anio: { funcionarioId: func.id, mes: 3, anio: 2026 } },
      update: {},
      create: {
        funcionarioId: func.id,
        mes: 3,
        anio: 2026,
        sueldoBase,
        totalHaberes,
        totalDescuentos,
        liquidoAPago,
        detalleHaberes: [
          { concepto: 'Sueldo Base', monto: sueldoBase },
          { concepto: 'Gratificación Legal', monto: gratificacion },
          { concepto: 'Bono Bienestar', monto: bonoBienestar },
        ],
        detalleDescuentos: [
          { concepto: `AFP ${func.afp}`, monto: afpDesc },
          { concepto: `Salud ${func.isapre}`, monto: saludDesc },
        ],
        fondoImputacion: [
          { fondoId: fondoSubv.id, porcentaje: 80, monto: Math.round(liquidoAPago * 0.8) },
          { fondoId: fondoSEP.id, porcentaje: 20, monto: Math.round(liquidoAPago * 0.2) },
        ],
        estado: 'APROBADA',
        fechaPago: new Date('2026-03-31'),
      },
    });
  }
  console.log(`✅ Liquidaciones: 3 (marzo 2026)`);

  // ── 17. Proveedores (5) con contratos ─────────────────────────
  const proveedoresData = [
    { rut: '76.123.456-7', razon: 'Librería Escolar Ltda', giro: 'Venta de material escolar', tel: '+56 2 2234 5678', email: 'contacto@libreria.cl', contacto: 'Juan Pérez', banco: 'BancoEstado' },
    { rut: '76.234.567-8', razon: 'Mantención Industrial SpA', giro: 'Servicios de mantención y aseo', tel: '+56 2 2345 6789', email: 'mant@mantindust.cl', contacto: 'María López', banco: 'Santander' },
    { rut: '76.345.678-9', razon: 'Tecnología Educativa SA', giro: 'Equipos y servicios computacionales', tel: '+56 2 2456 7890', email: 'ventas@tecedu.cl', contacto: 'Carlos García', banco: 'BCI' },
    { rut: '76.456.789-0', razon: 'Catering Escolar Limitada', giro: 'Alimentación y nutrición escolar', tel: '+56 2 2567 8901', email: 'info@catering.cl', contacto: 'Ana Morales', banco: 'Scotiabank' },
    { rut: '76.567.890-1', razon: 'Seguridad Total SpA', giro: 'Servicios de seguridad y vigilancia', tel: '+56 2 2678 9012', email: 'admin@segtotal.cl', contacto: 'Pedro Vargas', banco: 'Chile' },
  ];
  const proveedores: any[] = [];
  for (const pd of proveedoresData) {
    const p = await prisma.proveedor.upsert({
      where: { rut: pd.rut },
      update: {},
      create: { rut: pd.rut, razonSocial: pd.razon, giro: pd.giro, telefono: pd.tel, email: pd.email, contactoNombre: pd.contacto, banco: pd.banco },
    });
    proveedores.push(p);
  }

  const contratosCount = await prisma.contratoProveedor.count();
  if (contratosCount === 0) {
    const contratosData = [
      { pIdx: 0, tipo: 'Suministro material escolar', monto: 3500000, mensual: null, inicio: '2026-01-01', termino: '2026-12-31', fondo: 'SEP', estado: 'VIGENTE', num: 'CONT-2026-001' },
      { pIdx: 1, tipo: 'Mantención edificio y aseo', monto: 12000000, mensual: 1000000, inicio: '2026-01-01', termino: '2026-12-31', fondo: 'Subvención General', estado: 'VIGENTE', num: 'CONT-2026-002' },
      { pIdx: 2, tipo: 'Equipos computacionales y soporte', monto: 8500000, mensual: null, inicio: '2026-02-01', termino: '2026-05-31', fondo: 'SEP', estado: 'VIGENTE', num: 'CONT-2026-003' },
      { pIdx: 3, tipo: 'Servicio alimentación escolar', monto: null, mensual: 2800000, inicio: '2026-03-01', termino: '2026-12-31', fondo: 'Subvención General', estado: 'VIGENTE', num: 'CONT-2026-004' },
      { pIdx: 4, tipo: 'Seguridad y vigilancia exterior', monto: null, mensual: 550000, inicio: '2025-01-01', termino: '2026-06-30', fondo: 'Subvención General', estado: 'POR_VENCER', num: 'CONT-2025-012' },
    ];
    await prisma.contratoProveedor.createMany({
      data: contratosData.map(cd => ({
        proveedorId: proveedores[cd.pIdx].id,
        numeroContrato: cd.num,
        tipoServicio: cd.tipo,
        montoTotal: cd.monto,
        montoMensual: cd.mensual,
        fechaInicio: new Date(cd.inicio),
        fechaTermino: cd.termino ? new Date(cd.termino) : null,
        fondoImputacion: cd.fondo,
        estado: cd.estado as any,
      })),
    });
  }
  console.log(`✅ Proveedores: ${proveedores.length} con contratos`);

  // ── 18. Bienes inventario (30) ─────────────────────────────────
  const bienesCount = await prisma.bienInventario.count();
  if (bienesCount === 0) {
    const bienesRaw = [
      { cod: 'INV-TEC-001', nombre: 'Computador iMac 24"', cat: 'TECNOLOGICO', marca: 'Apple', modelo: 'iMac 2023', ns: 'SN2023IMAC001', valor: 1890000, vida: 5 },
      { cod: 'INV-TEC-002', nombre: 'Computador iMac 24"', cat: 'TECNOLOGICO', marca: 'Apple', modelo: 'iMac 2023', ns: 'SN2023IMAC002', valor: 1890000, vida: 5 },
      { cod: 'INV-TEC-003', nombre: 'Proyector Epson EB-X51', cat: 'TECNOLOGICO', marca: 'Epson', modelo: 'EB-X51', ns: 'PRJEP23001', valor: 450000, vida: 5 },
      { cod: 'INV-TEC-004', nombre: 'Proyector Epson EB-X51', cat: 'TECNOLOGICO', marca: 'Epson', modelo: 'EB-X51', ns: 'PRJEP23002', valor: 450000, vida: 5 },
      { cod: 'INV-TEC-005', nombre: 'Impresora Laser HP LaserJet Pro', cat: 'TECNOLOGICO', marca: 'HP', modelo: 'LaserJet Pro M404', ns: 'HPLJ2023001', valor: 280000, vida: 4 },
      { cod: 'INV-TEC-006', nombre: 'Tablet Samsung Galaxy Tab A8', cat: 'TECNOLOGICO', marca: 'Samsung', modelo: 'Galaxy Tab A8', ns: 'SAMSUNGTAB001', valor: 320000, vida: 3 },
      { cod: 'INV-TEC-007', nombre: 'Tablet Samsung Galaxy Tab A8', cat: 'TECNOLOGICO', marca: 'Samsung', modelo: 'Galaxy Tab A8', ns: 'SAMSUNGTAB002', valor: 320000, vida: 3 },
      { cod: 'INV-TEC-008', nombre: 'Pizarra Digital Interactiva Smart', cat: 'TECNOLOGICO', marca: 'Smart', modelo: 'Board 7000', ns: 'SMRT7K001', valor: 1200000, vida: 7 },
      { cod: 'INV-TEC-009', nombre: 'Monitor CRT 17" (BAJA)', cat: 'TECNOLOGICO', marca: 'Samsung', modelo: 'CRT 2008', ns: 'CRT2008001', valor: 0, vida: 5, estado: 'DADO_DE_BAJA', motivo: 'Obsoleto', fechaBaja: new Date('2026-02-15') },
      { cod: 'INV-MOB-001', nombre: 'Escritorio Docente', cat: 'MOBILIARIO', marca: 'Muebles Chile', modelo: 'Modelo A', ns: null, valor: 85000, vida: 10 },
      { cod: 'INV-MOB-002', nombre: 'Silla Ergonómica Dirección', cat: 'MOBILIARIO', marca: 'Ergo', modelo: 'Plus', ns: null, valor: 120000, vida: 8 },
      { cod: 'INV-MOB-003', nombre: 'Estantería metálica 5 niveles', cat: 'MOBILIARIO', marca: 'Metalmueble', modelo: '5N-180', ns: null, valor: 65000, vida: 15 },
      { cod: 'INV-MOB-004', nombre: 'Mesa reuniones 8 personas', cat: 'MOBILIARIO', marca: 'Muebles Chile', modelo: 'Oval Grande', ns: null, valor: 185000, vida: 10 },
      { cod: 'INV-MOB-005', nombre: 'Sillas alumno (lote 30)', cat: 'MOBILIARIO', marca: 'EscoLar', modelo: 'Clásica', ns: null, valor: 150000, vida: 10 },
      { cod: 'INV-MOB-006', nombre: 'Bancas biblioteca (lote 4)', cat: 'MOBILIARIO', marca: 'EscoLar', modelo: 'Lectura', ns: null, valor: 90000, vida: 10 },
      { cod: 'INV-MOB-007', nombre: 'Archivador 4 cajones', cat: 'MOBILIARIO', marca: 'Ofimueble', modelo: 'A4-100', ns: null, valor: 55000, vida: 12, estado: 'REGULAR' },
      { cod: 'INV-AF-001', nombre: 'Calefactor industrial 5000W', cat: 'ACTIVO_FIJO', marca: 'Calienta', modelo: 'Pro 5000', ns: 'CAL5000001', valor: 380000, vida: 8 },
      { cod: 'INV-AF-002', nombre: 'Calefactor industrial 5000W', cat: 'ACTIVO_FIJO', marca: 'Calienta', modelo: 'Pro 5000', ns: 'CAL5000002', valor: 380000, vida: 8 },
      { cod: 'INV-AF-003', nombre: 'Fotocopiadora Ricoh IM2702', cat: 'ACTIVO_FIJO', marca: 'Ricoh', modelo: 'IM 2702', ns: 'RICOH2702001', valor: 920000, vida: 6 },
      { cod: 'INV-AF-004', nombre: 'Sistema alarma y CCTV 8 cámaras', cat: 'ACTIVO_FIJO', marca: 'Dahua', modelo: 'Kit 8C', ns: 'DAHUA8KIT001', valor: 1500000, vida: 7 },
      { cod: 'INV-FUN-001', nombre: 'Resmas papel A4 (caja 10)', cat: 'FUNGIBLE', marca: 'Navigator', modelo: '80g', ns: null, valor: 65000, vida: 1 },
      { cod: 'INV-FUN-002', nombre: 'Tóner HP CF258A', cat: 'FUNGIBLE', marca: 'HP', modelo: 'CF258A', ns: null, valor: 45000, vida: 1 },
      { cod: 'INV-FUN-003', nombre: 'Plumones pizarra (caja 12)', cat: 'FUNGIBLE', marca: 'Pilot', modelo: 'Whiteboard', ns: null, valor: 8500, vida: 1 },
      { cod: 'INV-FUN-004', nombre: 'Lápices pasta azul (caja 50)', cat: 'FUNGIBLE', marca: 'Bic', modelo: 'Cristal', ns: null, valor: 12000, vida: 1 },
      { cod: 'INV-FUN-005', nombre: 'Cuadernos universitarios (caja 48)', cat: 'FUNGIBLE', marca: 'College', modelo: '100H', ns: null, valor: 28000, vida: 1 },
      { cod: 'INV-FUN-006', nombre: 'Jabón desinfectante (caja 12 x 1L)', cat: 'FUNGIBLE', marca: 'Dettol', modelo: 'Líquido', ns: null, valor: 24000, vida: 1 },
      { cod: 'INV-FUN-007', nombre: 'Alcohol gel 500ml (caja 24)', cat: 'FUNGIBLE', marca: 'Shield', modelo: '500ml', ns: null, valor: 36000, vida: 1 },
      { cod: 'INV-FUN-008', nombre: 'Papel higiénico institucional (fardo)', cat: 'FUNGIBLE', marca: 'Elite', modelo: 'Jumbo', ns: null, valor: 32000, vida: 1 },
      { cod: 'INV-FUN-009', nombre: 'Detergente multiuso 5L (caja 4)', cat: 'FUNGIBLE', marca: 'Flash', modelo: '5L', ns: null, valor: 18000, vida: 1 },
      { cod: 'INV-FUN-010', nombre: 'Guantes nitrilo talla M (caja 100)', cat: 'FUNGIBLE', marca: 'ShieldPro', modelo: 'M', ns: null, valor: 15000, vida: 1 },
    ];
    await prisma.bienInventario.createMany({
      data: bienesRaw.map((b, i) => ({
        codigoInventario: b.cod,
        nombre: b.nombre,
        categoria: b.cat as any,
        marca: b.marca ?? null,
        modelo: b.modelo ?? null,
        numeroSerie: b.ns ?? null,
        estado: (b as any).estado ?? (i > 18 ? 'REGULAR' : 'BUENO') as any,
        valorAdquisicion: b.valor,
        fechaAdquisicion: new Date('2026-01-15'),
        fondoCompra: b.cat === 'FUNGIBLE' ? 'SEP' : 'Subvención General',
        vidaUtilAnios: b.vida,
        responsableId: funcionarios[i % funcionarios.length].id,
        motivoBaja: (b as any).motivo ?? null,
        fechaBaja: (b as any).fechaBaja ?? null,
      })),
      skipDuplicates: true,
    });
    console.log(`✅ Bienes inventario: ${bienesRaw.length}`);
  } else {
    console.log(`⏭️  Bienes inventario: ya existen (${bienesCount})`);
  }

  // ── 19. Eventos calendario (4) ─────────────────────────────────
  const eventosCount = await prisma.evento.count();
  if (eventosCount === 0) {
    await prisma.evento.createMany({
      data: [
        {
          titulo: 'Inicio Año Escolar 2026',
          descripcion: 'Ceremonia de bienvenida y primer día de clases para todos los cursos.',
          fechaInicio: new Date('2026-03-02T09:00:00'),
          fechaFin: new Date('2026-03-02T12:00:00'),
          categoria: 'academico',
          audiencia: 'todos',
          ubicacion: 'Patio central',
          color: '#3b82f6',
          establecimientoId: establecimiento.id,
          creadoPor: director.id,
        },
        {
          titulo: 'Reunión de Apoderados – Primer Semestre',
          descripcion: 'Reunión general con apoderados de todos los cursos para presentar objetivos del año escolar.',
          fechaInicio: new Date('2026-03-20T19:00:00'),
          fechaFin: new Date('2026-03-20T21:00:00'),
          categoria: 'administrativo',
          audiencia: 'apoderados',
          ubicacion: 'Sala de actos',
          color: '#f59e0b',
          establecimientoId: establecimiento.id,
          creadoPor: director.id,
        },
        {
          titulo: 'Rendición SEP Primer Trimestre 2026',
          descripcion: 'Entrega de rendición de cuentas SEP correspondiente al primer trimestre a SuperEduc.',
          fechaInicio: new Date('2026-04-30T10:00:00'),
          fechaFin: new Date('2026-04-30T12:00:00'),
          categoria: 'financiero',
          audiencia: 'administrativos',
          ubicacion: 'Dirección',
          color: '#10b981',
          establecimientoId: establecimiento.id,
          creadoPor: director.id,
        },
        {
          titulo: 'Día del Alumno – Actividades Recreativas',
          descripcion: 'Jornada recreativa y cultural para todos los estudiantes del establecimiento.',
          fechaInicio: new Date('2026-05-26T09:00:00'),
          fechaFin: new Date('2026-05-26T17:00:00'),
          categoria: 'comunitario',
          audiencia: 'todos',
          ubicacion: 'Patio y canchas deportivas',
          color: '#8b5cf6',
          establecimientoId: establecimiento.id,
          creadoPor: director.id,
        },
      ],
    });
    console.log(`✅ Eventos calendario: 4`);
  } else {
    console.log(`⏭️  Eventos: ya existen (${eventosCount})`);
  }

  // ── 20. PME 2026 con 8 acciones ────────────────────────────────
  const pme = await prisma.pME.upsert({
    where: { anio: 2026 },
    update: {},
    create: {
      anio: 2026,
      estado: 'EN_EJECUCION',
      aprobadoPor: director.id,
      fechaAprobacion: new Date('2026-01-30'),
    },
  });

  const accionesCount = await prisma.accionPME.count({ where: { pmeId: pme.id } });
  if (accionesCount === 0) {
    await prisma.accionPME.createMany({
      data: [
        {
          pmeId: pme.id,
          dimension: 'Gestión Pedagógica',
          objetivo: 'Mejorar resultados en Matemáticas',
          meta: 'Aumentar promedio curso a 5.5 en primer semestre',
          indicador: 'Promedio de notas semestral por curso',
          descripcion: 'Implementar plan de reforzamiento matemático para alumnos con promedio menor a 4.0, con talleres adicionales dos veces por semana.',
          responsableId: funcionarios[0].id,
          fechaInicio: new Date('2026-03-01'),
          fechaFin: new Date('2026-07-31'),
          presupuesto: 1500000,
          fondoId: fondoSEP.id,
          porcentajeAvance: 35,
          estado: 'EN_CURSO',
        },
        {
          pmeId: pme.id,
          dimension: 'Gestión Pedagógica',
          objetivo: 'Fortalecer comprensión lectora',
          meta: '90% de alumnos en nivel adecuado según SIMCE Lenguaje',
          indicador: 'Resultados evaluación diagnóstica lectora y SIMCE',
          descripcion: 'Plan lector semestral con biblioteca, club de lectura y talleres de escritura creativa.',
          responsableId: funcionarios[1].id,
          fechaInicio: new Date('2026-03-01'),
          fechaFin: new Date('2026-11-30'),
          presupuesto: 800000,
          fondoId: fondoSEP.id,
          porcentajeAvance: 20,
          estado: 'EN_CURSO',
        },
        {
          pmeId: pme.id,
          dimension: 'Liderazgo',
          objetivo: 'Fortalecer el liderazgo pedagógico directivo',
          meta: 'Realizar 12 observaciones de aula con retroalimentación formal',
          indicador: 'Número de observaciones de aula registradas',
          descripcion: 'Plan sistemático de observación de clases con instrumento estandarizado y retroalimentación directiva.',
          responsableId: director.id,
          fechaInicio: new Date('2026-03-01'),
          fechaFin: new Date('2026-12-15'),
          presupuesto: 0,
          fondoId: null,
          porcentajeAvance: 25,
          estado: 'EN_CURSO',
        },
        {
          pmeId: pme.id,
          dimension: 'Convivencia Escolar',
          objetivo: 'Reducir los atrasos en un 30% respecto al año anterior',
          meta: 'Menos de 40 atrasos mensuales al finalizar el segundo semestre',
          indicador: 'Registro mensual de atrasos en sistema ERP',
          descripcion: 'Protocolo de atención temprana a alumnos con atrasos reiterados e involucramiento activo de apoderados.',
          responsableId: funcionarios[5 % funcionarios.length].id,
          fechaInicio: new Date('2026-03-01'),
          fechaFin: new Date('2026-12-15'),
          presupuesto: 0,
          fondoId: null,
          porcentajeAvance: 40,
          estado: 'EN_CURSO',
        },
        {
          pmeId: pme.id,
          dimension: 'Gestión de Recursos',
          objetivo: 'Actualizar el equipamiento computacional del laboratorio',
          meta: 'Adquirir 30 tablets para el laboratorio de tecnología',
          indicador: 'Equipos adquiridos, inventariados y operativos',
          descripcion: 'Compra de dispositivos con fondos SEP para modernizar el laboratorio de computación y habilitar clases con tecnología.',
          responsableId: funcionarios[6 % funcionarios.length].id,
          fechaInicio: new Date('2026-02-01'),
          fechaFin: new Date('2026-03-31'),
          presupuesto: 9600000,
          fondoId: fondoSEP.id,
          porcentajeAvance: 100,
          estado: 'COMPLETADA',
        },
        {
          pmeId: pme.id,
          dimension: 'Gestión Pedagógica',
          objetivo: 'Integrar TICs en las prácticas de aula',
          meta: '100% de docentes usando recursos digitales al menos una vez por semana',
          indicador: 'Porcentaje de docentes con clases con TICs registradas en leccionario',
          descripcion: 'Capacitación docente en herramientas digitales, uso de pizarras interactivas y plataformas educativas en línea.',
          responsableId: funcionarios[0].id,
          fechaInicio: new Date('2026-03-01'),
          fechaFin: new Date('2026-06-30'),
          presupuesto: 450000,
          fondoId: fondoSEP.id,
          porcentajeAvance: 60,
          estado: 'EN_CURSO',
        },
        {
          pmeId: pme.id,
          dimension: 'Convivencia Escolar',
          objetivo: 'Implementar y difundir el protocolo anti-bullying',
          meta: 'Cero casos de bullying grave sin protocolo activado en el año',
          indicador: 'Registro de casos y activaciones de protocolo en sistema',
          descripcion: 'Difusión masiva del protocolo de convivencia, capacitación docente y talleres preventivos con alumnos.',
          responsableId: funcionarios[5 % funcionarios.length].id,
          fechaInicio: new Date('2026-03-01'),
          fechaFin: new Date('2026-12-15'),
          presupuesto: 200000,
          fondoId: fondoSEP.id,
          porcentajeAvance: 30,
          estado: 'EN_CURSO',
        },
        {
          pmeId: pme.id,
          dimension: 'Gestión de Recursos',
          objetivo: 'Mejorar la infraestructura de baños del establecimiento',
          meta: 'Renovación completa de 2 baños habilitados para el inicio del año escolar',
          indicador: 'Obras terminadas y certificadas por inspector técnico',
          descripcion: 'Proyecto de renovación integral de baños con recursos de la Subvención General, incluyendo plomería y revestimientos.',
          responsableId: director.id,
          fechaInicio: new Date('2026-01-15'),
          fechaFin: new Date('2026-02-28'),
          presupuesto: 8500000,
          fondoId: fondoSubv.id,
          porcentajeAvance: 100,
          estado: 'COMPLETADA',
        },
      ],
    });
    console.log(`✅ PME 2026 con 8 acciones`);
  } else {
    console.log(`⏭️  PME: ya tiene acciones (${accionesCount})`);
  }

  // ── 21. Items cumplimiento (10) ────────────────────────────────
  const cumplimientoCount = await prisma.itemCumplimiento.count();
  if (cumplimientoCount === 0) {
    await prisma.itemCumplimiento.createMany({
      data: [
        {
          area: 'FINANCIERA',
          nombre: 'Rendición SEP Trimestre 1',
          descripcion: 'Entrega de rendición de cuentas SEP correspondiente al primer trimestre 2026 a SuperEduc',
          normativaReferencia: 'Ley SEP Art. 26, DS 50/2007',
          plazoLegal: new Date('2026-04-30'),
          estado: 'PENDIENTE',
          responsableId: director.id,
        },
        {
          area: 'FINANCIERA',
          nombre: 'Informe financiero anual al sostenedor',
          descripcion: 'Presentación del estado financiero consolidado del año 2025 al sostenedor',
          normativaReferencia: 'DFL N°2/1998 Art. 14',
          plazoLegal: new Date('2026-03-31'),
          estado: 'CUMPLIDO',
          responsableId: director.id,
        },
        {
          area: 'ACADEMICA',
          nombre: 'Entrega libro de clases digital completo',
          descripcion: 'Completar y validar digitalmente todos los leccionarios del primer semestre',
          normativaReferencia: 'Resolución Exenta 2835 MINEDUC',
          plazoLegal: new Date('2026-07-15'),
          estado: 'PENDIENTE',
          responsableId: funcionarios[0].id,
        },
        {
          area: 'ACADEMICA',
          nombre: 'Evaluación diagnóstica aplicada a todos los cursos',
          descripcion: 'Aplicación y registro de evaluación diagnóstica inicial a todos los cursos del establecimiento',
          normativaReferencia: 'Circular MINEDUC 2026 N°1',
          plazoLegal: new Date('2026-03-31'),
          estado: 'CUMPLIDO',
          responsableId: funcionarios[1].id,
        },
        {
          area: 'LABORAL',
          nombre: 'Liquidaciones de sueldo marzo 2026',
          descripcion: 'Pago oportuno de liquidaciones de sueldo a todos los funcionarios correspondiente a marzo 2026',
          normativaReferencia: 'Código del Trabajo Art. 44',
          plazoLegal: new Date('2026-03-31'),
          estado: 'CUMPLIDO',
          responsableId: director.id,
        },
        {
          area: 'LABORAL',
          nombre: 'Cotizaciones previsionales al día',
          descripcion: 'Verificar y declarar cotizaciones AFP e Isapre de todos los funcionarios correspondiente a marzo 2026',
          normativaReferencia: 'DL 3500/1980, Ley 18933',
          plazoLegal: new Date('2026-04-10'),
          estado: 'PENDIENTE',
          responsableId: director.id,
        },
        {
          area: 'CONVIVENCIA',
          nombre: 'Plan de convivencia escolar actualizado 2026',
          descripcion: 'Actualizar, aprobar y publicar el Plan de Convivencia Escolar para el año 2026',
          normativaReferencia: 'Ley 20536 Art. 15',
          plazoLegal: new Date('2026-03-15'),
          estado: 'CUMPLIDO',
          responsableId: funcionarios[5 % funcionarios.length].id,
        },
        {
          area: 'CONVIVENCIA',
          nombre: 'Protocolos de actuación publicados en panel escolar',
          descripcion: 'Publicar en panel informativo escolar todos los protocolos de actuación ante situaciones de violencia y emergencia',
          normativaReferencia: 'Ley 20536 Art. 16',
          plazoLegal: new Date('2026-03-31'),
          estado: 'CUMPLIDO',
          responsableId: funcionarios[5 % funcionarios.length].id,
        },
        {
          area: 'INFRAESTRUCTURA',
          nombre: 'Revisión extintores y señalética de emergencia',
          descripcion: 'Verificar vigencia de recargas de extintores y estado de señalética de evacuación y emergencia',
          normativaReferencia: 'DS 594 MINSAL, DS 548 MINEDUC',
          plazoLegal: new Date('2026-04-30'),
          estado: 'PENDIENTE',
          responsableId: funcionarios[6 % funcionarios.length].id,
        },
        {
          area: 'INFRAESTRUCTURA',
          nombre: 'Certificación sanitaria del establecimiento',
          descripcion: 'Renovación de la certificación sanitaria emitida por la Seremi de Salud Metropolitana',
          normativaReferencia: 'DS 548 MINEDUC Art. 5',
          plazoLegal: new Date('2026-06-30'),
          estado: 'PENDIENTE',
          responsableId: director.id,
        },
      ],
    });
    console.log(`✅ Items cumplimiento: 10`);
  } else {
    console.log(`⏭️  Items cumplimiento: ya existen (${cumplimientoCount})`);
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log(`\n🎉 ¡Seed completado exitosamente! [tenant: ${tenantId}]`);
  console.log('==========================================');
  console.log('Usuarios de prueba:');
  console.log('  admin@flowmind.cl        / Admin1234!     (SUPER_ADMIN)');
  console.log(`  ${cfg.emails.director.padEnd(25)} / Director123!   (DIRECTOR)`);
  console.log(`  ${cfg.emails.docente.padEnd(25)} / Docente123!    (DOCENTE)`);
  console.log(`  ${cfg.emails.apoderado.padEnd(25)} / Apoderado123!  (APODERADO)`);
  console.log('==========================================');
  console.log(`Resumen de datos:`);
  console.log(`  - ${cursos.length} cursos`);
  console.log(`  - ${allAlumnos.length} alumnos`);
  console.log(`  - ${notasCreadas} notas en 3 asignaturas`);
  console.log(`  - ${asistCreadas} registros de asistencia`);
  console.log(`  - 50 atrasos, 10 anotaciones convivencia`);
  console.log(`  - 20 leccionarios (10 firmados, 10 pendientes)`);
  console.log(`  - ${funcionarios.length} funcionarios, 3 liquidaciones marzo 2026`);
  console.log(`  - 5 proveedores con contratos`);
  console.log(`  - 30 bienes inventario (TEC, MOB, AF, FUNGIBLE)`);
  console.log(`  - 4 eventos calendario 2026`);
  console.log(`  - PME 2026 con 8 acciones`);
  console.log(`  - 10 items de cumplimiento normativo`);
  console.log(`  - Fondos y movimientos financieros Ene-Mar 2026`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => { await prisma.$disconnect(); });
