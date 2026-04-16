# Flowmind School ERP — Kit de Arranque

## INSTRUCCIÓN PARA CLAUDE CODE

**Lee este archivo COMPLETO antes de escribir una sola línea de código.**

Este directorio contiene los archivos fundacionales del proyecto. NO son código ejecutable todavía — son los archivos de especificación que el agente debe usar como base para construir el proyecto.

---

## Archivos del kit

| Archivo | Qué es | Cómo usarlo |
|---------|--------|-------------|
| `prisma/schema.prisma` | Schema COMPLETO de base de datos | Copiar a `apps/api/prisma/schema.prisma` |
| `packages/shared/src/events.ts` | 22 tipos de eventos tipados | Copiar a `packages/shared/src/events.ts` |
| `packages/shared/src/rbac.ts` | Matriz de 12 roles × 60+ permisos | Copiar a `packages/shared/src/rbac.ts` |
| `docker-compose.yml` | PostgreSQL 16 + Redis 7 + MinIO (S3) | Ejecutar `docker compose up -d` |
| `docker/init-tenant-db.sql` | Crea las BDs de tenants de prueba | Se ejecuta automáticamente con Docker |
| `.env.example` | Variables de entorno | Copiar como `.env` en `apps/api/` |
| `docs/` | Los 4 documentos Word de especificación | Referencia para funcionalidades y reglas |

---

## Las 10 reglas de oro

1. **CADA MÓDULO ES INDEPENDIENTE.** Nunca importar un service de otro módulo. Comunicación SOLO por eventos.
2. **NUNCA crear tabla sin que esté en schema.prisma.** Si necesitas una nueva, agrégala al schema PRIMERO.
3. **NUNCA hardcodear valores configurables.** Todo viene de la tabla Establecimiento.
4. **SIEMPRE publicar eventos** cuando ocurre una acción relevante (ver events.ts).
5. **SIEMPRE usar transacciones** para operaciones multi-tabla dentro del mismo módulo.
6. **SIEMPRE validar en backend.** Nunca confiar solo en frontend.
7. **SIEMPRE registrar en EventoAuditoria** todo CREATE, UPDATE, DELETE.
8. **SIEMPRE seguir el orden de construcción** (ver abajo).
9. **NUNCA hacer queries a tablas de otro módulo.** Si necesitas datos, escucha eventos o usa read-only service.
10. **SIEMPRE soft delete.** Nunca borrar registros físicamente.

---

## Orden de construcción

### Fase 0: Infraestructura (HACER PRIMERO)
1. Inicializar monorepo Turborepo: `apps/api`, `apps/web`, `packages/shared`, `packages/validators`
2. Copiar `docker-compose.yml`, ejecutar `docker compose up -d`
3. Copiar `schema.prisma` a `apps/api/prisma/`, ejecutar `npx prisma migrate dev --name init`
4. Copiar `events.ts` y `rbac.ts` a `packages/shared/src/`
5. Implementar PrismaService + TenantMiddleware
6. Implementar AuthModule (login, JWT, refresh, RBAC guard usando rbac.ts)
7. Implementar EventBusService (wrapper EventEmitter2 + BullMQ)
8. Implementar AuditInterceptor global
9. Implementar S3 upload service
10. Crear seed de datos de prueba
11. **CHECKPOINT:** `POST /api/v1/auth/login` retorna JWT válido

### Fase 1: Núcleo académico
- Sistema/Config → Alumnos → Asistencia → Atrasos → Calificaciones → Convivencia → Leccionario

### Fase 2: Finanzas
- Fondos → Movimientos → EER → Presupuesto → Conciliación → Rendición → Proveedores → Pagos

### Fase 3: RRHH
- Funcionarios → Asistencia/Reloj → Contratos → Remuneraciones

### Fase 4: Complementarios
- Dashboard → Calendario → PME → Inventario → Cumplimiento

### Fase 5: Frontend + Integraciones
- Layout → Pantallas → Portal apoderados → Exports → SII → SIGE

---

## Stack tecnológico

- **Frontend:** React 18 + TypeScript + TailwindCSS + shadcn/ui + Zustand + React Hook Form + Zod
- **Backend:** NestJS 10+ + TypeScript + Prisma 5+ + EventEmitter2 + BullMQ
- **BD:** PostgreSQL 16 (multi-tenant: database-per-tenant)
- **Cache:** Redis 7
- **Files:** S3-compatible (MinIO para dev)
- **Testing:** Vitest + Supertest
- **Monorepo:** Turborepo

---

## Estructura de carpetas esperada

```
flowmind-school-erp/
├── apps/
│   ├── api/                     # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/          # UN directorio por módulo
│   │   │   │   ├── alumnos/      # controller, service, module, dto/, *.spec.ts
│   │   │   │   ├── asistencia/
│   │   │   │   ├── calificaciones/
│   │   │   │   ├── atrasos/
│   │   │   │   ├── convivencia/
│   │   │   │   ├── leccionario/
│   │   │   │   ├── finanzas/
│   │   │   │   ├── rrhh/
│   │   │   │   ├── inventario/
│   │   │   │   ├── cumplimiento/
│   │   │   │   ├── pme/
│   │   │   │   └── sistema/
│   │   │   ├── common/           # Guards, pipes, decorators
│   │   │   ├── events/           # EventBus service
│   │   │   ├── audit/            # AuditInterceptor
│   │   │   └── prisma/           # PrismaService, TenantMiddleware
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                     # Frontend React
│       └── src/
│           ├── modules/          # Espeja backend
│           ├── components/       # UI compartidos
│           ├── layouts/          # Sidebar, Header
│           └── stores/           # Zustand
├── packages/
│   ├── shared/                  # Tipos, enums, events, rbac
│   └── validators/              # Zod schemas
├── docker-compose.yml
└── turbo.json
```

---

## Convenciones de naming

- Archivos: `kebab-case` (alumnos.controller.ts)
- Clases: `PascalCase` (AlumnosController)
- Variables: `camelCase` (calcularPromedio)
- Constantes: `SCREAMING_SNAKE_CASE` (MAX_NOTA)
- Tablas Prisma: `PascalCase` singular (Alumno)
- Columnas: `camelCase` (fechaNacimiento)
- Enums: `SCREAMING_SNAKE_CASE` (ACTIVO)
- Eventos: `SCREAMING_SNAKE_CASE` (ALUMNO_MATRICULADO)
- Endpoints: `kebab-case` plural (/api/v1/alumnos)

---

## Tema visual (extraído de capturas del ERP actual)

- Background principal: `#0f1923`
- Background cards: `#1a2332`
- Sidebar: `#0d1520`
- Sidebar activo: `#1e3a5f`
- Texto primario: `#ffffff`
- Texto secundario: `#8899aa`
- Verde/éxito: `#10b981`
- Amber/warning: `#f59e0b`
- Rojo/error: `#ef4444`
- Azul/info: `#3b82f6`
- Púrpura/badges: `#8b5cf6`
- Cyan/KPIs: `#06b6d4`
- Bordes: `#2a3a4a`

---

## Respuestas API estándar

```typescript
// Listado (200)
{ data: [...], meta: { page: 1, limit: 20, total: 232, totalPages: 12 } }

// Detalle (200)
{ data: { ... } }

// Error (400/401/403/404/422)
{ error: { code: "VALIDATION_ERROR", message: "...", details: [{ field, message }] } }
```

---

## Checklist post-módulo

Después de construir CADA módulo, verificar:

- [ ] Endpoints CRUD funcionan (GET, POST, PATCH)
- [ ] Validaciones rechazan datos inválidos (nota=8.0 → 400)
- [ ] Eventos se publican (ver logs)
- [ ] Auditoría registra (SELECT FROM EventoAuditoria)
- [ ] RBAC funciona (login como Docente, intentar admin → 403)
- [ ] Paginación funciona (?page=2&limit=10)
- [ ] Soft delete funciona
- [ ] Tests pasan (npm run test -- --filter=[modulo])
- [ ] `grep -r 'import.*from.*modules/[otro]'` → 0 resultados
