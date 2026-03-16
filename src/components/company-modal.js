"use client";

import styles from "@/app/modules.module.css";

export const STATE_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export const COMPANY_SIZE_OPTIONS = [
  "MEI",
  "Microempresa",
  "Empresa de Pequeno Porte",
  "Medio Porte",
  "Grande Porte",
  "Demais",
];

export const ESTABLISHMENT_OPTIONS = ["Matriz", "Filial"];

export function formatCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export const INITIAL_COMPANY_FORM = {
  corporateName: "",
  tradeName: "",
  cnpj: "",
  email: "",
  phone: "",
  address: "",
  stateCode: "",
  mainCnaeCode: "",
  mainEconomicActivityDescription: "",
  companySize: "",
  openedAt: "",
  establishmentType: "",
  legalNatureCode: "",
};

export function buildCompanyForm(company) {
  if (!company) return INITIAL_COMPANY_FORM;
  return {
    corporateName: company.corporateName || "",
    tradeName: company.tradeName || "",
    cnpj: formatCnpj(company.cnpj),
    email: company.email || "",
    phone: formatPhone(company.phone),
    address: company.address || "",
    stateCode: company.stateCode || "",
    mainCnaeCode: company.mainCnaeCode || "",
    mainEconomicActivityDescription: company.mainEconomicActivityDescription || "",
    companySize: company.companySize || "",
    openedAt: company.openedAt || "",
    establishmentType: company.establishmentType || "",
    legalNatureCode: company.legalNatureCode || "",
  };
}

export default function CompanyModal({
  open,
  form,
  onChange,
  onSubmit,
  onClose,
  saving = false,
  title,
  description,
  submitLabel,
}) {
  if (!open) return null;

  return (
    <div className={styles.floatingOverlay}>
      <div className={styles.floatingCard}>
        <div className={styles.listHeader}>
          <div>
            <h3>{title}</h3>
            <p className={styles.selectedInfo}>{description}</p>
          </div>
          <button className={styles.buttonAlt} type="button" onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.companyFormGrid}>
            <label>Razão social<input value={form.corporateName} onChange={(event) => onChange("corporateName", event.target.value)} required /></label>
            <label>Nome fantasia<input value={form.tradeName} onChange={(event) => onChange("tradeName", event.target.value)} required /></label>
            <label>CNPJ<input value={form.cnpj} onChange={(event) => onChange("cnpj", formatCnpj(event.target.value))} required /></label>
            <label>UF<select value={form.stateCode} onChange={(event) => onChange("stateCode", event.target.value)} required><option value="">Selecione</option>{STATE_OPTIONS.map((stateCode) => <option key={stateCode} value={stateCode}>{stateCode}</option>)}</select></label>
            <label>Telefone<input value={form.phone} onChange={(event) => onChange("phone", formatPhone(event.target.value))} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} required /></label>
            <label>Porte<select value={form.companySize} onChange={(event) => onChange("companySize", event.target.value)} required><option value="">Selecione</option>{COMPANY_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label>Estabelecimento<select value={form.establishmentType} onChange={(event) => onChange("establishmentType", event.target.value)} required><option value="">Selecione</option>{ESTABLISHMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label>Data de abertura<input type="date" value={form.openedAt} onChange={(event) => onChange("openedAt", event.target.value)} required /></label>
            <label>CNAE principal<input value={form.mainCnaeCode} onChange={(event) => onChange("mainCnaeCode", event.target.value)} required /></label>
            <label>Código da natureza jurídica<input value={form.legalNatureCode} onChange={(event) => onChange("legalNatureCode", event.target.value)} required /></label>
            <label className={styles.companyFieldSpanTwo}>Endereço<input value={form.address} onChange={(event) => onChange("address", event.target.value)} required /></label>
            <label className={styles.companyFieldSpanTwo}>Descrição da atividade econômica principal<textarea value={form.mainEconomicActivityDescription} onChange={(event) => onChange("mainEconomicActivityDescription", event.target.value)} rows={4} required /></label>
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={saving}>
              {saving ? "Salvando..." : submitLabel}
            </button>
            <button className={styles.buttonAlt} type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
