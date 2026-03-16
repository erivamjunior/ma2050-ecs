"use client";

import { useEffect, useMemo, useState } from "react";
import AppFooter from "@/components/app-footer";
import CompanyModal, { INITIAL_COMPANY_FORM, STATE_OPTIONS, buildCompanyForm, formatCnpj, formatPhone } from "@/components/company-modal";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import styles from "../../modules.module.css";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [editingCompany, setEditingCompany] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteCompanyState, setDeleteCompanyState] = useState(null);
  const [form, setForm] = useState(INITIAL_COMPANY_FORM);

  async function loadCompanies(preferredSelectedId = null) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/companies", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao carregar empresas.");
      }
      const nextCompanies = data.companies || [];
      setCompanies(nextCompanies);
      setSelectedCompanyId((current) => {
        const targetId = preferredSelectedId || current;
        if (targetId && nextCompanies.some((company) => company.id === targetId)) {
          return targetId;
        }
        return "";
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return companies.filter((company) => {
      if (stateFilter && company.stateCode !== stateFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [company.corporateName, company.tradeName, company.cnpj].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [companies, query, stateFilter]);

  const selectedCompany = useMemo(() => {
    return filteredCompanies.find((company) => company.id === selectedCompanyId) || null;
  }, [filteredCompanies, selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId && !filteredCompanies.some((company) => company.id === selectedCompanyId)) {
      setSelectedCompanyId("");
    }
  }, [filteredCompanies, selectedCompanyId]);

  function openCreateForm() {
    setEditingCompany(null);
    setForm(INITIAL_COMPANY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(company) {
    setEditingCompany(company);
    setForm(buildCompanyForm(company));
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingCompany(null);
    setForm(INITIAL_COMPANY_FORM);
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(editingCompany ? `/api/companies/${editingCompany.id}` : "/api/companies", {
        method: editingCompany ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao salvar empresa.");
      }
      const nextSelectedId = data.company?.id || editingCompany?.id || selectedCompanyId;
      setSuccess(editingCompany ? "Empresa atualizada com sucesso." : "Empresa cadastrada com sucesso.");
      setShowForm(false);
      setEditingCompany(null);
      setForm(INITIAL_COMPANY_FORM);
      await loadCompanies(nextSelectedId);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteCompany() {
    if (!deleteCompanyState) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/companies/${deleteCompanyState.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao excluir empresa.");
      }
      setSuccess("Empresa excluída com sucesso.");
      setDeleteCompanyState(null);
      await loadCompanies();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.listHeader}>
          <div>
            <h3>Partes Interessadas | Empresas</h3>
            <p className={styles.selectedInfo}>Clique na linha da empresa para ver detalhes, editar ou excluir.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.button} type="button" onClick={openCreateForm}>Nova empresa</button>
            <button className={styles.buttonAlt} type="button" onClick={() => loadCompanies(selectedCompanyId)}>Atualizar</button>
          </div>
        </div>

        <div className={styles.searchBar}>
          <label className={styles.searchField}>
            Empresa ou CNPJ
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por razão social, fantasia ou CNPJ" />
          </label>
          <label className={styles.searchField}>
            UF
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
              <option value="">Todas</option>
              {STATE_OPTIONS.map((stateCode) => <option key={stateCode} value={stateCode}>{stateCode}</option>)}
            </select>
          </label>
          <div className={styles.searchAction}>
            <button className={styles.buttonAlt} type="button" onClick={() => { setQuery(""); setStateFilter(""); }}>
              Limpar filtros
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}
        {loading ? <p>Carregando...</p> : null}
        {!loading && filteredCompanies.length === 0 ? <p>Nenhuma empresa cadastrada ainda.</p> : null}

        {!loading && filteredCompanies.length > 0 ? (
          <>
            <div className={styles.companyTableHead}>
              <span>CNPJ</span>
              <span>EMPRESA</span>
              <span>UF</span>
            </div>

            <div className={styles.companyRows}>
              {filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className={`${styles.companyRow} ${selectedCompany?.id === company.id ? styles.companyRowActive : ""}`}
                  onClick={() => setSelectedCompanyId((current) => (current === company.id ? "" : company.id))}
                >
                  <span className={styles.companyRowCnpj}>{formatCnpj(company.cnpj)}</span>
                  <span className={styles.companyRowName}>{company.corporateName}</span>
                  <span className={styles.companyRowState}>{company.stateCode}</span>
                </button>
              ))}
            </div>

            {selectedCompany ? (
              <section className={styles.companyDetailsPanel}>
                <div className={styles.listHeader}>
                  <div>
                    <h4>{selectedCompany.corporateName}</h4>
                    <p className={styles.selectedInfo}>
                      {selectedCompany.tradeName} | CNPJ: {formatCnpj(selectedCompany.cnpj)}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.buttonAlt} type="button" onClick={() => openEditForm(selectedCompany)}>
                      Editar
                    </button>
                    {selectedCompany.canDelete ? (
                      <button className={styles.buttonDanger} type="button" onClick={() => setDeleteCompanyState(selectedCompany)}>
                        Excluir
                      </button>
                    ) : null}
                  </div>
                </div>

                {!selectedCompany.canDelete ? (
                  <p className={styles.selectedInfo}>Empresa vinculada a licitação ou contrato. Exclusão bloqueada.</p>
                ) : null}

                <div className={styles.companyMetaGrid}>
                  <p><strong>UF:</strong> {selectedCompany.stateCode}</p>
                  <p><strong>Porte:</strong> {selectedCompany.companySize}</p>
                  <p><strong>Estabelecimento:</strong> {selectedCompany.establishmentType}</p>
                  <p><strong>Abertura:</strong> {selectedCompany.openedAt}</p>
                  <p><strong>Telefone:</strong> {formatPhone(selectedCompany.phone)}</p>
                  <p><strong>Email:</strong> {selectedCompany.email}</p>
                  <p><strong>CNAE principal:</strong> {selectedCompany.mainCnaeCode}</p>
                  <p><strong>Natureza jurídica:</strong> {selectedCompany.legalNatureCode}</p>
                  <p className={styles.companyAddress}><strong>Endereço:</strong> {selectedCompany.address}</p>
                  <p className={styles.companyDescription}><strong>Atividade econômica principal:</strong> {selectedCompany.mainEconomicActivityDescription}</p>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </section>

      <AppFooter />

      <CompanyModal
        open={showForm}
        form={form}
        onChange={updateField}
        onSubmit={submitForm}
        onClose={closeForm}
        saving={saving}
        title={editingCompany ? "Editar empresa" : "Nova empresa"}
        description="Todos os campos são obrigatórios nesta primeira versão."
        submitLabel={editingCompany ? "Salvar edição" : "Cadastrar empresa"}
      />

      {deleteCompanyState ? (
        <DeleteConfirmDialog
          title="Excluir empresa"
          message={`A empresa ${deleteCompanyState.corporateName} será excluída permanentemente.`}
          busy={saving}
          onConfirm={confirmDeleteCompany}
          onCancel={() => setDeleteCompanyState(null)}
        />
      ) : null}
    </div>
  );
}
