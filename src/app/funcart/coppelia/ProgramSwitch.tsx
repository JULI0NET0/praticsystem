"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Program } from "./program";
import styles from "./coppelia.module.css";

export interface ProgramTab {
  id: Program["id"];
  label: string;
  dates: string;
  sections: { href: string; label: string }[];
  panel: ReactNode;
}

/**
 * Alterna entre os dois elencos. O programa ativo vai para a URL
 * (?programa=2) para dar para compartilhar o link certo.
 */
export default function ProgramSwitch({
  tabs,
  initial,
  today,
  shared,
  sharedSections,
}: {
  tabs: ProgramTab[];
  initial: Program["id"];
  today: Program["id"] | null;
  shared: ReactNode;
  sharedSections: { href: string; label: string }[];
}) {
  const [active, setActive] = useState(initial);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  function select(id: Program["id"]) {
    if (id === active) return;
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("programa", id);
    url.hash = "";
    window.history.replaceState(null, "", url);
    const top = panelRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) panelRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <>
      <div className={styles.chooser}>
        <p className={styles.chooserLabel}>Qual sessão você vai assistir?</p>
        <div className={styles.chooserTabs} role="tablist" aria-label="Programa do espetáculo">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-programa-${t.id}`}
              aria-selected={t.id === active}
              aria-controls="painel-programa"
              className={styles.chooserTab}
              onClick={() => select(t.id)}
            >
              <span className={styles.chooserName}>{t.label}</span>
              <span className={styles.chooserDates}>{t.dates}</span>
              {today === t.id && <span className={styles.today}>Hoje</span>}
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
                title={`${t.label} — ${t.dates}`}
              >
                P{t.id}
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
          aria-labelledby={`tab-programa-${current.id}`}
          className={styles.panel}
        >
          <p className={styles.panelBadge}>
            {current.label} · {current.dates}
          </p>
          {current.panel}
        </div>
        {shared}
      </main>
    </>
  );
}
