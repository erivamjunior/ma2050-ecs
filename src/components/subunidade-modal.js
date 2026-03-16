"use client";

import styles from "@/app/modules.module.css";

export default function SubunidadeModal({
  open,
  form,
  secretarias,
  onChange,
  onSubmit,
  onClose,
  saving = false,
  title,
  description,
  submitLabel,
}) {
  if (!open) {
    return null;
  }

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
          <div className={styles.contractGrid}>
            <label>
              Secretaria
              <select value={form.secretariaId} onChange={(event) => onChange("secretariaId", event.target.value)} required>
                <option value="">Selecione...</option>
                {secretarias.map((secretaria) => (
                  <option key={secretaria.id} value={secretaria.id}>
                    {secretaria.sigla} | {secretaria.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nome da subunidade
              <input value={form.name} onChange={(event) => onChange("name", event.target.value)} required />
            </label>
            <label>
              Sigla
              <input value={form.sigla} onChange={(event) => onChange("sigla", event.target.value.toUpperCase())} required />
            </label>
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
