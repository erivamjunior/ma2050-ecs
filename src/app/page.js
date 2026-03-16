import AppFooter from "@/components/app-footer";
import styles from "./modules.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.homePanel}>
        <div className={styles.homeStage} />
      </section>

      <AppFooter />
    </div>
  );
}
