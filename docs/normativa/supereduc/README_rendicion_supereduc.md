# Módulo de Rendición SuperEduc — Semillas y Especificación

> **Fase 1 de 3** — Archivos de referencia generados por Claude (no código ejecutable).
> La Fase 2 (implementación) la hace Claude Code usando estos archivos como fuente.

## Contenido de este paquete

| Archivo | Qué contiene | Cómo se usa |
|---|---|---|
| `plan_cuentas_2026.json` | Plan de Cuentas SuperEduc 2026 completo, estructurado | Referencia de lectura para Claude Code |
| `plan_cuentas_2026.sql` | Script SQL idempotente para sembrar el plan en Postgres | `psql` directo o `prisma db execute` |
| `matriz_documentos_2026.json` | Qué tipos de documento acepta cada cuenta | Input para el validator en tiempo real |
| `validaciones_rendicion.json` | Reglas de negocio globales (R001–R010, SEP001–SEP002) | Input para lógica del service |

## Para Claude Code: plan de implementación

### Paso 1 — Agregar modelos al schema Prisma

Agregar a `apps/api/prisma/schema.prisma`:

```prisma
model SupereducCuenta {
  codigo           String   @id @db.VarChar(6)  // Ej: "410101"
  nombre           String
  tipo             String   // INGRESO | GASTO | AJUSTE
  familia          String   @db.VarChar(6)      // Código agrupador
  libroRendicion   String?                      // null para agrupadoras
  esAgrupadora     Boolean  @default(false)
  
  subvenciones     SupereducCuentaSubvencion[]
  documentos       SupereducCuentaDocumento[]
  movimientos      MovimientoFinanciero[]
  
  @@map("supereduc_cuenta")
}

model SupereducCuentaSubvencion {
  id              Int              @id @default(autoincrement())
  cuentaCodigo    String           @db.VarChar(6)
  subvencion      String           // "General" | "SEP" | "PIE" | etc
  cuenta          SupereducCuenta  @relation(fields: [cuentaCodigo], references: [codigo])
  
  @@unique([cuentaCodigo, subvencion])
  @@map("supereduc_cuenta_subvencion")
}

model SupereducCuentaDocumento {
  id              Int              @id @default(autoincrement())
  cuentaCodigo    String           @db.VarChar(6)
  tipoDocumento   String           // "BOL" | "FAC" | "BOLE" | etc
  cuenta          SupereducCuenta  @relation(fields: [cuentaCodigo], references: [codigo])
  
  @@unique([cuentaCodigo, tipoDocumento])
  @@map("supereduc_cuenta_documento")
}
```

El modelo `MovimientoFinanciero` ya existe — solo agregar relación a `SupereducCuenta` con FK a `cuenta_codigo`.

### Paso 2 — Migración

```bash
cd apps/api
npx prisma migrate dev --name add_supereduc_plan_cuentas
```

### Paso 3 — Ejecutar el seed SQL

```bash
docker exec -i flowmind-school-db psql -U flowmind -d tenant_colegio_san_andres < plan_cuentas_2026.sql
```

Verificar:
```sql
SELECT COUNT(*) FROM supereduc_cuenta WHERE es_agrupadora = false;  -- Debe dar 239
SELECT COUNT(*) FROM supereduc_cuenta_subvencion;                    -- ~800-900
SELECT COUNT(*) FROM supereduc_cuenta_documento;                     -- ~400-500
```

### Paso 4 — Crear el módulo NestJS

Estructura sugerida:
```
apps/api/src/modules/finanzas/rendicion/
├── rendicion.module.ts
├── rendicion.controller.ts
├── rendicion.service.ts
├── validator/
│   ├── rendicion.validator.ts      # Aplica R001-R010
│   └── documento.validator.ts      # Usa matriz_documentos_2026.json
├── generator/
│   └── archivo-rendicion.generator.ts  # Genera .csv o .xlsx para SuperEduc
└── dto/
    ├── registrar-movimiento.dto.ts
    └── generar-rendicion.dto.ts
```

### Paso 5 — Endpoints mínimos

```
POST   /api/v1/rendicion/movimiento           # Registrar gasto/ingreso
GET    /api/v1/rendicion/cuentas              # Listar plan de cuentas
GET    /api/v1/rendicion/cuentas/:codigo      # Detalle + documentos aceptados
POST   /api/v1/rendicion/validar              # Validación previa sin persistir
GET    /api/v1/rendicion/:anio/borrador       # Ver rendición en construcción
POST   /api/v1/rendicion/:anio/generar        # Generar archivo para SuperEduc
GET    /api/v1/rendicion/:anio/descargar      # Download del archivo generado
```

### Paso 6 — Validador de documento por cuenta

Lógica crítica (pseudocódigo):

```typescript
async validarMovimiento(dto: RegistrarMovimientoDto) {
  const cuenta = await this.prisma.supereducCuenta.findUnique({
    where: { codigo: dto.cuentaCodigo },
    include: { subvenciones: true, documentos: true }
  });
  
  if (!cuenta) throw new BadRequestException('Cuenta no existe');
  if (cuenta.esAgrupadora) throw new BadRequestException('R009: No se imputan a cuentas agrupadoras');
  
  const subvencionesValidas = cuenta.subvenciones.map(s => s.subvencion);
  if (!subvencionesValidas.includes(dto.subvencion)) {
    throw new BadRequestException(
      `R004: Subvención "${dto.subvencion}" no habilitada para cuenta ${cuenta.codigo}. ` +
      `Habilitadas: ${subvencionesValidas.join(', ')}`
    );
  }
  
  const documentosValidos = cuenta.documentos.map(d => d.tipoDocumento);
  if (documentosValidos.length > 0 && !documentosValidos.includes(dto.tipoDocumento)) {
    throw new BadRequestException(
      `R003: Documento "${dto.tipoDocumento}" no aceptado para cuenta ${cuenta.codigo}. ` +
      `Aceptados: ${documentosValidos.join(', ')}`
    );
  }
  
  // R002: año correcto
  const anioRendicion = new Date(dto.fechaPago).getFullYear();
  if (anioRendicion !== dto.anioRendicion) {
    throw new BadRequestException('R002: Fecha de pago fuera del año de rendición');
  }
  
  // R006: RUT válido (usar librería rut-helpers)
  // R008: folio+rut_emisor único
  // ... etc
  
  return cuenta;
}
```

### Paso 7 — Generador de archivo

El formato de archivo que espera SuperEduc en su plataforma es un CSV con columnas específicas. **Este formato no está completamente documentado en los PDFs públicos** — hay que obtener la plantilla real desde la plataforma SuperEduc y ajustar. Por ahora, generar un CSV con todas las columnas conocidas:

- `rbd_establecimiento`
- `anio`
- `codigo_cuenta`
- `nombre_cuenta`
- `subvencion`
- `libro_rendicion`
- `tipo_documento`
- `folio_documento`
- `rut_emisor`
- `razon_social_emisor`
- `fecha_emision`
- `fecha_pago`
- `monto`
- `glosa`

### Paso 8 — Tests mínimos

Al menos:
- `rendicion.validator.spec.ts` — test de cada regla R001-R010
- `documento.validator.spec.ts` — test con cuentas reales del seed

## Deuda técnica conocida de este módulo

1. **Formato de archivo exacto de SuperEduc**: hay que descargarlo de la plataforma real, puede requerir ajustes.
2. **Integración con SII**: R006 y R007 asumen que el ERP consulta SII para validar RUT y folios. Hoy solo validamos formato de RUT localmente.
3. **SEP + PME**: la regla SEP001 requiere que el ERP tenga el módulo PME integrado para validar que el gasto SEP esté vinculado a una acción PME. Hoy no está implementado.
4. **Plazo dinámico**: R010 asume fecha fija (30 abril); SuperEduc publica resoluciones anuales con la fecha exacta.

## Metadata de la extracción

- **Fuente**: Manual de Cuentas para la Rendición de Recursos destinados a Educación 2026 (SuperEduc)
- **Páginas**: 129
- **Cuentas operativas extraídas**: 239
- **Cuentas agrupadoras**: 27
- **Extractor**: Python 3 con regex sobre texto plano (pdftotext layout)
- **Verificación manual pendiente**: el plan de cuentas tabular de las páginas 112-124 del PDF original debería rasterizarse y contrastarse con lo extraído para capturar cualquier cuenta que el extractor haya perdido.
