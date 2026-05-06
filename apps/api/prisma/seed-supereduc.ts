import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { TENANT_CONFIGS, TenantId } from './tenant-configs';

const tenantId = (process.argv[2] || 'colegio_san_andres') as TenantId;

if (!TENANT_CONFIGS[tenantId]) {
  console.error(`Tenant invalido: ${tenantId}`);
  console.error(`Validos: ${Object.keys(TENANT_CONFIGS).join(', ')}`);
  process.exit(1);
}

const tenantDbUrl =
  process.env.TENANT_DATABASE_URL?.replace('{tenantId}', tenantId) ||
  process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });

// ─── Paths ────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '../../..');
const PLAN_PATH  = path.join(REPO_ROOT, 'docs/normativa/supereduc/plan_cuentas_2026.json');
const MATRIZ_PATH = path.join(REPO_ROOT, 'docs/normativa/supereduc/matriz_documentos_2026.json');

// ─── Types ────────────────────────────────────────────────────────────────────

interface CuentaJson {
  codigo: string;
  codigo_plano: string;
  nombre: string;
  subvenciones: string[];
  libro_rendicion: string | null;
  documentos_habilitados: string[];
  tipo: string;
  familia: string;
}

interface MatrizEntry {
  nombre: string;
  tipo: string;
  libro_rendicion: string | null;
  subvenciones_habilitadas: string[];
  documentos_aceptados: string[];
  requiere_documento: boolean;
}

interface PlanJson {
  metadata: Record<string, unknown>;
  cuentas_operativas: CuentaJson[];
  cuentas_agrupadoras: CuentaJson[];
}

interface MatrizJson {
  metadata: Record<string, unknown>;
  descripcion: string;
  matriz: Record<string, MatrizEntry>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🌱 Sembrando plan de cuentas SuperEduc 2026 [tenant: ${tenantId}]...\n`);

  const plan: PlanJson = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));
  const matrizJson: MatrizJson = JSON.parse(fs.readFileSync(MATRIZ_PATH, 'utf-8'));
  const matriz = matrizJson.matriz;

  // ── 1. Cuentas agrupadoras (primero, por el FK padre) ──────────
  console.log(`📂 Insertando ${plan.cuentas_agrupadoras.length} cuentas agrupadoras...`);

  for (const c of plan.cuentas_agrupadoras) {
    // Agrupadora de nivel raíz: familia == propio codigo_plano
    const codigoPadre = c.familia !== c.codigo_plano ? c.familia : null;
    await prisma.supereducCuenta.upsert({
      where: { codigo: c.codigo_plano },
      update: { nombre: c.nombre, tipo: c.tipo },
      create: {
        codigo: c.codigo_plano,
        nombre: c.nombre,
        tipo: c.tipo,
        esAgrupadora: true,
        codigoPadre,
      },
    });
  }
  console.log(`✅ Agrupadoras: ${plan.cuentas_agrupadoras.length}`);

  // ── 2. Cuentas operativas + subvenciones + documentos ──────────
  console.log(`📋 Insertando ${plan.cuentas_operativas.length} cuentas operativas...`);

  let subvTotal = 0;
  let docTotal  = 0;

  for (const c of plan.cuentas_operativas) {
    const cuenta = await prisma.supereducCuenta.upsert({
      where: { codigo: c.codigo_plano },
      update: { nombre: c.nombre, tipo: c.tipo },
      create: {
        codigo: c.codigo_plano,
        nombre: c.nombre,
        tipo: c.tipo,
        esAgrupadora: false,
        codigoPadre: c.familia || null,
      },
    });

    // Subvenciones: priorizar matriz (más autoritativa que plan)
    const subvenciones =
      matriz[c.codigo_plano]?.subvenciones_habilitadas?.length
        ? matriz[c.codigo_plano].subvenciones_habilitadas
        : c.subvenciones;

    for (const subv of subvenciones) {
      await prisma.supereducCuentaSubvencion.upsert({
        where: { cuentaId_subvencion: { cuentaId: cuenta.id, subvencion: subv } },
        update: {},
        create: { cuentaId: cuenta.id, subvencion: subv },
      });
      subvTotal++;
    }

    // Documentos: priorizar matriz
    const documentos =
      matriz[c.codigo_plano]?.documentos_aceptados?.length
        ? matriz[c.codigo_plano].documentos_aceptados
        : c.documentos_habilitados;

    for (const doc of documentos) {
      await prisma.supereducCuentaDocumento.upsert({
        where: { cuentaId_tipoDoc: { cuentaId: cuenta.id, tipoDoc: doc } },
        update: {},
        create: { cuentaId: cuenta.id, tipoDoc: doc },
      });
      docTotal++;
    }
  }

  console.log(`✅ Operativas: ${plan.cuentas_operativas.length}`);
  console.log(`✅ Subvenciones: ${subvTotal}`);
  console.log(`✅ Documentos: ${docTotal}`);

  // ── Summary con conteo final desde BD ─────────────────────────
  const [opCount, agCount, subvCount, docCount] = await Promise.all([
    prisma.supereducCuenta.count({ where: { esAgrupadora: false } }),
    prisma.supereducCuenta.count({ where: { esAgrupadora: true } }),
    prisma.supereducCuentaSubvencion.count(),
    prisma.supereducCuentaDocumento.count(),
  ]);

  console.log('\n🎉 Plan de cuentas SuperEduc 2026 sembrado');
  console.log('==========================================');
  console.log(`  Tenant       : ${tenantId}`);
  console.log(`  Operativas   : ${opCount}   (esperado: 239)`);
  console.log(`  Agrupadoras  : ${agCount}    (esperado: 27)`);
  console.log(`  Subvenciones : ${subvCount}`);
  console.log(`  Documentos   : ${docCount}`);
  console.log('==========================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => { await prisma.$disconnect(); });
