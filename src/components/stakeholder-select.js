"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./stakeholder-ui.module.css";

const INITIAL_STAKEHOLDER = {
  name: "",
  cpf: "",
  birthDate: "",
  email: "",
  phone: "",
  secretariaId: "",
  setorId: "",
};

export function StakeholderCreateModal({
  open,
  onClose,
  onCreated,
  initialName = "",
}) {
  const [stakeholderForm, setStakeholderForm] = useState(INITIAL_STAKEHOLDER);
  const [secretarias, setSecretarias] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showSecretariaBox, setShowSecretariaBox] = useState(false);
  const [showSetorBox, setShowSetorBox] = useState(false);
  const [secretariaForm, setSecretariaForm] = useState({ name: "", sigla: "" });
  const [setorForm, setSetorForm] = useState({ name: "", sigla: "", secretariaId: "" });

  const setoresBySecretaria = useMemo(
    () => setores.filter((setor) => setor.secretariaId === stakeholderForm.secretariaId),
    [setores, stakeholderForm.secretariaId],
  );

  async function loadCatalog() {
    setLoading(true);
    setError("");

    try {
      const [s1, s2] = await Promise.all([
        fetch("/api/secretarias", { cache: "no-store" }),
        fetch("/api/setores", { cache: "no-store" }),
      ]);

      const d1 = await s1.json();
      const d2 = await s2.json();

      if (!s1.ok) {
        throw new Error(d1.error || "Erro ao carregar secretarias.");
      }

      if (!s2.ok) {
        throw new Error(d2.error || "Erro ao carregar setores.");
      }

      setSecretarias(d1.secretarias || []);
      setSetores(d2.setores || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    setStakeholderForm((prev) => ({ ...INITIAL_STAKEHOLDER, name: initialName || prev.name }));
    setSecretariaForm({ name: "", sigla: "" });
    setSetorForm({ name: "", sigla: "", secretariaId: "" });
    setShowSecretariaBox(false);
    setShowSetorBox(false);
    loadCatalog();
  }, [open, initialName]);

  function changeStakeholder(event) {
    const { name, value } = event.target;

    setStakeholderForm((prev) => {
      if (name === "secretariaId") {
        return { ...prev, secretariaId: value, setorId: "" };
      }

      return { ...prev, [name]: value };
    });
  }

  async function saveSecretaria() {
    setError("");

    try {
      const response = await fetch("/api/secretarias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(secretariaForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar secretaria.");
      }

      setSecretariaForm({ name: "", sigla: "" });
      setShowSecretariaBox(false);
      await loadCatalog();
      setStakeholderForm((prev) => ({ ...prev, secretariaId: data.secretaria.id, setorId: "" }));
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function saveSetor() {
    setError("");

    try {
      const payload = {
        ...setorForm,
        secretariaId: setorForm.secretariaId || stakeholderForm.secretariaId,
      };

      const response = await fetch("/api/setores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar setor.");
      }

      setSetorForm({ name: "", sigla: "", secretariaId: "" });
      setShowSetorBox(false);
      await loadCatalog();
      setStakeholderForm((prev) => ({
        ...prev,
        secretariaId: data.setor.secretariaId,
        setorId: data.setor.id,
      }));
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function saveStakeholder(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/stakeholders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stakeholderForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar stakeholder.");
      }

      onCreated?.(data.stakeholder);
      onClose?.();
    } catch (saveError) {
      setError(saveError.message);
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
          <h3>Novo stakeholder</h3>
          <button className={styles.closeButton} type="button" onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>

        {loading ? <p>Carregando catalogo...</p> : null}

        <form className={styles.form} onSubmit={saveStakeholder}>
          <label>
            Nome completo
            <input name="name" value={stakeholderForm.name} onChange={changeStakeholder} required />
          </label>

          <label>
            CPF
            <input name="cpf" value={stakeholderForm.cpf} onChange={changeStakeholder} required />
          </label>

          <label>
            Data de nascimento
            <input
              type="date"
              name="birthDate"
              value={stakeholderForm.birthDate}
              onChange={changeStakeholder}
              required
            />
          </label>

          <label>
            Email
            <input type="email" name="email" value={stakeholderForm.email} onChange={changeStakeholder} required />
          </label>

          <label>
            Telefone (WhatsApp)
            <input name="phone" value={stakeholderForm.phone} onChange={changeStakeholder} required />
          </label>

          <label>
            Secretaria
            <select
              name="secretariaId"
              value={stakeholderForm.secretariaId}
              onChange={changeStakeholder}
              required
            >
              <option value="">Selecione...</option>
              {secretarias.map((secretaria) => (
                <option key={secretaria.id} value={secretaria.id}>
                  {secretaria.name} ({secretaria.sigla})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => setShowSecretariaBox((prev) => !prev)}
          >
            {showSecretariaBox ? "Fechar criacao de secretaria" : "Secretaria nao existe? Criar"}
          </button>

          {showSecretariaBox && (
            <div className={styles.inlineBox}>
              <label>
                Nome completo da secretaria
                <input
                  value={secretariaForm.name}
                  onChange={(event) =>
                    setSecretariaForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>
              <label>
                Sigla
                <input
                  value={secretariaForm.sigla}
                  onChange={(event) =>
                    setSecretariaForm((prev) => ({ ...prev, sigla: event.target.value }))
                  }
                />
              </label>
              <button type="button" className={styles.secondaryButton} onClick={saveSecretaria}>
                Salvar secretaria
              </button>
            </div>
          )}

          <label>
            Setor
            <select
              name="setorId"
              value={stakeholderForm.setorId}
              onChange={changeStakeholder}
              required
              disabled={!stakeholderForm.secretariaId}
            >
              <option value="">Selecione...</option>
              {setoresBySecretaria.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.name} ({setor.sigla})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => setShowSetorBox((prev) => !prev)}
          >
            {showSetorBox ? "Fechar criacao de setor" : "Setor nao existe? Criar"}
          </button>

          {showSetorBox && (
            <div className={styles.inlineBox}>
              <label>
                Secretaria do setor
                <select
                  value={setorForm.secretariaId || stakeholderForm.secretariaId}
                  onChange={(event) =>
                    setSetorForm((prev) => ({ ...prev, secretariaId: event.target.value }))
                  }
                >
                  <option value="">Selecione...</option>
                  {secretarias.map((secretaria) => (
                    <option key={secretaria.id} value={secretaria.id}>
                      {secretaria.name} ({secretaria.sigla})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nome completo do setor
                <input
                  value={setorForm.name}
                  onChange={(event) => setSetorForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label>
                Sigla
                <input
                  value={setorForm.sigla}
                  onChange={(event) => setSetorForm((prev) => ({ ...prev, sigla: event.target.value }))}
                />
              </label>
              <button type="button" className={styles.secondaryButton} onClick={saveSetor}>
                Salvar setor
              </button>
            </div>
          )}

          <div className={styles.actionRow}>
            <button className={styles.primaryButton} type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar stakeholder"}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </div>
  );
}

export default function StakeholderSelect({
  value,
  onChange,
  label = "Responsavel",
  required = false,
}) {
  const [stakeholders, setStakeholders] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  async function loadStakeholders() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stakeholders", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar stakeholders.");
      }

      setStakeholders(data.stakeholders || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStakeholders();
  }, []);

  const selectedStakeholder = stakeholders.find((item) => item.id === value) || null;

  useEffect(() => {
    if (selectedStakeholder) {
      setQuery(selectedStakeholder.name);
    }
  }, [selectedStakeholder]);

  const filtered = stakeholders.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase().trim()),
  );

  const showDropdown = query.trim().length > 0;

  function selectStakeholder(item) {
    onChange(item.id);
    setQuery(item.name);
  }

  function handleInputChange(event) {
    const nextValue = event.target.value;
    setQuery(nextValue);
    onChange("");
  }

  function onCreated(stakeholder) {
    loadStakeholders().then(() => {
      onChange(stakeholder.id);
      setQuery(stakeholder.name);
    });
  }

  return (
    <div className={styles.pickerWrap}>
      <label>
        {label}
        <input
          placeholder="Busque pelo nome do responsavel"
          value={query}
          onChange={handleInputChange}
          required={required}
        />
      </label>

      {selectedStakeholder ? (
        <p className={styles.selectedInfo}>
          CPF: {selectedStakeholder.cpf} | Secretaria: {selectedStakeholder.secretaria?.sigla || "-"} |
          Setor: {selectedStakeholder.setor?.sigla || "-"}
        </p>
      ) : null}

      {showDropdown && (
        <div className={styles.dropdown}>
          {loading ? <p className={styles.hint}>Carregando...</p> : null}

          {!loading && filtered.length === 0 ? (
            <button type="button" className={styles.dropdownItem} onClick={() => setShowModal(true)}>
              Nenhum nome encontrado. Criar stakeholder &quot;{query}&quot;.
            </button>
          ) : null}

          {!loading && filtered.length > 0
            ? filtered.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => selectStakeholder(item)}
                >
                  {item.name}
                </button>
              ))
            : null}
        </div>
      )}

      <div className={styles.actionRow}>
        <button type="button" className={styles.ghostButton} onClick={() => setShowModal(true)}>
          Criar novo stakeholder
        </button>
        <button type="button" className={styles.ghostButton} onClick={loadStakeholders}>
          Atualizar lista
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <StakeholderCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={onCreated}
        initialName={query}
      />
    </div>
  );
}

