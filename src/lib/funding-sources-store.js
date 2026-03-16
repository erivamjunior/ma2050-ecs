import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeAmountCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const cents = Math.round(numeric);
  return cents >= 0 ? cents : null;
}

function toDbAmount(value) {
  return BigInt(value);
}

function fromDbAmount(value) {
  return typeof value === "bigint" ? Number(value) : Number(value || 0);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function mapFundingSource(source) {
  return {
    id: source.id,
    name: source.name,
    amountCents: fromDbAmount(source.amountCents),
    createdAt: toIso(source.createdAt),
    updatedAt: toIso(source.updatedAt),
  };
}

export async function listFundingSources() {
  const sources = await prisma.fundingSource.findMany({
    orderBy: { name: "asc" },
  });

  return sources.map(mapFundingSource);
}

export async function getFundingSourceById(id) {
  const source = await prisma.fundingSource.findUnique({
    where: { id },
  });

  return source ? mapFundingSource(source) : null;
}

export async function createFundingSource(input) {
  const name = normalizeText(input.name);
  const amountCents = normalizeAmountCents(input.amountCents);

  if (!name) {
    throw new Error("Nome da fonte de recurso e obrigatorio.");
  }

  if (amountCents === null) {
    throw new Error("Valor da fonte de recurso e obrigatorio.");
  }

  const exists = await prisma.fundingSource.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (exists) {
    throw new Error("Fonte de recurso ja cadastrada.");
  }

  const source = await prisma.fundingSource.create({
    data: {
      id: randomUUID(),
      name,
      amountCents: toDbAmount(amountCents),
    },
  });

  return mapFundingSource(source);
}

export async function updateFundingSource(id, input) {
  const name = normalizeText(input.name);
  const amountCents = normalizeAmountCents(input.amountCents);

  if (!name) {
    throw new Error("Nome da fonte de recurso e obrigatorio.");
  }

  if (amountCents === null) {
    throw new Error("Valor da fonte de recurso e obrigatorio.");
  }

  const current = await prisma.fundingSource.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return null;
  }

  const exists = await prisma.fundingSource.findFirst({
    where: {
      id: { not: id },
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (exists) {
    throw new Error("Ja existe outra fonte com esse nome.");
  }

  const updated = await prisma.fundingSource.update({
    where: { id },
    data: {
      name,
      amountCents: toDbAmount(amountCents),
      updatedAt: new Date(),
    },
  });

  return mapFundingSource(updated);
}

export async function deleteFundingSource(id) {
  const current = await prisma.fundingSource.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!current) {
    return false;
  }

  await prisma.fundingSource.delete({
    where: { id },
  });

  return true;
}
