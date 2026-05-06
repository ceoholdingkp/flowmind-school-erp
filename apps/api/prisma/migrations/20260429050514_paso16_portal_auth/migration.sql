-- AlterTable
ALTER TABLE "Apoderado" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "ultimoAcceso" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mensaje_individual" ADD COLUMN     "fechaRespuesta" TIMESTAMP(3),
ADD COLUMN     "respuesta" TEXT;
