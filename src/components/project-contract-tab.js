"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/modules.module.css";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";

const EMPTY_TERM = {
  mode: "relative",
  quantity: "",
  unit: "dias",
  reference: "assinatura_os",
  endDate: "",
};

const EMPTY_CONTRACT = {
  contractNumber: "",
  contractValueCents: "",
  contractSignedAt: "",
  administrativeProcessNumber: "",
  secretariaId: "",
  serviceOrderNumber: "",
  serviceOrderValueCents: "",
  serviceOrderSignedAt: "",
  executionTerm: { ...EMPTY_TERM },
  validityTerm: { ...EMPTY_TERM },
  addenda: [],
};

const EMPTY_ADDENDUM = {
  id: null,
  number: "",
  administrativeProcessNumber: "",
  signedAt: "",
  type: "prazo",
  valueCents: "",
  executionTermEnabled: true,
  validityTermEnabled: true,
  executionTerm: { ...EMPTY_TERM },
  validityTerm: { ...EMPTY_TERM },
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

function signedCurrencyInputToCents(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const isNegative = text.includes("-");
  const digits = text.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return (isNegative ? -1 : 1) * Number(digits);
}

function maskCurrencyInput(value) {
  const cents = currencyInputToCents(value);
  return cents === null ? "" : formatCurrencyFromCents(cents);
}

function maskSignedCurrencyInput(value) {
  const cents = signedCurrencyInputToCents(value);
  if (cents === null) {
    return "";
  }

  return cents < 0 ? `- ${formatCurrencyFromCents(Math.abs(cents))}` : formatCurrencyFromCents(cents);
}

function normalizeTermForForm(term) {
  if (!term) {
    return { ...EMPTY_TERM };
  }

  return {
    mode: term.mode || "relative",
    quantity: term.quantity ? String(term.quantity) : "",
    unit: term.unit || "dias",
    reference: term.reference || "assinatura_os",
    endDate: term.endDate || "",
  };
}

function normalizeContractForForm(contract) {
  if (!contract) {
    return { ...EMPTY_CONTRACT, executionTerm: { ...EMPTY_TERM }, validityTerm: { ...EMPTY_TERM }, addenda: [] };
  }

  return {
    contractNumber: contract.contractNumber || "",
    contractValueCents: contract.contractValueCents ? formatCurrencyFromCents(contract.contractValueCents) : "",
    contractSignedAt: contract.contractSignedAt || "",
    administrativeProcessNumber: contract.administrativeProcessNumber || "",
    secretariaId: contract.secretariaId || "",
    serviceOrderNumber: contract.serviceOrderNumber || "",
    serviceOrderValueCents: contract.serviceOrderValueCents ? formatCurrencyFromCents(contract.serviceOrderValueCents) : "",
    serviceOrderSignedAt: contract.serviceOrderSignedAt || "",
    executionTerm: normalizeTermForForm(contract.executionTerm),
    validityTerm: normalizeTermForForm(contract.validityTerm),
    addenda: Array.isArray(contract.addenda) ? contract.addenda : [],
  };
}

function normalizeAddendumForForm(addendum) {
  if (!addendum) {
    return { ...EMPTY_ADDENDUM, executionTerm: { ...EMPTY_TERM }, validityTerm: { ...EMPTY_TERM } };
  }

  return {
    id: addendum.id || null,
    number: addendum.number || "",
    administrativeProcessNumber: addendum.administrativeProcessNumber || "",
    signedAt: addendum.signedAt || "",
    type: addendum.type || "prazo",
    valueCents:
      addendum.valueCents === null || addendum.valueCents === undefined
        ? ""
        : addendum.valueCents < 0
          ? `- ${formatCurrencyFromCents(Math.abs(addendum.valueCents))}`
          : formatCurrencyFromCents(addendum.valueCents),
    executionTermEnabled: Boolean(addendum.executionTerm),
    validityTermEnabled: Boolean(addendum.validityTerm),
    executionTerm: normalizeTermForForm(addendum.executionTerm),
    validityTerm: normalizeTermForForm(addendum.validityTerm),
  };
}

function buildTermPayload(termForm) {
  if (termForm.mode === "fixed") {
    return {
      mode: "fixed",
      endDate: termForm.endDate || null,
    };
  }

  return {
    mode: "relative",
    quantity: Number(termForm.quantity || 0),
    unit: termForm.unit,
    reference: termForm.reference,
  };
}

function buildContractPayload(contractForm, bidding) {
  return {
    contractNumber: contractForm.contractNumber.trim(),
    contractorName: bidding?.winnerName?.trim() || "",
    contractorCnpj: bidding?.winnerCnpj?.trim() || "",
    contractValueCents: currencyInputToCents(contractForm.contractValueCents),
    contractSignedAt: contractForm.contractSignedAt || null,
    administrativeProcessNumber: contractForm.administrativeProcessNumber.trim(),
    secretariaId: contractForm.secretariaId,
    serviceOrderNumber: contractForm.serviceOrderNumber.trim(),
    serviceOrderValueCents: currencyInputToCents(contractForm.serviceOrderValueCents),
    serviceOrderSignedAt: contractForm.serviceOrderSignedAt || null,
    executionTerm: buildTermPayload(contractForm.executionTerm),
    validityTerm: buildTermPayload(contractForm.validityTerm),
    addenda: contractForm.addenda || [],
  };
}

export default function ProjectContractTab({ project, error, onError, onSaveContract, onRequestMigration }) {
  const [secretarias, setSecretarias] = useState([]);
  const [contractForm, setContractForm] = useState(normalizeContractForForm(project?.contract));
  const [addendumForm, setAddendumForm] = useState(normalizeAddendumForForm(null));
  const [feedback, setFeedback] = useState("");
  const [deleteAddendumId, setDeleteAddendumId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setContractForm(normalizeContractForForm(project?.contract));
    setAddendumForm(normalizeAddendumForForm(null));
    setFeedback("");
  }, [project]);

  useEffect(() => {
    async function loadSecretarias() {
      const response = await fetch("/api/secretarias", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) {
        setSecretarias(data.secretarias || []);
      }
    }

    loadSecretarias();
  }, []);

  const effectiveProjectValue = useMemo(() => {
    const contractValue = currencyInputToCents(contractForm.contractValueCents) || 0;
    const addendaDelta = (contractForm.addenda || []).reduce((sum, item) => {
      if (item.type === "valor" || item.type === "valor_prazo") {
        return sum + Number(item.valueCents || 0);
      }
      return sum;
    }, 0);
    return Math.max(0, contractValue + addendaDelta);
  }, [contractForm]);

  const bidding = project?.bidding || null;
  const canRequestMigration = Boolean(bidding) && project?.phase === "banco";
  const contractEnabled = Boolean(bidding) && project?.phase === "contratado";

  function changeContract(event) {
    const { name, value } = event.target;
    if (name === "contractValueCents" || name === "serviceOrderValueCents") {
      setContractForm((prev) => ({ ...prev, [name]: maskCurrencyInput(value) }));
      return;
    }
    setContractForm((prev) => ({ ...prev, [name]: value }));
  }

  function changeTerm(scope, field, value) {
    setContractForm((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        [field]: field === "quantity" ? String(value || "").replace(/\D/g, "") : value,
      },
    }));
  }

  function changeAddendum(event) {
    const { name, value, type, checked } = event.target;

    if (name === "valueCents") {
      setAddendumForm((prev) => ({ ...prev, valueCents: maskSignedCurrencyInput(value) }));
      return;
    }

    if (type === "checkbox") {
      setAddendumForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setAddendumForm((prev) => ({ ...prev, [name]: value }));
  }

  function changeAddendumTerm(scope, field, value) {
    setAddendumForm((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        [field]: field === "quantity" ? String(value || "").replace(/\D/g, "") : value,
      },
    }));
  }

  async function saveContractDetails(event) {
    event.preventDefault();
    if (!bidding) {
      onError("Cadastre a licitaÃ§Ã£o antes de informar o contrato.");
      return;
    }

    setSubmitting(true);
    onError("");
    setFeedback("");

    try {
      const payload = buildContractPayload(contractForm, bidding);
      await onSaveContract(payload);
      setFeedback("Contrato atualizado com sucesso.");
    } catch (saveError) {
      onError(saveError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetAddendumForm() {
    setAddendumForm(normalizeAddendumForForm(null));
  }

  async function saveAddendum(event) {
    event.preventDefault();
    if (!bidding) {
      onError("Cadastre a licitaÃ§Ã£o antes de informar aditivos do contrato.");
      return;
    }

    setSubmitting(true);
    onError("");
    setFeedback("");

    try {
      const nextAddendum = {
        id: addendumForm.id,
        number: addendumForm.number.trim(),
        administrativeProcessNumber: addendumForm.administrativeProcessNumber.trim(),
        signedAt: addendumForm.signedAt || null,
        type: addendumForm.type,
        valueCents:
          addendumForm.type === "valor" || addendumForm.type === "valor_prazo"
            ? signedCurrencyInputToCents(addendumForm.valueCents)
            : null,
        executionTerm:
          addendumForm.type === "prazo" || addendumForm.type === "valor_prazo"
            ? addendumForm.executionTermEnabled
              ? buildTermPayload(addendumForm.executionTerm)
              : null
            : null,
        validityTerm:
          addendumForm.type === "prazo" || addendumForm.type === "valor_prazo"
            ? addendumForm.validityTermEnabled
              ? buildTermPayload(addendumForm.validityTerm)
              : null
            : null,
      };

      const addenda = nextAddendum.id
        ? (contractForm.addenda || []).map((item) => (item.id === nextAddendum.id ? { ...item, ...nextAddendum } : item))
        : [...(contractForm.addenda || []), nextAddendum];

      const payload = buildContractPayload({ ...contractForm, addenda }, bidding);
      await onSaveContract(payload);
      setContractForm((prev) => ({ ...prev, addenda }));
      setFeedback(nextAddendum.id ? "Aditivo atualizado com sucesso." : "Aditivo cadastrado com sucesso.");
      resetAddendumForm();
    } catch (saveError) {
      onError(saveError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAddendum(addendumId) {
    const confirmed = window.confirm("Excluir este aditivo?");
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    onError("");
    setFeedback("");

    try {
      const addenda = (contractForm.addenda || []).filter((item) => item.id !== addendumId);
      const payload = buildContractPayload({ ...contractForm, addenda }, bidding);
      await onSaveContract(payload);
      setContractForm((prev) => ({ ...prev, addenda }));
      setFeedback("Aditivo excluÃ­do com sucesso.");
      if (addendumForm.id === addendumId) {
        resetAddendumForm();
      }
    } catch (deleteError) {
      onError(deleteError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function editAddendum(addendum) {
    setAddendumForm(normalizeAddendumForForm(addendum));
    setFeedback("");
    onError("");
  }

  return (
    <div className={styles.tabPanel}>
      {!contractEnabled ? (
        <div className={styles.disabledNotice}>
          <h3>Contrato indisponível no momento</h3>
          <p>
            {bidding
              ? "Este projeto ainda está no Banco de Projetos. Migre-o para Projetos Contratados para habilitar contrato, medições e pagamentos."
              : "Cadastre a licitação deste projeto para habilitar a migração. A empresa vencedora e o CNPJ serão herdados automaticamente da licitação."}
          </p>
          {canRequestMigration ? (
            <div className={styles.actions}>
              <button className={styles.button} type="button" onClick={onRequestMigration}>
                Enviar para Projetos Contratados
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Valor vigente do projeto</p>
          <p className={styles.metricValue}>{formatCurrencyFromCents(effectiveProjectValue)}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Contrato base</p>
          <p className={styles.metricValue}>{formatCurrencyFromCents(currencyInputToCents(contractForm.contractValueCents) || 0)}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Aditivos</p>
          <p className={styles.metricValue}>{(contractForm.addenda || []).length}</p>
        </div>
      </div>

      <section className={`${styles.panel} ${!contractEnabled ? styles.panelDisabled : ""}`}>
        <div className={styles.measurementFormHeader}>
          <h3>Contrato e ordem de serviÃ§o</h3>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {feedback ? <p className={styles.success}>{feedback}</p> : null}

        <form className={styles.form} onSubmit={saveContractDetails}>
          <div className={styles.contractGrid}>
            <label>
              NÃºmero do contrato
              <input name="contractNumber" value={contractForm.contractNumber} onChange={changeContract} required disabled={!contractEnabled} />
            </label>
            <label>
              Secretaria
              <select name="secretariaId" value={contractForm.secretariaId} onChange={changeContract} required disabled={!contractEnabled}>
                <option value="">Selecione...</option>
                {secretarias.map((secretaria) => (
                  <option key={secretaria.id} value={secretaria.id}>
                    {secretaria.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.contractGrid}>
            <label>
              Empresa executora
              <input value={bidding?.winnerName || ""} readOnly disabled className={styles.readonlyField} />
            </label>
            <label>
              CNPJ da empresa
              <input value={bidding?.winnerCnpj || ""} readOnly disabled className={styles.readonlyField} />
            </label>
          </div>

          <div className={styles.contractGrid}>
            <label>
              Valor do contrato (R$)
              <input name="contractValueCents" value={contractForm.contractValueCents} onChange={changeContract} required disabled={!contractEnabled} />
            </label>
            <label>
              Data de assinatura do contrato
              <input type="date" name="contractSignedAt" value={contractForm.contractSignedAt} onChange={changeContract} required disabled={!contractEnabled} />
            </label>
          </div>

          <label>
            Processo administrativo do contrato
            <input name="administrativeProcessNumber" value={contractForm.administrativeProcessNumber} onChange={changeContract} required disabled={!contractEnabled} />
          </label>

          <div className={styles.contractGrid}>
            <label>
              NÃºmero da ordem de serviÃ§o
              <input name="serviceOrderNumber" value={contractForm.serviceOrderNumber} onChange={changeContract} required disabled={!contractEnabled} />
            </label>
            <label>
              Valor da ordem de serviÃ§o (R$)
              <input name="serviceOrderValueCents" value={contractForm.serviceOrderValueCents} onChange={changeContract} required disabled={!contractEnabled} />
            </label>
          </div>

          <label>
            Data de assinatura da ordem de serviÃ§o
            <input type="date" name="serviceOrderSignedAt" value={contractForm.serviceOrderSignedAt} onChange={changeContract} required disabled={!contractEnabled} />
          </label>

          <div className={styles.contractTermsGrid}>
            <div className={styles.contractTermBox}>
              <h4>Prazo de execuÃ§Ã£o</h4>
              <select value={contractForm.executionTerm.mode} onChange={(event) => changeTerm("executionTerm", "mode", event.target.value)} disabled={!contractEnabled}>
                <option value="relative">Dias/meses corridos</option>
                <option value="fixed">Data final definida</option>
              </select>
              {contractForm.executionTerm.mode === "relative" ? (
                <div className={styles.contractGrid}>
                  <input value={contractForm.executionTerm.quantity} onChange={(event) => changeTerm("executionTerm", "quantity", event.target.value)} placeholder="Quantidade" disabled={!contractEnabled} />
                  <select value={contractForm.executionTerm.unit} onChange={(event) => changeTerm("executionTerm", "unit", event.target.value)} disabled={!contractEnabled}>
                    <option value="dias">Dias</option>
                    <option value="meses">Meses</option>
                  </select>
                  <select value={contractForm.executionTerm.reference} onChange={(event) => changeTerm("executionTerm", "reference", event.target.value)} disabled={!contractEnabled}>
                    <option value="assinatura_os">A partir da assinatura da OS</option>
                    <option value="recebimento_os">A partir do recebimento da OS</option>
                  </select>
                </div>
              ) : (
                <input type="date" value={contractForm.executionTerm.endDate} onChange={(event) => changeTerm("executionTerm", "endDate", event.target.value)} disabled={!contractEnabled} />
              )}
            </div>

            <div className={styles.contractTermBox}>
              <h4>Prazo de vigÃªncia</h4>
              <select value={contractForm.validityTerm.mode} onChange={(event) => changeTerm("validityTerm", "mode", event.target.value)} disabled={!contractEnabled}>
                <option value="relative">Dias/meses corridos</option>
                <option value="fixed">Data final definida</option>
              </select>
              {contractForm.validityTerm.mode === "relative" ? (
                <div className={styles.contractGrid}>
                  <input value={contractForm.validityTerm.quantity} onChange={(event) => changeTerm("validityTerm", "quantity", event.target.value)} placeholder="Quantidade" disabled={!contractEnabled} />
                  <select value={contractForm.validityTerm.unit} onChange={(event) => changeTerm("validityTerm", "unit", event.target.value)} disabled={!contractEnabled}>
                    <option value="dias">Dias</option>
                    <option value="meses">Meses</option>
                  </select>
                  <select value={contractForm.validityTerm.reference} onChange={(event) => changeTerm("validityTerm", "reference", event.target.value)} disabled={!contractEnabled}>
                    <option value="assinatura_os">A partir da assinatura da OS</option>
                    <option value="recebimento_os">A partir do recebimento da OS</option>
                  </select>
                </div>
              ) : (
                <input type="date" value={contractForm.validityTerm.endDate} onChange={(event) => changeTerm("validityTerm", "endDate", event.target.value)} disabled={!contractEnabled} />
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={submitting || !contractEnabled}>
              {submitting ? "Salvando..." : "Salvar contrato"}
            </button>
          </div>
        </form>
      </section>

      <section className={`${styles.panel} ${!contractEnabled ? styles.panelDisabled : ""}`}>
        <div className={styles.measurementFormHeader}>
          <h3>{addendumForm.id ? "Editar aditivo" : "Novo aditivo"}</h3>
          {addendumForm.id ? (
            <button className={styles.buttonAlt} type="button" onClick={resetAddendumForm} disabled={!contractEnabled}>
              Cancelar ediÃ§Ã£o
            </button>
          ) : null}
        </div>

        <form className={styles.form} onSubmit={saveAddendum}>
          <div className={styles.contractGrid}>
            <label>
              NÃºmero do aditivo
              <input name="number" value={addendumForm.number} onChange={changeAddendum} required disabled={!contractEnabled} />
            </label>
            <label>
              Tipo
              <select name="type" value={addendumForm.type} onChange={changeAddendum} disabled={!contractEnabled}>
                <option value="prazo">Prazo</option>
                <option value="valor">Valor</option>
                <option value="valor_prazo">Valor e prazo</option>
              </select>
            </label>
          </div>

          <div className={styles.contractGrid}>
            <label>
              Processo administrativo
              <input name="administrativeProcessNumber" value={addendumForm.administrativeProcessNumber} onChange={changeAddendum} required disabled={!contractEnabled} />
            </label>
            <label>
              Data de assinatura
              <input type="date" name="signedAt" value={addendumForm.signedAt} onChange={changeAddendum} required disabled={!contractEnabled} />
            </label>
          </div>

          {addendumForm.type === "valor" || addendumForm.type === "valor_prazo" ? (
            <label>
              Valor do aditivo (positivo ou negativo)
              <input name="valueCents" value={addendumForm.valueCents} onChange={changeAddendum} placeholder="R$ 0,00 ou - R$ 0,00" required disabled={!contractEnabled} />
            </label>
          ) : null}

          {addendumForm.type === "prazo" || addendumForm.type === "valor_prazo" ? (
            <div className={styles.contractTermsGrid}>
              <div className={styles.contractTermBox}>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" name="executionTermEnabled" checked={addendumForm.executionTermEnabled} onChange={changeAddendum} disabled={!contractEnabled} />
                  Revisar execuÃ§Ã£o
                </label>
                {addendumForm.executionTermEnabled ? (
                  <>
                    <select value={addendumForm.executionTerm.mode} onChange={(event) => changeAddendumTerm("executionTerm", "mode", event.target.value)} disabled={!contractEnabled}>
                      <option value="relative">Dias/meses corridos</option>
                      <option value="fixed">Data final definida</option>
                    </select>
                    {addendumForm.executionTerm.mode === "relative" ? (
                      <div className={styles.contractGrid}>
                        <input value={addendumForm.executionTerm.quantity} onChange={(event) => changeAddendumTerm("executionTerm", "quantity", event.target.value)} placeholder="Quantidade" disabled={!contractEnabled} />
                        <select value={addendumForm.executionTerm.unit} onChange={(event) => changeAddendumTerm("executionTerm", "unit", event.target.value)} disabled={!contractEnabled}>
                          <option value="dias">Dias</option>
                          <option value="meses">Meses</option>
                        </select>
                        <select value={addendumForm.executionTerm.reference} onChange={(event) => changeAddendumTerm("executionTerm", "reference", event.target.value)} disabled={!contractEnabled}>
                          <option value="assinatura_os">A partir da assinatura da OS</option>
                          <option value="recebimento_os">A partir do recebimento da OS</option>
                        </select>
                      </div>
                    ) : (
                      <input type="date" value={addendumForm.executionTerm.endDate} onChange={(event) => changeAddendumTerm("executionTerm", "endDate", event.target.value)} disabled={!contractEnabled} />
                    )}
                  </>
                ) : null}
              </div>
              <div className={styles.contractTermBox}>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" name="validityTermEnabled" checked={addendumForm.validityTermEnabled} onChange={changeAddendum} disabled={!contractEnabled} />
                  Revisar vigÃªncia
                </label>
                {addendumForm.validityTermEnabled ? (
                  <>
                    <select value={addendumForm.validityTerm.mode} onChange={(event) => changeAddendumTerm("validityTerm", "mode", event.target.value)} disabled={!contractEnabled}>
                      <option value="relative">Dias/meses corridos</option>
                      <option value="fixed">Data final definida</option>
                    </select>
                    {addendumForm.validityTerm.mode === "relative" ? (
                      <div className={styles.contractGrid}>
                        <input value={addendumForm.validityTerm.quantity} onChange={(event) => changeAddendumTerm("validityTerm", "quantity", event.target.value)} placeholder="Quantidade" disabled={!contractEnabled} />
                        <select value={addendumForm.validityTerm.unit} onChange={(event) => changeAddendumTerm("validityTerm", "unit", event.target.value)} disabled={!contractEnabled}>
                          <option value="dias">Dias</option>
                          <option value="meses">Meses</option>
                        </select>
                        <select value={addendumForm.validityTerm.reference} onChange={(event) => changeAddendumTerm("validityTerm", "reference", event.target.value)} disabled={!contractEnabled}>
                          <option value="assinatura_os">A partir da assinatura da OS</option>
                          <option value="recebimento_os">A partir do recebimento da OS</option>
                        </select>
                      </div>
                    ) : (
                      <input type="date" value={addendumForm.validityTerm.endDate} onChange={(event) => changeAddendumTerm("validityTerm", "endDate", event.target.value)} disabled={!contractEnabled} />
                    )}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={submitting || !contractEnabled}>
              {submitting ? "Salvando..." : addendumForm.id ? "Salvar aditivo" : "Cadastrar aditivo"}
            </button>
          </div>
        </form>

        {(contractForm.addenda || []).length > 0 ? (
          <div className={styles.measurementsTableWrap}>
            <div className={styles.measurementsTableHeader}>
              <span>NÂº</span>
              <span>Tipo</span>
              <span>Processo</span>
              <span>Impacto</span>
            </div>
            <div className={styles.measurementsTableBody}>
              {(contractForm.addenda || []).map((addendum) => (
                <div key={addendum.id} className={styles.measurementRowGroup}>
                  <div className={styles.measurementRow}>
                    <span>{addendum.number}</span>
                    <span>{addendum.type === "valor_prazo" ? "Valor e prazo" : addendum.type === "valor" ? "Valor" : "Prazo"}</span>
                    <span>{addendum.administrativeProcessNumber}</span>
                    <span>{addendum.valueCents !== null && addendum.valueCents !== undefined ? formatCurrencyFromCents(addendum.valueCents) : "Sem valor"}</span>
                  </div>
                  <div className={styles.measurementExpandedRow}>
                    <div className={styles.measurementActions}>
                      <button className={styles.buttonAlt} type="button" onClick={() => editAddendum(addendum)} disabled={!contractEnabled}>
                        Editar
                      </button>
                      <button className={styles.buttonDanger} type="button" onClick={() => deleteAddendum(addendum.id)} disabled={!contractEnabled}>
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.selectedInfo}>Nenhum aditivo cadastrado ainda.</p>
        )}
      </section>
      {deleteAddendumId ? (
        <DeleteConfirmDialog
          title="Excluir aditivo"
          message="O aditivo selecionado sera excluido permanentemente do contrato."
          busy={submitting}
          onConfirm={confirmDeleteAddendum}
          onCancel={() => setDeleteAddendumId(null)}
        />
      ) : null}
    </div>
  );
}
