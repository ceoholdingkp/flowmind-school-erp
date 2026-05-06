/**
 * seed-remuneraciones.ts
 * Crea configuración previsional 2026, actualiza sueldos de funcionarios
 * y genera liquidaciones de enero a abril 2026.
 *
 * Run:
 *   DATABASE_URL="postgresql://flowmind:flowmind_dev_2026@127.0.0.1:5434/tenant_colegio_san_andres?schema=public" \
 *   npx tsx prisma/seed-remuneraciones.ts
 */

import { PrismaClient } from '@prisma/client';

const TENANT_URL =
  process.env.DATABASE_URL ??
  'postgresql://flowmind:flowmind_dev_2026@127.0.0.1:5434/tenant_colegio_san_andres?schema=public';

const prisma = new PrismaClient({ datasources: { db: { url: TENANT_URL } } });

const UTM_2026 = 66_000;
const UF_2026 = 38_000;
const TOPE_IMPONIBLE = Math.round(81.6 * UF_2026);
const TASA_CESANTIA = 0.6;
const TASA_SALUD_FONASA = 7.0;

// ─── TASAS AFP/SALUD 2026 ─────────────────────────────────────────
const TASAS_AFP = [
  { nombre: 'AFP_HABITAT',   tipo: 'AFP', tasa: 11.44 },
  { nombre: 'AFP_CUPRUM',    tipo: 'AFP', tasa: 11.44 },
  { nombre: 'AFP_CAPITAL',   tipo: 'AFP', tasa: 11.44 },
  { nombre: 'AFP_MODELO',    tipo: 'AFP', tasa: 10.58 },
  { nombre: 'AFP_PLANVITAL', tipo: 'AFP', tasa: 11.16 },
  { nombre: 'AFP_PROVIDA',   tipo: 'AFP', tasa: 11.45 },
  { nombre: 'AFP_UNO',       tipo: 'AFP', tasa: 10.69 },
  { nombre: 'FONASA',        tipo: 'SALUD', tasa: 7.0 },
  { nombre: 'CESANTIA_TRABAJADOR', tipo: 'SEGURO_CESANTIA', tasa: 0.6 },
];

// ─── IMPUESTO ÚNICO ────────────────────────────────────────────────
function calcularImpuestoUnico(base: number): number {
  if (base <= 0) return 0;
  const utm = UTM_2026;
  if (base <= 13.5 * utm) return 0;
  if (base <= 30 * utm) return Math.round(base * 0.04 - 0.54 * utm);
  if (base <= 50 * utm) return Math.round(base * 0.08 - 1.74 * utm);
  if (base <= 70 * utm) return Math.round(base * 0.135 - 4.49 * utm);
  if (base <= 90 * utm) return Math.round(base * 0.23 - 11.14 * utm);
  if (base <= 120 * utm) return Math.round(base * 0.304 - 17.8 * utm);
  return Math.round(base * 0.35 - 23.32 * utm);
}

function calcular(
  sueldoBase: number,
  tasaAfp: number,
  salud: string,
) {
  const totalHaberes = sueldoBase;
  const baseImponible = Math.min(totalHaberes, TOPE_IMPONIBLE);
  const montoAfp = Math.round(baseImponible * tasaAfp / 100);
  const montoSalud = Math.round(totalHaberes * TASA_SALUD_FONASA / 100);
  const seguroCesantia = Math.round(totalHaberes * TASA_CESANTIA / 100);
  const baseTrib = Math.max(0, totalHaberes - montoAfp - montoSalud - seguroCesantia);
  const impuesto = calcularImpuestoUnico(baseTrib);
  const totalDescuentos = montoAfp + montoSalud + seguroCesantia + impuesto;
  const sueldoLiquido = totalHaberes - totalDescuentos;
  return { totalHaberes, montoAfp, montoSalud, seguroCesantia, impuesto, totalDescuentos, sueldoLiquido };
}

async function main() {
  console.log('💰 Seed Remuneraciones — iniciando\n');

  // ── 1. Configuración previsional ──────────────────────────────
  let configCount = 0;
  for (const cfg of TASAS_AFP) {
    await prisma.configuracionPrevisional.upsert({
      where: { nombre: cfg.nombre },
      update: { tasa: cfg.tasa, vigente: true },
      create: { nombre: cfg.nombre, tipo: cfg.tipo, tasa: cfg.tasa, vigente: true },
    });
    configCount++;
  }
  console.log(`✅ ConfiguracionPrevisional: ${configCount} registros`);

  // ── 2. Actualizar funcionarios con sueldoBase, AFP, salud ──────
  const funcionarios = await prisma.funcionario.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, nombres: true, apellidos: true, cargo: true, tipo: true },
    take: 20,
  });

  const AFP_OPTIONS = ['HABITAT', 'CUPRUM', 'CAPITAL', 'MODELO', 'PLANVITAL', 'PROVIDA'];
  const SALUD_OPTIONS = ['FONASA', 'FONASA', 'FONASA', 'ISAPRE_CRUZ_BLANCA', 'FONASA']; // 3:1 FONASA

  // Sueldos según tipo de funcionario
  const SUELDOS_POR_TIPO: Record<string, number[]> = {
    DIRECTIVO: [1_200_000, 1_400_000, 1_500_000],
    DOCENTE:   [700_000, 800_000, 900_000, 950_000, 1_100_000],
    ASISTENTE_EDUCACION: [600_000, 650_000, 680_000, 720_000],
    PROFESIONAL_PIE: [750_000, 820_000],
    ADMINISTRATIVO: [580_000, 620_000, 650_000],
    AUXILIAR: [420_000, 450_000, 480_000],
  };

  let funcUpdated = 0;
  for (let i = 0; i < funcionarios.length; i++) {
    const func = funcionarios[i] as any;
    const sueldosOps = SUELDOS_POR_TIPO[func.tipo] ?? SUELDOS_POR_TIPO.ASISTENTE_EDUCACION;
    const sueldoBase = sueldosOps[i % sueldosOps.length];
    const afp = AFP_OPTIONS[i % AFP_OPTIONS.length];
    const salud = SALUD_OPTIONS[i % SALUD_OPTIONS.length];

    await prisma.funcionario.update({
      where: { id: func.id },
      data: { sueldoBase, afp, isapre: salud },
    });
    funcUpdated++;
  }
  console.log(`✅ Funcionarios actualizados: ${funcUpdated}`);

  // ── 3. Generar liquidaciones Ene-Abr 2026 ─────────────────────
  const funcConSueldo = await prisma.funcionario.findMany({
    where: { estado: 'ACTIVO', sueldoBase: { not: null } },
    select: { id: true, nombres: true, apellidos: true, sueldoBase: true, afp: true, isapre: true },
  });

  // Meses: 1-3 PAGADA, 4 BORRADOR
  const MESES = [
    { mes: 1, estado: 'PAGADA', fechaPago: new Date('2026-01-31') },
    { mes: 2, estado: 'PAGADA', fechaPago: new Date('2026-02-28') },
    { mes: 3, estado: 'PAGADA', fechaPago: new Date('2026-03-31') },
    { mes: 4, estado: 'BORRADOR', fechaPago: null },
  ];

  // Build AFP tasa map
  const tasasMap: Record<string, number> = {};
  for (const cfg of TASAS_AFP.filter((c) => c.tipo === 'AFP')) {
    tasasMap[cfg.nombre.replace('AFP_', '')] = cfg.tasa;
  }
  const getTasaAfp = (afp: string) => tasasMap[afp.toUpperCase()] ?? 11.44;

  let liquidCreadas = 0;
  let liquidOmitidas = 0;

  for (const func of funcConSueldo as any[]) {
    const sueldoBase = Number(func.sueldoBase);
    const afp = func.afp ?? 'CAPITAL';
    const salud = func.isapre ?? 'FONASA';
    const tasaAfp = getTasaAfp(afp);

    for (const periodo of MESES) {
      const existing = await prisma.liquidacionSueldo.findUnique({
        where: { funcionarioId_mes_anio: { funcionarioId: func.id, mes: periodo.mes, anio: 2026 } },
      });
      if (existing) { liquidOmitidas++; continue; }

      const calc = calcular(sueldoBase, tasaAfp, salud);

      await prisma.liquidacionSueldo.create({
        data: {
          funcionarioId: func.id,
          mes: periodo.mes,
          anio: 2026,
          diasTrabajados: 30,
          sueldoBase,
          asignacionFamiliar: 0,
          bonoZona: 0,
          horasExtra: 0,
          otrosHaberes: 0,
          totalHaberes: calc.totalHaberes,
          afp,
          tasaAfp,
          montoAfp: calc.montoAfp,
          salud,
          montoSalud: calc.montoSalud,
          seguroCesantia: calc.seguroCesantia,
          impuestoUnico: calc.impuesto,
          otrosDescuentos: 0,
          totalDescuentos: calc.totalDescuentos,
          sueldoLiquido: calc.sueldoLiquido,
          estado: periodo.estado,
          fechaPago: periodo.fechaPago,
        },
      });
      liquidCreadas++;
    }
  }

  console.log(`✅ LiquidacionSueldo creadas: ${liquidCreadas} (omitidas ya existentes: ${liquidOmitidas})`);
  console.log('\n🎉 Seed remuneraciones completado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
