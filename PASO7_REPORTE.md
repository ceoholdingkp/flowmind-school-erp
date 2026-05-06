# Paso 7 — Sistema Inteligente de Asignación de Cuentas SuperEduc

**Fecha:** 2026-04-17  
**Rama:** `main`  
**Objetivo:** Reducir la fricción de seleccionar una cuenta entre 239 opciones al registrar movimientos SuperEduc, mediante dos mecanismos complementarios: historial de cuentas frecuentes por proveedor y sugerencia automática con IA (Claude).

---

## Resumen Ejecutivo

| Parte | Descripción | Estado |
|---|---|---|
| A | Cuentas frecuentes por proveedor | ✅ Completo |
| B | Sugerencia IA por glosa (Anthropic) | ✅ Completo |
| Migración DB | `proveedor_cuenta_frecuente` en ambos tenants | ✅ Aplicada |
| Build API | `nest build` → webpack compiled successfully | ✅ |
| Build web | `tsc --noEmit` sin errores | ✅ |
| Tests endpoints | GET frecuentes + POST sugerir-cuenta + auto-tracking | ✅ |

---

## Parte A — Cuentas Frecuentes por Proveedor

### 1. Nuevo modelo Prisma

**Archivo:** `apps/api/prisma/schema.prisma`

Nuevo modelo agregado:

```prisma
model ProveedorCuentaFrecuente {
  id           String          @id @default(uuid())
  proveedorId  String
  cuentaCodigo String
  frecuencia   Int             @default(1)
  ultimoUso    DateTime        @default(now())
  createdAt    DateTime        @default(now())

  proveedor    Proveedor       @relation(fields: [proveedorId], references: [id])
  cuenta       SupereducCuenta @relation(fields: [cuentaCodigo], references: [codigo])

  @@unique([proveedorId, cuentaCodigo])
  @@map("proveedor_cuenta_frecuente")
}
```

Relaciones agregadas en modelos existentes:
- `Proveedor`: `cuentasFrecuentes ProveedorCuentaFrecuente[]`
- `SupereducCuenta`: `proveedoresFrecuentes ProveedorCuentaFrecuente[]`

### 2. Migración de base de datos

**Archivo creado:** `apps/api/prisma/migrations/20260417033005_add_proveedor_cuenta_frecuente/migration.sql`

Aplicada a ambos tenants:
- `tenant_colegio_san_andres` ✅
- `tenant_colegio_saucache` ✅

### 3. Nuevos endpoints en Proveedores

**Archivo modificado:** `apps/api/src/modules/finanzas/controllers/proveedores.controller.ts`

```
GET  /api/v1/finanzas/proveedores/:id/cuentas-frecuentes
POST /api/v1/finanzas/proveedores/:id/cuentas-frecuentes
```

- Permiso requerido: `finanzas:rendicion`
- GET devuelve lista ordenada por `frecuencia DESC`, incluye detalle de cuenta (subvenciones, documentos)
- POST hace upsert manual (asociación explícita)

**Archivo modificado:** `apps/api/src/modules/finanzas/proveedores.service.ts`

Métodos nuevos:
- `getCuentasFrecuentes(proveedorId)` — consulta con include de cuenta
- `asociarCuentaFrecuente(proveedorId, cuentaCodigo)` — upsert manual desde endpoint
- `trackCuentaUsada(proveedorId, cuentaCodigo)` — upsert silencioso (para auto-tracking interno)

### 4. Auto-tracking al registrar movimiento

**Archivo modificado:** `apps/api/src/modules/finanzas/rendicion/rendicion.service.ts`

Después de confirmar la transacción `registrarMovimiento`, si el DTO incluye `proveedorId`:

```typescript
if (dto.proveedorId) {
  this.db.proveedorCuentaFrecuente.upsert({
    where: { proveedorId_cuentaCodigo: { proveedorId: dto.proveedorId, cuentaCodigo: dto.supereducCuentaCodigo } },
    update: { frecuencia: { increment: 1 }, ultimoUso: new Date() },
    create: { proveedorId: dto.proveedorId, cuentaCodigo: dto.supereducCuentaCodigo, frecuencia: 1 },
  }).catch(e => this.logger.warn(`trackCuenta failed: ${e?.message}`));
}
```

Diseño: **fire-and-forget** — el error de tracking nunca afecta la respuesta del movimiento.

**Archivo modificado:** `apps/api/src/modules/finanzas/rendicion/dto/registrar-movimiento.dto.ts`

Campo nuevo:
```typescript
@IsOptional()
@IsString()
proveedorId?: string;
```

---

## Parte B — Sugerencia IA por Glosa

### 5. Instalación del SDK

```bash
npm install @anthropic-ai/sdk
```

Instalado en `apps/api/`.

### 6. Variable de entorno

**Archivo modificado:** `apps/api/.env`

```env
# ─── Anthropic / Claude ──────────────────────────────────────
ANTHROPIC_API_KEY=""
```

La clave debe completarse para activar la IA. Sin clave, el endpoint responde `{ sugerencias: [], topSugerencia: null }` sin error.

### 7. Nuevo DTO

**Archivo creado:** `apps/api/src/modules/finanzas/rendicion/dto/sugerir-cuenta.dto.ts`

```typescript
export class SugerirCuentaDto {
  @IsString() @IsNotEmpty() glosa: string;
  @IsOptional() @IsString() proveedorId?: string;
}
```

### 8. Nuevo endpoint sugerir-cuenta

**Archivo modificado:** `apps/api/src/modules/finanzas/rendicion/rendicion.controller.ts`

```
POST /api/v1/finanzas/rendicion/supereduc/sugerir-cuenta
```

Permiso requerido: `finanzas:rendicion`

**Archivo modificado:** `apps/api/src/modules/finanzas/rendicion/rendicion.service.ts`

Lógica del método `sugerirCuenta(dto)`:

1. Si no hay `ANTHROPIC_API_KEY` → retorna vacío inmediatamente
2. Carga las 239 cuentas operativas (codigo + nombre)
3. Si `proveedorId` presente: carga `razonSocial` + `giro` + top 5 cuentas frecuentes
4. Construye prompt con contexto completo del gasto y catálogo de cuentas
5. Llama a `claude-sonnet-4-6` con `max_tokens: 512`
6. Parsea array JSON de la respuesta, enriquece con nombres del catálogo
7. Clamps `confianza` entre 0–100
8. Retorna `{ sugerencias: Sugerencia[], topSugerencia: string | null }`
9. Cualquier error → retorna vacío (no-blocking, no rompe el flujo)

Interfaz `Sugerencia`:
```typescript
interface Sugerencia {
  codigo: string;
  nombre: string;
  confianza: number;  // 0-100
  razon: string;
}
```

---

## Cambios en Frontend

**Archivo reescrito:** `apps/web/src/pages/finanzas/NuevoMovimientoSupereduc.tsx`

### Nuevo componente `ProveedorSelect`

- Dropdown buscable con input de búsqueda inline
- Detecta click-outside con `useRef` para cerrar
- Muestra RUT + razón social
- Al seleccionar: carga cuentas frecuentes vía `GET /proveedores/:id/cuentas-frecuentes`

### Nuevo flujo del formulario

Orden de campos rediseñado para guiar al usuario:
1. **Proveedor** → `ProveedorSelect` (nuevo)
2. **Glosa/Descripción** → trigger de sugerencia IA (debounce 1800ms)
3. **Cuenta SuperEduc** → select con 3 grupos
4. Fondo, Subvención, Tipo Documento
5. Monto, Fecha, Año, Mes
6. Número de documento (opcional)

### Cuenta select con 3 grupos

```
─── Cuentas frecuentes ───      (★ 410304 · OTROS GASTOS EN PERSONAL · usado 3×)
─── Sugeridas por IA ───        (✦ 410115 · MATERIAL DIDÁCTICO · conf. 87%)
─── Todas las cuentas ───       (239 opciones completas)
```

### Lógica de auto-selección

- Al cambiar proveedor: si hay frecuentes y no hay cuenta seleccionada → auto-selecciona la #1
- Al recibir sugerencias IA: si `confianza ≥ 90` y no hay cuenta seleccionada → auto-selecciona `topSugerencia`

### Panel derecho (3 cards)

1. **Sugerencias IA**: muestra hasta 3 sugerencias con badge de confianza (verde ≥80 / ámbar ≥50 / gris <50), click para aplicar
2. **Historial del proveedor**: muestra hasta 5 cuentas frecuentes con badge de frecuencia
3. **Validación en tiempo real**: errores R001–R006 visibles antes de guardar
4. **Detalle de cuenta**: subvenciones y documentos habilitados de la cuenta seleccionada

### Indicadores visuales

- Spinner animado (`spin`) mientras carga sugerencias IA
- Pulse en badge IA cuando hay sugerencias activas
- `proveedorId` enviado en `POST /movimientos` para activar auto-tracking
- Recarga frecuentes tras guardar exitosamente

---

## Resumen de Archivos

| Archivo | Operación |
|---|---|
| `apps/api/prisma/schema.prisma` | MODIFICADO — modelo `ProveedorCuentaFrecuente` + relaciones |
| `apps/api/prisma/migrations/20260417033005_add_proveedor_cuenta_frecuente/` | CREADO — migración SQL |
| `apps/api/.env` | MODIFICADO — `ANTHROPIC_API_KEY` |
| `apps/api/src/modules/finanzas/controllers/proveedores.controller.ts` | MODIFICADO — 2 nuevos endpoints |
| `apps/api/src/modules/finanzas/proveedores.service.ts` | MODIFICADO — 3 nuevos métodos |
| `apps/api/src/modules/finanzas/rendicion/dto/registrar-movimiento.dto.ts` | MODIFICADO — campo `proveedorId` |
| `apps/api/src/modules/finanzas/rendicion/dto/sugerir-cuenta.dto.ts` | CREADO |
| `apps/api/src/modules/finanzas/rendicion/rendicion.service.ts` | MODIFICADO — auto-tracking + `sugerirCuenta()` |
| `apps/api/src/modules/finanzas/rendicion/rendicion.controller.ts` | MODIFICADO — endpoint `sugerir-cuenta` |
| `apps/web/src/pages/finanzas/NuevoMovimientoSupereduc.tsx` | REESCRITO — flujo completo con IA |

---

## Endpoints Nuevos

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/finanzas/proveedores/:id/cuentas-frecuentes` | `finanzas:rendicion` | Lista cuentas frecuentes del proveedor |
| `POST` | `/api/v1/finanzas/proveedores/:id/cuentas-frecuentes` | `finanzas:rendicion` | Asocia cuenta manualmente al proveedor |
| `POST` | `/api/v1/finanzas/rendicion/supereduc/sugerir-cuenta` | `finanzas:rendicion` | Sugerencia IA por glosa + proveedor |

---

## Resultado de Tests

### Build

```
nest build → webpack 5.97.1 compiled successfully in 2036 ms
tsc --noEmit (API)  → sin errores
tsc --noEmit (web)  → sin errores
```

### Endpoints curl (tenant: colegio_san_andres, usuario: director@sanandres.cl)

**GET /proveedores/:id/cuentas-frecuentes** (antes de movimiento)
```json
{ "data": [] }
```

**POST /sugerir-cuenta** (sin ANTHROPIC_API_KEY)
```json
{ "data": { "sugerencias": [], "topSugerencia": null } }
```

**POST /movimientos** (con proveedorId)
```json
{ "data": { "id": "76390eda-ea04-4a5b-a54e-9b37f90c306d", "tipo": "EGRESO", ... } }
```

**GET /proveedores/:id/cuentas-frecuentes** (después del movimiento — auto-tracking)
```json
{
  "data": [{
    "id": "798c2266-5e07-4084-aa6f-e1b9fe13fdd0",
    "frecuencia": 1,
    "ultimoUso": "2026-04-17T03:36:54.216Z",
    "cuenta": { "codigo": "410304", "nombre": "OTROS GASTOS EN PERSONAL", ... }
  }]
}
```

Auto-tracking confirmado: la cuenta `410304` quedó registrada tras el movimiento.

---

## Errores Encontrados y Soluciones

### Error 1 — Login sin x-tenant-id
**Problema:** `POST /auth/login` devolvía `INTERNAL_ERROR` al no incluir el header `x-tenant-id`.  
**Causa:** `TenantMiddleware` activo en todos los endpoints, incluyendo auth.  
**Solución:** Agregar `-H "x-tenant-id: colegio_san_andres"` a todas las peticiones curl.

### Error 2 — Subvención/documento inválido en test curl
**Problema:** Test inicial usó `subvencion: "SEP"` y `tipoDocumento: "FAC"` para cuenta `410120`, que solo acepta `General` + `ODE`.  
**Causa:** Los validadores R002 y R003 funcionan correctamente.  
**Solución:** Buscar una cuenta compatible con SEP+FAC (`410304`) usando el endpoint `GET /cuentas?subvencion=SEP`.

---

## Activación de IA

Para habilitar las sugerencias IA en producción o desarrollo:

```bash
# apps/api/.env
ANTHROPIC_API_KEY="sk-ant-..."
```

Reiniciar el servidor. El endpoint `/sugerir-cuenta` usará `claude-sonnet-4-6` con el catálogo completo de 239 cuentas operativas y el historial del proveedor como contexto.

**Sin clave configurada:** el sistema degrada de forma elegante — el formulario funciona normalmente sin sugerencias IA, sin errores ni bloqueos.
