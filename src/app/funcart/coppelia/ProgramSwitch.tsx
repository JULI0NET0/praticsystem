"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "./coppelia.module.css";

export interface SessionTab {
  /** "28" (Coppélia) ou "28-casa" (A Casa de Brinquedos). */
  id: string;
  /** "28 de novembro" */
  label: string;
  /** O que acontece: "Coppélia · Programa 1" ou "A Casa de Brinquedos · 1º ano". */
  detail: string;
  /** "À tarde" ou "20h". */
  time: string;
  /** Rótulo curto da barra fixa: "28 Casa", "28 Coppélia" ou só "26". */
  short: string;
  sections: { href: string; label: string }[];
  panel: ReactNode;
}

/**
 * Alterna entre as sessões do espetáculo. A sessão ativa vai para a URL
 * (?dia=28) para dar para compartilhar o link certo.
 */
export default function ProgramSwitch({
  tabs,
  initial,
  today,
  shared,
  sharedSections,
}: {
  tabs: SessionTab[];
  initial: string;
  today: string[];
  shared: ReactNode;
  sharedSections: { href: string; label: string }[];
}) {
  const [active, setActive] = useState(initial);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  function select(id: string) {
    if (id === active) return;
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.delete("programa");
    url.searchParams.set("dia", id);
    url.hash = "";
    window.history.replaceState(null, "", url);
    const top = panelRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) panelRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <>
      <div className={styles.chooser}>
        <p className={styles.chooserLabel}>Qual sessão você vai assistir?</p>
        <div className={styles.chooserTabs} role="tablist" aria-label="Sessão do espetáculo">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-dia-${t.id}`}
              aria-selected={t.id === active}
              aria-controls="painel-programa"
              className={styles.chooserTab}
              onClick={() => select(t.id)}
            >
              <span className={styles.chooserName}>{t.label}</span>
              <span className={styles.chooserDates}>{t.detail}</span>
              <span className={styles.chooserTime}>{t.time}</span>
              {today.includes(t.id) && <span className={styles.today}>Hoje</span>}
            </button>
          ))}
        </div>
      </div>

      <nav className={styles.nav} aria-label="Seções do programa">
        <ul>
          <li className={styles.navSwitch}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === active}
                onClick={() => select(t.id)}
                title={`${t.label} — ${t.detail} · ${t.time}`}
              >
                {t.short}
              </button>
            ))}
          </li>
          {[...current.sections, ...sharedSections].map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <main className={styles.main}>
        <div
          ref={panelRef}
          id="painel-programa"
          role="tabpanel"
          key={current.id}
          aria-labelledby={`tab-dia-${current.id}`}
          className={styles.panel}
        >
          <p className={styles.panelBadge}>
            {current.label} · {current.time} · {current.detail}
          </p>
          {current.panel}
        </div>
        {shared}
      </main>
    </>
  );
}
