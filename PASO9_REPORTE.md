# Paso 9 — Dashboard del Director

**Fecha:** 2026-04-17  
**Estado:** Completado ✅

---

## Resumen

Panel ejecutivo que consolida KPIs de todos los módulos construidos. 
Primera pantalla post-login para el director, con foto instantánea del estado del colegio.

---

## Archivos Creados / Modificados

### Backend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `apps/api/src/modules/dashboard/dashboard.service.ts` | Modificado | Agregados métodos `getDirectorDashboard()` y `getActividadReciente()` |
| `apps/api/src/modules/dashboard/dashboard.controller.ts` | Modificado | Agregadas rutas `GET /director` y `GET /actividad-reciente` |

### Frontend

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `apps/web/src/pages/Dashboard.tsx` | Reescrito | Nueva vista de 4 filas con KPIs, gráficos, alertas, actividad |
| `apps/web/src/components/Sidebar.tsx` | Modificado | Logo FlowMind hace click y navega a /dashboard |

---

## Endpoints Nuevos

### GET /api/v1/dashboard/director
- **Permiso:** `dashboard:read` (DIRECTOR, SUPER_ADMIN, SOSTENEDOR, ADMINISTRATIVO, UTP, INSPECTOR)
- **Descripción:** Consolida KPIs de matrículas, finanzas, asistencia, personal y alertas dinámicas

**Response real de la DB (San Andrés):**
```json
{
  "data": {
    "matriculas": {
      "totalVigentes": 30,
      "totalRetirados": 0,
      "nuevosMes": 30,
      "porNivel": [
        { "nivel": "1° Básico", "total": 15, "hombres": 7, "mujeres": 8 },
        { "nivel": "2° Básico", "total": 15, "hombres": 0, "mujeres": 15 }
      ],
      "pie": 4,
      "prioritarios": 8,
      "preferentes": 6
    },
    "finanzas": {
      "totalIngresos": 1292333333,
      "totalEgresos": 555812340,
      "balance": 736520993,
      "movimientosMes": 6,
      "rendicionEstado": "EN_PROCESO",
      "cuentasMasUsadas": [
        { "codigo": "410120", "nombre": "DEVOLUCIÓN BONOS REMUNERACIONALES FISCALES", "monto": 150000, "movimientos": 1 }
      ]
    },
    "asistencia": {
      "promedioGeneral": null,
      "asistenciaHoy": { "presentes": 0, "ausentes": 0, "total": 0 },
      "tendenciaSemanal": [],
      "mock": true
    },
    "personal": {
      "totalFuncionarios": 9,
      "docentes": 7,
      "asistentes": 2,
      "licenciasMes": 0
    },
    "alertas": [
      {
        "tipo": "RENDICION",
        "mensaje": "Rendición 2026 tiene 2 movimiento(s) sin documento respaldo",
        "severidad": "warning"
      }
    ],
    "actualizadoEn": "2026-04-17T06:13:30.327Z"
  }
}
```

### GET /api/v1/dashboard/actividad-reciente?limit=N
- **Permiso:** `dashboard:read`
- **Descripción:** Últimas N acciones mezclando matrículas y movimientos financieros

**Response real:**
```json
{
  "data": [
    { "tipo": "MATRICULA", "descripcion": "Nueva matrícula: Sofía Castro — 2B", "usuario": null, "fecha": "2026-04-17T05:11:57.847Z" },
    { "tipo": "MOVIMIENTO", "descripcion": "Egreso $150.000 — Compra útiles", "usuario": null, "fecha": "..." }
  ]
}
```

---

## Lógica del Service

### `getDirectorDashboard()`
- **Matrículas:** consulta tabla `matricula_v2` (Prisma model `Matricula`), agrupa por `nivel`, cuenta con genero (`MASCULINO`/`FEMENINO`) desde tabla `Alumno`
- **Finanzas:** `groupBy supereducCuentaCodigo` con `_sum monto` para top 5 cuentas; balance = totalIngresos - totalEgresos del año
- **Asistencia:** try/catch con `mock: true` si no hay registros hoy
- **Personal:** cuenta `Funcionario` activos por tipo DOCENTE vs total
- **Alertas dinámicas:**
  - Movimientos sin `documentoTributarioId` (respaldo)
  - Alumnos prioritarios sin apoderado vinculado
  - Alertas activas del sistema (`Alerta` model)

### `getActividadReciente(limit)`
- Consulta en paralelo últimas N matrículas y N movimientos
- Mezcla, ordena por fecha desc, corta en `limit`

---

## Frontend — Dashboard.tsx

### Layout (4 filas)

**Fila 1 — KPI Cards (2x2 mobile / 4col desktop):**
- Alumnos Matriculados (con delta "+N este mes")
- Asistencia Hoy (con fallback "Sin datos" si `mock: true`)
- Balance Financiero (verde si positivo, rojo si negativo)
- Funcionarios (docentes vs asistentes)

**Fila 2 — 3:2 cols:**
- Izquierda: gráfico de barras CSS por nivel (sin dependencias)
  - Gradiente azul, contadores hombres/mujeres
  - Stats de PIE, prioritarios, preferentes al pie
- Derecha: panel alertas con íconos por severidad (error=rojo, warning=amarillo, info=azul)
  - Click en alerta navega al módulo correspondiente

**Fila 3 — 1:1 cols:**
- Izquierda: top cuentas SuperEduc (código, nombre, monto, movimientos)
  - Link "Ver rendición completa →" a `/finanzas/rendicion/resumen`
  - Balance total al pie
- Derecha: timeline de actividad reciente
  - Íconos por tipo (School=MATRICULA, Receipt=MOVIMIENTO)
  - Tiempo relativo ("hace 2 min", "hace 3h")

**Fila 4 — condicional:**
- Gráfico de barras de tendencia semanal (si `tendenciaSemanal.length > 0`)

### Features adicionales
- **Skeleton loaders:** mientras carga cada sección
- **Auto-refresh:** `setInterval(5 * 60 * 1000)` + cleanup en unmount
- **Error handling:** `Promise.allSettled` — si un endpoint falla, el otro sigue mostrando
- **Responsive:** grid 2-col en mobile (2x2 KPI), 4-col en lg
- **Botón Actualizar:** con spinner animado mientras carga

---

## Sidebar — Cambio de Logo

El logo "FlowMind" en el sidebar ahora es un `<button>` que llama a `navigate('/dashboard')` al hacer click.

---

## Errores y Soluciones

| Error | Solución |
|-------|---------|
| `genero` almacenado como `MASCULINO`/`FEMENINO` (no `M`/`F`) | Comparaciones corregidas a strings completos |
| Puerto 3002 ya ocupado al reiniciar | `kill $(lsof -ti:3002)` + rebuild + restart desde `dist/main.js` |

---

## Resultado de Tests

```bash
# GET /dashboard/director → 200 OK, datos reales
curl http://localhost:3002/api/v1/dashboard/director -H "Authorization: Bearer $TOKEN" -H "x-tenant-id: colegio_san_andres"
# → matriculas: 30 vigentes, finanzas: balance $736M, personal: 9, 1 alerta RENDICION

# GET /dashboard/actividad-reciente?limit=5 → 200 OK
# → 5 items tipo MATRICULA ordenados por fecha desc

# TypeScript check API → 0 errores
# TypeScript check web → 0 errores
```

---

## Estado del Módulo de Asistencia

El campo `asistencia.mock = true` porque no hay registros de asistencia para hoy (2026-04-17).
El módulo de asistencia existe en la DB pero aún no se ha registrado asistencia para los alumnos de matrícula_v2.
Cuando existan registros, `promedioGeneral` se calculará automáticamente desde datos reales.
