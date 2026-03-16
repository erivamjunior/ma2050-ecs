"use client";

import { useEffect, useMemo, useState } from "react";
import AppFooter from "@/components/app-footer";
import styles from "../../modules.module.css";

const INITIAL_FORM = {
  name: "",
  sigla: "",
  secretariaId: "",
};

export default function SubunidadesPage() {
  const [setores, setSetores] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [secretariaFilter, setSecretariaFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  async function loadCatalog() {
    setLoading(true);
    setError("");
    try {
      const [setoresResponse, secretariasResponse] = await Promise.all([
        fetch("/api/setores", { cache: "no-store" }),
        fetch("/api/secretarias", { cache: "no-store" }),
      ]);
      const setoresData = await setoresResponse.json();
      const secretariasData = await secretariasResponse.json();

      if (!setoresResponse.ok) {
        throw new Error(setoresData.error || "Falha ao carregar subunidades.");
      }
      if (!secretariasResponse.ok) {
        throw new Error(secretariasData.error || "Falha ao carregar secretarias.");
      }

      setSetores(setoresData.setores || []);
      setSecretarias(secretariasData.secretarias || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const secretariaById = useMemo(
    () => new Map(secretarias.map((secretaria) => [secretaria.id, secretaria])),
    [secretarias],
  );

  const filteredSetores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return setores.filter((setor) => {
      if (secretariaFilter && setor.secretariaId !== secretariaFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const secretaria = secretariaById.get(setor.secretariaId);
      return [setor.name, setor.sigla, secretaria?.name, secretaria?.sigla].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [query, secretariaById, secretariaFilter, setores]);

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/setores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao cadastrar subunidade.");
      }
      setSuccess("Subunidade cadastrada com sucesso.");
      setForm(INITIAL_FORM);
      setShowForm(false);
      await loadCatalog();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.listHeader}>
          <div>
            <h3>Partes Interessadas | Subunidades</h3>
            <p className={styles.selectedInfo}>Use aqui CSL, adjuntas, assessorias e outras unidades responsáveis.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.button} type="button" onClick={() => setShowForm(true)}>Nova subunidade</button>
            <button className={styles.buttonAlt} type="button" onClick={loadCatalog}>Atualizar</button>
          </div>
        </div>

        <div className={styles.searchBar}>
          <label className={styles.searchField}>
            Subunidade
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, sigla ou secretaria" />
          </label>
          <label className={styles.searchField}>
            Secretaria
            <select value={secretariaFilter} onChange={(event) => setSecretariaFilter(event.target.value)}>
              <option value="">Todas</option>
              {secretarias.map((secretaria) => (
                <option key={secretaria.id} value={secretaria.id}>{secretaria.sigla}</option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}
        {loading ? <p>Carregando...</p> : null}
        {!loading && filteredSetores.length === 0 ? <p>Nenhuma subunidade cadastrada ainda.</p> : null}

        {!loading && filteredSetores.length > 0 ? (
          <>
            <div className={styles.registrySubTableHead}>
              <span>SIGLA</span>
              <span>SUBUNIDADE</span>
              <span>SECRETARIA</span>
            </div>
            <div className={styles.registryRows}>
              {filteredSetores.map((setor) => {
                const secretaria = secretariaById.get(setor.secretariaId) || null;
                return (
                  <div key={setor.id} className={styles.registrySubRow}>
                    <span className={styles.registryCode}>{setor.sigla}</span>
                    <span className={styles.registryName}>{setor.name}</span>
                    <span className={styles.registryMeta}>{secretaria ? `${secretaria.sigla} | ${secretaria.name}` : "-"}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </section>

      <AppFooter />

      {showForm ? (
        <div className={styles.floatingOverlay}>
          <div className={styles.floatingCard}>
            <div className={styles.listHeader}>
              <div>
                <h3>Nova subunidade</h3>
                <p className={styles.selectedInfo}>Associe a subunidade a uma secretaria.</p>
              </div>
              <button className={styles.buttonAlt} type="button" onClick={() => setShowForm(false)} disabled={saving}>Fechar</button>
            </div>

            <form className={styles.form} onSubmit={submitForm}>
              <div className={styles.contractGrid}>
                <label>
                  Secretaria
                  <select value={form.secretariaId} onChange={(event) => setForm((prev) => ({ ...prev, secretariaId: event.target.value }))} required>
                    <option value="">Selecione...</option>
                    {secretarias.map((secretaria) => (
                      <option key={secretaria.id} value={secretaria.id}>{secretaria.sigla} | {secretaria.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nome da subunidade
                  <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
                </label>
                <label>
                  Sigla
                  <input value={form.sigla} onChange={(event) => setForm((prev) => ({ ...prev, sigla: event.target.value }))} required />
                </label>
              </div>
              <div className={styles.actions}>
                <button className={styles.button} type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar subunidade"}</button>
                <button className={styles.buttonAlt} type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
