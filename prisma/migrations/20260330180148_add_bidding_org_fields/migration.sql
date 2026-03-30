/*
  Warnings:

  - Added the required column `secretariaId` to the `ProjectBidding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `setorId` to the `ProjectBidding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectBidding" ADD COLUMN     "homologatedValueCents" BIGINT,
ADD COLUMN     "secretariaId" UUID NOT NULL,
ADD COLUMN     "setorId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "ProjectBidding" ADD CONSTRAINT "ProjectBidding_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBidding" ADD CONSTRAINT "ProjectBidding_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
