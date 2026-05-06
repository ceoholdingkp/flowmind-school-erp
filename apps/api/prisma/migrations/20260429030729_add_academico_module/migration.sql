-- AlterTable
ALTER TABLE "Asignatura" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'ASIGNATURA';

-- CreateTable
CREATE TABLE "evaluacion" (
    "id" TEXT NOT NULL,
    "asignaturaId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ponderacion" DOUBLE PRECISION NOT NULL,
    "fechaAplicacion" TIMESTAMP(3),
    "semestre" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_eval" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "observacion" TEXT,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nota_eval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluacion_cursoId_asignaturaId_semestre_anio_idx" ON "evaluacion"("cursoId", "asignaturaId", "semestre", "anio");

-- CreateIndex
CREATE INDEX "nota_eval_alumnoId_idx" ON "nota_eval"("alumnoId");

-- CreateIndex
CREATE UNIQUE INDEX "nota_eval_evaluacionId_alumnoId_key" ON "nota_eval"("evaluacionId", "alumnoId");

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_asignaturaId_fkey" FOREIGN KEY ("asignaturaId") REFERENCES "Asignatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_eval" ADD CONSTRAINT "nota_eval_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "evaluacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_eval" ADD CONSTRAINT "nota_eval_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
