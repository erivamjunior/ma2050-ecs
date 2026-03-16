"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/modules.module.css";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";

const INITIAL_PAYMENT_FORM = {
  id: null,
  originalMeasurementId: "",
  invoiceNumber: "",
  issueDate: "",
  sourceId: "",
  amountCents: "",
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

function formatDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `${start} até ${end}`;
  }
  if (start) {
    return `Início: ${start}`;
  }
  if (end) {
    return `Fim: ${end}`;
  }
  return "Sem período informado";
}

function sumPayments(payments) {
  return (payments || []).reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
}

function getPaymentStatus(measurement) {
  const totalPaid = sumPayments(measurement.payments || []);
  const measurementAmount = Number(measurement.amountCents || 0);

  if (totalPaid <= 0) {
    return { label: "Não paga", className: styles.statusPending };
  }

  if (totalPaid < measurementAmount) {
    return { label: "Paga parcial", className: styles.statusPartial };
  }

  return { label: "Paga ok", className: styles.statusPaid };
}

function formatPercentage(numerator, denominator) {
  if (!denominator) {
    return "0,00%";
  }

  return `${((Number(numerator || 0) / Number(denominator)) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function buildInitialPaymentForm(measurement, project) {
  return {
    ...INITIAL_PAYMENT_FORM,
    originalMeasurementId: measurement?.id || "",
    sourceId: measurement?.payments?.[0]?.sourceId || project?.fundingSources?.[0]?.sourceId || "",
  };
}

export default function ProjectPaymentsTab({
  project,
  projectAmountCents,
  error,
  onError,
  onSaveMeasurements,
}) {
  const [paymentForm, setPaymentForm] = useState(INITIAL_PAYMENT_FORM);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState("");
  const [deletePaymentState, setDeletePaymentState] = useState(null);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState(null);

  const selectedMeasurement = useMemo(
    () => (project?.measurements || []).find((measurement) => measurement.id === selectedMeasurementId) || null,
    [project, selectedMeasurementId],
  );

  const paymentTotalCents = useMemo(
    () => (project?.measurements || []).reduce((sum, item) => sum + sumPayments(item.payments || []), 0),
    [project],
  );
  const paymentPercent = formatPercentage(paymentTotalCents, projectAmountCents);

  const paymentStatusCounts = useMemo(() => {
    return (project?.measurements || []).reduce(
      (acc, measurement) => {
        const status = getPaymentStatus(measurement).label;
        if (status === "Paga ok") acc.paid += 1;
        else if (status === "Paga parcial") acc.partial += 1;
        else acc.pending += 1;
        return acc;
      },
      { paid: 0, partial: 0, pending: 0 },
    );
  }, [project]);

  useEffect(() => {
    if (!selectedMeasurementId) {
      return;
    }

    const currentMeasurement = (project?.measurements || []).find(
      (measurement) => measurement.id === selectedMeasurementId,
    );

    if (!currentMeasurement) {
      setSelectedMeasurementId(null);
      setPaymentForm(INITIAL_PAYMENT_FORM);
    }
  }, [project, selectedMeasurementId]);

  function resetPaymentForm(measurement = selectedMeasurement) {
    setPaymentForm(buildInitialPaymentForm(measurement, project));
    setPaymentFeedback("");
  }

  function openMeasurement(measurement) {
    setSelectedMeasurementId(measurement.id);
    setPaymentFeedback("");
    onError("");
    setPaymentForm(buildInitialPaymentForm(measurement, project));
  }

  function closeDetailsSheet() {
    setSelectedMeasurementId(null);
    setPaymentFeedback("");
    onError("");
    setPaymentForm(INITIAL_PAYMENT_FORM);
  }

  function onPaymentChange(event) {
    const { name, value } = event.target;

    if (name === "amountCents") {
      setPaymentForm((prev) => ({ ...prev, amountCents: maskCurrencyInput(value) }));
      return;
    }

    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  }

  function buildPaymentFromForm(measurementId) {
    const amountCents = currencyInputToCents(paymentForm.amountCents);

    if (!measurementId) throw new Error("Selecione a medição.");
    if (!paymentForm.invoiceNumber.trim()) throw new Error("Informe o número da NF.");
    if (!paymentForm.issueDate) throw new Error("Informe a data de emissão da NF.");
    if (!paymentForm.sourceId) throw new Error("Selecione a fonte do projeto.");
    if (amountCents === null) throw new Error("Informe um valor pago válido.");

    return {
      id: paymentForm.id,
      invoiceNumber: paymentForm.invoiceNumber.trim(),
      issueDate: paymentForm.issueDate,
      sourceId: paymentForm.sourceId,
      amountCents,
    };
  }

  async function onSavePayment(event, measurement) {
    event.preventDefault();
    setPaymentSubmitting(true);
    onError("");
    setPaymentFeedback("");

    try {
      const nextPayment = buildPaymentFromForm(measurement.id);
      const measurements = (project.measurements || []).map((currentMeasurement) => {
        let payments = currentMeasurement.payments || [];

        if (nextPayment.id && currentMeasurement.id === measurement.id) {
          payments = payments.filter((payment) => payment.id !== nextPayment.id);
        }

        if (currentMeasurement.id === measurement.id) {
          payments = [...payments, nextPayment];
        }

        return { ...currentMeasurement, payments };
      });

      const successMessage = nextPayment.id
        ? "Pagamento atualizado com sucesso."
        : "Pagamento registrado com sucesso.";

      await onSaveMeasurements(measurements, successMessage);
      setPaymentFeedback(successMessage);
      setPaymentForm(buildInitialPaymentForm(measurement, project));
    } catch (saveError) {
      onError(saveError.message);
    } finally {
      setPaymentSubmitting(false);
    }
  }

  function onEditPayment(measurement, payment) {
    setSelectedMeasurementId(measurement.id);
    setPaymentFeedback("");
    onError("");
    setPaymentForm({
      id: payment.id,
      originalMeasurementId: measurement.id,
      invoiceNumber: payment.invoiceNumber || "",
      issueDate: payment.issueDate || "",
      sourceId: payment.sourceId || "",
      amountCents: formatCurrencyFromCents(payment.amountCents),
    });
  }

  async function onDeletePayment(measurementId, paymentId) {
    const confirmed = window.confirm("Excluir este pagamento?");
    if (!confirmed) return;

    setPaymentSubmitting(true);
    onError("");
    setPaymentFeedback("");

    try {
      const measurements = (project.measurements || []).map((measurement) => {
        if (measurement.id !== measurementId) return measurement;
        return {
          ...measurement,
          payments: (measurement.payments || []).filter((payment) => payment.id !== paymentId),
        };
      });

      await onSaveMeasurements(measurements, "Pagamento excluído com sucesso.");
      setPaymentFeedback("Pagamento excluído com sucesso.");
      if (paymentForm.id === paymentId) {
        setPaymentForm(buildInitialPaymentForm(selectedMeasurement, project));
      }
    } catch (deleteError) {
      onError(deleteError.message);
    } finally {
      setPaymentSubmitting(false);
    }
  }

  return (
    <div className={styles.tabPanel}>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Total pago</p>
          <p className={styles.metricValue}>{formatCurrencyFromCents(paymentTotalCents)}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Percentual pago</p>
          <p className={styles.metricValue}>{paymentPercent}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Não pagas</p>
          <p className={styles.metricValue}>{paymentStatusCounts.pending}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Parcial / ok</p>
          <p className={styles.metricValue}>{`${paymentStatusCounts.partial} / ${paymentStatusCounts.paid}`}</p>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.paymentTabHeader}>
          <h3>Status das medições</h3>
          {selectedMeasurement ? (
            <button className={styles.buttonAlt} type="button" onClick={closeDetailsSheet}>
              Fechar detalhes
            </button>
          ) : null}
        </div>

        {error && !selectedMeasurement ? <p className={styles.error}>{error}</p> : null}
        {paymentFeedback && !selectedMeasurement ? <p className={styles.success}>{paymentFeedback}</p> : null}

        {(project.measurements || []).length === 0 ? (
          <p>Nenhuma medição cadastrada ainda.</p>
        ) : (
          <div className={styles.measurementsTableWrap}>
            <div className={styles.paymentsTableHeader}>
              <span>#</span>
              <span>Processo</span>
              <span>Status</span>
              <span>Pago</span>
              <span>Saldo</span>
            </div>
            <div className={styles.measurementsTableBody}>
              {(project.measurements || []).map((measurement) => {
                const status = getPaymentStatus(measurement);
                const paidTotal = sumPayments(measurement.payments || []);
                const remaining = Math.max(Number(measurement.amountCents || 0) - paidTotal, 0);
                const isSelected = selectedMeasurementId === measurement.id;

                return (
                  <div key={measurement.id} className={styles.measurementRowGroup}>
                    <button
                      type="button"
                      className={`${styles.paymentRowButton} ${isSelected ? styles.paymentRowButtonActive : ""}`}
                      onClick={() => openMeasurement(measurement)}
                    >
                      <span>{measurement.number}</span>
                      <span>{measurement.processNumber}</span>
                      <span className={`${styles.statusBadge} ${status.className}`}>{status.label}</span>
                      <span>{formatCurrencyFromCents(paidTotal)}</span>
                      <span>{formatCurrencyFromCents(remaining)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {selectedMeasurement ? (
          <div className={styles.paymentDetailsSheet}>
            <div className={styles.paymentSheetHeader}>
              <div>
                <h3>{`Medição ${selectedMeasurement.number}`}</h3>
                <p className={styles.selectedInfo}>
                  {`${selectedMeasurement.processNumber} · ${formatDateRange(selectedMeasurement.startDate, selectedMeasurement.endDate)}`}
                </p>
              </div>
            </div>

            <div className={styles.paymentSummary}>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Valor da medição</p>
                <p className={styles.metricValue}>{formatCurrencyFromCents(selectedMeasurement.amountCents)}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Total pago</p>
                <p className={styles.metricValue}>{formatCurrencyFromCents(sumPayments(selectedMeasurement.payments || []))}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Saldo</p>
                <p className={styles.metricValue}>
                  {formatCurrencyFromCents(
                    Math.max(
                      Number(selectedMeasurement.amountCents || 0) - sumPayments(selectedMeasurement.payments || []),
                      0,
                    ),
                  )}
                </p>
              </div>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}
            {paymentFeedback ? <p className={styles.success}>{paymentFeedback}</p> : null}

            <div className={styles.paymentDetailsGrid}>
              <div className={styles.panelSection}>
                <div className={styles.measurementFormHeader}>
                  <h3>Pagamentos já registrados</h3>
                </div>

                {(selectedMeasurement.payments || []).length === 0 ? (
                  <p className={styles.selectedInfo}>Nenhum pagamento registrado ainda.</p>
                ) : (
                  <div className={styles.paymentList}>
                    {(selectedMeasurement.payments || []).map((payment) => (
                      <div key={payment.id} className={styles.paymentItem}>
                        <div className={styles.paymentItemText}>
                          <strong>{`NF ${payment.invoiceNumber}`}</strong>
                          <span>{`Emissão: ${formatDate(payment.issueDate) || "-"}`}</span>
                          <span>{`Fonte: ${payment.source?.name || "Fonte"}`}</span>
                          <span>{`Pago: ${formatCurrencyFromCents(payment.amountCents)}`}</span>
                        </div>
                        <div className={styles.measurementActions}>
                          <button
                            className={styles.buttonAlt}
                            type="button"
                            onClick={() => onEditPayment(selectedMeasurement, payment)}
                            disabled={paymentSubmitting}
                          >
                            Editar
                          </button>
                          <button
                            className={styles.buttonDanger}
                            type="button"
                            onClick={() => onDeletePayment(selectedMeasurement.id, payment.id)}
                            disabled={paymentSubmitting}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.panelSection}>
                <div className={styles.measurementFormHeader}>
                  <h3>{paymentForm.id ? "Editar pagamento" : "Registrar pagamento"}</h3>
                  {paymentForm.id ? (
                    <button className={styles.buttonAlt} type="button" onClick={() => resetPaymentForm(selectedMeasurement)}>
                      Cancelar edição
                    </button>
                  ) : null}
                </div>

                <form className={styles.form} onSubmit={(event) => onSavePayment(event, selectedMeasurement)}>
                  <div className={styles.paymentGrid}>
                    <label>
                      Número da NF
                      <input name="invoiceNumber" value={paymentForm.invoiceNumber} onChange={onPaymentChange} required />
                    </label>

                    <label>
                      Emissão da NF
                      <input type="date" name="issueDate" value={paymentForm.issueDate} onChange={onPaymentChange} required />
                    </label>
                  </div>

                  <div className={styles.paymentGrid}>
                    <label>
                      Fonte do projeto
                      <select name="sourceId" value={paymentForm.sourceId} onChange={onPaymentChange}>
                        <option value="">Selecione...</option>
                        {(project.fundingSources || []).map((source) => (
                          <option key={source.sourceId} value={source.sourceId}>
                            {source.source?.name || "Fonte"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Valor pago (R$)
                      <input name="amountCents" value={paymentForm.amountCents} onChange={onPaymentChange} required />
                    </label>
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.button} type="submit" disabled={paymentSubmitting}>
                      {paymentSubmitting ? "Salvando..." : paymentForm.id ? "Salvar pagamento" : "Registrar pagamento"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      {deletePaymentState ? (
        <DeleteConfirmDialog
          title="Excluir pagamento"
          message="O pagamento selecionado sera excluido permanentemente da medi??o."
          busy={paymentSubmitting}
          onConfirm={confirmDeletePayment}
          onCancel={() => setDeletePaymentState(null)}
        />
      ) : null}
    </div>
  );
}


