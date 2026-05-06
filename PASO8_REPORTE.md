# Paso 8 — Módulo de Matrículas y Fichas de Alumnos

**Fecha:** 2026-04-17  
**Rama:** `main`  
**Objetivo:** Implementar el módulo core del ERP escolar. Ciclo completo de matrícula con cumplimiento normativo SIGE/Mineduc: schema, migración, seed, 12 endpoints nuevos, 4 páginas React, wizard de matrícula.

---

## Resumen Ejecutivo

| Componente | Estado |
|---|---|
| Schema Prisma — 3 modelos nuevos + extensiones | ✅ |
| Migración DB — ambos tenants | ✅ |
| Seed — 30 alumnos San Andrés con matrículas 2026 | ✅ |
| Backend — 12 endpoints nuevos | ✅ |
| Permisos RBAC — matricula:read/write | ✅ |
| Frontend — 4 páginas + navegación | ✅ |
| Build API (`nest build`) | ✅ compilado sin errores |
| Build Web (`tsc --noEmit`) | ✅ sin errores |
| Tests curl — todos los endpoints | ✅ |

---

## Parte A — Backend

### 1. Cambios en Schema Prisma

**Archivo modificado:** `apps/api/prisma/schema.prisma`

#### Modelo `Alumno` — campos nuevos (no breaking)

```prisma
puebloOriginario     String?
seguroEscolar        Boolean  @default(true)
activo               Boolean  @default(true)

// Nuevas relaciones
matriculas          Matricula[]
contactosEmergencia ContactoEmergencia[]
documentos          DocumentoAlumno[]
```

#### Modelo `Apoderado` — campos nuevos (no breaking)

```prisma
apellidoPaterno String?
apellidoMaterno String?
telefonoAlt     String?
comuna          String?
parentesco      String?
```

#### Modelo `ApoderadoAlumno` — campos nuevos (no breaking)

```prisma
tipo           String?  // TITULAR, SUPLENTE, ECONOMICO
esRetiraAlumno Boolean  @default(false)
```

#### Nuevo modelo `Matricula` (`@@map("matricula_v2")`)

Tabla separada del modelo `Alumno` (que mantiene datos embebidos para compatibilidad). Permite historial multi-año.

```prisma
model Matricula {
  id              String    @id @default(uuid())
  alumnoId        String
  anio            Int
  curso           String              // "1A", "2B"
  nivel           String              // "1° Básico"
  cursoId         String?
  estado          String    @default("VIGENTE")
  numeroMatricula Int?
  fechaMatricula  DateTime  @default(now())
  fechaRetiro     DateTime?
  motivoRetiro    String?
  procedencia     String?
  becaPorcentaje  Float     @default(0)
  prioritario     Boolean   @default(false)
  preferente      Boolean   @default(false)
  pie             Boolean   @default(false)
  pieDiagnostico  String?
  repitente       Boolean   @default(false)
  ...
  @@unique([alumnoId, anio])
}
```

Constraint clave: **un alumno solo puede tener una matrícula por año** (validado en DB y en servicio).

#### Nuevo modelo `ContactoEmergencia`

```prisma
model ContactoEmergencia {
  id         String  @id @default(uuid())
  alumnoId   String
  nombre     String
  telefono   String
  parentesco String
  prioridad  Int     @default(1)
  @@map("contacto_emergencia")
}
```

#### Nuevo modelo `DocumentoAlumno`

```prisma
model DocumentoAlumno {
  id         String   @id @default(uuid())
  alumnoId   String
  tipo       String   // CERTIFICADO_NACIMIENTO, INFORME_NOTAS, CERTIFICADO_PIE, OTRO
  nombre     String
  archivoUrl String
  createdAt  DateTime @default(now())
  @@map("documento_alumno")
}
```

#### Modelo `Curso` — relación nueva

```prisma
matriculas Matricula[]
```

---

### 2. Migración de Base de Datos

**Archivo creado:** `apps/api/prisma/migrations/20260417051026_add_matriculas_v2_contactos_documentos/migration.sql`

Operaciones:
- `ALTER TABLE "Alumno"` — 3 nuevas columnas
- `ALTER TABLE "Apoderado"` — 5 nuevas columnas
- `ALTER TABLE "ApoderadoAlumno"` — 2 nuevas columnas
- `CREATE TABLE "matricula_v2"` con índice único `(alumnoId, anio)`
- `CREATE TABLE "contacto_emergencia"`
- `CREATE TABLE "documento_alumno"`
- 3 foreign keys nuevas

Aplicada a ambos tenants:
- `tenant_colegio_san_andres` ✅
- `tenant_colegio_saucache` ✅

---

### 3. Seed de Matrículas

**Archivo creado:** `apps/api/prisma/seed-matriculas.ts`

Ejecutado en `tenant_colegio_san_andres`.

**Cursos creados/upsert (4 nuevos):**

| Curso | Nivel | Alumnos |
|---|---|---|
| 1° Básico A | 1° Básico | 7 |
| 1° Básico B | 1° Básico | 8 |
| 2° Básico A | 2° Básico | 8 |
| 2° Básico B | 2° Básico | 7 |

**Datos generados:**
- **30 alumnos** con RUTs ficticios válidos (serie 19000001–19000030, DV calculado con módulo 11)
- Datos realistas: nombres del pool chileno, fechas nacimiento 2017–2019, grupo sanguíneo, previsión de salud, comunas de RM
- Mix de subvención: 4 PIE, 8 prioritarios, 6 preferentes, 2 repitentes
- 8% con pueblo originario asignado (Mapuche, Aymara, Atacameño, etc.)
- **20 apoderados** (RUTs 18000001–18000020) con teléfono, email, ocupación, parentesco
- Cada alumno vinculado a apoderado titular; cada 3er alumno tiene también apoderado suplente
- **30 registros `Matricula`** en año 2026, estado VIGENTE
- **5 `ContactoEmergencia`** para los primeros 5 alumnos

---

### 4. Módulos y Archivos Backend

#### Archivos nuevos

| Archivo | Descripción |
|---|---|
| `src/modules/matricula/dto/matriculas.dto.ts` | DTOs: `CrearMatriculaDto`, `ActualizarMatriculaDto`, `MatriculaQueryDto` |
| `src/modules/matricula/matriculas-v2.service.ts` | Service CRUD + resumen + SIGE + historial |
| `src/modules/matricula/matriculas-v2.controller.ts` | Controller en ruta `/matriculas` |
| `src/modules/alumnos/dto/apoderados.dto.ts` | DTOs: `CreateApoderadoV2Dto`, `UpdateApoderadoDto`, `CreateContactoEmergenciaDto` |
| `src/modules/alumnos/apoderados.service.ts` | Service: lista, detalle, crear, actualizar, contactos |
| `src/modules/alumnos/apoderados.controller.ts` | Controllers: `ApoderadosController` + `ContactosEmergenciaController` |

#### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/modules/matricula/matricula.module.ts` | + `MatriculasV2Controller`, `MatriculasV2Service` |
| `src/modules/alumnos/alumnos.module.ts` | + `ApoderadosController`, `ContactosEmergenciaController`, `ApoderadosService` |
| `src/modules/alumnos/alumnos.controller.ts` | + `GET /:id/historial` |
| `src/modules/alumnos/alumnos.service.ts` | + método `getHistorial()`, filtro `nivel` en `findAll()` |
| `src/modules/alumnos/dto/alumnos.dto.ts` | + campo `nivel?` en `AlumnoQueryDto` |
| `packages/shared/src/rbac.ts` | + `matricula:read`, `matricula:write` para DIRECTOR y SECRETARIA |

---

### 5. Endpoints Nuevos

#### Matrículas (`/api/v1/matriculas`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/matriculas` | `matricula:read` | Lista paginada. Filtros: `anio`, `estado`, `curso`, `nivel`, `q` (búsqueda por nombre/RUN) |
| `GET` | `/matriculas/resumen` | `matricula:read` | Totales globales + desglose por curso (hombres, mujeres, PIE, prioritarios, retirados) |
| `GET` | `/matriculas/reporte-sige` | `alumnos:export:sige` | 21 columnas formateadas para upload a SIGE Mineduc |
| `POST` | `/matriculas` | `alumnos:write` | Crear matrícula. Valida: alumno existe, no duplicado año, auto-numera |
| `PATCH` | `/matriculas/:id` | `alumnos:write` | Actualizar. Al retirar: exige `motivoRetiro` + `fechaRetiro` |

#### Apoderados (`/api/v1/apoderados`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/apoderados` | `alumnos:read` | Lista paginada con alumnos asociados |
| `GET` | `/apoderados/:id` | `alumnos:read` | Detalle con alumnos, cursos y matrículas 2026 |
| `POST` | `/apoderados` | `alumnos:write` | Crear apoderado. Valida RUT módulo 11 |
| `PATCH` | `/apoderados/:id` | `alumnos:write` | Actualizar. Sincroniza campo `apellidos` legacy |

#### Alumnos — extensiones

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/alumnos/:id/historial` | `alumnos:read` | Timeline de matrículas del alumno por año (modelo `matricula_v2`) |
| `POST` | `/alumnos/:id/contactos` | `alumnos:write` | Agregar contacto de emergencia |
| `DELETE` | `/alumnos/:id/contactos/:cid` | `alumnos:write` | Eliminar contacto de emergencia |

---

### 6. Validaciones implementadas

| Regla | Dónde | Descripción |
|---|---|---|
| RUT módulo 11 | `AlumnosService.validarRUN()`, `ApoderadosService.create()` | Dígito verificador chileno, acepta `K` |
| Alumno existe | `MatriculasV2Service.create()` | 404 si alumno no encontrado o soft-deleted |
| No duplicar matrícula | `MatriculasV2Service.create()` | 409 si ya existe matrícula para mismo alumno+año |
| Retiro requiere motivo y fecha | `MatriculasV2Service.update()` | 400 si estado=RETIRADO/TRASLADADO sin motivo o fecha |
| Auditoria | Todas las mutaciones | `eventoAuditoria` creado en misma transacción |

---

## Parte B — Frontend

### 7. Páginas nuevas

#### `apps/web/src/pages/matricula/ListaAlumnos.tsx`

Ruta: `/matricula/alumnos`

- Tabla paginada con 25 registros por página
- **Filtros**: texto libre (RUN/nombre/apellido), selector de curso, selector de estado
- **KPI cards**: total, vigentes, PIE (página actual), página actual/total
- Foto miniatura o avatar con inicial
- **Badges**: PIE (violeta), Prioritario (azul), Preferente (ámbar)
- Badge de estado por color: verde (Vigente), rojo (Retirado), ámbar (Trasladado)
- Botón "Ver ficha" → navega a `/matricula/alumnos/:id`
- Botón "Nueva Matrícula" → navega a `/matricula/nuevo`
- Estado vacío con CTA de nueva matrícula

#### `apps/web/src/pages/matricula/FichaAlumno.tsx`

Ruta: `/matricula/alumnos/:id`

6 tabs con funcionalidad completa:

| Tab | Contenido |
|---|---|
| Datos Personales | Formulario editable (nombres, apellidos, dirección, comuna, teléfono, email, nacionalidad, pueblo originario). Botón Editar/Guardar inline |
| Apoderados | Cards por apoderado con badges TITULAR/SUPLENTE, RUN, teléfono, parentesco, flag "Retira al alumno" |
| Matrícula | Datos de matrícula 2026: número, curso, nivel, estado, fecha, beca, repitente, badges PIE/SEP |
| Salud | Formulario editable: grupo sanguíneo, previsión, alergias, enfermedades crónicas, medicamentos, seguro escolar |
| Documentos | Lista de documentos adjuntos (preparado para upload futuro) |
| Historial | Timeline visual con año en círculo, nivel, curso, estado y fechas de matrícula/retiro |

Breadcrumb con botón "Volver", header con nombre completo, badges de estado y subvención.

#### `apps/web/src/pages/matricula/NuevaMatricula.tsx`

Ruta: `/matricula/nuevo`

Wizard de 4 pasos con stepper visual:

| Paso | Contenido |
|---|---|
| 1 — Datos del Alumno | Input RUN con validación módulo 11 en tiempo real. Botón "Buscar" precarga datos si el RUN ya existe en DB. Formulario completo (nombres, apellidos, fecha nacimiento, género, dirección) |
| 2 — Apoderado Titular | Mismo patrón: búsqueda por RUN, precarga si existe. Formulario: nombres, apellidos, teléfono, email, ocupación, parentesco |
| 3 — Datos de Matrícula | Selector de curso (carga desde API), nivel, procedencia, beca%, checkboxes PIE/prioritario/preferente/repitente, diagnóstico PIE condicional |
| 4 — Confirmación | Resumen de los 3 pasos + botón "Confirmar Matrícula". En éxito: pantalla de confirmación con acceso a ficha del alumno o nueva matrícula |

Lógica de envío:
1. Crea o reutiliza alumno (upsert por RUN)
2. Crea o reutiliza apoderado + vincula con `POST /alumnos/:id/apoderados`
3. Crea matrícula con `POST /matriculas`

#### `apps/web/src/pages/matricula/ResumenMatriculas.tsx`

Ruta: `/matricula/resumen`

- **6 KPI cards**: Total, Vigentes, Retirados, PIE, Prioritarios SEP, Preferentes SEP (con porcentaje del total vigente)
- **Gráfico de barras horizontal** por nivel (calculado desde `porCurso`, agrupado)
- **Tabla por curso**: columnas Curso, Nivel, Total, Hombres, Mujeres, Prioritarios, Preferentes, PIE, Retirados — con badges de color y fila de totales
- **Botón "Exportar SIGE"**: llama a `GET /matriculas/reporte-sige`, genera CSV con BOM UTF-8, descarga automática `matriculas-sige-2026.csv`

---

### 8. Navegación actualizada

**Archivo modificado:** `apps/web/src/components/Sidebar.tsx`

Íconos importados: `UserPlus`, `List`, `PieChart` (de lucide-react)

Sub-items agregados al grupo de Matrícula:

```typescript
{ label: 'MA: Alumnos',  icon: <List size={16} />,     path: '/matricula/alumnos' },
{ label: 'MA: Nueva',    icon: <UserPlus size={16} />,  path: '/matricula/nuevo'   },
{ label: 'MA: Resumen',  icon: <PieChart size={16} />,  path: '/matricula/resumen' },
```

**Archivo modificado:** `apps/web/src/App.tsx`

```typescript
import ListaAlumnos     from './pages/matricula/ListaAlumnos';
import FichaAlumno      from './pages/matricula/FichaAlumno';
import NuevaMatricula   from './pages/matricula/NuevaMatricula';
import ResumenMatriculas from './pages/matricula/ResumenMatriculas';

// Rutas agregadas:
<Route path="matricula/alumnos"      element={<ListaAlumnos />} />
<Route path="matricula/alumnos/:id"  element={<FichaAlumno />} />
<Route path="matricula/nuevo"        element={<NuevaMatricula />} />
<Route path="matricula/resumen"      element={<ResumenMatriculas />} />
```

---

## Resumen de Archivos

| Archivo | Operación |
|---|---|
| `apps/api/prisma/schema.prisma` | MODIFICADO — 3 modelos nuevos, extensiones en Alumno/Apoderado/ApoderadoAlumno/Curso |
| `apps/api/prisma/migrations/20260417051026_.../migration.sql` | CREADO — migración SQL |
| `apps/api/prisma/seed-matriculas.ts` | CREADO — seed 30 alumnos, 20 apoderados, 30 matrículas |
| `apps/api/src/modules/matricula/dto/matriculas.dto.ts` | CREADO |
| `apps/api/src/modules/matricula/matriculas-v2.service.ts` | CREADO |
| `apps/api/src/modules/matricula/matriculas-v2.controller.ts` | CREADO |
| `apps/api/src/modules/matricula/matricula.module.ts` | MODIFICADO |
| `apps/api/src/modules/alumnos/dto/apoderados.dto.ts` | CREADO |
| `apps/api/src/modules/alumnos/apoderados.service.ts` | CREADO |
| `apps/api/src/modules/alumnos/apoderados.controller.ts` | CREADO |
| `apps/api/src/modules/alumnos/alumnos.module.ts` | MODIFICADO |
| `apps/api/src/modules/alumnos/alumnos.controller.ts` | MODIFICADO — endpoint historial |
| `apps/api/src/modules/alumnos/alumnos.service.ts` | MODIFICADO — getHistorial(), filtro nivel |
| `apps/api/src/modules/alumnos/dto/alumnos.dto.ts` | MODIFICADO — campo nivel en query |
| `packages/shared/src/rbac.ts` | MODIFICADO — matricula:read/write para DIRECTOR y SECRETARIA |
| `apps/web/src/pages/matricula/ListaAlumnos.tsx` | CREADO |
| `apps/web/src/pages/matricula/FichaAlumno.tsx` | CREADO |
| `apps/web/src/pages/matricula/NuevaMatricula.tsx` | CREADO |
| `apps/web/src/pages/matricula/ResumenMatriculas.tsx` | CREADO |
| `apps/web/src/App.tsx` | MODIFICADO — 4 rutas nuevas + imports |
| `apps/web/src/components/Sidebar.tsx` | MODIFICADO — 3 ítems de navegación |

---

## Resultado de Tests

### Build

```
nest build (API)         → webpack 5.97.1 compiled successfully
tsc --noEmit (API)       → sin errores
tsc --noEmit (web)       → sin errores
shared package build     → tsc sin errores
```

### Endpoints curl (tenant: colegio_san_andres, usuario: director@sanandres.cl)

**GET /alumnos**
```json
{ "meta": { "total": 231 } }
```

**GET /matriculas?anio=2026**
```json
{ "meta": { "total": 30 } }
```
Sample: `[('Javier', '1A'), ('Sebastián', '1A'), ('Felipe', '1A')]`

**GET /matriculas/resumen?anio=2026**
```json
{
  "totales": { "vigentes": 30, "pie": 4, "prioritarios": 8, "preferentes": 6 },
  "porCurso": [ ... 4 cursos ... ]
}
```

**GET /matriculas/reporte-sige?anio=2026**
```json
{ "totalAlumnos": 30, "filas": [ { "RUN": "...", "Nombres": "...", ... } ] }
```
21 columnas: RUN, Nombres, Apellido Paterno, Apellido Materno, Fecha Nacimiento, Género, Nacionalidad, Pueblo Originario, Curso, Nivel, N° Matrícula, Estado, Prioritario, Preferente, PIE, Diagnóstico PIE, Procedencia, Apoderado RUN, Apoderado Nombre, Apoderado Teléfono, Apoderado Email

**GET /apoderados**
```json
{ "meta": { "total": 21 } }
```

**POST /apoderados**
```json
{ "data": { "id": "9867b773-a17b-4f9a-8bda-dc8c7dd67a57", "nombres": "Carmen", ... } }
```

**GET /alumnos/:id/historial** (alumno con matrícula 2026)
```json
{ "data": [ { "anio": 2026, "curso": "1A", "estado": "VIGENTE" } ] }
```

---

## Errores Encontrados y Soluciones

### Error 1 — DIRECTOR sin permiso `matricula:read`

**Problema:** `GET /matriculas` devolvía 403 Forbidden para el rol DIRECTOR.  
**Causa:** El rol DIRECTOR no tenía `matricula:read` ni `matricula:write` en `packages/shared/src/rbac.ts`. El módulo de matrícula existente (`/matricula`) usaba esos permisos.  
**Solución:** Agregar `matricula:read` y `matricula:write` a DIRECTOR y SECRETARIA. Reconstruir el paquete `shared` y el API.

### Error 2 — Historial vacío para alumnos del seed original

**Problema:** `GET /alumnos/:id/historial` devolvía `[]` para alumnos antiguos.  
**Causa:** El seed original crea alumnos con `estadoMatricula` embebido en `Alumno`, no en la nueva tabla `matricula_v2`. El historial solo lee esta tabla nueva.  
**Solución comportamiento esperado:** Es correcto. Los 30 alumnos nuevos del seed de Paso 8 tienen historial. Para migrar los 200+ alumnos existentes se necesitaría un script de migración de datos separado (fuera del alcance de este paso).

### Error 3 — RUT de prueba inválido en test curl

**Problema:** Test con `15123456-7` devolvía `RUN inválido`.  
**Causa:** El DV calculado para 15123456 es `9`, no `7`.  
**Solución:** Calcular DV con módulo 11 antes del test. Usado `15123456-9`.

---

## Compatibilidad con módulos existentes

El diseño fue **no-breaking**:
- Los campos nuevos en `Alumno`/`Apoderado`/`ApoderadoAlumno` son todos opcionales (`?`) o con default
- El modelo `Matricula` usa `@@map("matricula_v2")` para no colisionar con código que usa `prisma.matricula` si existiera
- El servicio y controlador existentes (`matricula.service.ts`, `matricula.controller.ts`) siguen funcionando en `/api/v1/matricula` sin cambios
- Los nuevos endpoints viven en `/api/v1/matriculas` (plural)
- Asistencia, notas, anotaciones y todos los módulos que usan `alumnoId` siguen funcionando sin cambios
