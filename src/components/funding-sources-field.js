"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./funding-sources-field.module.css";

const EMPTY_ITEM = { sourceId: "", amountCents: "" };

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

export function normalizeFundingSourcesForSubmit(items) {
  return items
    .map((item) => ({
      sourceId: String(item?.sourceId || "").trim(),
      amountCents: currencyInputToCents(item?.amountCents),
    }))
    .filter((item) => item.sourceId && item.amountCents !== null && item.amountCents > 0);
}

function FundingSourceCreateModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [amountCents, setAmountCents] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setAmountCents("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const value = currencyInputToCents(amountCents);
      if (value === null) {
        throw new Error("Informe o valor da fonte.");
      }

      const response = await fetch("/api/funding-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amountCents: value }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar fonte de recurso.");
      }

      onCreated?.(data.source);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h3>Nova fonte de recurso</h3>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Nome da fonte
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label>
            Valor total da fonte (R$)
            <input value={amountCents} onChange={(event) => setAmountCents(maskCurrencyInput(event.target.value))} required />
          </label>

          <div className={styles.actionRow}>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Salvando..." : "Salvar fonte"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </div>
  );
}

export default function FundingSourcesField({
  value,
  onChange,
  projectAmountCents = 0,
  fundingSummaries = [],
  label = "Fontes de recurso",
}) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);

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

  const totalAllocatedCents = useMemo(
    () =>
      items.reduce((sum, item) => {
        const amountCents = currencyInputToCents(item.amountCents);
        return sum + (amountCents || 0);
      }, 0),
    [items],
  );

  function updateItem(index, field, nextValue) {
    const nextItems = items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      if (field === "amountCents") {
        return { ...item, amountCents: maskCurrencyInput(nextValue) };
      }

      return { ...item, [field]: nextValue };
    });

    onChange(nextItems);
  }

  function addItem() {
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  function removeItem(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleCreated(source) {
    loadSources().then(() => {
      onChange([...items, { sourceId: source.id, amountCents: "" }]);
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.labelRow}>
        <label className={styles.fieldLabel}>{label}</label>
        <div className={styles.actionRow}>
          <button type="button" className={styles.ghostButton} onClick={addItem}>
            Adicionar fonte
          </button>
          <button type="button" className={styles.ghostButton} onClick={() => setShowCreateModal(true)}>
            Nova fonte
          </button>
          <button type="button" className={styles.ghostButton} onClick={loadSources}>
            Atualizar lista
          </button>
        </div>
      </div>

      {loading ? <p className={styles.hint}>Carregando fontes...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {items.length === 0 ? <p className={styles.hint}>Nenhuma fonte associada ainda.</p> : null}

      <div className={styles.itemList}>
        {items.map((item, index) => {
          const selectedSource = sources.find((source) => source.id === item.sourceId) || null;
          const summary = fundingSummaries.find((entry) => entry.sourceId === item.sourceId) || null;

          return (
            <div key={`${item.sourceId}-${index}`} className={styles.itemRow}>
              <label>
                Fonte
                <select
                  value={item.sourceId}
                  onChange={(event) => updateItem(index, "sourceId", event.target.value)}
                >
                  <option value="">Selecione...</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Valor da fonte neste projeto (R$)
                <input
                  value={item.amountCents}
                  onChange={(event) => updateItem(index, "amountCents", event.target.value)}
                  placeholder="R$ 0,00"
                />
              </label>

              <div className={styles.amountBox}>
                <span>Saldo da fonte</span>
                <strong>{selectedSource ? formatCurrencyFromCents(selectedSource.availableCents) : "-"}</strong>
              </div>

              <div className={styles.sourceBreakdown}>
                <div className={styles.breakdownItem}>
                  <span>Aprovado</span>
                  <strong>{summary ? formatCurrencyFromCents(summary.approvedCents) : "-"}</strong>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Pago</span>
                  <strong>{summary ? formatCurrencyFromCents(summary.paidCents) : "-"}</strong>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Saldo aprovado</span>
                  <strong>{summary ? formatCurrencyFromCents(summary.approvedRemainingCents) : "-"}</strong>
                </div>
                <div className={styles.breakdownItem}>
                  <span>Saldo da fonte</span>
                  <strong>
                    {summary && summary.sourceAvailableCents !== null
                      ? formatCurrencyFromCents(summary.sourceAvailableCents)
                      : selectedSource
                        ? formatCurrencyFromCents(selectedSource.availableCents)
                        : "-"}
                  </strong>
                </div>
              </div>

              <button type="button" className={styles.removeButton} onClick={() => removeItem(index)}>
                Remover
              </button>
            </div>
          );
        })}
      </div>

      <p className={styles.summary}>
        Total vinculado: {formatCurrencyFromCents(totalAllocatedCents)} de {formatCurrencyFromCents(projectAmountCents)}
      </p>

      <FundingSourceCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
