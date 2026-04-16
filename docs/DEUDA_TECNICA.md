# Flowmind School ERP — Deuda Técnica

Registro de decisiones técnicas pendientes, workarounds conocidos y mejoras planificadas.
Actualizar con fecha y estado cuando se resuelva cada ítem.

---

## Tabla de deuda activa

| # | Severidad | Item | Estado |
|---|-----------|------|--------|
| 1 | CRÍTICO | TenantService leak de conexiones: `new PrismaClient()` por request sin `$disconnect()` | **Resuelto 2026-04-16** — refactor a singleton + Map cache + AsyncLocalStorage |
| 2 | ALTO | `EstadoMatricula` enum: valor `PENDIENTE` no existe en schema (es `SUSPENDIDA`) | **Resuelto** — corregido en matricula.service.ts |
| 3 | MEDIO | Schema Prisma duplicado: `prisma/schema.prisma` y `apps/api/prisma/schema.prisma` son copias manuales | Pendiente — unificar en un solo lugar con symlink o turbo pipeline |
| 4 | MEDIO | Sin git desde el inicio del proyecto | **Resuelto 2026-04-16** — `git init` + primer commit + repo privado en GitHub |
| 5 | MEDIO | 1 solo test (`alumnos.service.spec.ts`) — sin cobertura real | Pendiente — atacar en fase de testing |
| 6 | ALTO | Auth multi-tenant: implementar Master DB para usuarios globales en vez de requerir `x-tenant-id` desde frontend | Pendiente |

---

## Detalle de ítems pendientes

### #3 — Schema duplicado
- **Problema:** `prisma/schema.prisma` (raíz) y `apps/api/prisma/schema.prisma` se sincronizan manualmente.
- **Riesgo:** Pueden desincronizarse silenciosamente.
- **Solución:** Convertir `prisma/schema.prisma` en el único fuente de verdad con un symlink, o configurar turbo para que `apps/api` lo copie en build.
- **Cuándo atacar:** Antes de agregar el segundo tenant real.

### #5 — Cobertura de tests
- **Problema:** Solo existe `alumnos.service.spec.ts` y tiene errores de tipado preexistentes.
- **Impacto:** Sin tests, los refactors como el de TenantService no tienen red de seguridad.
- **Solución:** Agregar tests de integración por módulo usando Vitest + Supertest contra una BD de test.
- **Cuándo atacar:** Fase 8 (definida en plan de trabajo).

### #6 — Auth multi-tenant: Master DB
- **Problema actual:** El login requiere header `x-tenant-id` desde el frontend para saber a qué base de datos del tenant consultar. El frontend actualmente NO envía este header (workaround temporal: añadirlo hardcodeado al axios client).
- **Diseño correcto:**
  1. BD Master global con tabla `Users(email, tenantId, passwordHash, rol)`
  2. `POST /auth/login` consulta Master → valida credenciales → retorna JWT con `{ sub, email, rol, tenantId }`
  3. Requests siguientes usan `tenantId` del JWT (extraído por JwtStrategy) → no requieren header manual
  4. El header `x-tenant-id` queda solo como override para super-admins
- **Workaround activo:** Frontend enviará `x-tenant-id: colegio_san_andres` hardcodeado en el axios interceptor hasta que se implemente Master DB.
- **Cuándo atacar:** Antes de tener más de 2 colegios en producción. Es un cambio de schema + migración de datos.

---

## Resueltos

| Fecha | # | Detalle |
|---|---|---|
| 2026-04-16 | 1 | TenantService refactorizado: singleton + `Map<tenantId, PrismaClient>` + `AsyncLocalStorage` + `OnModuleDestroy` con `$disconnect()` |
| 2026-04-16 | 2 | `PENDIENTE` → `SUSPENDIDA` en `EstadoMatricula` corregido en `matricula.service.ts` |
| 2026-04-16 | 4 | Repo inicializado con git, 201 archivos en commit inicial, subido a `github.com/ceoholdingkp/flowmind-school-erp` (privado) |
