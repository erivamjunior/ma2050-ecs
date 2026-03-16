import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

function formatCode(sequence) {
  return `MA2050-${String(sequence).padStart(6, "0")}`;
}

function extractSequenceFromCode(code) {
  const match = /^MA2050-(\d{6,})$/i.exec(String(code || "").trim());
  return match ? Number(match[1]) : 0;
}

function normalizeAmountCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const cents = Math.round(numeric);
  return cents >= 0 ? cents : null;
}

function normalizeSignedAmountCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function toDateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : null;
}

function parseDate(value) {
  return value ? new Date(value) : null;
}

function toDbAmount(value) {
  return BigInt(Math.round(Number(value || 0)));
}

function toDbSignedAmount(value) {
  return value === null || value === undefined ? null : BigInt(Math.round(Number(value)));
}

function fromDbAmount(value) {
  return typeof value === "bigint" ? Number(value) : Number(value || 0);
}

function normalizeFundingSources(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      sourceId: String(item?.sourceId || "").trim(),
      amountCents: normalizeAmountCents(item?.amountCents),
      createdAt: item?.createdAt || null,
      updatedAt: item?.updatedAt || null,
    }))
    .filter((item) => item.sourceId && item.amountCents !== null && item.amountCents > 0);
}

function normalizeMeasurementNumber(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function normalizeTermConfig(input) {
  const mode = input?.mode === "fixed" ? "fixed" : input?.mode === "relative" ? "relative" : null;

  if (!mode) {
    return null;
  }

  const quantity = Number(input?.quantity);
  const unit = input?.unit === "meses" ? "meses" : input?.unit === "dias" ? "dias" : null;
  const reference =
    input?.reference === "recebimento_os"
      ? "recebimento_os"
      : input?.reference === "assinatura_os"
        ? "assinatura_os"
        : null;
  const endDate = input?.endDate ? String(input.endDate).trim() : null;

  if (mode === "relative") {
    return {
      mode,
      quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : null,
      unit,
      reference,
      endDate: null,
    };
  }

  return {
    mode,
    quantity: null,
    unit: null,
    reference: null,
    endDate: endDate || null,
  };
}

function normalizeAddenda(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const number = String(item?.number || "").trim();
      const administrativeProcessNumber = String(item?.administrativeProcessNumber || "").trim();
      const signedAt = item?.signedAt ? String(item.signedAt).trim() : null;
      const type =
        item?.type === "valor_prazo"
          ? "valor_prazo"
          : item?.type === "valor"
            ? "valor"
            : item?.type === "prazo"
              ? "prazo"
              : null;
      const valueCents = normalizeSignedAmountCents(item?.valueCents);

      if (!number || !administrativeProcessNumber || !signedAt || !type) {
        return null;
      }

      return {
        id: String(item?.id || randomUUID()),
        number,
        administrativeProcessNumber,
        signedAt,
        type,
        valueCents: type === "valor" || type === "valor_prazo" ? valueCents : null,
        executionTerm: normalizeTermConfig(item?.executionTerm),
        validityTerm: normalizeTermConfig(item?.validityTerm),
        createdAt: item?.createdAt || new Date().toISOString(),
        updatedAt: item?.updatedAt || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.number).localeCompare(String(b.number), "pt-BR", { numeric: true }));
}

function normalizeContract(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const contractNumber = String(input.contractNumber || "").trim();
  const contractorName = String(input.contractorName || "").trim();
  const contractorCnpj = String(input.contractorCnpj || "").trim();
  const contractValueCents = normalizeAmountCents(input.contractValueCents);
  const contractSignedAt = input?.contractSignedAt ? String(input.contractSignedAt).trim() : null;
  const administrativeProcessNumber = String(input.administrativeProcessNumber || "").trim();
  const secretariaId = String(input.secretariaId || "").trim();
  const serviceOrderNumber = String(input.serviceOrderNumber || "").trim();
  const serviceOrderValueCents = normalizeAmountCents(input.serviceOrderValueCents);
  const serviceOrderSignedAt = input?.serviceOrderSignedAt ? String(input.serviceOrderSignedAt).trim() : null;
  const executionTerm = normalizeTermConfig(input.executionTerm);
  const validityTerm = normalizeTermConfig(input.validityTerm);
  const addenda = normalizeAddenda(input.addenda);

  const hasAnyValue = [
    contractNumber,
    contractorName,
    contractorCnpj,
    contractValueCents,
    contractSignedAt,
    administrativeProcessNumber,
    secretariaId,
    serviceOrderNumber,
    serviceOrderValueCents,
    serviceOrderSignedAt,
    executionTerm,
    validityTerm,
    addenda.length,
  ].some(Boolean);

  if (!hasAnyValue) {
    return null;
  }

  return {
    contractNumber,
    contractorName,
    contractorCnpj,
    contractValueCents,
    contractSignedAt,
    administrativeProcessNumber,
    secretariaId,
    serviceOrderNumber,
    serviceOrderValueCents,
    serviceOrderSignedAt,
    executionTerm,
    validityTerm,
    addenda,
  };
}

function normalizeBidding(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const biddingNumber = String(input.biddingNumber || "").trim();
  const secretariaId = String(input.secretariaId || "").trim();
  const setorId = String(input.setorId || "").trim();
  const administrativeProcessNumber = String(input.administrativeProcessNumber || "").trim();
  const modality = String(input.modality || "").trim();
  const objectDescription = String(input.objectDescription || "").trim();
  const bidValueCents = normalizeAmountCents(input.bidValueCents);
  const homologatedValueCents = normalizeAmountCents(input.homologatedValueCents);
  const winnerName = String(input.winnerName || "").trim();
  const winnerCnpj = String(input.winnerCnpj || "").trim();
  const publishedAt = input?.publishedAt ? String(input.publishedAt).trim() : null;
  const homologatedAt = input?.homologatedAt ? String(input.homologatedAt).trim() : null;

  const hasAnyValue = [
    biddingNumber,
    secretariaId,
    setorId,
    administrativeProcessNumber,
    modality,
    objectDescription,
    bidValueCents,
    homologatedValueCents,
    winnerName,
    winnerCnpj,
    publishedAt,
    homologatedAt,
  ].some(Boolean);

  if (!hasAnyValue) {
    return null;
  }

  return {
    biddingNumber,
    secretariaId,
    setorId,
    administrativeProcessNumber,
    modality,
    objectDescription: objectDescription || null,
    bidValueCents,
    homologatedValueCents,
    winnerName,
    winnerCnpj,
    publishedAt,
    homologatedAt,
  };
}

function computeEffectiveProjectAmount(inputAmountCents, contract) {
  const fallbackAmount = normalizeAmountCents(inputAmountCents) ?? 0;
  if (!contract || contract.contractValueCents === null) {
    return fallbackAmount;
  }

  const addendaDelta = (contract.addenda || []).reduce((sum, item) => {
    if (item.type === "valor" || item.type === "valor_prazo") {
      return sum + Number(item.valueCents || 0);
    }
    return sum;
  }, 0);

  return Math.max(0, Number(contract.contractValueCents || 0) + addendaDelta);
}

function normalizePayments(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const invoiceNumber = String(item?.invoiceNumber || "").trim();
      const issueDate = item?.issueDate ? String(item.issueDate).trim() : null;
      const sourceId = String(item?.sourceId || "").trim();
      const amountCents = normalizeAmountCents(item?.amountCents);

      if (!invoiceNumber || !issueDate || !sourceId || amountCents === null || amountCents <= 0) {
        return null;
      }

      return {
        id: String(item?.id || randomUUID()),
        invoiceNumber,
        issueDate,
        sourceId,
        amountCents,
        createdAt: item?.createdAt || new Date().toISOString(),
        updatedAt: item?.updatedAt || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));
}

function normalizeMeasurements(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const number = normalizeMeasurementNumber(item?.number);
      const amountCents = normalizeAmountCents(item?.amountCents);
      const processNumber = String(item?.processNumber || "").trim();
      const startDate = item?.startDate ? String(item.startDate).trim() : null;
      const endDate = item?.endDate ? String(item.endDate).trim() : null;

      if (!processNumber || number === null || amountCents === null || amountCents <= 0) {
        return null;
      }

      return {
        id: String(item?.id || randomUUID()),
        number,
        processNumber,
        startDate: startDate || null,
        endDate: endDate || null,
        amountCents,
        payments: normalizePayments(item?.payments),
        createdAt: item?.createdAt || new Date().toISOString(),
        updatedAt: item?.updatedAt || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
}

function mapTermFromRecord(mode, quantity, unit, reference, endDate) {
  if (!mode) {
    return null;
  }

  if (mode === "relative") {
    return {
      mode,
      quantity,
      unit,
      reference,
      endDate: null,
    };
  }

  return {
    mode,
    quantity: null,
    unit: null,
    reference: null,
    endDate: toDateOnly(endDate),
  };
}

function mapAddendum(addendum) {
  return {
    id: addendum.id,
    number: addendum.number,
    administrativeProcessNumber: addendum.administrativeProcessNumber,
    signedAt: toDateOnly(addendum.signedAt),
    type: addendum.type,
    valueCents: addendum.valueCents === null ? null : fromDbAmount(addendum.valueCents),
    executionTerm: mapTermFromRecord(
      addendum.executionTermMode,
      addendum.executionTermQuantity,
      addendum.executionTermUnit,
      addendum.executionTermReference,
      addendum.executionTermEndDate,
    ),
    validityTerm: mapTermFromRecord(
      addendum.validityTermMode,
      addendum.validityTermQuantity,
      addendum.validityTermUnit,
      addendum.validityTermReference,
      addendum.validityTermEndDate,
    ),
    createdAt: toIso(addendum.createdAt),
    updatedAt: toIso(addendum.updatedAt),
  };
}

function mapContract(contract) {
  if (!contract) {
    return null;
  }

  return {
    contractNumber: contract.contractNumber,
    contractorName: contract.contractorName,
    contractorCnpj: contract.contractorCnpj,
    contractValueCents: fromDbAmount(contract.contractValueCents),
    contractSignedAt: toDateOnly(contract.contractSignedAt),
    administrativeProcessNumber: contract.administrativeProcessNumber,
    secretariaId: contract.secretariaId,
    serviceOrderNumber: contract.serviceOrderNumber,
    serviceOrderValueCents: fromDbAmount(contract.serviceOrderValueCents),
    serviceOrderSignedAt: toDateOnly(contract.serviceOrderSignedAt),
    executionTerm: mapTermFromRecord(
      contract.executionTermMode,
      contract.executionTermQuantity,
      contract.executionTermUnit,
      contract.executionTermReference,
      contract.executionTermEndDate,
    ),
    validityTerm: mapTermFromRecord(
      contract.validityTermMode,
      contract.validityTermQuantity,
      contract.validityTermUnit,
      contract.validityTermReference,
      contract.validityTermEndDate,
    ),
    addenda: (contract.addenda || []).map(mapAddendum),
    createdAt: toIso(contract.createdAt),
    updatedAt: toIso(contract.updatedAt),
  };
}

function mapBidding(bidding) {
  if (!bidding) {
    return null;
  }

  return {
    biddingNumber: bidding.biddingNumber,
    secretariaId: bidding.secretariaId,
    setorId: bidding.setorId,
    administrativeProcessNumber: bidding.administrativeProcessNumber,
    modality: bidding.modality,
    objectDescription: bidding.objectDescription,
    bidValueCents: bidding.bidValueCents === null ? null : fromDbAmount(bidding.bidValueCents),
    homologatedValueCents: bidding.homologatedValueCents === null ? null : fromDbAmount(bidding.homologatedValueCents),
    winnerName: bidding.winnerName,
    winnerCnpj: bidding.winnerCnpj,
    publishedAt: toDateOnly(bidding.publishedAt),
    homologatedAt: toDateOnly(bidding.homologatedAt),
    createdAt: toIso(bidding.createdAt),
    updatedAt: toIso(bidding.updatedAt),
  };
}

function mapProject(project) {
  const contract = mapContract(project.contract);
  const bidding = mapBidding(project.bidding);

  return {
    id: project.id,
    code: project.code,
    name: project.name,
    stakeholderId: project.stakeholderId,
    phase: project.phase,
    bidding,
    contract,
    amountCents: computeEffectiveProjectAmount(fromDbAmount(project.amountCents), contract),
    fundingSources: (project.fundingSources || []).map((entry) => ({
      sourceId: entry.fundingSourceId,
      amountCents: fromDbAmount(entry.amountCents),
      createdAt: toIso(entry.createdAt),
      updatedAt: toIso(entry.updatedAt),
    })),
    measurements: (project.measurements || []).map((measurement) => ({
      id: measurement.id,
      number: measurement.number,
      processNumber: measurement.processNumber,
      startDate: toDateOnly(measurement.startDate),
      endDate: toDateOnly(measurement.endDate),
      amountCents: fromDbAmount(measurement.amountCents),
      payments: (measurement.payments || []).map((payment) => ({
        id: payment.id,
        invoiceNumber: payment.invoiceNumber,
        issueDate: toDateOnly(payment.issueDate),
        sourceId: payment.fundingSourceId,
        amountCents: fromDbAmount(payment.amountCents),
        createdAt: toIso(payment.createdAt),
        updatedAt: toIso(payment.updatedAt),
      })),
      createdAt: toIso(measurement.createdAt),
      updatedAt: toIso(measurement.updatedAt),
    })),
    status: project.status,
    startDate: toDateOnly(project.startDate),
    endDate: toDateOnly(project.endDate),
    createdAt: toIso(project.createdAt),
    updatedAt: toIso(project.updatedAt),
  };
}

async function getNextProjectSequence() {
  const projects = await prisma.project.findMany({
    select: { code: true },
  });

  return (
    projects.reduce((max, item) => Math.max(max, extractSequenceFromCode(item.code)), 0) + 1
  );
}

async function consumeNextCode() {
  const next = await getNextProjectSequence();
  return formatCode(next);
}

function buildProjectWriteInput(input, contract, bidding) {
  const effectiveAmount = computeEffectiveProjectAmount(input.amountCents, contract);
  const fundingSources = normalizeFundingSources(input.fundingSources);
  const measurements = normalizeMeasurements(input.measurements);

  return {
    name: input.name.trim(),
    stakeholderId: input.stakeholderId || null,
    amountCents: effectiveAmount,
    phase: input.phase === "contratado" ? "contratado" : "banco",
    status: input.status,
    startDate: parseDate(input.startDate),
    endDate: parseDate(input.endDate),
    fundingSources,
    measurements,
    bidding,
    contract,
  };
}

function buildBiddingCreate(projectId, bidding, createdAt = null, updatedAt = null) {
  if (!bidding) {
    return null;
  }

  return {
    id: randomUUID(),
    projectId,
    biddingNumber: bidding.biddingNumber,
    secretariaId: bidding.secretariaId || null,
    setorId: bidding.setorId || null,
    administrativeProcessNumber: bidding.administrativeProcessNumber,
    modality: bidding.modality,
    objectDescription: bidding.objectDescription,
    bidValueCents: bidding.bidValueCents === null ? null : toDbAmount(bidding.bidValueCents),
    homologatedValueCents: bidding.homologatedValueCents === null ? null : toDbAmount(bidding.homologatedValueCents),
    winnerName: bidding.winnerName,
    winnerCnpj: bidding.winnerCnpj,
    publishedAt: parseDate(bidding.publishedAt),
    homologatedAt: parseDate(bidding.homologatedAt),
    createdAt: createdAt || new Date(),
    updatedAt,
  };
}

function buildFundingSourcesCreate(projectId, fundingSources, createdAt = null) {
  return fundingSources.map((entry) => ({
    id: randomUUID(),
    projectId,
    fundingSourceId: entry.sourceId,
    amountCents: toDbAmount(entry.amountCents),
    createdAt: parseDate(entry.createdAt) || createdAt || new Date(),
    updatedAt: parseDate(entry.updatedAt),
  }));
}

function buildMeasurementsCreate(projectId, measurements, createdAt = null) {
  return measurements.map((measurement) => ({
    id: measurement.id,
    projectId,
    number: measurement.number,
    processNumber: measurement.processNumber,
    startDate: parseDate(measurement.startDate),
    endDate: parseDate(measurement.endDate),
    amountCents: toDbAmount(measurement.amountCents),
    createdAt: parseDate(measurement.createdAt) || createdAt || new Date(),
    updatedAt: parseDate(measurement.updatedAt),
    payments: {
      create: (measurement.payments || []).map((payment) => ({
        id: payment.id,
        fundingSourceId: payment.sourceId,
        invoiceNumber: payment.invoiceNumber,
        issueDate: parseDate(payment.issueDate) || new Date(),
        amountCents: toDbAmount(payment.amountCents),
        createdAt: parseDate(payment.createdAt) || createdAt || new Date(),
        updatedAt: parseDate(payment.updatedAt),
      })),
    },
  }));
}

function buildContractCreate(projectId, contract, createdAt = null, updatedAt = null) {
  if (!contract) {
    return null;
  }

  return {
    id: projectId,
    projectId,
    secretariaId: contract.secretariaId,
    contractNumber: contract.contractNumber,
    contractorName: contract.contractorName,
    contractorCnpj: contract.contractorCnpj,
    contractValueCents: toDbAmount(contract.contractValueCents),
    contractSignedAt: parseDate(contract.contractSignedAt) || new Date(),
    administrativeProcessNumber: contract.administrativeProcessNumber,
    serviceOrderNumber: contract.serviceOrderNumber,
    serviceOrderValueCents: toDbAmount(contract.serviceOrderValueCents),
    serviceOrderSignedAt: parseDate(contract.serviceOrderSignedAt) || new Date(),
    executionTermMode: contract.executionTerm.mode,
    executionTermQuantity: contract.executionTerm.quantity,
    executionTermUnit: contract.executionTerm.unit,
    executionTermReference: contract.executionTerm.reference,
    executionTermEndDate: parseDate(contract.executionTerm.endDate),
    validityTermMode: contract.validityTerm.mode,
    validityTermQuantity: contract.validityTerm.quantity,
    validityTermUnit: contract.validityTerm.unit,
    validityTermReference: contract.validityTerm.reference,
    validityTermEndDate: parseDate(contract.validityTerm.endDate),
    createdAt: createdAt || new Date(),
    updatedAt,
    addenda: {
      create: (contract.addenda || []).map((addendum) => ({
        id: addendum.id,
        number: addendum.number,
        administrativeProcessNumber: addendum.administrativeProcessNumber,
        signedAt: parseDate(addendum.signedAt) || new Date(),
        type: addendum.type,
        valueCents: toDbSignedAmount(addendum.valueCents),
        executionTermMode: addendum.executionTerm?.mode || null,
        executionTermQuantity: addendum.executionTerm?.quantity || null,
        executionTermUnit: addendum.executionTerm?.unit || null,
        executionTermReference: addendum.executionTerm?.reference || null,
        executionTermEndDate: parseDate(addendum.executionTerm?.endDate),
        validityTermMode: addendum.validityTerm?.mode || null,
        validityTermQuantity: addendum.validityTerm?.quantity || null,
        validityTermUnit: addendum.validityTerm?.unit || null,
        validityTermReference: addendum.validityTerm?.reference || null,
        validityTermEndDate: parseDate(addendum.validityTerm?.endDate),
        createdAt: parseDate(addendum.createdAt) || createdAt || new Date(),
        updatedAt: parseDate(addendum.updatedAt),
      })),
    },
  };
}

async function fetchProjects() {
  const projects = await prisma.project.findMany({
    include: {
      fundingSources: {
        orderBy: { createdAt: "asc" },
      },
      measurements: {
        orderBy: { number: "asc" },
        include: {
          payments: {
            orderBy: { issueDate: "asc" },
          },
        },
      },
      contract: {
        include: {
          addenda: {
            orderBy: { number: "asc" },
          },
        },
      },
      bidding: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map(mapProject);
}

export async function listProjects() {
  return fetchProjects();
}

export async function createProject(input) {
  const code = await consumeNextCode();
  const bidding = normalizeBidding(input.bidding);
  const contract = normalizeContract(input.contract);
  const createdAt = new Date();
  const payload = buildProjectWriteInput(input, contract, bidding);
  const projectId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.project.create({
      data: {
        id: projectId,
        code,
        name: payload.name,
        stakeholderId: payload.stakeholderId,
        amountCents: toDbAmount(payload.amountCents),
        phase: payload.phase,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
        createdAt,
      },
    });

    if (payload.fundingSources.length > 0) {
      await tx.projectFundingSource.createMany({
        data: buildFundingSourcesCreate(projectId, payload.fundingSources, createdAt),
      });
    }

    const biddingCreate = buildBiddingCreate(projectId, payload.bidding, createdAt, null);
    if (biddingCreate) {
      await tx.projectBidding.create({
        data: biddingCreate,
      });
    }

    for (const measurement of buildMeasurementsCreate(projectId, payload.measurements, createdAt)) {
      await tx.measurement.create({
        data: measurement,
      });
    }

    const contractCreate = buildContractCreate(projectId, payload.contract, createdAt, null);
    if (contractCreate) {
      await tx.projectContract.create({
        data: contractCreate,
      });
    }
  });

  const projects = await fetchProjects();
  return projects.find((item) => item.id === projectId) || null;
}

export async function updateProject(id, input) {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const bidding = normalizeBidding(input.bidding);
  const contract = normalizeContract(input.contract);
  const payload = buildProjectWriteInput(input, contract, bidding);
  const updatedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({
      where: { measurement: { projectId: id } },
    });
    await tx.measurement.deleteMany({
      where: { projectId: id } },
    );
    await tx.projectFundingSource.deleteMany({
      where: { projectId: id },
    });
    await tx.projectBidding.deleteMany({
      where: { projectId: id },
    });
    await tx.contractAddendum.deleteMany({
      where: { contract: { projectId: id } },
    });
    await tx.projectContract.deleteMany({
      where: { projectId: id },
    });

    await tx.project.update({
      where: { id },
      data: {
        name: payload.name,
        stakeholderId: payload.stakeholderId,
        amountCents: toDbAmount(payload.amountCents),
        phase: payload.phase,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
        updatedAt,
      },
    });

    if (payload.fundingSources.length > 0) {
      await tx.projectFundingSource.createMany({
        data: buildFundingSourcesCreate(id, payload.fundingSources, updatedAt),
      });
    }

    const biddingCreate = buildBiddingCreate(id, payload.bidding, updatedAt, updatedAt);
    if (biddingCreate) {
      await tx.projectBidding.create({
        data: biddingCreate,
      });
    }

    for (const measurement of buildMeasurementsCreate(id, payload.measurements, updatedAt)) {
      await tx.measurement.create({
        data: measurement,
      });
    }

    const contractCreate = buildContractCreate(id, payload.contract, updatedAt, updatedAt);
    if (contractCreate) {
      await tx.projectContract.create({
        data: contractCreate,
      });
    }
  });

  const projects = await fetchProjects();
  return projects.find((item) => item.id === id) || null;
}

export async function deleteProject(id) {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  await prisma.project.delete({
    where: { id },
  });

  return true;
}
