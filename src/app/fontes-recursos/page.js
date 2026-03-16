"use client";

import { useEffect, useState } from "react";
import AppFooter from "@/components/app-footer";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import styles from "../modules.module.css";

function formatCurrencyFromCents(cents) {
  const amount = Number(cents || 0) / 100;
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

const INITIAL_FORM = {
  id: "",
  name: "",
  amountCents: "",
};

export default function FontesRecursosPage() {
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditing = Boolean(form.id);

  async function loadSources() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/funding-sources", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar fontes de recurso.");
      }

      setSources(data.sources || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  function resetForm() {
    setForm(INITIAL_FORM);
  }

  function startEdit(source) {
    setForm({
      id: source.id,
      name: source.name,
      amountCents: formatCurrencyFromCents(source.amountCents),
    });
    setError("");
    setSuccess("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const value = currencyInputToCents(form.amountCents);
      if (value === null) {
        throw new Error("Informe o valor da fonte.");
      }

      const response = await fetch("/api/funding-sources", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, name: form.name, amountCents: value }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (isEditing ? "Erro ao atualizar fonte." : "Erro ao cadastrar fonte."));
      }

      resetForm();
      setSuccess(isEditing ? "Fonte de recurso atualizada com sucesso." : "Fonte de recurso cadastrada com sucesso.");
      await loadSources();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function onDelete(source) {
    setDeleteTarget(source);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeletingId(deleteTarget.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/funding-sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir fonte.");
      }

      if (form.id === deleteTarget.id) {
        resetForm();
      }

      setSuccess("Fonte de recurso excluida com sucesso.");
      setDeleteTarget(null);
      await loadSources();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Modulo: Fontes de Recursos</h2>
        <p>Cadastre, edite e exclua as fontes de financiamento dos projetos.</p>
      </header>

      <section className={styles.panel}>
        <h3>{isEditing ? "Editar fonte" : "Nova fonte"}</h3>
        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            Nome da fonte de recurso
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>

          <label>
            Valor total da fonte (R$)
            <input
              value={form.amountCents}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amountCents: maskCurrencyInput(event.target.value) }))
              }
              placeholder="R$ 0,00"
              required
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : isEditing ? "Salvar edicao" : "Cadastrar fonte"}
            </button>
            <button className={styles.buttonAlt} type="button" onClick={loadSources}>
              Atualizar lista
            </button>
            {isEditing ? (
              <button className={styles.buttonAlt} type="button" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>{success}</p> : null}
      </section>

      <section className={styles.panel}>
        <h3>Fontes cadastradas</h3>

        {loading ? <p>Carregando...</p> : null}
        {!loading && sources.length === 0 ? <p>Nenhuma fonte cadastrada ainda.</p> : null}

        {!loading && sources.length > 0 ? (
          <ul className={styles.list}>
            {sources.map((source) => (
              <li key={source.id} className={styles.item}>
                <div className={styles.listHeader}>
                  <strong>{source.name}</strong>
                  <div className={styles.actions}>
                    <button className={styles.buttonAlt} type="button" onClick={() => startEdit(source)}>
                      Editar
                    </button>
                    <button
                      className={styles.buttonDanger}
                      type="button"
                      onClick={() => onDelete(source)}
                      disabled={deletingId === source.id}
                    >
                      {deletingId === source.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </div>
                <div className={styles.sourceStatsGrid}>
                  <div className={styles.sourceStatBox}>
                    <span>Total da fonte</span>
                    <strong>{formatCurrencyFromCents(source.amountCents)}</strong>
                  </div>
                  <div className={styles.sourceStatBox}>
                    <span>Aprovado</span>
                    <strong>{formatCurrencyFromCents(source.approvedCents)}</strong>
                  </div>
                  <div className={styles.sourceStatBox}>
                    <span>Pago</span>
                    <strong>{formatCurrencyFromCents(source.paidCents)}</strong>
                  </div>
                  <div className={styles.sourceStatBox}>
                    <span>Saldo aprovado</span>
                    <strong>{formatCurrencyFromCents(Math.max(Number(source.approvedCents || 0) - Number(source.paidCents || 0), 0))}</strong>
                  </div>
                  <div className={styles.sourceStatBox}>
                    <span>Saldo da fonte</span>
                    <strong>{formatCurrencyFromCents(source.availableCents)}</strong>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <AppFooter />

      {deleteTarget ? (
        <DeleteConfirmDialog
          title="Excluir fonte de recurso"
          message={`A fonte "${deleteTarget.name}" sera excluida permanentemente.`}
          busy={deletingId === deleteTarget.id}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}


