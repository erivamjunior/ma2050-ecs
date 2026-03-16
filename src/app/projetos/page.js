"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppFooter from "@/components/app-footer";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import FundingSourcesField, {
  normalizeFundingSourcesForSubmit,
} from "@/components/funding-sources-field";
import StakeholderSelect from "@/components/stakeholder-select";
import ProjectPaymentsTab from "@/components/project-payments-tab";
import ProjectContractTab from "@/components/project-contract-tab";
import ProjectBiddingTab from "@/components/project-bidding-tab";
import styles from "../modules.module.css";

const INITIAL_FORM = {
  name: "",
  stakeholderId: "",
  amountCents: "",
  fundingSources: [],
  status: "planejado",
  startDate: "",
  endDate: "",
};

const INITIAL_MEASUREMENT_FORM = {
  id: null,
  number: "",
  processNumber: "",
  startDate: "",
  endDate: "",
  amountCents: "",
};

const STATUS_OPTIONS = [
  { value: "planejado", label: "Planejado" },
  { value: "em_execucao", label: "Em execução" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
];

const PROJECT_TABS = [
  { id: "main", label: "Principal" },
  { id: "bidding", label: "Licitação" },
  { id: "contract", label: "Contrato" },
  { id: "measurements", label: "Medições" },
  { id: "payments", label: "Pagamentos" },
  { id: "environmental", label: "Regularidade Ambiental" },
];

const LOCKED_TABS = new Set(["contract", "measurements", "payments"]);

function formatCurrencyFromCents(amountCents) {
  const amount = Number(amountCents || 0) / 100;
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function currencyInputToCents(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  return Number(digits);
}

function maskCurrencyInput(value) {
  const cents = currencyInputToCents(value);
  return cents === null ? "" : formatCurrencyFromCents(cents);
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `${start} até ${end}`;
  }
  if (start) {
    return `Início: ${start}`;
  }
  if (end) {
    return `Fim: ${end}`;
  }
  return "Sem período informado";
}

function formatPercentage(numerator, denominator) {
  if (!denominator) {
    return "0,00%";
  }

  return `${((Number(numerator || 0) / Number(denominator)) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function measurementNumberToString(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function ProjetosPageContent() {
  const searchParams = useSearchParams();
  const currentProjectView = searchParams.get("fase") === "contratado" ? "contratado" : "banco";
  const currentViewLabel = currentProjectView === "contratado" ? "Projetos Contratados" : "Banco de Projetos";

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [phaseSubmittingId, setPhaseSubmittingId] = useState(null);
  const [phaseDialog, setPhaseDialog] = useState(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);
  const [deleteMeasurementTarget, setDeleteMeasurementTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [nameFilter, setNameFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [activeTab, setActiveTab] = useState("main");
  const [measurementForm, setMeasurementForm] = useState(INITIAL_MEASUREMENT_FORM);
  const [measurementSubmitting, setMeasurementSubmitting] = useState(false);
  const [measurementFeedback, setMeasurementFeedback] = useState("");
  const [expandedMeasurementId, setExpandedMeasurementId] = useState(null);

  async function loadProjects() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar projetos.");
      }

      setProjects(data.projects || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (editingProject) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingProject]);

  const filteredProjects = useMemo(() => {
    const byName = nameFilter.trim().toLowerCase();
    const byCode = codeFilter.trim().toLowerCase();

    return projects
      .filter((project) => {
        const phaseMatch = getProjectPhase(project) === currentProjectView;
        const nameMatch = byName ? String(project.name || "").toLowerCase().includes(byName) : true;
        const codeMatch = byCode ? String(project.code || "").toLowerCase().includes(byCode) : true;
        return phaseMatch && nameMatch && codeMatch;
      })
      .sort((left, right) => {
        if (currentProjectView === "banco") {
          return String(right.code || "").localeCompare(String(left.code || ""), "pt-BR", { numeric: true });
        }

        return 0;
      });
  }, [projects, nameFilter, codeFilter, currentProjectView]);

  function getProjectPhase(project) {
    return project.phase || (project.contract ? "contratado" : "banco");
  }

  function canReturnProjectToBank(project) {
    if (getProjectPhase(project) !== "contratado") {
      return false;
    }

    if (project.contract) {
      return false;
    }

    const measurements = project.measurements || [];
    if (measurements.length > 0) {
      return false;
    }

    return !measurements.some((measurement) => (measurement.payments || []).length > 0);
  }

  function buildPhasePayload(project, phase) {
    return {
      id: project.id,
      name: project.name,
      stakeholderId: project.stakeholderId || "",
      amountCents: Number(project.amountCents || 0),
      fundingSources: (project.fundingSources || []).map((item) => ({
        sourceId: item.sourceId,
        amountCents: Number(item.amountCents || 0),
      })),
      status: project.status || "planejado",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      phase,
      bidding: project.bidding || null,
      contract: phase === "banco" ? null : project.contract || null,
      measurements: phase === "banco" ? [] : project.measurements || [],
    };
  }

  function requestProjectPhaseChange(project, phase) {
    const goingToContracted = phase === "contratado";
    setPhaseDialog({
      project,
      phase,
      title: goingToContracted ? "Migrar projeto" : "Voltar projeto ao banco",
      message: goingToContracted
        ? "Ao confirmar, este projeto sairá do Banco de Projetos e passará para Projetos Contratados. As abas de Contrato, Medições e Pagamentos serão habilitadas."
        : "Ao confirmar, este projeto voltará para Banco de Projetos. As abas de Contrato, Medições e Pagamentos voltarão a ficar bloqueadas.",
      confirmLabel: goingToContracted ? "Migrar projeto" : "Voltar ao banco",
    });
  }

  async function confirmProjectPhaseChange() {
    if (!phaseDialog?.project || !phaseDialog?.phase) {
      return;
    }

    const { project, phase } = phaseDialog;
    setPhaseSubmittingId(project.id);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPhasePayload(project, phase)),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar fase do projeto.");
      }

      if (editingProject?.id === project.id) {
        setEditingProject(data.project);
        if (phase === "banco") {
          setActiveTab("main");
        }
      }

      setPhaseDialog(null);
      await loadProjects();
    } catch (phaseError) {
      setError(phaseError.message);
    } finally {
      setPhaseSubmittingId(null);
    }
  }

  function openProject(project) {
    setEditingProject(project);
    setActiveTab("main");
    setMeasurementForm(INITIAL_MEASUREMENT_FORM);
    setMeasurementFeedback("");
    setExpandedMeasurementId(null);
    setForm({
      name: project.name ?? "",
      stakeholderId: project.stakeholderId ?? "",
      amountCents: formatCurrencyFromCents(project.amountCents),
      fundingSources: (project.fundingSources || []).map((item) => ({
        sourceId: item.sourceId,
        amountCents: formatCurrencyFromCents(item.amountCents),
      })),
      status: project.status ?? "planejado",
      startDate: project.startDate ?? "",
      endDate: project.endDate ?? "",
    });
  }

  function closeModal() {
    setEditingProject(null);
    setForm(INITIAL_FORM);
    setMeasurementForm(INITIAL_MEASUREMENT_FORM);
    setMeasurementFeedback("");
    setExpandedMeasurementId(null);
    setActiveTab("main");
    setError("");
  }

  function onChange(event) {
    const { name, value } = event.target;

    if (name === "amountCents") {
      setForm((prev) => ({ ...prev, amountCents: maskCurrencyInput(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onMeasurementChange(event) {
    const { name, value } = event.target;

    if (name === "amountCents") {
      setMeasurementForm((prev) => ({ ...prev, amountCents: maskCurrencyInput(value) }));
      return;
    }

    if (name === "number") {
      setMeasurementForm((prev) => ({
        ...prev,
        number: String(value || "").replace(/\D/g, ""),
      }));
      return;
    }

    setMeasurementForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetMeasurementForm() {
    setMeasurementForm(INITIAL_MEASUREMENT_FORM);
    setMeasurementFeedback("");
    setExpandedMeasurementId(null);
  }

  function buildProjectPayload(overrides = {}) {
    const amountCents = currencyInputToCents(form.amountCents);
    if (amountCents === null) {
      throw new Error("Informe um valor válido.");
    }

    return {
      ...form,
      amountCents,
      fundingSources: normalizeFundingSourcesForSubmit(form.fundingSources),
      phase: editingProject?.phase || "banco",
      bidding: editingProject?.bidding || null,
      contract: editingProject?.contract || null,
      measurements: editingProject?.measurements || [],
      id: editingProject.id,
      ...overrides,
    };
  }

  async function saveProject(payload, successMessage = "") {
    const response = await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Erro ao atualizar projeto.");
    }

    setProjects((prev) => prev.map((item) => (item.id === data.project.id ? data.project : item)));
    setEditingProject(data.project);
    if (successMessage) {
      setMeasurementFeedback(successMessage);
    }
    return data.project;
  }

  async function saveMeasurementsPayload(measurements, successMessage = "") {
    const payload = buildProjectPayload({ measurements });
    await saveProject(payload, successMessage);
    await loadProjects();
  }

  async function saveBiddingPayload(bidding) {
    const payload = buildProjectPayload({ bidding });
    const savedProject = await saveProject(payload);
    await loadProjects();
    return savedProject;
  }

  async function saveContractPayload(contract) {
    const payload = buildProjectPayload({ contract });
    const savedProject = await saveProject(payload);
    await loadProjects();
    return savedProject;
  }

  async function requestProjectMigration() {
    if (!editingProject?.id) {
      return;
    }

    const confirmed = window.confirm(
      "Ao migrar, este projeto sairá do Banco de Projetos e passará a permitir contrato, medições e pagamentos. Deseja continuar?",
    );
    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const savedProject = await saveProject(buildProjectPayload({ phase: "contratado" }));
      setEditingProject(savedProject);
      setActiveTab("contract");
      await loadProjects();
    } catch (migrationError) {
      setError(migrationError.message);
    }
  }

  async function onSubmitEdit(event) {
    event.preventDefault();

    if (!editingProject?.id) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMeasurementFeedback("");

    try {
      const payload = buildProjectPayload();
      await saveProject(payload);
      await loadProjects();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function buildMeasurementFromForm() {
    const amountCents = currencyInputToCents(measurementForm.amountCents);
    const number = Number(measurementForm.number);

    if (!Number.isInteger(number) || number <= 0) {
      throw new Error("Informe um número inteiro e positivo para a medição.");
    }

    if (amountCents === null) {
      throw new Error("Informe um valor válido para a medição.");
    }

    if (!measurementForm.processNumber.trim()) {
      throw new Error("Informe o número do processo.");
    }

    if (measurementForm.startDate && measurementForm.endDate && measurementForm.endDate < measurementForm.startDate) {
      throw new Error("A data final da medição não pode ser menor que a data inicial.");
    }

    return {
      id: measurementForm.id,
      number,
      processNumber: measurementForm.processNumber.trim(),
      startDate: measurementForm.startDate || null,
      endDate: measurementForm.endDate || null,
      amountCents,
    };
  }

  async function onSaveMeasurement(event) {
    event.preventDefault();

    if (!editingProject?.id || editingProject.phase !== "contratado") {
      setError("Migre o projeto para contratados antes de cadastrar mediÃ§Ãµes.");
      return;
    }

    setMeasurementSubmitting(true);
    setError("");
    setMeasurementFeedback("");

    try {
      const nextMeasurement = buildMeasurementFromForm();
      const existingMeasurements = editingProject.measurements || [];
      const payloadMeasurements = nextMeasurement.id
        ? existingMeasurements.map((item) => (item.id === nextMeasurement.id ? { ...item, ...nextMeasurement } : item))
        : [...existingMeasurements, nextMeasurement];

      const payload = buildProjectPayload({ measurements: payloadMeasurements });
      const savedProject = await saveProject(
        payload,
        nextMeasurement.id ? "MediÃ§Ã£o atualizada com sucesso." : "MediÃ§Ã£o cadastrada com sucesso.",
      );

      setExpandedMeasurementId(nextMeasurement.id || savedProject.measurements.at(-1)?.id || null);
      resetMeasurementForm();
      await loadProjects();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setMeasurementSubmitting(false);
    }
  }

  function onEditMeasurement(measurement) {
    setActiveTab("measurements");
    setMeasurementFeedback("");
    setExpandedMeasurementId(measurement.id);
    setMeasurementForm({
      id: measurement.id,
      number: measurementNumberToString(measurement.number),
      processNumber: measurement.processNumber || "",
      startDate: measurement.startDate || "",
      endDate: measurement.endDate || "",
      amountCents: formatCurrencyFromCents(measurement.amountCents),
    });
  }

  function onDeleteMeasurement(measurementId) {
    if (!editingProject?.id || editingProject.phase !== "contratado") {
      setError("Migre o projeto para contratados antes de excluir medi??es.");
      return;
    }

    setDeleteMeasurementTarget({ id: measurementId });
  }

  async function confirmDeleteMeasurement() {
    if (!deleteMeasurementTarget) {
      return;
    }

    const measurementId = deleteMeasurementTarget.id;
    setMeasurementSubmitting(true);
    setError("");
    setMeasurementFeedback("");

    try {
      const payload = buildProjectPayload({
        measurements: (editingProject.measurements || []).filter((item) => item.id !== measurementId),
      });

      await saveProject(payload, "Medi??o exclu?da com sucesso.");
      if (measurementForm.id === measurementId) {
        resetMeasurementForm();
      }
      if (expandedMeasurementId === measurementId) {
        setExpandedMeasurementId(null);
      }
      setDeleteMeasurementTarget(null);
      await loadProjects();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setMeasurementSubmitting(false);
    }
  }

  function onDelete(project) {
    setDeleteProjectTarget(project);
  }

  async function confirmDeleteProject() {
    if (!deleteProjectTarget) {
      return;
    }

    setDeletingProjectId(deleteProjectTarget.id);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteProjectTarget.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir projeto.");
      }

      setDeleteProjectTarget(null);
      closeModal();
      await loadProjects();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingProjectId(null);
    }
  }

  const measurementTotalCents = useMemo(
    () => (editingProject?.measurements || []).reduce((sum, item) => sum + Number(item.amountCents || 0), 0),
    [editingProject],
  );

  const projectAmountCents = currencyInputToCents(form.amountCents) || editingProject?.amountCents || 0;
  const measurementPercent = formatPercentage(measurementTotalCents, projectAmountCents);
  const editingProjectPhase = editingProject?.phase || (editingProject?.contract ? "contratado" : "banco");

  const projectFundingSummaries = useMemo(() => {
    const paidBySource = new Map();

    (editingProject?.measurements || []).forEach((measurement) => {
      (measurement.payments || []).forEach((payment) => {
        const sourceId = String(payment.sourceId || "").trim();
        if (!sourceId) {
          return;
        }

        paidBySource.set(sourceId, (paidBySource.get(sourceId) || 0) + Number(payment.amountCents || 0));
      });
    });

    return (form.fundingSources || []).map((item) => {
      const sourceId = String(item?.sourceId || "").trim();
      const approvedCents = currencyInputToCents(item?.amountCents) || 0;
      const existingEntry = (editingProject?.fundingSources || []).find((entry) => entry.sourceId === sourceId) || null;
      const source = existingEntry?.source || null;
      const paidCents = paidBySource.get(sourceId) || 0;

      return {
        sourceId,
        approvedCents,
        paidCents,
        approvedRemainingCents: Math.max(approvedCents - paidCents, 0),
        sourceAvailableCents: source ? Number(source.availableCents || 0) : null,
      };
    });
  }, [editingProject, form.fundingSources]);

  function isTabDisabled(tabId) {
    return editingProjectPhase !== "contratado" && LOCKED_TABS.has(tabId);
  }

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.panelToolbar}>
          <div className={styles.listHeader}>
            <h3>{currentViewLabel}</h3>
            <button className={styles.button} type="button" onClick={loadProjects} disabled={loading}>
              Atualizar
            </button>
          </div>

          <div className={styles.searchBar}>
            <label className={styles.searchField}>
              Nome da obra
              <input
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Buscar por nome"
              />
            </label>

            <label className={styles.searchField}>
              Código
              <input
                value={codeFilter}
                onChange={(event) => setCodeFilter(event.target.value)}
                placeholder="Buscar por código"
              />
            </label>

            <div className={styles.searchAction}>
              <button
                className={styles.buttonAlt}
                type="button"
                onClick={() => {
                  setNameFilter("");
                  setCodeFilter("");
                }}
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {!loading && filteredProjects.length > 0 ? (
            <div className={styles.tableHead}>
              <span>COD</span>
              <span>PROJETO</span>
              <span>VALOR</span>
            </div>
          ) : null}
        </div>

        <div className={styles.listViewport}>
          {loading ? (
            <p>Carregando...</p>
          ) : filteredProjects.length === 0 ? (
            <p>Nenhum projeto encontrado nesta vis?o.</p>
          ) : (
            <ul className={styles.list}>
              {filteredProjects.map((project) => {
                const projectPhase = getProjectPhase(project);
                const canReturnToBank = canReturnProjectToBank(project);
                const isPhaseSubmitting = phaseSubmittingId === project.id;

                const phaseAction = projectPhase === "banco"
                  ? {
                      className: styles.phaseChipPrimary,
                      label: isPhaseSubmitting ? "Migrando..." : "Migrar para contratados",
                      onClick: () => requestProjectPhaseChange(project, "contratado"),
                    }
                  : canReturnToBank
                    ? {
                        className: styles.phaseChipSecondary,
                        label: isPhaseSubmitting ? "Voltando..." : "Voltar ao banco",
                        onClick: () => requestProjectPhaseChange(project, "banco"),
                      }
                    : null;

                return (
                  <li key={project.id} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.projectSummaryLine}>
                        <span className={styles.projectCode}>{project.code || "-"}</span>
                        <button type="button" className={styles.projectNameButton} onClick={() => openProject(project)}>
                          {project.name}
                        </button>
                        <span className={styles.projectValue}>{formatCurrencyFromCents(project.amountCents)}</span>
                      </div>
                    </div>

                    {phaseAction ? (
                      <button
                        type="button"
                        className={`${styles.phaseChip} ${phaseAction.className}`}
                        onClick={phaseAction.onClick}
                        disabled={isPhaseSubmitting}
                      >
                        {phaseAction.label}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <AppFooter />

      {phaseDialog ? (
        <div className={styles.phaseDialogOverlay}>
          <div className={styles.phaseDialogCard}>
            <h3>{phaseDialog.title}</h3>
            <p>{phaseDialog.message}</p>
            <div className={styles.actions}>
              <button className={styles.button} type="button" onClick={confirmProjectPhaseChange} disabled={phaseSubmittingId === phaseDialog.project.id}>
                {phaseSubmittingId === phaseDialog.project.id ? "Salvando..." : phaseDialog.confirmLabel}
              </button>
              <button className={styles.buttonAlt} type="button" onClick={() => setPhaseDialog(null)} disabled={phaseSubmittingId === phaseDialog.project.id}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteProjectTarget ? (
        <DeleteConfirmDialog
          title="Excluir projeto"
          message={`O projeto ${deleteProjectTarget.name} sera excluido permanentemente.`}
          busy={deletingProjectId === deleteProjectTarget.id}
          onConfirm={confirmDeleteProject}
          onCancel={() => setDeleteProjectTarget(null)}
        />
      ) : null}

      {deleteMeasurementTarget ? (
        <DeleteConfirmDialog
          title="Excluir medi??o"
          message="A medi??o selecionada sera excluida permanentemente do projeto."
          busy={measurementSubmitting}
          onConfirm={confirmDeleteMeasurement}
          onCancel={() => setDeleteMeasurementTarget(null)}
        />
      ) : null}

      {editingProject ? (
        <div className={styles.floatingOverlay}>
          <div className={styles.floatingCard}>
            <div className={styles.listHeader}>
              <div>
                <h3>
                  Projeto {editingProject.code ? `(${editingProject.code})` : ""}: {editingProject.name}
                </h3>
                <p className={styles.selectedInfo}>
                  Fase atual: {editingProjectPhase === "contratado" ? "Projetos Contratados" : "Banco de Projetos"}
                </p>
              </div>
              <button className={styles.buttonAlt} type="button" onClick={closeModal}>
                Fechar
              </button>
            </div>

            <div className={styles.tabBar}>
              {PROJECT_TABS.map((tab) => {
                const disabled = isTabDisabled(tab.id);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={activeTab === tab.id ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => {
                      if (!disabled) {
                        setActiveTab(tab.id);
                      }
                    }}
                    disabled={disabled}
                    title={disabled ? "Disponível após migrar para Projetos Contratados." : undefined}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "main" ? (
              <div className={styles.tabPanel}>
                <form className={styles.form} onSubmit={onSubmitEdit}>
                  <label>
                    Nome do projeto
                    <input name="name" value={form.name} onChange={onChange} required />
                  </label>

                  <StakeholderSelect
                    label="Responsável (stakeholder)"
                    value={form.stakeholderId}
                    onChange={(id) => setForm((prev) => ({ ...prev, stakeholderId: id }))}
                  />

                  <label>
                    Valor (R$)
                    <input name="amountCents" value={form.amountCents} onChange={onChange} required />
                  </label>

                  <FundingSourcesField
                    value={form.fundingSources}
                    projectAmountCents={currencyInputToCents(form.amountCents) || 0}
                    fundingSummaries={projectFundingSummaries}
                    onChange={(fundingSources) => setForm((prev) => ({ ...prev, fundingSources }))}
                  />

                  <label>
                    Status
                    <select name="status" value={form.status} onChange={onChange}>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Início
                    <input type="date" name="startDate" value={form.startDate} onChange={onChange} />
                  </label>

                  <label>
                    Fim previsto
                    <input type="date" name="endDate" value={form.endDate} onChange={onChange} />
                  </label>

                  <div className={styles.selectedInfo}>
                    <p>
                      Valor atual: {formatCurrencyFromCents(editingProject.amountCents)} | Secretaria: {editingProject.stakeholder?.secretaria?.name || "-"} | Setor: {editingProject.stakeholder?.setor?.name || "-"}
                    </p>
                    {(editingProject.fundingSources || []).length > 0 ? (
                      <p>
                        Fontes atuais: {editingProject.fundingSources.map((item) => `${item.source?.name || "Fonte"} (${formatCurrencyFromCents(item.amountCents)})`).join(" | ")}
                      </p>
                    ) : (
                      <p>Fontes atuais: nenhuma vinculada.</p>
                    )}
                  </div>

                  <div className={styles.modalStickyActions}>
                    <div className={styles.actions}>
                      <button className={styles.button} type="submit" disabled={submitting}>
                        {submitting ? "Salvando..." : "Salvar ediÃ§Ã£o"}
                      </button>
                      <button className={styles.buttonAlt} type="button" onClick={closeModal}>
                        Cancelar
                      </button>
                      <button
                        className={styles.buttonDanger}
                        type="button"
                        onClick={() => onDelete(editingProject)}
                        disabled={deletingProjectId === editingProject.id || submitting}
                      >
                        {deletingProjectId === editingProject.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : null}

            {activeTab === "bidding" ? (
              <ProjectBiddingTab
                project={editingProject}
                error={error}
                onError={setError}
                onSaveBidding={saveBiddingPayload}
              />
            ) : null}

            {activeTab === "contract" ? (
              <ProjectContractTab
                project={editingProject}
                error={error}
                onError={setError}
                onSaveContract={saveContractPayload}
                onRequestMigration={requestProjectMigration}
              />
            ) : null}

            {activeTab === "measurements" ? (
              <div className={styles.tabPanel}>
                <div className={styles.metricsGrid}>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>Valor do projeto</p>
                    <p className={styles.metricValue}>{formatCurrencyFromCents(projectAmountCents)}</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>Total medido</p>
                    <p className={styles.metricValue}>{formatCurrencyFromCents(measurementTotalCents)}</p>
                  </div>
                  <div className={styles.metricCard}>
                    <p className={styles.metricLabel}>Percentual medido</p>
                    <p className={styles.metricValue}>{measurementPercent}</p>
                  </div>
                </div>

                {error ? <p className={styles.error}>{error}</p> : null}
                {measurementFeedback ? <p className={styles.success}>{measurementFeedback}</p> : null}

                {(editingProject.measurements || []).length > 0 ? (
                  <div className={styles.measurementsTableWrap}>
                    <div className={styles.paymentsTableHeader}>
                      <span>#</span>
                      <span>Processo</span>
                      <span>Período</span>
                      <span>Valor</span>
                    </div>
                    <div className={styles.measurementsTableBody}>
                      {editingProject.measurements.map((measurement) => {
                        const isSelected = expandedMeasurementId === measurement.id;

                        return (
                          <div key={measurement.id} className={styles.measurementRowGroup}>
                            <button
                              type="button"
                              className={`${styles.measurementRowButton} ${isSelected ? styles.measurementRowButtonActive : ""}`}
                              onClick={() => onEditMeasurement(measurement)}
                            >
                              <span>{measurement.number}</span>
                              <span>{measurement.processNumber}</span>
                              <span>{formatDateRange(measurement.startDate, measurement.endDate)}</span>
                              <span>{formatCurrencyFromCents(measurement.amountCents)}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p>Nenhuma medição cadastrada ainda.</p>
                )}

                <section className={styles.panel}>
                  <div className={styles.measurementFormHeader}>
                    <h3>{measurementForm.id ? "Editar medição" : "Nova medição"}</h3>
                    {measurementForm.id ? (
                      <button className={styles.buttonAlt} type="button" onClick={resetMeasurementForm}>
                        Cancelar edição
                      </button>
                    ) : null}
                  </div>

                  <form className={styles.form} onSubmit={onSaveMeasurement}>
                    <div className={styles.contractGrid}>
                      <label>
                        Número da medição
                        <input name="number" value={measurementForm.number} onChange={onMeasurementChange} required />
                      </label>
                      <label>
                        Número do processo
                        <input name="processNumber" value={measurementForm.processNumber} onChange={onMeasurementChange} required />
                      </label>
                    </div>

                    <div className={styles.contractGrid}>
                      <label>
                        Data de início
                        <input type="date" name="startDate" value={measurementForm.startDate} onChange={onMeasurementChange} />
                      </label>
                      <label>
                        Data de fim
                        <input type="date" name="endDate" value={measurementForm.endDate} onChange={onMeasurementChange} />
                      </label>
                    </div>

                    <label>
                      Valor da medição (R$)
                      <input name="amountCents" value={measurementForm.amountCents} onChange={onMeasurementChange} required />
                    </label>

                    <div className={styles.actions}>
                      <button className={styles.button} type="submit" disabled={measurementSubmitting}>
                        {measurementSubmitting ? "Salvando..." : measurementForm.id ? "Salvar medição" : "Cadastrar medição"}
                      </button>
                      {measurementForm.id ? (
                        <button
                          className={styles.buttonDanger}
                          type="button"
                          onClick={() => onDeleteMeasurement(measurementForm.id)}
                          disabled={measurementSubmitting}
                        >
                          Excluir
                        </button>
                      ) : null}
                    </div>
                  </form>
                </section>
              </div>
            ) : null}

            {activeTab === "payments" ? (
              <ProjectPaymentsTab
                project={editingProject}
                projectAmountCents={projectAmountCents}
                error={error}
                onError={setError}
                onSaveMeasurements={saveMeasurementsPayload}
              />
            ) : null}

            {activeTab === "environmental" ? (
              <div className={styles.tabPanel}>
                <section className={styles.panel}>
                  <h3>Regularidade Ambiental</h3>
                  <p className={styles.selectedInfo}>Aba reservada para evoluções futuras.</p>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjetosPage() {
  return (
    <Suspense fallback={<div className={styles.page}><section className={styles.panel}><p>Carregando projetos...</p></section></div>}>
      <ProjetosPageContent />
    </Suspense>
  );
}
