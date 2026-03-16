-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planejado', 'em_execucao', 'concluido', 'suspenso');

-- CreateEnum
CREATE TYPE "TermMode" AS ENUM ('relative', 'fixed');

-- CreateEnum
CREATE TYPE "TermUnit" AS ENUM ('dias', 'meses');

-- CreateEnum
CREATE TYPE "TermReference" AS ENUM ('assinatura_os', 'recebimento_os');

-- CreateEnum
CREATE TYPE "AddendumType" AS ENUM ('prazo', 'valor', 'valor_prazo');

-- CreateTable
CREATE TABLE "Secretaria" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Secretaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setor" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "secretariaId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "secretariaId" UUID NOT NULL,
    "setorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingSource" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stakeholderId" UUID,
    "amountCents" INTEGER NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFundingSource" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "fundingSourceId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectFundingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "processNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "measurementId" UUID NOT NULL,
    "fundingSourceId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContract" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "secretariaId" UUID NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractorName" TEXT NOT NULL,
    "contractorCnpj" TEXT NOT NULL,
    "contractValueCents" INTEGER NOT NULL,
    "contractSignedAt" TIMESTAMP(3) NOT NULL,
    "administrativeProcessNumber" TEXT NOT NULL,
    "serviceOrderNumber" TEXT NOT NULL,
    "serviceOrderValueCents" INTEGER NOT NULL,
    "serviceOrderSignedAt" TIMESTAMP(3) NOT NULL,
    "executionTermMode" "TermMode" NOT NULL,
    "executionTermQuantity" INTEGER,
    "executionTermUnit" "TermUnit",
    "executionTermReference" "TermReference",
    "executionTermEndDate" TIMESTAMP(3),
    "validityTermMode" "TermMode" NOT NULL,
    "validityTermQuantity" INTEGER,
    "validityTermUnit" "TermUnit",
    "validityTermReference" "TermReference",
    "validityTermEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAddendum" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "administrativeProcessNumber" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "type" "AddendumType" NOT NULL,
    "valueCents" INTEGER,
    "executionTermMode" "TermMode",
    "executionTermQuantity" INTEGER,
    "executionTermUnit" "TermUnit",
    "executionTermReference" "TermReference",
    "executionTermEndDate" TIMESTAMP(3),
    "validityTermMode" "TermMode",
    "validityTermQuantity" INTEGER,
    "validityTermUnit" "TermUnit",
    "validityTermReference" "TermReference",
    "validityTermEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ContractAddendum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Secretaria_name_key" ON "Secretaria"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Secretaria_sigla_key" ON "Secretaria"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Setor_secretariaId_name_key" ON "Setor"("secretariaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Setor_secretariaId_sigla_key" ON "Setor"("secretariaId", "sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Stakeholder_cpf_key" ON "Stakeholder"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "FundingSource_name_key" ON "FundingSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFundingSource_projectId_fundingSourceId_key" ON "ProjectFundingSource"("projectId", "fundingSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Measurement_projectId_number_key" ON "Measurement"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContract_projectId_key" ON "ProjectContract"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractAddendum_contractId_number_key" ON "ContractAddendum"("contractId", "number");

-- AddForeignKey
ALTER TABLE "Setor" ADD CONSTRAINT "Setor_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFundingSource" ADD CONSTRAINT "ProjectFundingSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFundingSource" ADD CONSTRAINT "ProjectFundingSource_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "Measurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fundingSourceId_fkey" FOREIGN KEY ("fundingSourceId") REFERENCES "FundingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContract" ADD CONSTRAINT "ProjectContract_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAddendum" ADD CONSTRAINT "ContractAddendum_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ProjectContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
