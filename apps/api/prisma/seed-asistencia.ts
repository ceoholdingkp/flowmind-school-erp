/**
 * seed-asistencia.ts
 * Genera registros de asistencia para los últimos 5 días hábiles
 * para los 30 alumnos del seed de matrículas.
 *
 * Run: DATABASE_URL="..." npx tsx prisma/seed-asistencia.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_URL = process.env.TENANT_DATABASE_URL?.replace('{tenantId}', 'colegio_san_andres')
  ?? 'postgresql://flowmind:flowmind_dev_2026@127.0.0.1:5434/tenant_colegio_san_andres?schema=public';

const tenantPrisma = new PrismaClient({
  datasources: { db: { url: TENANT_URL } },
});

// Get last N weekdays (Mon-Fri), starting from today going back
function getLastWeekdays(n: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0); // noon to avoid timezone issues
  while (days.length < n) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) days.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return days.reverse();
}

// Random attendance state with realistic distribution
function randomEstado(random: number): 'PRESENTE' | 'AUSENTE' | 'ATRASO' | 'JUSTIFICADO' | 'RETIRADO_ANTICIPADO' {
  if (random < 0.80) return 'PRESENTE';
  if (random < 0.90) return 'ATRASO';
  if (random < 0.95) return 'AUSENTE';
  if (random < 0.98) return 'JUSTIFICADO';
  return 'RETIRADO_ANTICIPADO';
}

async function main() {
  console.log('🏫 Seed de Asistencia — Colegio San Andrés\n');

  // Get director userId
  const director = await tenantPrisma.usuario.findFirst({
    where: { rol: 'DIRECTOR' },
    select: { id: true, email: true },
  });
  if (!director) throw new Error('No se encontró usuario DIRECTOR');
  console.log(`  Director: ${director.email} (${director.id})`);

  // Get last 5 weekdays
  const diasHabiles = getLastWeekdays(5);
  console.log(`  Días a registrar: ${diasHabiles.map(d => d.toISOString().split('T')[0]).join(', ')}\n`);

  // Get alumnos from matricula_v2 with cursoId
  const matriculas = await tenantPrisma.matricula.findMany({
    where: { anio: 2026, estado: 'VIGENTE' },
    select: { alumnoId: true, cursoId: true, curso: true },
  });

  if (matriculas.length === 0) {
    throw new Error('No hay matrículas vigentes en 2026. Ejecuta seed-matriculas.ts primero.');
  }
  console.log(`  Alumnos con matrícula vigente: ${matriculas.length}`);

  let totalCreados = 0;
  let totalActualizados = 0;
  let seed = 42; // deterministic seed

  for (const dia of diasHabiles) {
    const fechaStr = dia.toISOString().split('T')[0];
    const diaStart = new Date(dia); diaStart.setHours(0, 0, 0, 0);
    const diaEnd = new Date(dia); diaEnd.setHours(23, 59, 59, 999);

    // Check existing records for this day
    const alumnoIds = matriculas.map(m => m.alumnoId);
    const existing = await tenantPrisma.asistencia.findMany({
      where: {
        alumnoId: { in: alumnoIds },
        fecha: { gte: diaStart, lte: diaEnd },
        tramoHorario: null,
      },
      select: { id: true, alumnoId: true },
    });
    const existingMap = new Map(existing.map(e => [e.alumnoId, e.id]));

    let presentes = 0;
    let ausentes = 0;

    for (const mat of matriculas) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const r = (seed % 1000) / 1000;
      const estado = randomEstado(r);

      if (['PRESENTE', 'ATRASO', 'JUSTIFICADO'].includes(estado)) presentes++;
      else ausentes++;

      const existingId = existingMap.get(mat.alumnoId);

      if (existingId) {
        await tenantPrisma.asistencia.update({
          where: { id: existingId },
          data: {
            estado: estado as any,
            registradoPor: director.id,
            horaLlegada: estado === 'ATRASO' ? new Date(`${fechaStr}T08:${15 + (seed % 30)}:00`) : null,
          },
        });
        totalActualizados++;
      } else {
        await tenantPrisma.asistencia.create({
          data: {
            alumnoId: mat.alumnoId,
            cursoId: mat.cursoId ?? '',
            fecha: diaStart,
            tramoHorario: null,
            estado: estado as any,
            registradoPor: director.id,
            horaLlegada: estado === 'ATRASO' ? new Date(`${fechaStr}T08:${15 + (seed % 30)}:00`) : null,
          },
        });
        totalCreados++;
      }
    }

    const pct = Math.round((presentes / matriculas.length) * 100);
    console.log(`  ${fechaStr}: ${presentes}/${matriculas.length} presentes (${pct}%)`);
  }

  console.log(`\n✅ Seed completado:`);
  console.log(`   Creados: ${totalCreados}`);
  console.log(`   Actualizados: ${totalActualizados}`);
  console.log(`   Total registros: ${totalCreados + totalActualizados}`);
}

main()
  .catch(console.error)
  .finally(() => Promise.all([prisma.$disconnect(), tenantPrisma.$disconnect()]));
