"use client";

import { useEffect, useMemo, useState } from "react";
import AppFooter from "@/components/app-footer";
import { StakeholderCreateModal } from "@/components/stakeholder-select";
import styles from "../modules.module.css";

export default function StakeholdersPage() {
  const [stakeholders, setStakeholders] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [secretariaFilter, setSecretariaFilter] = useState("");
  const [setorFilter, setSetorFilter] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [s1, s2, s3] = await Promise.all([
        fetch("/api/stakeholders", { cache: "no-store" }),
        fetch("/api/secretarias", { cache: "no-store" }),
        fetch("/api/setores", { cache: "no-store" }),
      ]);

      const d1 = await s1.json();
      const d2 = await s2.json();
      const d3 = await s3.json();

      if (!s1.ok) {
        throw new Error(d1.error || "Erro ao listar stakeholders.");
      }

      if (!s2.ok) {
        throw new Error(d2.error || "Erro ao listar secretarias.");
      }

      if (!s3.ok) {
        throw new Error(d3.error || "Erro ao listar setores.");
      }

      setStakeholders(d1.stakeholders || []);
      setSecretarias(d2.secretarias || []);
      setSetores(d3.setores || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredSetores = useMemo(() => {
    if (!secretariaFilter) {
      return setores;
    }
    return setores.filter((setor) => setor.secretariaId === secretariaFilter);
  }, [setores, secretariaFilter]);

  const filteredStakeholders = useMemo(() => {
    return stakeholders.filter((item) => {
      if (secretariaFilter && item.secretariaId !== secretariaFilter) {
        return false;
      }

      if (setorFilter && item.setorId !== setorFilter) {
        return false;
      }

      return true;
    });
  }, [stakeholders, secretariaFilter, setorFilter]);

  const orgView = useMemo(() => {
    return secretarias.map((secretaria) => {
      const setoresDaSecretaria = setores.filter((setor) => setor.secretariaId === secretaria.id);

      const setoresComPessoas = setoresDaSecretaria.map((setor) => {
        const perfis = stakeholders.filter((item) => item.setorId === setor.id);
        return { ...setor, perfis };
      });

      const semSetor = stakeholders.filter(
        (item) => item.secretariaId === secretaria.id && !item.setorId,
      );

      return {
        ...secretaria,
        setores: setoresComPessoas,
        semSetor,
      };
    });
  }, [secretarias, setores, stakeholders]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Modulo: Stakeholders</h2>
        <p>Filtros por secretaria/setor e visao organizacional completa.</p>
      </header>

      <section className={styles.panel}>
        <div className={styles.listHeader}>
          <h3>Listagem de perfis</h3>
          <div className={styles.actions}>
            <button className={styles.button} type="button" onClick={() => setShowModal(true)}>
              Novo stakeholder
            </button>
            <button className={styles.buttonAlt} type="button" onClick={loadData}>
              Atualizar
            </button>
          </div>
        </div>

        <div className={styles.filterBar}>
          <label className={styles.filterGroup}>
            Secretaria
            <select
              value={secretariaFilter}
              onChange={(event) => {
                setSecretariaFilter(event.target.value);
                setSetorFilter("");
              }}
            >
              <option value="">Todas</option>
              {secretarias.map((secretaria) => (
                <option key={secretaria.id} value={secretaria.id}>
                  {secretaria.name} ({secretaria.sigla})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterGroup}>
            Setor
            <select value={setorFilter} onChange={(event) => setSetorFilter(event.target.value)}>
              <option value="">Todos</option>
              {filteredSetores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.name} ({setor.sigla})
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {loading ? <p>Carregando...</p> : null}

        {!loading && filteredStakeholders.length === 0 ? (
          <p>Nenhum perfil encontrado para os filtros selecionados.</p>
        ) : null}

        {!loading && filteredStakeholders.length > 0 ? (
          <ul className={styles.list}>
            {filteredStakeholders.map((item) => (
              <li key={item.id} className={styles.item}>
                <h4>{item.name}</h4>
                <p className={styles.selectedInfo}>
                  {item.secretaria?.sigla || "-"} / {item.setor?.sigla || "-"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.panel}>
        <h3>Secretarias, setores e perfis</h3>
        <p className={styles.selectedInfo}>
          Secretarias: {secretarias.length} | Setores: {setores.length} | Perfis: {stakeholders.length}
        </p>

        <div className={styles.hierarchyGrid}>
          {orgView.map((secretaria) => (
            <article key={secretaria.id} className={styles.hierarchyCard}>
              <h4>
                {secretaria.name} ({secretaria.sigla})
              </h4>

              {secretaria.setores.length === 0 ? <p className={styles.selectedInfo}>Sem setores.</p> : null}

              {secretaria.setores.map((setor) => (
                <div key={setor.id} className={styles.hierarchySetor}>
                  <p>
                    <strong>{setor.name}</strong> ({setor.sigla})
                  </p>

                  {setor.perfis.length === 0 ? (
                    <p className={styles.selectedInfo}>Sem perfis neste setor.</p>
                  ) : (
                    <div className={styles.chipList}>
                      {setor.perfis.map((perfil) => (
                        <span key={perfil.id} className={styles.chip}>
                          {perfil.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {secretaria.semSetor.length > 0 ? (
                <div className={styles.hierarchySetor}>
                  <p>
                    <strong>Sem setor definido</strong>
                  </p>
                  <div className={styles.chipList}>
                    {secretaria.semSetor.map((perfil) => (
                      <span key={perfil.id} className={styles.chip}>
                        {perfil.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <AppFooter />

      <StakeholderCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false);
          loadData();
        }}
      />
    </div>
  );
}


