import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCpf(value) {
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

function mapSecretaria(secretaria) {
  return {
    id: secretaria.id,
    name: secretaria.name,
    sigla: secretaria.sigla,
    createdAt: toIso(secretaria.createdAt),
  };
}

function mapSetor(setor) {
  return {
    id: setor.id,
    name: setor.name,
    sigla: setor.sigla,
    secretariaId: setor.secretariaId,
    createdAt: toIso(setor.createdAt),
  };
}

function mapStakeholder(stakeholder) {
  return {
    id: stakeholder.id,
    name: stakeholder.name,
    cpf: stakeholder.cpf,
    birthDate: toDateOnly(stakeholder.birthDate),
    email: stakeholder.email,
    phone: stakeholder.phone,
    secretariaId: stakeholder.secretariaId,
    setorId: stakeholder.setorId,
    createdAt: toIso(stakeholder.createdAt),
  };
}

export async function listSecretarias() {
  const secretarias = await prisma.secretaria.findMany({
    orderBy: { name: "asc" },
  });

  return secretarias.map(mapSecretaria);
}

export async function getSecretariaById(id) {
  const secretaria = await prisma.secretaria.findUnique({ where: { id } });
  return secretaria ? mapSecretaria(secretaria) : null;
}

export async function createSecretaria(input) {
  const name = normalizeText(input.name);
  const sigla = normalizeText(input.sigla).toUpperCase();

  if (!name || !sigla) {
    throw new Error("Nome e sigla da secretaria são obrigatórios.");
  }

  const alreadyExists = await prisma.secretaria.findFirst({
    where: {
      OR: [{ name: { equals: name, mode: "insensitive" } }, { sigla }],
    },
  });

  if (alreadyExists) {
    throw new Error("Secretaria já cadastrada por nome ou sigla.");
  }

  const secretaria = await prisma.secretaria.create({
    data: {
      id: randomUUID(),
      name,
      sigla,
    },
  });

  return mapSecretaria(secretaria);
}

export async function updateSecretaria(id, input) {
  const current = await prisma.secretaria.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Secretaria não encontrada.");
  }

  const name = normalizeText(input.name);
  const sigla = normalizeText(input.sigla).toUpperCase();

  if (!name || !sigla) {
    throw new Error("Nome e sigla da secretaria são obrigatórios.");
  }

  const conflict = await prisma.secretaria.findFirst({
    where: {
      id: { not: id },
      OR: [{ name: { equals: name, mode: "insensitive" } }, { sigla }],
    },
  });

  if (conflict) {
    throw new Error("Já existe outra secretaria com esse nome ou sigla.");
  }

  const secretaria = await prisma.secretaria.update({
    where: { id },
    data: { name, sigla },
  });

  return mapSecretaria(secretaria);
}

export async function deleteSecretaria(id) {
  const [secretaria, setoresCount, stakeholdersCount, contractsCount] = await Promise.all([
    prisma.secretaria.findUnique({ where: { id }, select: { id: true } }),
    prisma.setor.count({ where: { secretariaId: id } }),
    prisma.stakeholder.count({ where: { secretariaId: id } }),
    prisma.projectContract.count({ where: { secretariaId: id } }),
  ]);

  if (!secretaria) {
    throw new Error("Secretaria não encontrada.");
  }

  const linkedCount = setoresCount + stakeholdersCount + contractsCount;
  if (linkedCount > 0) {
    throw new Error("Não é possível excluir esta secretaria porque ela possui vínculos ativos.");
  }

  await prisma.secretaria.delete({ where: { id } });
}

export async function listSetores() {
  const setores = await prisma.setor.findMany({
    orderBy: [{ secretariaId: "asc" }, { name: "asc" }],
  });

  return setores.map(mapSetor);
}

export async function listSetoresEnriched() {
  const setores = await prisma.setor.findMany({
    include: { secretaria: true },
    orderBy: [{ secretaria: { name: "asc" } }, { name: "asc" }],
  });

  return setores.map((setor) => ({
    ...mapSetor(setor),
    secretaria: setor.secretaria ? mapSecretaria(setor.secretaria) : null,
  }));
}

export async function getSetorById(id) {
  const setor = await prisma.setor.findUnique({ where: { id } });
  return setor ? mapSetor(setor) : null;
}

export async function createSetor(input) {
  const name = normalizeText(input.name);
  const sigla = normalizeText(input.sigla).toUpperCase();
  const secretariaId = normalizeText(input.secretariaId);

  if (!name || !sigla || !secretariaId) {
    throw new Error("Nome, sigla e secretaria da subunidade são obrigatórios.");
  }

  const secretaria = await prisma.secretaria.findUnique({
    where: { id: secretariaId },
    select: { id: true },
  });

  if (!secretaria) {
    throw new Error("Secretaria informada não encontrada.");
  }

  const alreadyExists = await prisma.setor.findFirst({
    where: {
      secretariaId,
      OR: [{ name: { equals: name, mode: "insensitive" } }, { sigla }],
    },
  });

  if (alreadyExists) {
    throw new Error("Subunidade já cadastrada nessa secretaria por nome ou sigla.");
  }

  const setor = await prisma.setor.create({
    data: {
      id: randomUUID(),
      name,
      sigla,
      secretariaId,
    },
  });

  return mapSetor(setor);
}

export async function updateSetor(id, input) {
  const current = await prisma.setor.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Subunidade não encontrada.");
  }

  const name = normalizeText(input.name);
  const sigla = normalizeText(input.sigla).toUpperCase();
  const secretariaId = normalizeText(input.secretariaId);

  if (!name || !sigla || !secretariaId) {
    throw new Error("Nome, sigla e secretaria da subunidade são obrigatórios.");
  }

  const secretaria = await prisma.secretaria.findUnique({
    where: { id: secretariaId },
    select: { id: true },
  });

  if (!secretaria) {
    throw new Error("Secretaria informada não encontrada.");
  }

  const conflict = await prisma.setor.findFirst({
    where: {
      id: { not: id },
      secretariaId,
      OR: [{ name: { equals: name, mode: "insensitive" } }, { sigla }],
    },
  });

  if (conflict) {
    throw new Error("Já existe outra subunidade nessa secretaria com esse nome ou sigla.");
  }

  const setor = await prisma.setor.update({
    where: { id },
    data: { name, sigla, secretariaId },
  });

  return mapSetor(setor);
}

export async function deleteSetor(id) {
  const [setor, stakeholdersCount] = await Promise.all([
    prisma.setor.findUnique({ where: { id }, select: { id: true } }),
    prisma.stakeholder.count({ where: { setorId: id } }),
  ]);

  if (!setor) {
    throw new Error("Subunidade não encontrada.");
  }

  if (stakeholdersCount > 0) {
    throw new Error("Não é possível excluir esta subunidade porque ela possui vínculos ativos.");
  }

  await prisma.setor.delete({ where: { id } });
}

export async function listStakeholders() {
  const stakeholders = await prisma.stakeholder.findMany({
    orderBy: { name: "asc" },
  });

  return stakeholders.map(mapStakeholder);
}

export async function createStakeholder(input) {
  const name = normalizeText(input.name);
  const cpf = normalizeCpf(input.cpf);
  const birthDate = normalizeText(input.birthDate);
  const email = normalizeText(input.email).toLowerCase();
  const phone = normalizePhone(input.phone);
  const secretariaId = normalizeText(input.secretariaId);
  const setorId = normalizeText(input.setorId);

  if (!name || !cpf || !birthDate || !email || !phone || !secretariaId || !setorId) {
    throw new Error("Todos os campos do stakeholder são obrigatórios.");
  }

  if (cpf.length !== 11) {
    throw new Error("CPF deve ter 11 dígitos.");
  }

  const [secretaria, setor, existingStakeholder] = await Promise.all([
    prisma.secretaria.findUnique({
      where: { id: secretariaId },
      select: { id: true },
    }),
    prisma.setor.findUnique({
      where: { id: setorId },
      select: { id: true, secretariaId: true },
    }),
    prisma.stakeholder.findUnique({
      where: { cpf },
      select: { id: true },
    }),
  ]);

  if (!secretaria) {
    throw new Error("Secretaria informada não encontrada.");
  }

  if (!setor) {
    throw new Error("Setor informado não encontrado.");
  }

  if (setor.secretariaId !== secretariaId) {
    throw new Error("Setor não pertence à secretaria informada.");
  }

  if (existingStakeholder) {
    throw new Error("Já existe stakeholder com esse CPF.");
  }

  const stakeholder = await prisma.stakeholder.create({
    data: {
      id: randomUUID(),
      name,
      cpf,
      birthDate: new Date(birthDate),
      email,
      phone,
      secretariaId,
      setorId,
    },
  });

  return mapStakeholder(stakeholder);
}

export async function getStakeholderById(id) {
  const stakeholder = await prisma.stakeholder.findUnique({
    where: { id },
  });

  return stakeholder ? mapStakeholder(stakeholder) : null;
}

export async function listStakeholdersEnriched() {
  const stakeholders = await prisma.stakeholder.findMany({
    include: {
      secretaria: true,
      setor: true,
    },
    orderBy: { name: "asc" },
  });

  return stakeholders.map((item) => ({
    ...mapStakeholder(item),
    secretaria: item.secretaria ? mapSecretaria(item.secretaria) : null,
    setor: item.setor ? mapSetor(item.setor) : null,
  }));
}
