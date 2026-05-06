-- AlterTable
ALTER TABLE "Alumno" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "puebloOriginario" TEXT,
ADD COLUMN     "seguroEscolar" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Apoderado" ADD COLUMN     "apellidoMaterno" TEXT,
ADD COLUMN     "apellidoPaterno" TEXT,
ADD COLUMN     "comuna" TEXT,
ADD COLUMN     "parentesco" TEXT,
ADD COLUMN     "telefonoAlt" TEXT;

-- AlterTable
ALTER TABLE "ApoderadoAlumno" ADD COLUMN     "esRetiraAlumno" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" TEXT;

-- CreateTable
CREATE TABLE "matricula_v2" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "curso" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "cursoId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'VIGENTE',
    "numeroMatricula" INTEGER,
    "fechaMatricula" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRetiro" TIMESTAMP(3),
    "motivoRetiro" TEXT,
    "procedencia" TEXT,
    "becaPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prioritario" BOOLEAN NOT NULL DEFAULT false,
    "preferente" BOOLEAN NOT NULL DEFAULT false,
    "pie" BOOLEAN NOT NULL DEFAULT false,
    "pieDiagnostico" TEXT,
    "repitente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matricula_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacto_emergencia" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contacto_emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_alumno" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_alumno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matricula_v2_alumnoId_anio_key" ON "matricula_v2"("alumnoId", "anio");

-- AddForeignKey
ALTER TABLE "matricula_v2" ADD CONSTRAINT "matricula_v2_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matricula_v2" ADD CONSTRAINT "matricula_v2_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto_emergencia" ADD CONSTRAINT "contacto_emergencia_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_alumno" ADD CONSTRAINT "documento_alumno_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
