import { readFile } from "node:fs/promises";
import path from "node:path";
import AppFooter from "@/components/app-footer";
import styles from "./page.module.css";

async function loadDiagramHtml() {
  const filePath = path.join(process.cwd(), "schema-diagram.html");
  return readFile(filePath, "utf8");
}

export default async function GestaoSistemaPage() {
  const diagramHtml = await loadDiagramHtml();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Modulo novo</p>
          <h1>Gestao do Sistema</h1>
          <p className={styles.subtitle}>
            Espaco para visibilidade operacional do sistema. A primeira entrega deste modulo
            traz o schema de dados embutido na aplicacao, pronto para consulta visual.
          </p>
        </div>
      </header>

      <section className={styles.overviewGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Visao atual</span>
          <strong className={styles.metricValue}>Schema remoto refletido no GitHub</strong>
          <p className={styles.metricText}>
            O diagrama abaixo foi baseado no <code>prisma/schema.prisma</code> que bate com o
            arquivo da branch <code>main</code> no GitHub.
          </p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Uso imediato</span>
          <strong className={styles.metricValue}>Consulta estrutural</strong>
          <p className={styles.metricText}>
            Aqui voce consegue inspecionar tabelas, campos, tipos, PKs, FKs e relacoes sem
            depender de pgAdmin ou acesso direto ao RDS.
          </p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Proximas frentes</span>
          <strong className={styles.metricValue}>Governanca e operacao</strong>
          <p className={styles.metricText}>
            Esse modulo pode crescer depois com versao do app, ambiente AWS, checagens de banco,
            saude do deploy e outros paineis de administracao.
          </p>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Schema de Dados</h2>
            <p>
              Diagrama interativo embutido no modulo. Voce pode dar zoom e rearranjar as tabelas
              diretamente aqui.
            </p>
          </div>
        </div>

        <div className={styles.diagramFrameWrap}>
          <iframe
            title="Schema de dados do sistema"
            srcDoc={diagramHtml}
            className={styles.diagramFrame}
          />
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
