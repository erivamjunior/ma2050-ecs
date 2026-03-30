import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const VALID_STATE_CODES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
]);

const VALID_COMPANY_SIZES = new Set([
  "MEI",
  "Microempresa",
  "Empresa de Pequeno Porte",
  "Medio Porte",
  "Grande Porte",
  "Demais",
]);

const VALID_ESTABLISHMENT_TYPES = new Set(["Matriz", "Filial"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCnpj(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function toDateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : null;
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : null;
}

async function buildCompanyLinkageMap() {
  const [biddings, contracts] = await Promise.all([
    prisma.projectBidding.findMany({ select: { companyId: true, winnerCnpj: true } }),
    prisma.projectContract.findMany({ select: { companyId: true, contractorCnpj: true } }),
  ]);

  const linkedCounts = new Map();

  for (const bidding of biddings) {
    const key = normalizeText(bidding.companyId) || normalizeCnpj(bidding.winnerCnpj);
    if (!key) continue;
    linkedCounts.set(key, (linkedCounts.get(key) || 0) + 1);
  }

  for (const contract of contracts) {
    const key = normalizeText(contract.companyId) || normalizeCnpj(contract.contractorCnpj);
    if (!key) continue;
    linkedCounts.set(key, (linkedCounts.get(key) || 0) + 1);
  }

  return linkedCounts;
}

function mapCompany(company, linkedCount = 0) {
  return {
    id: company.id,
    corporateName: company.corporateName,
    tradeName: company.tradeName,
    cnpj: company.cnpj,
    email: company.email,
    phone: company.phone,
    address: company.address,
    stateCode: company.stateCode,
    mainCnaeCode: company.mainCnaeCode,
    mainEconomicActivityDescription: company.mainEconomicActivityDescription,
    companySize: company.companySize,
    openedAt: toDateOnly(company.openedAt),
    establishmentType: company.establishmentType,
    legalNatureCode: company.legalNatureCode,
    createdAt: toIso(company.createdAt),
    updatedAt: toIso(company.updatedAt),
    linkedCount,
    canDelete: linkedCount === 0,
  };
}

function normalizeCompanyInput(input) {
  return {
    corporateName: normalizeText(input.corporateName),
    tradeName: normalizeText(input.tradeName),
    cnpj: normalizeCnpj(input.cnpj),
    email: normalizeText(input.email).toLowerCase(),
    phone: normalizePhone(input.phone),
    address: normalizeText(input.address),
    stateCode: normalizeText(input.stateCode).toUpperCase(),
    mainCnaeCode: normalizeText(input.mainCnaeCode),
    mainEconomicActivityDescription: normalizeText(input.mainEconomicActivityDescription),
    companySize: normalizeText(input.companySize),
    openedAt: normalizeText(input.openedAt),
    establishmentType: normalizeText(input.establishmentType),
    legalNatureCode: normalizeText(input.legalNatureCode),
  };
}

function validateCompanyData(data) {
  const missing = Object.entries(data).find(([, value]) => !value);
  if (missing) {
    throw new Error("Todos os campos da empresa sao obrigatorios.");
  }

  if (data.cnpj.length !== 14) {
    throw new Error("CNPJ deve ter 14 digitos.");
  }

  if (!VALID_STATE_CODES.has(data.stateCode)) {
    throw new Error("UF invalida.");
  }

  if (!VALID_COMPANY_SIZES.has(data.companySize)) {
    throw new Error("Porte invalido.");
  }

  if (!VALID_ESTABLISHMENT_TYPES.has(data.establishmentType)) {
    throw new Error("Tipo de estabelecimento invalido.");
  }

  const openedAt = new Date(data.openedAt);
  if (Number.isNaN(openedAt.getTime())) {
    throw new Error("Data de abertura invalida.");
  }

  return { ...data, openedAt };
}

export async function listCompanies() {
  const [companies, linkedCounts] = await Promise.all([
    prisma.company.findMany({ orderBy: { corporateName: "asc" } }),
    buildCompanyLinkageMap(),
  ]);

  return companies.map((company) => mapCompany(company, linkedCounts.get(company.id) || linkedCounts.get(company.cnpj) || 0));
}

export async function getCompanyByCnpj(cnpj) {
  const normalizedCnpj = normalizeCnpj(cnpj);
  if (!normalizedCnpj) {
    return null;
  }

  const company = await prisma.company.findUnique({
    where: { cnpj: normalizedCnpj },
  });

  if (!company) {
    return null;
  }

  const linkedCounts = await buildCompanyLinkageMap();
  return mapCompany(company, linkedCounts.get(company.id) || linkedCounts.get(company.cnpj) || 0);
}
export async function getCompanyById(id) {
  const companyId = normalizeText(id);
  if (!companyId) {
    return null;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    return null;
  }

  const linkedCounts = await buildCompanyLinkageMap();
  return mapCompany(company, linkedCounts.get(company.id) || linkedCounts.get(company.cnpj) || 0);
}
export async function createCompany(input) {
  const data = validateCompanyData(normalizeCompanyInput(input));

  const existing = await prisma.company.findUnique({
    where: { cnpj: data.cnpj },
    select: { id: true },
  });

  if (existing) {
    throw new Error("Ja existe empresa com esse CNPJ.");
  }

  const company = await prisma.company.create({
    data: {
      id: randomUUID(),
      ...data,
    },
  });

  return mapCompany(company, 0);
}

export async function updateCompany(id, input) {
  const companyId = normalizeText(id);
  if (!companyId) {
    throw new Error("Empresa informada nao encontrada.");
  }

  const data = validateCompanyData(normalizeCompanyInput(input));

  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Empresa informada nao encontrada.");
  }

  const duplicated = await prisma.company.findFirst({
    where: {
      cnpj: data.cnpj,
      NOT: { id: companyId },
    },
    select: { id: true },
  });

  if (duplicated) {
    throw new Error("Ja existe outra empresa com esse CNPJ.");
  }

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  const linkedCounts = await buildCompanyLinkageMap();
  return mapCompany(company, linkedCounts.get(company.id) || linkedCounts.get(company.cnpj) || 0);
}

export async function deleteCompany(id) {
  const companyId = normalizeText(id);
  if (!companyId) {
    throw new Error("Empresa informada nao encontrada.");
  }

  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, cnpj: true },
  });

  if (!existing) {
    throw new Error("Empresa informada nao encontrada.");
  }

  const linkedCounts = await buildCompanyLinkageMap();
  if ((linkedCounts.get(existing.id) || linkedCounts.get(existing.cnpj) || 0) > 0) {
    throw new Error("Empresa vinculada a licitacao ou contrato nao pode ser excluida.");
  }

  await prisma.company.delete({ where: { id: companyId } });
}

export const COMPANY_STATE_CODES = Array.from(VALID_STATE_CODES);
export const COMPANY_SIZE_OPTIONS = Array.from(VALID_COMPANY_SIZES);
export const COMPANY_ESTABLISHMENT_OPTIONS = Array.from(VALID_ESTABLISHMENT_TYPES);
