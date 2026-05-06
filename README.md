# Flowmind School ERP

ERP multi-tenant para colegios chilenos. Cubre matrícula, asistencia, académico (notas/evaluaciones), finanzas con rendición SuperEduc, remuneraciones con exportación Previred, comunicación con apoderados, integración EDE Mineduc con libro digital y firma OTP, portal de apoderados y dashboard del director.

Arquitectura **database-per-tenant** sobre PostgreSQL: una base maestra (`flowmind_master`) y una base por colegio (`tenant_<id>`).

---

## Stack

**Backend** — NestJS 10, TypeScript, Prisma 5, EventEmitter2, BullMQ, Passport JWT, class-validator, Helmet, `@nestjs/throttler`.
**Frontend** — React 18, Vite, TypeScript, TailwindCSS, Zustand, React Hook Form + Zod, React Router 6, Recharts, Axios, lucide-react.
**Datos** — PostgreSQL 16 (multi-tenant), Redis 7 (cache + colas BullMQ), MinIO (S3 compatible para archivos).
**Tooling** — Turborepo, Vitest (unit + e2e), ESLint, Docker / docker-compose.

---

## Requisitos previos

- **Node.js 20.x** (`node -v`).
- **npm 10+** (viene con Node 20).
- **Docker Desktop** o `docker` + `docker compose` v2.
- **Git**.
- (Opcional, sólo si quieres correr Postgres fuera de Docker) **PostgreSQL 16** local.

---

## Instalación desde cero

```bash
# 1. Clonar
git clone https://github.com/ceoholdingkp/flowmind-school-erp.git
cd flowmind-school-erp

# 2. Instalar dependencias del monorepo
npm install

# 3. Levantar Postgres + Redis + MinIO
docker compose up -d
docker compose ps    # los 3 servicios deben estar healthy

# 4. Variables de entorno
cp .env.example apps/api/.env
# editar apps/api/.env si necesitas cambiar puertos/credenciales

# 5. Generar cliente Prisma + aplicar migraciones a la BD master
cd apps/api
npx prisma generate
npx prisma migrate deploy   # en dev local puedes usar `migrate dev`

# 6. Crear las BDs de tenants de ejemplo (san_andres, saucache)
#    El init-tenant-db.sql ya las crea al levantar el contenedor;
#    si necesitas otra: ../../scripts/add-tenant.sh <tenant_id>

# 7. Cargar seeds (datos demo)
npm run seed:all              # base + multi-tenant
npm run seed:supereduc:all    # plan de cuentas SuperEduc

# 8. Volver a la raíz y arrancar todo en modo dev
cd ../..
npm run dev
```

Al terminar:
- API → http://localhost:3001
- Web → http://localhost:5173
- MinIO console → http://localhost:9001 (`flowmind` / `flowmind_dev_2026`)

---

## Variables de entorno

Copiar `.env.example` a `apps/api/.env`. Las claves clave:

| Variable | Default dev | Para qué |
|---|---|---|
| `DATABASE_URL` | `postgresql://flowmind:...@localhost:5434/flowmind_master` | BD maestra (tenants, usuarios globales) |
| `TENANT_DATABASE_URL` | `postgresql://...@127.0.0.1:5434/tenant_{tenantId}` | Plantilla para resolver la BD del tenant en runtime |
| `JWT_SECRET` | dev-only | Firma de access/refresh tokens. **Cambiar en prod.** |
| `JWT_ACCESS_EXPIRATION` | `15m` | TTL access token |
| `JWT_REFRESH_EXPIRATION` | `7d` | TTL refresh token |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6382` | Redis (cache + BullMQ) |
| `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` / `S3_REGION` | MinIO local | Storage de documentos |
| `PORT` | `3001` | Puerto API |
| `NODE_ENV` | `development` | Modo |
| `FRONTEND_URL` | `http://localhost:5173` | CORS |

Integraciones opcionales (comentadas en `.env.example`): `SII_*`, `WEBPAY_*`, `KHIPU_*`. Para producción ver `.env.production.example` en la raíz.

---

## Levantar el proyecto en desarrollo

Desde la raíz del monorepo:

```bash
npm run dev          # turbo: arranca api (watch) + web (vite)
```

O por separado:

```bash
# API con hot-reload
cd apps/api && npm run dev

# Web (Vite)
cd apps/web && npm run dev
```

Comandos útiles de Prisma (en `apps/api`):

```bash
npx prisma migrate dev --name <nombre>   # crear y aplicar migración
npx prisma migrate deploy                # aplicar migraciones existentes
npx prisma studio                        # GUI de la BD master
npx prisma generate                      # regenerar cliente tras cambios
```

---

## Estructura del repo

```
flowmind-school-erp/
├── apps/
│   ├── api/                       Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma      Schema único (fuente de verdad)
│   │   │   ├── migrations/        Migraciones SQL
│   │   │   ├── seed.ts            Seed multi-tenant base
│   │   │   ├── seed-academico.ts  Seeds por módulo
│   │   │   ├── seed-asistencia.ts
│   │   │   ├── seed-comunicaciones.ts
│   │   │   ├── seed-matriculas.ts
│   │   │   ├── seed-remuneraciones.ts
│   │   │   └── seed-supereduc.ts
│   │   ├── src/
│   │   │   ├── main.ts            Bootstrap (Helmet, CORS, throttler, validation pipe)
│   │   │   ├── app.module.ts      Wiring de módulos
│   │   │   ├── audit/             Interceptor + controller de auditoría
│   │   │   ├── common/            guards, filters, interceptors compartidos
│   │   │   └── modules/           Un directorio por módulo (ver abajo)
│   │   ├── test/                  Specs e2e (vitest)
│   │   ├── vitest.config.ts       Config tests unitarios
│   │   └── vitest.e2e.config.ts   Config tests e2e
│   └── web/                       Frontend React + Vite
│       └── src/
│           ├── App.tsx            Routing
│           ├── api/               client.ts (admin), portalClient.ts (apoderado)
│           ├── components/        Layout, Sidebar, ErrorBoundary, Skeleton, Toast
│           ├── pages/             Una carpeta por módulo (espeja backend)
│           └── store/             Zustand stores (auth, toasts)
├── packages/
│   ├── shared/                    Tipos, eventos (events.ts), matriz RBAC (rbac.ts)
│   └── validators/                Schemas Zod compartidos cliente/servidor
├── scripts/
│   ├── add-tenant.sh              Provisiona una BD de tenant nueva
│   ├── backup.sh / restore.sh     Backup/restore de BD
│   └── deploy.sh                  Deploy a producción
├── docker/
│   └── init-tenant-db.sql         BDs de tenants demo al levantar postgres
├── docker-compose.yml             Stack de desarrollo
├── docker-compose.prod.yml        Stack de producción
├── turbo.json                     Pipeline turborepo
└── tsconfig.base.json             TS config compartido
```

### Módulos del backend (`apps/api/src/modules/`)

| Módulo | Responsabilidad |
|---|---|
| `auth` | Login admin/staff, JWT access+refresh, RBAC guard sobre `rbac.ts` |
| `sistema` | Configuración global del establecimiento, parámetros |
| `alumnos` | Alumnos y apoderados (relación, contactos) |
| `matricula` | Proceso de matrícula V2 con contactos, documentos y wizard |
| `asistencia` | Registro diario por curso, marcación masiva, reportes |
| `atrasos` | Atrasos y justificaciones |
| `calendario` | Eventos, fechas relevantes, feriados |
| `calificaciones` | Notas individuales (legacy, complementa academico) |
| `academico` | Asignaturas, evaluaciones, calificaciones, promedios y ponderaciones |
| `leccionario` | Libro de clases por asignatura/profesor |
| `convivencia` | Anotaciones positivas/negativas, medidas formativas |
| `cumplimiento` | Cumplimiento normativo Mineduc |
| `dashboard` | KPIs del director: matrícula, asistencia, finanzas, alertas |
| `finanzas` | Fondos, movimientos, presupuesto, conciliación, **rendición SuperEduc** con sugerencia IA de cuenta frecuente, proveedores |
| `remuneraciones` | Liquidaciones, conceptos, exportación Previred |
| `rrhh` | Funcionarios, contratos (la UI vive bajo `pages/rrhh`) |
| `inventario` | Activos y consumibles del colegio |
| `comunicaciones` | Mensajes y comunicados a apoderados con plantillas y segmentación |
| `pme` | Plan de Mejoramiento Educativo |
| `ede` | Integración EDE Mineduc + libro de clases digital + firma OTP del docente |
| `portal` | API del portal de apoderados (auth JWT propia, asistencia/notas/comunicados del hijo) |
| `onboarding` | Wizard para dar de alta un nuevo tenant |
| `health` | Healthchecks `/health/live` y `/health/ready` |

---

## Convenciones de código

### Las 10 reglas de oro

1. **Cada módulo es independiente.** No importar un service de otro módulo. Comunicación por eventos (ver `packages/shared/src/events.ts`).
2. **No crear tabla sin pasar por `schema.prisma`.** El schema es la fuente de verdad.
3. **No hardcodear valores configurables.** Vienen de la tabla `Establecimiento`.
4. **Publicar eventos** en cada acción relevante (CREATE/UPDATE de entidades de dominio).
5. **Transacciones** para operaciones multi-tabla dentro del mismo módulo.
6. **Validar en backend.** Frontend valida UX, backend valida seguridad (DTOs con class-validator + Zod en `packages/validators`).
7. **Auditoría obligatoria** para CREATE / UPDATE / DELETE (vía `AuditInterceptor`).
8. **Soft delete siempre.** Nunca borrar físicamente.
9. **No queries cross-módulo.** Si necesitas datos, escucha eventos o usa un read-only service expuesto.
10. **RBAC por permiso, no por rol.** Roles compuestos viven en `packages/shared/src/rbac.ts`.

### Naming

| Qué | Cómo | Ejemplo |
|---|---|---|
| Archivos | `kebab-case` | `alumnos.controller.ts` |
| Clases | `PascalCase` | `AlumnosController` |
| Variables / funciones | `camelCase` | `calcularPromedio` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_NOTA` |
| Tablas Prisma | `PascalCase` singular | `Alumno` |
| Columnas | `camelCase` | `fechaNacimiento` |
| Enums | `SCREAMING_SNAKE_CASE` | `ACTIVO` |
| Eventos | `SCREAMING_SNAKE_CASE` | `ALUMNO_MATRICULADO` |
| Endpoints | `kebab-case` plural | `/api/v1/alumnos` |

### Formato de respuesta API

```ts
// Listado (200)
{ data: [...], meta: { page: 1, limit: 20, total: 232, totalPages: 12 } }

// Detalle (200)
{ data: { ... } }

// Error (400/401/403/404/422)
{ error: { code: "VALIDATION_ERROR", message: "...", details: [{ field, message }] } }
```

### Tema visual del frontend

Paleta dark fija (definida en `apps/web/src/index.css` y tokens Tailwind):

```
bg principal     #0f1923    bg cards        #1a2332    sidebar          #0d1520
sidebar activo   #1e3a5f    texto primario  #ffffff    texto secundario #8899aa
verde/éxito      #10b981    amber/warning   #f59e0b    rojo/error       #ef4444
azul/info        #3b82f6    púrpura/badges  #8b5cf6    cyan/KPIs        #06b6d4
bordes           #2a3a4a
```

---

## Tests

```bash
# Todo el monorepo
npm run test

# API — unitarios
cd apps/api && npm run test
npm run test:watch
npm run test:cov

# API — e2e (levanta NestJS contra BD de test)
cd apps/api && npm run test:e2e

# Filtrar por archivo
cd apps/api && npx vitest run src/modules/asistencia
```

Las specs unitarias viven junto al código (`*.spec.ts` o `*.service.spec.ts`). Las specs e2e están en `apps/api/test/*.e2e-spec.ts` y usan `vitest.e2e.config.ts`.

---

## Scripts de operaciones

Todos en `scripts/` y pensados para producción/staging:

| Script | Qué hace |
|---|---|
| `scripts/add-tenant.sh <tenant_id>` | Crea la BD del tenant y aplica migraciones |
| `scripts/backup.sh` | Dump de la BD master y todos los tenants |
| `scripts/restore.sh <archivo>` | Restaura desde un dump |
| `scripts/deploy.sh` | Build + push + restart contra `docker-compose.prod.yml` |

---

## Checklist al cerrar un módulo

- [ ] CRUD funciona (GET / POST / PATCH).
- [ ] DTOs rechazan datos inválidos (ej: `nota=8.0` → 400).
- [ ] Eventos publicados (verificar logs / Bull dashboard).
- [ ] Auditoría queda registrada (`SELECT FROM EventoAuditoria`).
- [ ] RBAC: login como rol distinto al permitido devuelve 403.
- [ ] Paginación responde a `?page=2&limit=10`.
- [ ] Soft delete (no se eliminan filas físicas).
- [ ] Tests pasan (`npm run test`).
- [ ] `grep -r 'from.*modules/<otro>'` desde el módulo nuevo → 0 resultados.

---

## Recursos

- `docs/` — Especificaciones funcionales y reglas de negocio (4 documentos base).
- `PASO7_REPORTE.md`, `PASO8_REPORTE.md`, `PASO9_REPORTE.md` — Reportes de fases de infraestructura/seguridad.
- `packages/shared/src/events.ts` — Catálogo de eventos del dominio.
- `packages/shared/src/rbac.ts` — Matriz roles × permisos.
