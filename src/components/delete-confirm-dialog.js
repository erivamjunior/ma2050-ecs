"use client";

import { useState } from "react";
import styles from "@/app/modules.module.css";

const REQUIRED_TEXT = "EXCLUIR";

export default function DeleteConfirmDialog({
  title,
  message,
  confirmLabel = "Excluir",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const [typedValue, setTypedValue] = useState("");
  const canConfirm = typedValue.trim().toUpperCase() === REQUIRED_TEXT && !busy;

  return (
    <div className={styles.phaseDialogOverlay}>
      <div className={styles.phaseDialogCard}>
        <h3>{title}</h3>
        <p>{message}</p>
        <label className={styles.deleteConfirmField}>
          <span className={styles.deleteConfirmHint}>
            Digite <strong>{REQUIRED_TEXT}</strong> para confirmar.
          </span>
          <input value={typedValue} onChange={(event) => setTypedValue(event.target.value)} placeholder={REQUIRED_TEXT} />
        </label>
        <div className={styles.actions}>
          <button className={styles.buttonDanger} type="button" onClick={onConfirm} disabled={!canConfirm}>
            {busy ? "Excluindo..." : confirmLabel}
          </button>
          <button className={styles.buttonAlt} type="button" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
