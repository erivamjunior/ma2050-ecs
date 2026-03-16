"use client";

import { useState } from "react";
import AppFooter from "@/components/app-footer";
import FundingSourcesField, {
  normalizeFundingSourcesForSubmit,
} from "@/components/funding-sources-field";
import StakeholderSelect from "@/components/stakeholder-select";
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

const STATUS_OPTIONS = [
  { value: "planejado", label: "Planejado" },
  { value: "em_execucao", label: "Em execucao" },
  { value: "concluido", label: "Concluido" },
  { value: "suspenso", label: "Suspenso" },
];

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

export default function CadastroPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function onChange(event) {
    const { name, value } = event.target;

    if (name === "amountCents") {
      setForm((prev) => ({ ...prev, amountCents: maskCurrencyInput(value) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const amountCents = currencyInputToCents(form.amountCents);
      if (amountCents === null) {
        throw new Error("Informe um valor valido.");
      }

      const payload = {
        ...form,
        amountCents,
        fundingSources: normalizeFundingSourcesForSubmit(form.fundingSources),
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cadastrar projeto.");
      }

      setForm(INITIAL_FORM);
      setSuccess("Projeto cadastrado com sucesso. Confira no modulo Projetos.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Modulo: Cadastro</h2>
        <p>Cadastre projetos nesta tela. Eles aparecerao no modulo Projetos.</p>
      </header>

      <section className={styles.panel}>
        <h3>Novo projeto</h3>
        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            Nome do projeto
            <input name="name" value={form.name} onChange={onChange} required />
          </label>

          <StakeholderSelect
            label="Responsavel (stakeholder)"
            value={form.stakeholderId}
            onChange={(id) => setForm((prev) => ({ ...prev, stakeholderId: id }))}
          />

          <label>
            Valor (R$)
            <input
              name="amountCents"
              value={form.amountCents}
              onChange={onChange}
              placeholder="R$ 0,00"
              required
            />
          </label>

          <FundingSourcesField
            value={form.fundingSources}
            projectAmountCents={currencyInputToCents(form.amountCents) || 0}
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
            Inicio
            <input type="date" name="startDate" value={form.startDate} onChange={onChange} />
          </label>

          <label>
            Fim previsto
            <input type="date" name="endDate" value={form.endDate} onChange={onChange} />
          </label>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Cadastrar projeto"}
            </button>
          </div>
        </form>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
      </section>

      <AppFooter />
    </div>
  );
}

