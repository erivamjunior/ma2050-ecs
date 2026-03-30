-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('banco', 'contratado');

-- AlterTable
ALTER TABLE "ContractAddendum" ALTER COLUMN "valueCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "FundingSource" ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "amountCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Measurement" ALTER COLUMN "amountCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "amountCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "phase" "ProjectPhase" NOT NULL DEFAULT 'banco',
ALTER COLUMN "amountCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "ProjectContract" ALTER COLUMN "contractValueCents" SET DATA TYPE BIGINT,
ALTER COLUMN "serviceOrderValueCents" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "ProjectFundingSource" ALTER COLUMN "amountCents" SET DATA TYPE BIGINT;

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "corporateName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "mainCnaeCode" TEXT NOT NULL,
    "mainEconomicActivityDescription" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "establishmentType" TEXT NOT NULL,
    "legalNatureCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBidding" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "biddingNumber" TEXT NOT NULL,
    "administrativeProcessNumber" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "objectDescription" TEXT,
    "bidValueCents" BIGINT,
    "winnerName" TEXT NOT NULL,
    "winnerCnpj" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "homologatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectBidding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBidding_projectId_key" ON "ProjectBidding"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectBidding" ADD CONSTRAINT "ProjectBidding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
