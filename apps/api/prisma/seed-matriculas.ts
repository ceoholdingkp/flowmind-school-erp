/**
 * Seed Paso 8 — Matrículas San Andrés
 * 30 alumnos nuevos en 4 cursos (1A, 1B, 2A, 2B)
 * 20 apoderados, contactos de emergencia, matriculas_v2
 */
import { PrismaClient } from '@prisma/client';

const DB_URL =
  process.env.TENANT_DATABASE_URL?.replace('{tenantId}', 'colegio_san_andres') ||
  'postgresql://flowmind:flowmind_dev_2026@127.0.0.1:5434/tenant_colegio_san_andres?schema=public';

const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

// ── RUT helpers ────────────────────────────────────────────────
function dv(n: number): string {
  let sum = 0, mul = 2;
  for (const d of String(n).split('').reverse()) {
    sum += parseInt(d) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
function rut(n: number) { return `${n}-${dv(n)}`; }

// ── Name pools ─────────────────────────────────────────────────
const NM = ['Mateo','Sebastián','Nicolás','Felipe','Ignacio','Tomás','Cristóbal','Joaquín','Martín','Emilio',
            'Andrés','Gabriel','Eduardo','Víctor','Pedro','Javier','Rodrigo','Camilo','Vicente','Manuel'];
const NF = ['Sofía','Valentina','Camila','Isabella','Fernanda','Catalina','Daniela','Javiera','Paula',
            'Constanza','Antonia','Florencia','Isidora','Gabriela','Valeria','Carolina','Claudia','Andrea','Lorena','Ximena'];
const AP = ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda',
            'Morales','Torres','Flores','Miranda','Castro','Vargas','Fuentes','Herrera','Medina','Aguilera',
            'Núñez','Fernández','López','Ramírez','Vega','Castillo','Ramos','Reyes','Gutiérrez','Espinoza'];
const COMUNAS = ['Santiago','La Florida','Maipú','Puente Alto','La Pintana','San Bernardo','Providencia','Ñuñoa',
                 'Recoleta','Independencia'];
const PUEBLOS = ['Mapuche','Aymara','Atacameño','Quechua','Colla','Kawashkar','Yagán','Rapa Nui'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Diagnosis pool for PIE ──────────────────────────────────────
const PIE_DIAG = ['TEL','DEA','DI','TEA','TDAH','Dificultad específica de aprendizaje','Trastorno motor'];

async function main() {
  console.log('🌱 Seed Paso 8 — Matrículas San Andrés\n');

  // Fetch establecimiento
  const estab = await prisma.establecimiento.findFirst();
  if (!estab) throw new Error('No hay establecimiento — ejecuta seed.ts primero');

  // Fetch or create 4 cursos (1A, 1B, 2A, 2B) for 2026
  const cursosConfig = [
    { nombre: '1° Básico A', nivel: '1° Básico', letra: 'A', abrev: '1A' },
    { nombre: '1° Básico B', nivel: '1° Básico', letra: 'B', abrev: '1B' },
    { nombre: '2° Básico A', nivel: '2° Básico', letra: 'A', abrev: '2A' },
    { nombre: '2° Básico B', nivel: '2° Básico', letra: 'B', abrev: '2B' },
  ];

  const cursos: any[] = [];
  for (const cfg of cursosConfig) {
    const c = await prisma.curso.upsert({
      where: { nombre_anio_establecimientoId: { nombre: cfg.nombre, anio: 2026, establecimientoId: estab.id } },
      update: {},
      create: {
        nombre: cfg.nombre,
        nivel: cfg.nivel,
        letra: cfg.letra,
        tipoEnsenanza: 'Educación Básica',
        capacidad: 35,
        anio: 2026,
        establecimientoId: estab.id,
      },
    });
    cursos.push({ ...c, abrev: cfg.abrev, nivel: cfg.nivel });
  }
  console.log(`✅ Cursos: ${cursos.map((c) => c.nombre).join(', ')}`);

  // Get current max matricula number
  const lastAlumno = await prisma.alumno.findFirst({ orderBy: { numeroMatricula: 'desc' } });
  let numMatricula = (lastAlumno?.numeroMatricula ?? 0) + 1;

  // Generate 20 apoderados (RUTs 18000001–18000020)
  const apoderados: any[] = [];
  for (let i = 0; i < 20; i++) {
    const rutNum = 18000001 + i;
    const isM = i % 3 !== 0;
    const nombres = isM ? pick(NM) : pick(NF);
    const ap = await prisma.apoderado.upsert({
      where: { run: rut(rutNum) },
      update: {},
      create: {
        run: rut(rutNum),
        nombres,
        apellidos: `${pick(AP)} ${pick(AP)}`,
        apellidoPaterno: pick(AP),
        apellidoMaterno: pick(AP),
        telefono: `+569${Math.floor(10000000 + Math.random() * 89999999)}`,
        telefonoAlt: Math.random() > 0.5 ? `+562${Math.floor(20000000 + Math.random() * 9999999)}` : null,
        email: `apoderado${rutNum}@mail.cl`,
        direccion: `Calle Los Alamos ${Math.floor(100 + Math.random() * 2000)}`,
        comuna: pick(COMUNAS),
        ocupacion: pick(['Docente','Comerciante','Ingeniero','Médico','Administrativo','Técnico','Independiente','Operario']),
        parentesco: pick(['Madre','Padre','Abuelo/a','Tío/a','Tutor legal']),
      },
    });
    apoderados.push(ap);
  }
  console.log(`✅ Apoderados: ${apoderados.length}`);

  // Generate 30 alumnos: ~8 per curso (7+8+8+7)
  const distribution = [7, 8, 8, 7];
  const alumnos: any[] = [];
  let alumnoIdx = 0;

  for (let ci = 0; ci < cursos.length; ci++) {
    const curso = cursos[ci];
    const count = distribution[ci];

    for (let ai = 0; ai < count; ai++) {
      const rutNum = 19000001 + alumnoIdx;
      const isM = (alumnoIdx + ai) % 2 === 0;
      const nombre = isM ? pick(NM) : pick(NF);
      const apPat = pick(AP);
      const apMat = pick(AP);

      const isPIE = alumnoIdx < 4;
      const isPrioritario = alumnoIdx >= 4 && alumnoIdx < 12;
      const isPreferente = alumnoIdx >= 12 && alumnoIdx < 18;
      const isRepitente = alumnoIdx === 2 || alumnoIdx === 9;

      // Birth year: ~7-8 years old for 1B, ~8-9 for 2B
      const birthYear = 2026 - (ci < 2 ? 7 : 8) - Math.floor(Math.random() * 2);
      const birthMonth = Math.floor(1 + Math.random() * 11);
      const birthDay = Math.floor(1 + Math.random() * 27);

      const alumno = await prisma.alumno.upsert({
        where: { run: rut(rutNum) },
        update: {},
        create: {
          run: rut(rutNum),
          nombres: nombre,
          apellidoPaterno: apPat,
          apellidoMaterno: apMat,
          fechaNacimiento: new Date(`${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`),
          genero: isM ? 'MASCULINO' : 'FEMENINO',
          nacionalidad: 'Chilena',
          direccion: `Av. Principal ${Math.floor(100 + Math.random() * 3000)}`,
          comuna: pick(COMUNAS),
          cursoId: curso.id,
          fechaMatricula: new Date('2026-01-15'),
          estadoMatricula: 'ACTIVA',
          numeroMatricula: numMatricula++,
          esPIE: isPIE,
          esPrioritario: isPrioritario,
          esPreferente: isPreferente,
          puebloOriginario: Math.random() < 0.08 ? pick(PUEBLOS) : null,
          seguroEscolar: true,
          activo: true,
          grupoSanguineo: pick(['A+','A-','B+','B-','O+','O-','AB+','AB-']),
          previsionSalud: pick(['FONASA A','FONASA B','FONASA C','FONASA D','ISAPRE']),
          alergias: Math.random() < 0.15 ? pick(['Penicilina','Polen','Ácaros','Mariscos','Látex']) : null,
          enfermedadesCronicas: (isPIE && Math.random() < 0.5) ? pick(['Asma','Diabetes tipo 1','Epilepsia']) : null,
          medicamentos: (isPIE && Math.random() < 0.4) ? pick(['Ritalin 10mg','Salbutamol inhalador','Metilfenidato']) : null,
        },
      });

      // Vincular apoderado titular (round-robin)
      const apTitular = apoderados[alumnoIdx % apoderados.length];
      await prisma.apoderadoAlumno.upsert({
        where: { alumnoId_apoderadoId: { alumnoId: alumno.id, apoderadoId: apTitular.id } },
        update: {},
        create: {
          alumnoId: alumno.id,
          apoderadoId: apTitular.id,
          parentesco: 'Apoderado titular',
          esTitular: true,
          esEmergencia: false,
          tipo: 'TITULAR',
          esRetiraAlumno: true,
        },
      });

      // Vincular segundo apoderado suplente para algunos
      if (alumnoIdx % 3 === 0) {
        const apSuplente = apoderados[(alumnoIdx + 5) % apoderados.length];
        if (apSuplente.id !== apTitular.id) {
          await prisma.apoderadoAlumno.upsert({
            where: { alumnoId_apoderadoId: { alumnoId: alumno.id, apoderadoId: apSuplente.id } },
            update: {},
            create: {
              alumnoId: alumno.id,
              apoderadoId: apSuplente.id,
              parentesco: 'Apoderado suplente',
              esTitular: false,
              esEmergencia: true,
              tipo: 'SUPLENTE',
              esRetiraAlumno: false,
            },
          });
        }
      }

      // Crear registro Matricula_v2
      await prisma.matricula.upsert({
        where: { alumnoId_anio: { alumnoId: alumno.id, anio: 2026 } },
        update: {},
        create: {
          alumnoId: alumno.id,
          anio: 2026,
          curso: curso.abrev,
          nivel: curso.nivel,
          cursoId: curso.id,
          estado: 'VIGENTE',
          numeroMatricula: alumno.numeroMatricula,
          fechaMatricula: new Date('2026-01-15'),
          prioritario: isPrioritario,
          preferente: isPreferente,
          pie: isPIE,
          pieDiagnostico: isPIE ? pick(PIE_DIAG) : null,
          repitente: isRepitente,
          becaPorcentaje: Math.random() < 0.1 ? pick([25, 50, 75, 100]) : 0,
        },
      });

      // Agregar contactos de emergencia (primeros 5 alumnos)
      if (alumnoIdx < 5) {
        const existing = await prisma.contactoEmergencia.findFirst({ where: { alumnoId: alumno.id } });
        if (!existing) {
          await prisma.contactoEmergencia.create({
            data: {
              alumnoId: alumno.id,
              nombre: `${pick(NF)} ${pick(AP)}`,
              telefono: `+569${Math.floor(10000000 + Math.random() * 89999999)}`,
              parentesco: pick(['Abuela','Tía','Vecina','Hermano mayor','Padrino']),
              prioridad: 1,
            },
          });
        }
      }

      alumnos.push(alumno);
      alumnoIdx++;
    }

    console.log(`  📚 ${curso.nombre}: ${count} alumnos`);
  }

  console.log(`\n✅ Alumnos nuevos: ${alumnos.length}`);

  // Verify matriculas created
  const totalMatriculas = await prisma.matricula.count({ where: { anio: 2026 } });
  const totalContactos = await prisma.contactoEmergencia.count();
  console.log(`✅ Matrículas 2026: ${totalMatriculas}`);
  console.log(`✅ Contactos emergencia: ${totalContactos}`);

  // Summary per curso
  for (const c of cursos) {
    const count = await prisma.alumno.count({ where: { cursoId: c.id, deletedAt: null } });
    console.log(`   ${c.nombre}: ${count} alumnos`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
