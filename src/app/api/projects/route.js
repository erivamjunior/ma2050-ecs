import { NextResponse } from "next/server";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "@/lib/projects-store";
import { listFundingSources } from "@/lib/funding-sources-store";
import { getCompanyByCnpj } from "@/lib/companies-store";
import {
  getStakeholderById,
  listSecretarias,
  listSetores,
  listStakeholders,
} from "@/lib/registry-store";

export const runtime = "nodejs";

const ALLOWED_STATUS = ["planejado", "em_execucao", "concluido", "suspenso"];
const ALLOWED_PHASES = ["banco", "contratado"];

function normalizeFundingEntry(item) {
  const sourceId = String(item?.sourceId || "").trim();
  const amountCents = Number(item?.amountCents);

  return {
    sourceId,
    amountCents: Number.isFinite(amountCents) ? Math.round(amountCents) : null,
  };
}

function normalizePaymentEntry(item) {
  const invoiceNumber = String(item?.invoiceNumber || "").trim();
  const issueDate = item?.issueDate ? String(item.issueDate).trim() : null;
  const sourceId = String(item?.sourceId || "").trim();
  const amountCents = Number(item?.amountCents);

  return {
    id: item?.id ? String(item.id) : null,
    invoiceNumber,
    issueDate: issueDate || null,
    sourceId,
    amountCents: Number.isFinite(amountCents) ? Math.round(amountCents) : null,
  };
}

function normalizeMeasurementEntry(item) {
  const number = Number(item?.number);
  const processNumber = String(item?.processNumber || "").trim();
  const startDate = item?.startDate ? String(item.startDate).trim() : null;
  const endDate = item?.endDate ? String(item.endDate).trim() : null;
  const amountCents = Number(item?.amountCents);
  const payments = Array.isArray(item?.payments) ? item.payments : [];

  return {
    id: item?.id ? String(item.id) : null,
    number: Number.isInteger(number) ? number : null,
    processNumber,
    startDate: startDate || null,
    endDate: endDate || null,
    amountCents: Number.isFinite(amountCents) ? Math.round(amountCents) : null,
    payments: payments.map(normalizePaymentEntry),
  };
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

  return {
    mode,
    quantity: mode === "relative" && Number.isInteger(quantity) && quantity > 0 ? quantity : null,
    unit: mode === "relative" ? unit : null,
    reference: mode === "relative" ? reference : null,
    endDate: mode === "fixed" ? endDate || null : null,
  };
}

function normalizeAddendaEntry(item) {
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
  const rawValueCents = Number(item?.valueCents);

  return {
    id: item?.id ? String(item.id) : null,
    number,
    administrativeProcessNumber,
    signedAt,
    type,
    valueCents: Number.isFinite(rawValueCents) ? Math.round(rawValueCents) : null,
    executionTerm: normalizeTermConfig(item?.executionTerm),
    validityTerm: normalizeTermConfig(item?.validityTerm),
  };
}

function normalizeContractEntry(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const rawContractValue = Number(item?.contractValueCents);
  const rawServiceOrderValue = Number(item?.serviceOrderValueCents);
  const addenda = Array.isArray(item?.addenda) ? item.addenda : [];

  return {
    contractNumber: String(item?.contractNumber || "").trim(),
    contractorName: String(item?.contractorName || "").trim(),
    contractorCnpj: String(item?.contractorCnpj || "").trim(),
    contractValueCents: Number.isFinite(rawContractValue) ? Math.round(rawContractValue) : null,
    contractSignedAt: item?.contractSignedAt ? String(item.contractSignedAt).trim() : null,
    administrativeProcessNumber: String(item?.administrativeProcessNumber || "").trim(),
    secretariaId: String(item?.secretariaId || "").trim(),
    serviceOrderNumber: String(item?.serviceOrderNumber || "").trim(),
    serviceOrderValueCents: Number.isFinite(rawServiceOrderValue) ? Math.round(rawServiceOrderValue) : null,
    serviceOrderSignedAt: item?.serviceOrderSignedAt ? String(item.serviceOrderSignedAt).trim() : null,
    executionTerm: normalizeTermConfig(item?.executionTerm),
    validityTerm: normalizeTermConfig(item?.validityTerm),
    addenda: addenda.map(normalizeAddendaEntry),
  };
}

function normalizeBiddingEntry(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const rawBidValue = Number(item?.bidValueCents);
  const rawHomologatedValue = Number(item?.homologatedValueCents);

  return {
    biddingNumber: String(item?.biddingNumber || "").trim(),
    secretariaId: String(item?.secretariaId || "").trim(),
    setorId: String(item?.setorId || "").trim(),
    administrativeProcessNumber: String(item?.administrativeProcessNumber || "").trim(),
    modality: String(item?.modality || "").trim(),
    objectDescription: String(item?.objectDescription || "").trim(),
    bidValueCents: Number.isFinite(rawBidValue) ? Math.round(rawBidValue) : null,
    homologatedValueCents: Number.isFinite(rawHomologatedValue) ? Math.round(rawHomologatedValue) : null,
    winnerName: String(item?.winnerName || "").trim(),
    winnerCnpj: String(item?.winnerCnpj || "").trim(),
    publishedAt: item?.publishedAt ? String(item.publishedAt).trim() : null,
    homologatedAt: item?.homologatedAt ? String(item.homologatedAt).trim() : null,
  };
}

function sumPayments(payments) {
  return payments.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
}

function getMeasurementStatus(measurement) {
  const totalPaidCents = sumPayments(measurement.payments || []);

  if (totalPaidCents <= 0) {
    return "nao_paga";
  }

  if (totalPaidCents < Number(measurement.amountCents || 0)) {
    return "paga_parcial";
  }

  return "paga_ok";
}

function sumProjectPaymentsBySource(project, sourceId) {
  return (project.measurements || []).reduce((sum, measurement) => {
    const payments = Array.isArray(measurement.payments) ? measurement.payments : [];
    return (
      sum +
      payments
        .filter((payment) => payment.sourceId === sourceId)
        .reduce((paymentSum, payment) => paymentSum + Number(payment.amountCents || 0), 0)
    );
  }, 0);
}

function sumGlobalPaymentsBySource(projects, sourceId, excludeProjectId = null) {
  return projects.reduce((sum, project) => {
    if (excludeProjectId && project.id === excludeProjectId) {
      return sum;
    }

    return sum + sumProjectPaymentsBySource(project, sourceId);
  }, 0);
}

function canReturnProjectToBank(project) {
  if (!project) {
    return false;
  }

  if (project.contract) {
    return false;
  }

  const measurements = Array.isArray(project.measurements) ? project.measurements : [];
  if (measurements.length > 0) {
    return false;
  }

  return !measurements.some((measurement) => Array.isArray(measurement.payments) && measurement.payments.length > 0);
}

function computeEffectiveAmount(amountCents, contract) {
  const fallbackAmount = Number.isFinite(Number(amountCents)) ? Math.round(Number(amountCents)) : 0;
  if (!contract || contract.contractValueCents === null || contract.contractValueCents < 0) {
    return Math.max(0, fallbackAmount);
  }

  const addendaDelta = (contract.addenda || []).reduce((sum, item) => {
    if (item.type === "valor" || item.type === "valor_prazo") {
      return sum + Number(item.valueCents || 0);
    }
    return sum;
  }, 0);

  return Math.max(0, Number(contract.contractValueCents || 0) + addendaDelta);
}

function validateTermConfig(term, label) {
  if (!term) {
    return `${label}: informe a forma de definiÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o do prazo.`;
  }

  if (term.mode === "relative") {
    if (!Number.isInteger(term.quantity) || term.quantity <= 0) {
      return `${label}: informe uma quantidade vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lida.`;
    }
    if (!["dias", "meses"].includes(term.unit)) {
      return `${label}: selecione dias ou meses.`;
    }
    if (!["assinatura_os", "recebimento_os"].includes(term.reference)) {
      return `${label}: selecione a referÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªncia inicial.`;
    }
  }

  if (term.mode === "fixed" && !term.endDate) {
    return `${label}: informe a data final.`;
  }

  return null;
}

async function listProjectsEnriched() {
  const [projects, stakeholders, secretarias, setores, fundingSources] = await Promise.all([
    listProjects(),
    listStakeholders(),
    listSecretarias(),
    listSetores(),
    listFundingSources(),
  ]);

  const stakeholderById = new Map(stakeholders.map((item) => [item.id, item]));
  const secretariaById = new Map(secretarias.map((item) => [item.id, item]));
  const setorById = new Map(setores.map((item) => [item.id, item]));
  const fundingSourceById = new Map(fundingSources.map((item) => [item.id, item]));

  return projects.map((project) => {
    const stakeholder = project.stakeholderId
      ? stakeholderById.get(project.stakeholderId) || null
      : null;

    const secretaria = stakeholder ? secretariaById.get(stakeholder.secretariaId) || null : null;
    const setor = stakeholder ? setorById.get(stakeholder.setorId) || null : null;

    const measurements = (project.measurements || []).map((measurement) => {
      const paymentTotalCents = sumPayments(measurement.payments || []);
      const paymentRemainingCents = Math.max(Number(measurement.amountCents || 0) - paymentTotalCents, 0);

      return {
        ...measurement,
        payments: (measurement.payments || []).map((payment) => ({
          ...payment,
          source: fundingSourceById.get(payment.sourceId) || null,
        })),
        paymentTotalCents,
        paymentRemainingCents,
        paymentStatus: getMeasurementStatus(measurement),
      };
    });

    const measurementTotalCents = measurements.reduce(
      (sum, measurement) => sum + Number(measurement.amountCents || 0),
      0,
    );
    const paymentTotalCents = measurements.reduce(
      (sum, measurement) => sum + Number(measurement.paymentTotalCents || 0),
      0,
    );

    const bidding = project.bidding
      ? {
          ...project.bidding,
          secretaria: project.bidding.secretariaId ? secretariaById.get(project.bidding.secretariaId) || null : null,
          setor: project.bidding.setorId ? setorById.get(project.bidding.setorId) || null : null,
        }
      : null;

    const contract = project.contract
      ? {
          ...project.contract,
          secretaria: secretariaById.get(project.contract.secretariaId) || null,
        }
      : null;

    return {
      ...project,
      bidding,
      contract,
      fundingSources: (project.fundingSources || []).map((entry) => ({
        ...entry,
        source: fundingSourceById.get(entry.sourceId) || null,
      })),
      measurements,
      measurementTotalCents,
      measurementRemainingCents: Math.max(Number(project.amountCents || 0) - measurementTotalCents, 0),
      paymentTotalCents,
      paymentRemainingCents: Math.max(Number(project.amountCents || 0) - paymentTotalCents, 0),
      stakeholder: stakeholder
        ? {
            ...stakeholder,
            secretaria,
            setor,
          }
        : null,
    };
  });
}

async function validateProjectBody(body, currentProjectId = null) {
  if (!body?.name) {
    return "Campo obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rio: name.";
  }

  if (!ALLOWED_STATUS.includes(body.status)) {
    return "Status invÃ¡lido.";
  }

  const phase = body.phase === "contratado" ? "contratado" : "banco";
  if (!ALLOWED_PHASES.includes(phase)) {
    return "Fase invÃ¡lida.";
  }

  if (body.stakeholderId) {
    const stakeholder = await getStakeholderById(body.stakeholderId);
    if (!stakeholder) {
      return "Stakeholder informado nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrado.";
    }
  }

  const [projects, fundingSources, secretarias, setores] = await Promise.all([
    listProjects(),
    listFundingSources(),
    listSecretarias(),
    listSetores(),
  ]);
  const currentProject = currentProjectId
    ? projects.find((project) => project.id === currentProjectId) || null
    : null;
  const fundingSourceById = new Map(fundingSources.map((item) => [item.id, item]));
  const secretariaIds = new Set(secretarias.map((item) => item.id));
  const setorById = new Map(setores.map((item) => [item.id, item]));
  const fundingItems = Array.isArray(body.fundingSources) ? body.fundingSources : [];
  const measurementItems = Array.isArray(body.measurements) ? body.measurements : [];
  const bidding = normalizeBiddingEntry(body.bidding);
  const contract = normalizeContractEntry(body.contract);
  const effectiveAmount = computeEffectiveAmount(body.amountCents, contract);
  const seenSourceIds = new Set();
  const approvedBySource = new Map();
  let projectFundingTotal = 0;

  if (currentProject && currentProject.phase === "contratado" && phase === "banco" && !canReturnProjectToBank(currentProject)) {
    return "Este projeto n?o pode voltar para Banco de Projetos porque j? possui dados contratuais ou de execu??o.";
  }

  if (phase === "banco" && contract) {
    return "Migre o projeto para contratados antes de informar o contrato.";
  }

  if (phase === "banco" && measurementItems.length > 0) {
    return "Migre o projeto para contratados antes de cadastrar mediÃƒÂ§ÃƒÂµes.";
  }

  if (bidding) {
    if (
      !bidding.biddingNumber ||
      !bidding.secretariaId ||
      !bidding.setorId ||
      !bidding.administrativeProcessNumber ||
      !bidding.modality ||
      bidding.bidValueCents === null ||
      bidding.bidValueCents <= 0 ||
      bidding.homologatedValueCents === null ||
      bidding.homologatedValueCents <= 0 ||
      !bidding.winnerName ||
      !bidding.winnerCnpj
    ) {
      return "Preencha os campos obrigatórios da licitação antes de salvar.";
    }

    if (!secretariaIds.has(bidding.secretariaId)) {
      return "A secretaria informada na licitação não foi encontrada.";
    }

    const biddingSetor = setorById.get(bidding.setorId) || null;
    if (!biddingSetor) {
      return "A subunidade informada na licitação não foi encontrada.";
    }

    if (biddingSetor.secretariaId !== bidding.secretariaId) {
      return "A subunidade da licitação precisa pertencer à secretaria selecionada.";
    }

    const winningCompany = await getCompanyByCnpj(bidding.winnerCnpj);
    if (!winningCompany) {
      return "A empresa vencedora precisa existir em Partes Interessadas > Empresas.";
    }

    const acceptedNames = [winningCompany.corporateName, winningCompany.tradeName]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    if (!acceptedNames.includes(String(bidding.winnerName || "").trim().toLowerCase())) {
      return "A empresa vencedora precisa ser selecionada a partir da base cadastrada.";
    }
  }

  if (contract) {
    if (!bidding) {
      return "Cadastre a licitaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o antes de informar o contrato.";
    }

    if (
      !contract.contractNumber ||
      !contract.contractorName ||
      !contract.contractorCnpj ||
      contract.contractValueCents === null ||
      contract.contractValueCents <= 0 ||
      !contract.contractSignedAt ||
      !contract.administrativeProcessNumber ||
      !contract.secretariaId ||
      !contract.serviceOrderNumber ||
      contract.serviceOrderValueCents === null ||
      contract.serviceOrderValueCents <= 0 ||
      !contract.serviceOrderSignedAt
    ) {
      return "Preencha todos os campos principais do contrato e da ordem de serviÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§o.";
    }

    if (contract.contractorName !== bidding.winnerName || contract.contractorCnpj !== bidding.winnerCnpj) {
      return "A empresa e o CNPJ do contrato devem ser os mesmos da licitaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o vinculada.";
    }

    if (!secretariaIds.has(contract.secretariaId)) {
      return "A secretaria informada no contrato nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o foi encontrada.";
    }

    const executionError = validateTermConfig(contract.executionTerm, "Prazo de execuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o");
    if (executionError) {
      return executionError;
    }

    const validityError = validateTermConfig(contract.validityTerm, "Prazo de vigÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªncia");
    if (validityError) {
      return validityError;
    }

    const seenAddendaNumbers = new Set();
    for (const addendum of contract.addenda || []) {
      if (!addendum.number || !addendum.administrativeProcessNumber || !addendum.signedAt || !addendum.type) {
        return "Cada aditivo precisa ter nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero, processo administrativo, data e tipo.";
      }

      if (seenAddendaNumbers.has(addendum.number)) {
        return "NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o pode haver dois aditivos com o mesmo nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero neste contrato.";
      }
      seenAddendaNumbers.add(addendum.number);

      if ((addendum.type === "valor" || addendum.type === "valor_prazo") && addendum.valueCents === null) {
        return `Informe o valor do aditivo ${addendum.number}.`;
      }

      if (addendum.type === "prazo" || addendum.type === "valor_prazo") {
        const addendumExecutionConfigured = Boolean(addendum.executionTerm);
        const addendumValidityConfigured = Boolean(addendum.validityTerm);

        if (!addendumExecutionConfigured && !addendumValidityConfigured) {
          return `O aditivo ${addendum.number} precisa revisar execuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o, vigÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªncia ou ambos.`;
        }

        if (addendum.executionTerm) {
          const addendumExecutionError = validateTermConfig(addendum.executionTerm, `Aditivo ${addendum.number} - execuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o`);
          if (addendumExecutionError) {
            return addendumExecutionError;
          }
        }

        if (addendum.validityTerm) {
          const addendumValidityError = validateTermConfig(addendum.validityTerm, `Aditivo ${addendum.number} - vigÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªncia`);
          if (addendumValidityError) {
            return addendumValidityError;
          }
        }
      }
    }
  }

  for (const rawItem of fundingItems) {
    const item = normalizeFundingEntry(rawItem);

    if (!item.sourceId || item.amountCents === null || item.amountCents <= 0) {
      return "Cada fonte vinculada precisa ter sourceId e valor vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.";
    }

    if (seenSourceIds.has(item.sourceId)) {
      return "NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o repita a mesma fonte de recurso no projeto.";
    }
    seenSourceIds.add(item.sourceId);

    const source = fundingSourceById.get(item.sourceId) || null;
    if (!source) {
      return "Fonte de recurso informada nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrada.";
    }

    approvedBySource.set(item.sourceId, item.amountCents);
    projectFundingTotal += item.amountCents;
  }

  if (projectFundingTotal > effectiveAmount) {
    return "A soma das fontes vinculadas nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o pode ultrapassar o valor vigente do projeto.";
  }

  const normalizedMeasurements = [];
  const seenMeasurementNumbers = new Set();
  const paymentsBySource = new Map();

  for (const rawItem of measurementItems) {
    const item = normalizeMeasurementEntry(rawItem);

    if (item.number === null || item.number <= 0) {
      return "O nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero da mediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o deve ser inteiro e positivo.";
    }

    if (seenMeasurementNumbers.has(item.number)) {
      return "NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o pode haver duas mediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes com o mesmo nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero neste projeto.";
    }
    seenMeasurementNumbers.add(item.number);

    if (!item.processNumber || item.amountCents === null || item.amountCents <= 0) {
      return "Cada mediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o precisa ter nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero, nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de processo e valor vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.";
    }

    if (item.startDate && item.endDate && item.endDate < item.startDate) {
      return "A data final da mediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o pode ser menor que a data inicial.";
    }

    const normalizedPayments = [];
    for (const rawPayment of item.payments) {
      const payment = normalizePaymentEntry(rawPayment);

      if (
        !payment.invoiceNumber ||
        !payment.issueDate ||
        !payment.sourceId ||
        payment.amountCents === null ||
        payment.amountCents <= 0
      ) {
        return "Cada pagamento precisa ter NF, data de emissÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o, fonte e valor pago vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.";
      }

      if (!approvedBySource.has(payment.sourceId)) {
        return "O pagamento precisa estar vinculado a uma das fontes aprovadas neste projeto.";
      }

      normalizedPayments.push(payment);
      paymentsBySource.set(
        payment.sourceId,
        Number(paymentsBySource.get(payment.sourceId) || 0) + payment.amountCents,
      );
    }

    if (sumPayments(normalizedPayments) > Number(item.amountCents || 0)) {
      return `Os pagamentos da mediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o ${item.number} nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o podem ultrapassar o valor da prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³pria mediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o.`;
    }

    normalizedMeasurements.push(item);
  }

  const measurementTotal = normalizedMeasurements.reduce(
    (sum, item) => sum + Number(item.amountCents || 0),
    0,
  );
  if (measurementTotal > effectiveAmount) {
    return "A soma das mediÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o pode ultrapassar o valor vigente do projeto.";
  }

  for (const [sourceId, paidTotal] of paymentsBySource.entries()) {
    const approvedTotal = Number(approvedBySource.get(sourceId) || 0);
    if (paidTotal > approvedTotal) {
      return "O total pago por uma fonte nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o pode ultrapassar o valor aprovado dessa fonte no projeto.";
    }

    const source = fundingSourceById.get(sourceId) || null;
    const paidInOtherProjects = sumGlobalPaymentsBySource(projects, sourceId, currentProjectId);
    if (paidInOtherProjects + paidTotal > Number(source?.amountCents || 0)) {
      return `A fonte ${source?.name || "informada"} nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o possui saldo suficiente para este pagamento.`;
    }
  }

  return null;
}

export async function GET() {
  try {
    const projects = await listProjectsEnriched();
    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: "Falha ao listar projetos." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validationError = await validateProjectBody(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const project = await createProject(body);
    const projects = await listProjectsEnriched();
    const enrichedProject = projects.find((item) => item.id === project.id) || project;
    return NextResponse.json({ project: enrichedProject }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar projeto." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: "Campo obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rio: id." }, { status: 400 });
    }

    const validationError = await validateProjectBody(body, body.id);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const project = await updateProject(body.id, body);

    if (!project) {
      return NextResponse.json({ error: "Projeto nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrado." }, { status: 404 });
    }

    const projects = await listProjectsEnriched();
    const enrichedProject = projects.find((item) => item.id === project.id) || project;
    return NextResponse.json({ project: enrichedProject });
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar projeto." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: "Campo obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rio: id." }, { status: 400 });
    }

    const deleted = await deleteProject(body.id);

    if (!deleted) {
      return NextResponse.json({ error: "Projeto nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrado." }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Falha ao excluir projeto." }, { status: 500 });
  }
}
