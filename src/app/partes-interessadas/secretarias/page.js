"use client";

import { useEffect, useMemo, useState } from "react";
import AppFooter from "@/components/app-footer";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import SecretariaModal from "@/components/secretaria-modal";
import SubunidadeModal from "@/components/subunidade-modal";
import styles from "../../modules.module.css";

const INITIAL_SECRETARIA_FORM = {
  id: null,
  name: "",
  sigla: "",
};

const INITIAL_SUBUNIDADE_FORM = {
  id: null,
  name: "",
  sigla: "",
  secretariaId: "",
};

export default function SecretariasPage() {
  const [secretarias, setSecretarias] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSecretaria, setSavingSecretaria] = useState(false);
  const [savingSubunidade, setSavingSubunidade] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [expandedSecretariaId, setExpandedSecretariaId] = useState(null);
  const [showSecretariaForm, setShowSecretariaForm] = useState(false);
  const [showSubunidadeForm, setShowSubunidadeForm] = useState(false);
  const [secretariaForm, setSecretariaForm] = useState(INITIAL_SECRETARIA_FORM);
  const [subunidadeForm, setSubunidadeForm] = useState(INITIAL_SUBUNIDADE_FORM);
  const [deleteDialog, setDeleteDialog] = useState(null);

  async function loadCatalog() {
    setLoading(true);
    setError("");

    try {
      const [secretariasResponse, setoresResponse] = await Promise.all([
        fetch("/api/secretarias", { cache: "no-store" }),
        fetch("/api/setores", { cache: "no-store" }),
      ]);

      const secretariasData = await secretariasResponse.json();
      const setoresData = await setoresResponse.json();

      if (!secretariasResponse.ok) {
        throw new Error(secretariasData.error || "Falha ao carregar secretarias.");
      }

      if (!setoresResponse.ok) {
        throw new Error(setoresData.error || "Falha ao carregar subunidades.");
      }

      setSecretarias(secretariasData.secretarias || []);
      setSetores(setoresData.setores || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const subunidadesBySecretaria = useMemo(() => {
    const map = new Map();

    for (const setor of setores) {
      const current = map.get(setor.secretariaId) || [];
      current.push(setor);
      map.set(setor.secretariaId, current);
    }

    for (const value of map.values()) {
      value.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
    }

    return map;
  }, [setores]);

  const filteredSecretarias = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return secretarias.filter((secretaria) => {
      if (!normalizedQuery) {
        return true;
      }

      return [secretaria.name, secretaria.sigla].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [query, secretarias]);

  function openSecretariaCreate() {
    setSecretariaForm(INITIAL_SECRETARIA_FORM);
    setShowSecretariaForm(true);
  }

  function openSecretariaEdit(secretaria) {
    setSecretariaForm({
      id: secretaria.id,
      name: secretaria.name,
      sigla: secretaria.sigla,
    });
    setShowSecretariaForm(true);
  }

  function openSubunidadeCreate(secretariaId) {
    setSubunidadeForm({ ...INITIAL_SUBUNIDADE_FORM, secretariaId });
    setShowSubunidadeForm(true);
  }

  function openSubunidadeEdit(subunidade) {
    setSubunidadeForm({
      id: subunidade.id,
      name: subunidade.name,
      sigla: subunidade.sigla,
      secretariaId: subunidade.secretariaId,
    });
    setShowSubunidadeForm(true);
  }

  async function submitSecretaria(event) {
    event.preventDefault();
    setSavingSecretaria(true);
    setError("");
    setSuccess("");

    try {
      const isEditing = Boolean(secretariaForm.id);
      const response = await fetch(isEditing ? `/api/secretarias/${secretariaForm.id}` : "/api/secretarias", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: secretariaForm.name, sigla: secretariaForm.sigla }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditing ? "Falha ao atualizar secretaria." : "Falha ao cadastrar secretaria."));
      }

      setSuccess(isEditing ? "Secretaria atualizada com sucesso." : "Secretaria cadastrada com sucesso.");
      setSecretariaForm(INITIAL_SECRETARIA_FORM);
      setShowSecretariaForm(false);
      await loadCatalog();
      if (isEditing) {
        setExpandedSecretariaId(data.secretaria.id);
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSavingSecretaria(false);
    }
  }

  async function submitSubunidade(event) {
    event.preventDefault();
    setSavingSubunidade(true);
    setError("");
    setSuccess("");

    try {
      const isEditing = Boolean(subunidadeForm.id);
      const response = await fetch(isEditing ? `/api/setores/${subunidadeForm.id}` : "/api/setores", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subunidadeForm.name,
          sigla: subunidadeForm.sigla,
          secretariaId: subunidadeForm.secretariaId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditing ? "Falha ao atualizar subunidade." : "Falha ao cadastrar subunidade."));
      }

      setSuccess(isEditing ? "Subunidade atualizada com sucesso." : "Subunidade cadastrada com sucesso.");
      setSubunidadeForm(INITIAL_SUBUNIDADE_FORM);
      setShowSubunidadeForm(false);
      setExpandedSecretariaId(isEditing ? data.setor.secretariaId : subunidadeForm.secretariaId);
      await loadCatalog();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSavingSubunidade(false);
    }
  }

  function askDeleteSecretaria(secretaria) {
    setDeleteDialog({
      type: "secretaria",
      id: secretaria.id,
      title: `Excluir secretaria ${secretaria.sigla}`,
      message: `A secretaria ${secretaria.name} será excluída. Essa ação só será concluída se ela não possuir vínculos ativos.`,
    });
  }

  function askDeleteSubunidade(subunidade) {
    setDeleteDialog({
      type: "subunidade",
      id: subunidade.id,
      title: `Excluir subunidade ${subunidade.sigla}`,
      message: `A subunidade ${subunidade.name} será excluída. Essa ação só será concluída se ela não possuir vínculos ativos.`,
      secretariaId: subunidade.secretariaId,
    });
  }

  async function confirmDelete() {
    if (!deleteDialog) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const basePath = deleteDialog.type === "secretaria" ? "/api/secretarias" : "/api/setores";
      const response = await fetch(`${basePath}/${deleteDialog.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao excluir registro.");
      }

      setSuccess(deleteDialog.type === "secretaria" ? "Secretaria excluída com sucesso." : "Subunidade excluída com sucesso.");
      if (deleteDialog.type === "secretaria" && expandedSecretariaId === deleteDialog.id) {
        setExpandedSecretariaId(null);
      }
      await loadCatalog();
      setDeleteDialog(null);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.listHeader}>
          <div>
            <h3>Partes Envolvidas | Secretarias</h3>
            <p className={styles.selectedInfo}>Cadastre a secretaria e, dentro dela, as subunidades que poderão atuar em licitações, contratos e projetos.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.button} type="button" onClick={openSecretariaCreate}>Nova secretaria</button>
            <button className={styles.buttonAlt} type="button" onClick={loadCatalog}>Atualizar</button>
          </div>
        </div>

        <div className={styles.searchBar}>
          <label className={styles.searchField}>
            Secretaria
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar secretaria por nome ou sigla" />
          </label>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}
        {loading ? <p>Carregando...</p> : null}
        {!loading && filteredSecretarias.length === 0 ? <p>Nenhuma secretaria cadastrada ainda.</p> : null}

        {!loading && filteredSecretarias.length > 0 ? (
          <>
            <div className={styles.registryTableHead}>
              <span>SIGLA</span>
              <span>SECRETARIA</span>
            </div>
            <div className={styles.registryRows}>
              {filteredSecretarias.map((secretaria) => {
                const isExpanded = expandedSecretariaId === secretaria.id;
                const subunidades = subunidadesBySecretaria.get(secretaria.id) || [];

                return (
                  <div key={secretaria.id}>
                    <button
                      type="button"
                      className={`${styles.registryRowButton} ${isExpanded ? styles.registryRowButtonActive : ""}`}
                      onClick={() => setExpandedSecretariaId((current) => (current === secretaria.id ? null : secretaria.id))}
                    >
                      <span className={styles.registryCode}>{secretaria.sigla}</span>
                      <span className={styles.registryName}>{secretaria.name}</span>
                    </button>

                    {isExpanded ? (
                      <div className={styles.registryDetailsPanel}>
                        <div className={styles.listHeader}>
                          <div>
                            <h3>Subunidades de {secretaria.sigla}</h3>
                            <p className={styles.selectedInfo}>{subunidades.length ? `${subunidades.length} subunidade(s) cadastrada(s).` : "Nenhuma subunidade cadastrada ainda."}</p>
                          </div>
                          <div className={styles.actions}>
                            <button className={styles.buttonAlt} type="button" onClick={() => openSecretariaEdit(secretaria)}>
                              Editar secretaria
                            </button>
                            <button className={styles.buttonDanger} type="button" onClick={() => askDeleteSecretaria(secretaria)}>
                              Excluir secretaria
                            </button>
                            <button className={styles.button} type="button" onClick={() => openSubunidadeCreate(secretaria.id)}>
                              Nova subunidade
                            </button>
                          </div>
                        </div>

                        {subunidades.length ? (
                          <>
                            <div className={styles.registryTableHead}>
                              <span>SIGLA</span>
                              <span>SUBUNIDADE</span>
                            </div>
                            <div className={styles.registryRows}>
                              {subunidades.map((subunidade) => (
                                <div key={subunidade.id} className={styles.registryActionRow}>
                                  <span className={styles.registryCode}>{subunidade.sigla}</span>
                                  <span className={styles.registryName}>{subunidade.name}</span>
                                  <div className={styles.actions}>
                                    <button className={styles.buttonAlt} type="button" onClick={() => openSubunidadeEdit(subunidade)}>
                                      Editar
                                    </button>
                                    <button className={styles.buttonDanger} type="button" onClick={() => askDeleteSubunidade(subunidade)}>
                                      Excluir
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </section>

      <AppFooter />

            <SecretariaModal
        open={showSecretariaForm}
        form={secretariaForm}
        onChange={(field, value) => setSecretariaForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={submitSecretaria}
        onClose={() => setShowSecretariaForm(false)}
        saving={savingSecretaria}
        title={secretariaForm.id ? "Editar secretaria" : "Nova secretaria"}
        description="Informe apenas nome e sigla."
        submitLabel={secretariaForm.id ? "Salvar edi??o" : "Salvar secretaria"}
      />

      <SubunidadeModal
        open={showSubunidadeForm}
        form={subunidadeForm}
        secretarias={secretarias}
        onChange={(field, value) => setSubunidadeForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={submitSubunidade}
        onClose={() => setShowSubunidadeForm(false)}
        saving={savingSubunidade}
        title={subunidadeForm.id ? "Editar subunidade" : "Nova subunidade"}
        description="Informe nome e sigla da subunidade dentro da secretaria escolhida."
        submitLabel={subunidadeForm.id ? "Salvar edi??o" : "Salvar subunidade"}
      />

{deleteDialog ? (
        <DeleteConfirmDialog
          title={deleteDialog.title}
          message={deleteDialog.message}
          confirmLabel="Excluir"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteDialog(null)}
        />
      ) : null}
    </div>
  );
}
