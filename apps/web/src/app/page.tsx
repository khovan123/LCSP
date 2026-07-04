import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1>LCSP Web App</h1>
        <p>Scaffolded with create-next-app and ready for LCSP integration.</p>
      </section>
    </main>
  );
}
