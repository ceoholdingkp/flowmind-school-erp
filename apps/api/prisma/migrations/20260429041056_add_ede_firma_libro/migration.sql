-- CreateTable
CREATE TABLE "firma_libro_clases" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" TEXT NOT NULL,
    "otpValidado" BOOLEAN NOT NULL DEFAULT false,
    "ipSolicitante" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firma_libro_clases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "firma_libro_clases_cursoId_fecha_idx" ON "firma_libro_clases"("cursoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "firma_libro_clases_funcionarioId_cursoId_fecha_tipo_key" ON "firma_libro_clases"("funcionarioId", "cursoId", "fecha", "tipo");

-- AddForeignKey
ALTER TABLE "firma_libro_clases" ADD CONSTRAINT "firma_libro_clases_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firma_libro_clases" ADD CONSTRAINT "firma_libro_clases_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
