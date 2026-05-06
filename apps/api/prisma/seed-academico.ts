/**
 * seed-academico.ts
 * Crea evaluaciones y notas del módulo académico V2 para 2026.
 *
 * - 8 asignaturas (usa las existentes + agrega Ed. Física, Música, Artes, Religión)
 * - AsignaturaDocente: 1 docente por asignatura por curso
 * - Evaluaciones: 3 por asignatura por curso × 2 semestres = 6 evaluaciones por asig/curso
 * - NotaEval: para todos los alumnos ACTIVOS con cursoId
 *
 * Run:
 *   DATABASE_URL="postgresql://flowmind:flowmind_dev_2026@127.0.0.1:5434/tenant_colegio_san_andres?schema=public" \
 *   npx tsx prisma/seed-academico.ts
 */

import { PrismaClient } from '@prisma/client';

const TENANT_URL =
  process.env.DATABASE_URL ??
  'postgresql://flowmind:flowmind_dev_2026@127.0.0.1:5434/tenant_colegio_san_andres?schema=public';

const prisma = new PrismaClient({ datasources: { db: { url: TENANT_URL } } });

// Simple deterministic random (LCG)
let _seed = 12345;
function rand(): number {
  _seed = (_seed * 1664525 + 1013904223) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function randFloat(min: number, max: number): number {
  return min + rand() * (max - min);
}
function randomNota(): number {
  // Distribution: ~70% notas >= 4.0, ~30% below
  const r = rand();
  if (r < 0.05) return Math.round(randFloat(1.0, 2.9) * 10) / 10;
  if (r < 0.15) return Math.round(randFloat(3.0, 3.9) * 10) / 10;
  if (r < 0.50) return Math.round(randFloat(4.0, 5.4) * 10) / 10;
  if (r < 0.85) return Math.round(randFloat(5.5, 6.4) * 10) / 10;
  return Math.round(randFloat(6.5, 7.0) * 10) / 10;
}
function clampNota(v: number): number {
  return Math.min(7.0, Math.max(1.0, Math.round(v * 10) / 10));
}

async function main() {
  console.log('📚 Seed Académico V2 — iniciando\n');

  // ── 1. Get usuarios director/docente for registradoPor ─────────
  const director = await prisma.usuario.findFirst({ where: { rol: 'DIRECTOR' }, select: { id: true } });
  const docente = await prisma.usuario.findFirst({ where: { rol: 'DOCENTE' }, select: { id: true } });
  const registradoPor = docente?.id ?? director?.id ?? 'seed';

  // ── 2. Asegurar asignaturas extra ──────────────────────────────
  const asignaturasExtra = [
    { nombre: 'Educación Física', codigo: 'EFI', horas: 3 },
    { nombre: 'Música', codigo: 'MUS', horas: 2 },
    { nombre: 'Artes Visuales', codigo: 'ART', horas: 2 },
    { nombre: 'Religión', codigo: 'REL', horas: 2 },
  ];
  for (const a of asignaturasExtra) {
    await prisma.asignatura.upsert({
      where: { codigo: a.codigo },
      update: {},
      create: { nombre: a.nombre, codigo: a.codigo, horasSemanales: a.horas },
    });
  }

  const asignaturas = await prisma.asignatura.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } });
  console.log(`✅ Asignaturas activas: ${asignaturas.length}`);

  // ── 3. Cursos y funcionarios ────────────────────────────────────
  const cursos = await prisma.curso.findMany({ where: { anio: 2026 }, orderBy: { nombre: 'asc' } });
  if (cursos.length === 0) throw new Error('No hay cursos para 2026. Ejecuta seed.ts primero.');
  console.log(`✅ Cursos 2026: ${cursos.length}`);

  const funcionarios = await prisma.funcionario.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, nombres: true },
    take: 10,
  });
  if (funcionarios.length === 0) throw new Error('No hay funcionarios activos. Ejecuta seed.ts primero.');
  console.log(`✅ Funcionarios disponibles: ${funcionarios.length}`);

  // ── 4. AsignaturaDocente ────────────────────────────────────────
  let asigDocenteCount = 0;
  let funcIdx = 0;
  for (const curso of cursos) {
    for (const asig of asignaturas) {
      const func = funcionarios[funcIdx % funcionarios.length];
      funcIdx++;
      const exists = await prisma.asignaturaDocente.findFirst({
        where: { asignaturaId: asig.id, cursoId: curso.id, anio: 2026 },
      });
      if (!exists) {
        await prisma.asignaturaDocente.create({
          data: { asignaturaId: asig.id, funcionarioId: func.id, cursoId: curso.id, anio: 2026 },
        });
        asigDocenteCount++;
      }
    }
  }
  console.log(`✅ AsignaturaDocente creadas: ${asigDocenteCount}`);

  // ── 5. Evaluaciones ────────────────────────────────────────────
  // 3 evaluaciones por semestre × 2 semestres = 6 por asignatura/curso
  // Ponderaciones: Prueba=40, Trabajo=30, Tarea=30 (total=100 per semestre)
  const evTemplates = [
    { nombre: 'Prueba 1', tipo: 'PRUEBA', ponderacion: 40, semestre: 1 },
    { nombre: 'Trabajo 1', tipo: 'TRABAJO', ponderacion: 30, semestre: 1 },
    { nombre: 'Tarea 1', tipo: 'TAREA', ponderacion: 30, semestre: 1 },
    { nombre: 'Prueba 2', tipo: 'PRUEBA', ponderacion: 40, semestre: 2 },
    { nombre: 'Trabajo 2', tipo: 'TRABAJO', ponderacion: 30, semestre: 2 },
    { nombre: 'Tarea 2', tipo: 'TAREA', ponderacion: 30, semestre: 2 },
  ];

  // Approximate dates for each evaluation type in 2026
  const fechasPorTemplate: Record<string, Date> = {
    'Prueba 1': new Date('2026-03-25'),
    'Trabajo 1': new Date('2026-04-10'),
    'Tarea 1': new Date('2026-04-25'),
    'Prueba 2': new Date('2026-08-20'),
    'Trabajo 2': new Date('2026-09-15'),
    'Tarea 2': new Date('2026-10-05'),
  };

  let evalCount = 0;
  const evaluacionesMap = new Map<string, any>(); // key: `${cursoId}-${asigId}-${nombre}`

  for (const curso of cursos) {
    for (const asig of asignaturas) {
      for (const tmpl of evTemplates) {
        const key = `${curso.id}-${asig.id}-${tmpl.nombre}`;
        const existing = await prisma.evaluacion.findFirst({
          where: {
            cursoId: curso.id,
            asignaturaId: asig.id,
            nombre: tmpl.nombre,
            semestre: tmpl.semestre,
            anio: 2026,
          },
        });
        if (existing) {
          evaluacionesMap.set(key, existing);
        } else {
          const ev = await prisma.evaluacion.create({
            data: {
              cursoId: curso.id,
              asignaturaId: asig.id,
              nombre: tmpl.nombre,
              tipo: tmpl.tipo,
              ponderacion: tmpl.ponderacion,
              fechaAplicacion: fechasPorTemplate[tmpl.nombre],
              semestre: tmpl.semestre,
              anio: 2026,
              estado: 'ABIERTA',
            },
          });
          evaluacionesMap.set(key, ev);
          evalCount++;
        }
      }
    }
  }
  console.log(`✅ Evaluaciones creadas: ${evalCount} (total en mapa: ${evaluacionesMap.size})`);

  // ── 6. Alumnos activos con curso ────────────────────────────────
  const alumnos = await prisma.alumno.findMany({
    where: { estadoMatricula: 'ACTIVA', cursoId: { not: null } },
    select: { id: true, cursoId: true, nombres: true, apellidoPaterno: true },
  });
  console.log(`✅ Alumnos activos con curso: ${alumnos.length}`);

  if (alumnos.length === 0) {
    console.warn('⚠️  No hay alumnos. Ejecuta seed.ts primero.');
    return;
  }

  // ── 7. NotaEval ────────────────────────────────────────────────
  let notasCreadas = 0;
  let notasActualizadas = 0;

  for (const alumno of alumnos) {
    if (!alumno.cursoId) continue;

    for (const asig of asignaturas) {
      for (const tmpl of evTemplates) {
        const key = `${alumno.cursoId}-${asig.id}-${tmpl.nombre}`;
        const ev = evaluacionesMap.get(key);
        if (!ev) continue;

        const nota = clampNota(randomNota());

        const existing = await prisma.notaEval.findUnique({
          where: { evaluacionId_alumnoId: { evaluacionId: ev.id, alumnoId: alumno.id } },
          select: { id: true },
        });

        if (existing) {
          await prisma.notaEval.update({
            where: { id: existing.id },
            data: { valor: nota, registradoPor },
          });
          notasActualizadas++;
        } else {
          await prisma.notaEval.create({
            data: { evaluacionId: ev.id, alumnoId: alumno.id, valor: nota, registradoPor },
          });
          notasCreadas++;
        }
      }
    }
  }

  console.log(`✅ NotaEval creadas: ${notasCreadas}, actualizadas: ${notasActualizadas}`);
  console.log('\n🎉 Seed académico completado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
