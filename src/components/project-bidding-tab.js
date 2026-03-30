"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CompanyModal, { INITIAL_COMPANY_FORM, buildCompanyForm, formatCnpj } from "@/components/company-modal";
import SearchableCreateSelect from "@/components/searchable-create-select";
import SecretariaModal from "@/components/secretaria-modal";
import SubunidadeModal from "@/components/subunidade-modal";
import styles from "@/app/modules.module.css";

const MODALITY_OPTIONS = [
  "Concorrência",
  "Pregão",
  "Tomada de Preços",
  "Convite",
  "Concurso",
  "Leilão",
  "Dispensa",
  "Inexigibilidade",
  "RDC",
  "Outro",
];

const EMPTY_BIDDING = {
  biddingNumber: "",
  secretariaId: "",
  setorId: "",
  companyId: "",
  administrativeProcessNumber: "",
  modality: "",
  objectDescription: "",
  bidValueCents: "",
  homologatedValueCents: "",
  winnerName: "",
  winnerCnpj: "",
  publishedAt: "",
  homologatedAt: "",
};

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

function normalizeBiddingForForm(bidding) {
  if (!bidding) {
    return { ...EMPTY_BIDDING };
  }

  return {
    biddingNumber: bidding.biddingNumber || "",
    secretariaId: bidding.secretariaId || "",
    setorId: bidding.setorId || "",
    companyId: bidding.companyId || "",
    administrativeProcessNumber: bidding.administrativeProcessNumber || "",
    modality: bidding.modality || "",
    objectDescription: bidding.objectDescription || "",
    bidValueCents: bidding.bidValueCents ? formatCurrencyFromCents(bidding.bidValueCents) : "",
    homologatedValueCents: bidding.homologatedValueCents ? formatCurrencyFromCents(bidding.homologatedValueCents) : "",
    winnerName: bidding.winnerName || "",
    winnerCnpj: bidding.winnerCnpj || "",
    publishedAt: bidding.publishedAt || "",
    homologatedAt: bidding.homologatedAt || "",
  };
}

function buildBiddingPayload(form) {
  const payload = {
    biddingNumber: form.biddingNumber.trim(),
    secretariaId: form.secretariaId.trim(),
    setorId: form.setorId.trim(),
    companyId: form.companyId.trim(),
    administrativeProcessNumber: form.administrativeProcessNumber.trim(),
    modality: form.modality.trim(),
    objectDescription: form.objectDescription.trim(),
    bidValueCents: currencyInputToCents(form.bidValueCents),
    homologatedValueCents: currencyInputToCents(form.homologatedValueCents),
    winnerName: form.winnerName.trim(),
    winnerCnpj: form.winnerCnpj.trim(),
    publishedAt: form.publishedAt || null,
    homologatedAt: form.homologatedAt || null,
  };

  const hasAnyValue = Object.values(payload).some(Boolean);
  return hasAnyValue ? payload : null;
}

export default function ProjectBiddingTab({ project, error, onError, onSaveBidding }) {
  const [form, setForm] = useState(normalizeBiddingForForm(project?.bidding));
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [secretariaSaving, setSecretariaSaving] = useState(false);
  const [setorSaving, setSetorSaving] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [secretarias, setSecretarias] = useState([]);
  const [setores, setSetores] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showSecretariaModal, setShowSecretariaModal] = useState(false);
  const [showSetorModal, setShowSetorModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [secretariaForm, setSecretariaForm] = useState({ name: "", sigla: "" });
  const [setorForm, setSetorForm] = useState({ name: "", sigla: "", secretariaId: "" });
  const [companyForm, setCompanyForm] = useState(INITIAL_COMPANY_FORM);

  const filteredSetores = useMemo(
    () => setores.filter((setor) => setor.secretariaId === form.secretariaId),
    [setores, form.secretariaId],
  );

  const selectedSecretaria = useMemo(
    () => secretarias.find((secretaria) => secretaria.id === form.secretariaId) || null,
    [secretarias, form.secretariaId],
  );

  const selectedSetor = useMemo(
    () => filteredSetores.find((setor) => setor.id === form.setorId) || null,
    [filteredSetores, form.setorId],
  );

  const selectedCompany = useMemo(() => {
    const companyId = String(form.companyId || "").trim();
    if (companyId) {
      return companies.find((company) => company.id === companyId) || null;
    }

    const normalizedCnpj = String(form.winnerCnpj || "").replace(/\D/g, "");
    return companies.find((company) => company.cnpj === normalizedCnpj) || null;
  }, [companies, form.companyId, form.winnerCnpj]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    onError("");

    try {
      const [secretariasResponse, setoresResponse, companiesResponse] = await Promise.all([
        fetch("/api/secretarias", { cache: "no-store" }),
        fetch("/api/setores", { cache: "no-store" }),
        fetch("/api/companies", { cache: "no-store" }),
      ]);

      const secretariasData = await secretariasResponse.json();
      const setoresData = await setoresResponse.json();
      const companiesData = await companiesResponse.json();

      if (!secretariasResponse.ok) {
        throw new Error(secretariasData.error || "Erro ao carregar secretarias.");
      }

      if (!setoresResponse.ok) {
        throw new Error(setoresData.error || "Erro ao carregar subunidades.");
      }

      if (!companiesResponse.ok) {
        throw new Error(companiesData.error || "Erro ao carregar empresas.");
      }

      setSecretarias(secretariasData.secretarias || []);
      setSetores(setoresData.setores || []);
      setCompanies(companiesData.companies || []);
    } catch (loadError) {
      onError(loadError.message);
    } finally {
      setCatalogLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const nextForm = normalizeBiddingForForm(project?.bidding);
    setForm(nextForm);
    setFeedback("");
    setShowSecretariaModal(false);
    setShowSetorModal(false);
    setShowCompanyModal(false);
    setSecretariaForm({ name: "", sigla: "" });
    setSetorForm({ name: "", sigla: "", secretariaId: nextForm.secretariaId || "" });
    setCompanyForm(INITIAL_COMPANY_FORM);
  }, [project]);

  function onChange(event) {
    const { name, value } = event.target;

    if (name === "bidValueCents" || name === "homologatedValueCents") {
      setForm((prev) => ({ ...prev, [name]: maskCurrencyInput(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function selectSecretaria(secretaria) {
    setForm((prev) => ({
      ...prev,
      secretariaId: secretaria.id,
      setorId: "",
    }));
    setSetorForm((prev) => ({ ...prev, secretariaId: secretaria.id }));
  }

  function selectSetor(setor) {
    setForm((prev) => ({ ...prev, setorId: setor.id }));
  }

  function selectCompany(company) {
    setForm((prev) => ({
      ...prev,
      companyId: company.id,
      winnerName: company.corporateName,
      winnerCnpj: company.cnpj,
    }));
  }

  function openSecretariaModalFromSearch(query) {
    setSecretariaForm({
      name: query,
      sigla: "",
    });
    setShowSecretariaModal(true);
  }

  function openSetorModalFromSearch(query) {
    if (!form.secretariaId) {
      onError("Selecione uma secretaria antes de cadastrar a subunidade.");
      return;
    }

    setSetorForm({
      name: query,
      sigla: "",
      secretariaId: form.secretariaId,
    });
    setShowSetorModal(true);
  }

  function openCompanyModalFromSearch(query) {
    setCompanyForm({
      ...buildCompanyForm(null),
      corporateName: query,
      tradeName: query,
    });
    setShowCompanyModal(true);
  }

  async function saveSecretaria() {
    setSecretariaSaving(true);
    onError("");

    try {
      const response = await fetch("/api/secretarias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(secretariaForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar secretaria.");
      }

      setSecretariaForm({ name: "", sigla: "" });
      setShowSecretariaModal(false);
      await loadCatalog();
      setForm((prev) => ({ ...prev, secretariaId: data.secretaria.id, setorId: "" }));
      setSetorForm({ name: "", sigla: "", secretariaId: data.secretaria.id });
    } catch (saveError) {
      onError(saveError.message);
    } finally {
      setSecretariaSaving(false);
    }
  }

  async function saveSetor() {
    setSetorSaving(true);
    onError("");

    try {
      const payload = {
        ...setorForm,
        secretariaId: setorForm.secretariaId || form.secretariaId,
      };

      const response = await fetch("/api/setores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar subunidade.");
      }

      setSetorForm({ name: "", sigla: "", secretariaId: data.setor.secretariaId });
      setShowSetorModal(false);
      await loadCatalog();
      setForm((prev) => ({
        ...prev,
        secretariaId: data.setor.secretariaId,
        setorId: data.setor.id,
      }));
    } catch (saveError) {
      onError(saveError.message);
    } finally {
      setSetorSaving(false);
    }
  }

  async function saveCompany() {
    setCompanySaving(true);
    onError("");

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar empresa.");
      }

      setCompanyForm(INITIAL_COMPANY_FORM);
      setShowCompanyModal(false);
      await loadCatalog();
      selectCompany(data.company);
    } catch (saveError) {
      onError(saveError.message);
    } finally {
      setCompanySaving(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    onError("");
    setFeedback("");

    try {
      const payload = buildBiddingPayload(form);
      await onSaveBidding(payload);
      setFeedback(project?.bidding ? "Licitação atualizada com sucesso." : "Licitação registrada com sucesso.");
    } catch (saveError) {
      onError(saveError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.tabPanel}>
      <section className={styles.panel}>
        <div className={styles.measurementFormHeader}>
          <h3>Licitação vinculada ao projeto</h3>
          <button className={styles.buttonAlt} type="button" onClick={loadCatalog} disabled={catalogLoading}>
            {catalogLoading ? "Atualizando..." : "Atualizar base"}
          </button>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {feedback ? <p className={styles.success}>{feedback}</p> : null}

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.contractGrid}>
            <label>
              Número da licitação
              <input name="biddingNumber" value={form.biddingNumber} onChange={onChange} required />
            </label>
            <label>
              Modalidade
              <select name="modality" value={form.modality} onChange={onChange} required>
                <option value="">Selecione...</option>
                {MODALITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.contractGrid}>
            <label>
              Secretaria responsável
              <SearchableCreateSelect
                selectedItem={selectedSecretaria}
                items={secretarias}
                getItemKey={(secretaria) => secretaria.id}
                getItemSearchText={(secretaria) => [secretaria.sigla, secretaria.name].join(" ")}
                renderSelected={(secretaria) => `${secretaria.sigla} | ${secretaria.name}`}
                renderOption={(secretaria) => <span>{secretaria.sigla} | {secretaria.name}</span>}
                searchPlaceholder="Buscar por sigla ou nome"
                emptyMessage="Nenhuma secretaria encontrada para essa busca."
                addLabel="+ Adicionar nova secretaria"
                onSelect={selectSecretaria}
                onAdd={openSecretariaModalFromSearch}
                initialQuery={selectedSecretaria ? `${selectedSecretaria.sigla} | ${selectedSecretaria.name}` : ""}
              />
            </label>
            <label>
              Subunidade responsável
              <SearchableCreateSelect
                selectedItem={selectedSetor}
                items={filteredSetores}
                getItemKey={(setor) => setor.id}
                getItemSearchText={(setor) => [setor.sigla, setor.name].join(" ")}
                renderSelected={(setor) => `${setor.sigla} | ${setor.name}`}
                renderOption={(setor) => <span>{setor.sigla} | {setor.name}</span>}
                searchPlaceholder={form.secretariaId ? "Buscar por sigla ou nome" : "Selecione uma secretaria antes"}
                emptyMessage="Nenhuma subunidade encontrada para essa busca."
                addLabel="+ Adicionar nova subunidade"
                onSelect={selectSetor}
                onAdd={openSetorModalFromSearch}
                initialQuery={selectedSetor ? `${selectedSetor.sigla} | ${selectedSetor.name}` : ""}
                disabled={!form.secretariaId}
              />
            </label>
          </div>

          <label>
            Processo administrativo
            <input name="administrativeProcessNumber" value={form.administrativeProcessNumber} onChange={onChange} required />
          </label>

          <label>
            Objeto da licitação
            <input name="objectDescription" value={form.objectDescription} onChange={onChange} placeholder="Resumo do objeto licitado" />
          </label>

          <div className={styles.contractGrid}>
            <label>
              Valor licitado (R$)
              <input name="bidValueCents" value={form.bidValueCents} onChange={onChange} required />
            </label>
            <label>
              Valor homologado (R$)
              <input name="homologatedValueCents" value={form.homologatedValueCents} onChange={onChange} required />
            </label>
          </div>

          <div className={styles.contractGrid}>
            <label>
              Data de publicação
              <input type="date" name="publishedAt" value={form.publishedAt} onChange={onChange} />
            </label>
            <label>
              Data de homologação
              <input type="date" name="homologatedAt" value={form.homologatedAt} onChange={onChange} />
            </label>
          </div>

          <div className={styles.contractGrid}>
            <label>
              Empresa vencedora
              <SearchableCreateSelect
                selectedItem={selectedCompany}
                items={companies}
                getItemKey={(company) => company.id}
                getItemSearchText={(company) => [company.corporateName, company.tradeName, company.cnpj, formatCnpj(company.cnpj)].join(" ")}
                renderSelected={(company) => `${company.corporateName} | ${formatCnpj(company.cnpj)}`}
                renderOption={(company) => (
                  <>
                    <span>{company.corporateName}</span>
                    <strong>{formatCnpj(company.cnpj)}</strong>
                  </>
                )}
                searchPlaceholder="Buscar por CNPJ ou nome"
                emptyMessage="Nenhuma empresa encontrada para essa busca."
                addLabel="+ Adicionar nova empresa"
                onSelect={selectCompany}
                onAdd={openCompanyModalFromSearch}
                initialQuery={selectedCompany ? `${selectedCompany.corporateName} | ${formatCnpj(selectedCompany.cnpj)}` : ""}
              />
            </label>

            <label>
              CNPJ da empresa vencedora
              <input value={selectedCompany ? formatCnpj(selectedCompany.cnpj) : ""} readOnly disabled className={styles.readonlyField} />
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar licitação"}
            </button>
          </div>
        </form>
      </section>

      <SecretariaModal
        open={showSecretariaModal}
        form={secretariaForm}
        onChange={(field, value) => setSecretariaForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={(event) => { event.preventDefault(); void saveSecretaria(); }}
        onClose={() => setShowSecretariaModal(false)}
        saving={secretariaSaving}
        title="Nova secretaria"
        description="Use o mesmo cadastro de secretaria do módulo de Partes Envolvidas."
        submitLabel="Salvar secretaria"
      />

      <SubunidadeModal
        open={showSetorModal}
        form={setorForm}
        secretarias={secretarias}
        onChange={(field, value) => setSetorForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={(event) => { event.preventDefault(); void saveSetor(); }}
        onClose={() => setShowSetorModal(false)}
        saving={setorSaving}
        title="Nova subunidade"
        description="Use o mesmo cadastro de subunidade do módulo de Partes Envolvidas."
        submitLabel="Salvar subunidade"
      />

      <CompanyModal
        open={showCompanyModal}
        form={companyForm}
        onChange={(field, value) => setCompanyForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={(event) => { event.preventDefault(); void saveCompany(); }}
        onClose={() => setShowCompanyModal(false)}
        saving={companySaving}
        title="Nova empresa"
        description="Use o mesmo cadastro de empresa do módulo de Partes Envolvidas."
        submitLabel="Cadastrar empresa"
      />
    </div>
  );
}
