import Image from "next/image";
import styles from "../app/modules.module.css";

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Image
          src="/logoma2050.svg"
          alt="Logo MA 2050"
          className={styles.footerLogo}
          width={24}
          height={34}
        />
        <span className={styles.footerText}>
          © 2026 Erivam Junior — MA 2050 · Sistema de Gestão de Projetos. Todos os direitos reservados.
        </span>
      </div>
    </footer>
  );
}
