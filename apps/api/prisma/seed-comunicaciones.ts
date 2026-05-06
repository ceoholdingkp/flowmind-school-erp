/**
 * Seed Comunicaciones — Paso 13
 * Creates 5 comunicados + LecturaComunicado records for ~20 apoderados
 * Run: DATABASE_URL="..." npx ts-node prisma/seed-comunicaciones.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding comunicaciones...');

  // Get first apoderado to use as sender
  const director = await prisma.usuario.findFirst({
    where: { rol: 'DIRECTOR' },
  });
  const enviadoPor = director?.id ?? 'system';

  // Get up to 20 apoderados
  const apoderados = await prisma.apoderado.findMany({
    take: 20,
    orderBy: { createdAt: 'asc' },
  });

  if (apoderados.length === 0) {
    console.log('⚠️  No apoderados found. Run main seed first.');
    return;
  }

  // Get a course for course-specific comunicados
  const curso = await prisma.curso.findFirst({
    where: { anio: 2026 },
    orderBy: { nombre: 'asc' },
  });

  console.log(`Found ${apoderados.length} apoderados, curso: ${curso?.nombre ?? 'none'}`);

  // Define comunicados
  const comunicados = [
    {
      titulo: 'Inicio segundo semestre 2026',
      contenido: 'Estimadas familias, les informamos que el segundo semestre comenzará el lunes 27 de julio. Los alumnos deben presentarse con sus útiles escolares completos y uniforme de invierno. Se ruega puntualidad. Atentamente, La Dirección.',
      tipo: 'CIRCULAR',
      prioridad: 'NORMAL',
      destinatarios: 'TODOS',
      cursoId: null as string | null,
      enviadoPor,
      fechaEnvio: new Date('2026-07-18T10:00:00'),
      estado: 'ENVIADO',
    },
    {
      titulo: 'Reunión de apoderados — Primer ciclo',
      contenido: 'Se convoca a los apoderados de 1° a 4° básico a reunión general el martes 21 de julio a las 19:00 hrs. en el gimnasio. Se tratarán temas de convivencia escolar y resultados académicos del primer semestre.',
      tipo: 'REUNION',
      prioridad: 'ALTA',
      destinatarios: 'NIVEL',
      cursoId: curso?.id ?? null,
      enviadoPor,
      fechaEnvio: new Date('2026-07-14T14:30:00'),
      estado: 'ENVIADO',
    },
    {
      titulo: 'Aviso: Suspensión de clases — Paro nacional',
      contenido: 'En virtud del paro nacional convocado para mañana miércoles 22 de julio, el establecimiento no tendrá actividades presenciales. Los docentes enviarán guías de trabajo por la plataforma. Saludos.',
      tipo: 'AVISO',
      prioridad: 'URGENTE',
      destinatarios: 'TODOS',
      cursoId: null as string | null,
      enviadoPor,
      fechaEnvio: new Date('2026-07-21T20:00:00'),
      estado: 'ENVIADO',
    },
    {
      titulo: 'Resultados Simulacro SIMCE — 4° Básico',
      contenido: 'Los alumnos de 4° básico obtuvieron los siguientes promedios en el simulacro SIMCE: Lenguaje 265 puntos, Matemáticas 278 puntos. Estos resultados son alentadores. Compartiremos el informe detallado en la reunión del martes.',
      tipo: 'ACADEMICO',
      prioridad: 'NORMAL',
      destinatarios: 'CURSO',
      cursoId: curso?.id ?? null,
      enviadoPor,
      fechaEnvio: new Date('2026-07-10T09:00:00'),
      estado: 'ENVIADO',
    },
    {
      titulo: 'Campaña de útiles escolares — Solidaridad',
      contenido: 'El Centro de Alumnos organiza una campaña de recolección de útiles escolares para familias vulnerables de nuestra comunidad. Pueden traer donaciones hasta el 31 de julio a la biblioteca.',
      tipo: 'CIRCULAR',
      prioridad: 'NORMAL',
      destinatarios: 'TODOS',
      cursoId: null as string | null,
      enviadoPor,
      fechaEnvio: new Date('2026-07-08T11:00:00'),
      estado: 'ENVIADO',
    },
  ];

  let totalComunicados = 0;
  let totalLecturas = 0;

  for (const data of comunicados) {
    // Check if already exists
    const existing = await (prisma as any).comunicado.findFirst({
      where: { titulo: data.titulo },
    });
    if (existing) {
      console.log(`  ✓ Skip (exists): ${data.titulo}`);
      continue;
    }

    const comunicado = await (prisma as any).comunicado.create({ data });
    totalComunicados++;
    console.log(`  ✓ Created: ${comunicado.titulo}`);

    // Create lecturas for all apoderados (TODOS or if NIVEL/CURSO, use all 20)
    const lecturaData = apoderados.map((ap, idx) => ({
      comunicadoId: comunicado.id,
      apoderadoId: ap.id,
      // Mix: 60% read, 40% not read
      leido: idx < Math.floor(apoderados.length * 0.6),
      fechaLectura:
        idx < Math.floor(apoderados.length * 0.6)
          ? new Date(data.fechaEnvio.getTime() + idx * 3600000)
          : null,
      // 30% confirmed
      confirmado: idx < Math.floor(apoderados.length * 0.3),
      fechaConfirmacion:
        idx < Math.floor(apoderados.length * 0.3)
          ? new Date(data.fechaEnvio.getTime() + idx * 7200000)
          : null,
    }));

    await (prisma as any).lecturaComunicado.createMany({
      data: lecturaData,
      skipDuplicates: true,
    });
    totalLecturas += lecturaData.length;
    console.log(`    → ${lecturaData.length} lecturas (${lecturaData.filter((l) => l.leido).length} leídas)`);
  }

  // Create some mensajes individuales
  const alumnos = await prisma.alumno.findMany({
    take: 5,
    where: { estadoMatricula: 'ACTIVA' },
  });

  // Get apoderados linked via apoderado.alumnoIds relation
  let totalMensajes = 0;
  for (const alumno of alumnos) {
    // Find apoderado that has this alumno
    const apoderadoLinked = await prisma.apoderado.findFirst({
      where: { alumnos: { some: { id: alumno.id } } },
    });
    if (!apoderadoLinked) continue;

    const existing = await (prisma as any).mensajeIndividual.findFirst({
      where: { alumnoId: alumno.id, remitente: enviadoPor },
    });
    if (existing) continue;

    const nombreAlumno = `${alumno.nombres} ${alumno.apellidoPaterno}`;
    await (prisma as any).mensajeIndividual.create({
      data: {
        alumnoId: alumno.id,
        remitente: enviadoPor,
        destinatarioId: apoderadoLinked.id,
        asunto: `Información académica — ${nombreAlumno}`,
        contenido: `Estimado/a apoderado/a, le informamos que su pupilo/a ${nombreAlumno} ha mostrado un rendimiento destacado en las últimas evaluaciones. Le invitamos a conversar en horario de atención.`,
        leido: false,
      },
    });
    totalMensajes++;
  }

  console.log(`\n✅ Seed comunicaciones completado:`);
  console.log(`   ${totalComunicados} comunicados creados`);
  console.log(`   ${totalLecturas} registros de lectura`);
  console.log(`   ${totalMensajes} mensajes individuales`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
