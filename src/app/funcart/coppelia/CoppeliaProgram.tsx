import Image from "next/image";
import { Cormorant_Garamond, Pinyon_Script } from "next/font/google";
import ProgramSwitch, { type SessionTab } from "./ProgramSwitch";
import {
  CREDITS,
  EVENT,
  FUNCART_UNITS,
  GRADUATES,
  INSTAGRAM,
  SESSIONS,
  ORIGINAL_WORK,
  PROGRAMS,
  SUPPORTERS,
  type Dance,
  type Session,
  type Opening,
  type Program,
} from "./program";
import styles from "./coppelia.module.css";

const script = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--cp-script", display: "swap" });
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--cp-serif",
  display: "swap",
});

const SHARED_SECTIONS = [{ href: "#ficha-tecnica", label: "Ficha técnica" }];

/** Engrenagem desenhada por código: dentes trapezoidais ao redor de um aro. */
function gearPath(teeth: number, outer: number, inner: number) {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const at = (r: number, ang: number) => `${(r * Math.cos(ang)).toFixed(2)},${(r * Math.sin(ang)).toFixed(2)}`;
    pts.push(at(inner, a), at(outer, a + step * 0.15), at(outer, a + step * 0.45), at(inner, a + step * 0.6));
  }
  return `M${pts.join("L")}Z`;
}

function Gear({ size, teeth, className }: { size: number; teeth: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true">
      <path d={gearPath(teeth, 48, 40)} />
      <circle r="31" className={styles.gearHole} />
      <circle r="27" />
      {[0, 60, 120].map((r) => (
        <rect key={r} x="-3" y="-27" width="6" height="54" transform={`rotate(${r})`} className={styles.gearHole} />
      ))}
      <circle r="8" />
    </svg>
  );
}

function Clock({ className }: { className?: string }) {
  const numerals = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  return (
    <svg className={className} viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="47" className={styles.clockRim} />
      <circle r="41" className={styles.clockFace} />
      {numerals.map((n, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180);
        return (
          <text key={n} x={(33 * Math.cos(a)).toFixed(2)} y={(33 * Math.sin(a)).toFixed(2)} className={styles.clockNum}>
            {n}
          </text>
        );
      })}
      <line x1="0" y1="0" x2="0" y2="-24" className={styles.clockHand} />
      <line x1="0" y1="0" x2="16" y2="9" className={styles.clockHand} />
      <circle r="2.5" className={styles.clockPin} />
    </svg>
  );
}

function Flourish() {
  return (
    <svg className={styles.flourish} viewBox="0 0 240 24" aria-hidden="true">
      <path d="M4 12 H96 M144 12 H236" />
      <path d="M96 12 C104 2 114 2 120 12 C126 22 136 22 144 12 C136 2 126 2 120 12 C114 22 104 22 96 12Z" />
      <circle cx="120" cy="12" r="2.4" />
    </svg>
  );
}

function DanceCard({ dance }: { dance: Dance }) {
  return (
    <article className={styles.dance} id={dance.id}>
      <header className={styles.danceHead}>
        <h4 className={styles.danceTitle}>{dance.title}</h4>
        {dance.group && <p className={styles.danceGroup}>{dance.group}</p>}
      </header>
      {dance.soloist && (
        <p className={styles.soloist}>
          <span className={styles.soloLabel}>Solista</span>
          {dance.soloist}
        </p>
      )}
      {dance.alternating && <p className={styles.alternate}>Elenco alternado entre as apresentações</p>}
      {dance.cast.length > 0 && (
        <ul className={dance.alternating ? styles.castAlt : styles.cast}>
          {dance.cast.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function CharacterList({ characters }: { characters: Program["characters"] }) {
  return (
    <ul className={styles.characters}>
      {characters.map((c) => (
        <li key={c.role}>
          <span className={styles.role}>{c.role}</span>
          <span className={styles.performer}>{c.name}</span>
        </li>
      ))}
    </ul>
  );
}

function OpeningSection({ opening }: { opening: Opening }) {
  return (
    <section id={opening.id} className={`${styles.opening}`}>
      <p className={styles.eyebrow}>Escola Municipal de Dança · {opening.cohort}</p>
      <h2 className={styles.scriptTitle}>{opening.title}</h2>
      <Flourish />
      <div className={styles.synopsis}>
        {opening.synopsis.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <h3 id="casa-personagens" className={styles.subTitle}>
        Personagens principais
      </h3>
      <CharacterList characters={opening.characters} />
      <h3 id="casa-elenco" className={styles.subTitle}>
        Elenco
      </h3>
      <div className={styles.dances}>
        {opening.dances.map((d) => (
          <DanceCard key={d.id} dance={d} />
        ))}
      </div>
      <p className={styles.openingTeachers}>
        <span>Professores</span>
        {opening.teachers}
      </p>
    </section>
  );
}

function CoppeliaPanel({ program }: { program: Program }) {
  return (
    <>
      <figure className={styles.poster}>
        <Image
          src={program.poster.src}
          alt={program.poster.alt}
          width={2000}
          height={1650}
          sizes="(max-width: 760px) 100vw, 720px"
          priority
        />
      </figure>

      <section id="personagens" className={styles.section}>
        <h2 className={styles.sectionTitle}>Personagens principais</h2>
        <Flourish />
        <CharacterList characters={program.characters} />
      </section>

      {program.acts.map((act) => (
        <section key={act.id} id={act.id} className={styles.section}>
          <div className={styles.actHead}>
            <span className={styles.numeral}>{act.numeral}</span>
            <h2 className={styles.sectionTitle}>{act.label}</h2>
          </div>
          <Flourish />
          <div className={styles.synopsis}>
            {act.synopsis.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className={styles.dances}>
            {act.dances.map((d) => (
              <DanceCard key={d.id} dance={d} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function sessionTab(session: Session): SessionTab {
  const dayLabel = `${session.day} de novembro`;
  if (session.kind === "casa" && session.opening) {
    return {
      id: session.id,
      label: dayLabel,
      detail: `${session.opening.title} · ${session.opening.cohort}`,
      time: session.time,
      short: `${session.day} Casa`,
      sections: [
        { href: "#casa-personagens", label: "Personagens" },
        { href: "#casa-elenco", label: "Elenco" },
      ],
      panel: <OpeningSection opening={session.opening} />,
    };
  }
  const program = PROGRAMS.find((p) => p.id === session.programId) ?? PROGRAMS[0];
  const hasCasa = SESSIONS.some((x) => x.day === session.day && x.kind === "casa");
  return {
    id: session.id,
    label: dayLabel,
    detail: `Coppélia · ${program.label}`,
    time: session.time,
    short: hasCasa ? `${session.day} Coppélia` : String(session.day),
    sections: [
      { href: "#personagens", label: "Personagens" },
      ...program.acts.map((a) => ({ href: `#${a.id}`, label: a.label })),
    ],
    panel: <CoppeliaPanel program={program} />,
  };
}

export default function CoppeliaProgram({
  initial,
  today,
}: {
  initial: string;
  today: string[];
}) {
  return (
    <div className={`${styles.page} ${script.variable} ${serif.variable}`}>
      <div className={styles.ornaments} aria-hidden="true">
        <Gear size={220} teeth={18} className={`${styles.gear} ${styles.gearA}`} />
        <Gear size={120} teeth={12} className={`${styles.gear} ${styles.gearB}`} />
        <Gear size={160} teeth={14} className={`${styles.gear} ${styles.gearC}`} />
      </div>

      <header className={styles.hero}>
        <Clock className={styles.heroClock} />
        <p className={styles.presenter}>{EVENT.presenter}</p>
        <h1 className={styles.title}>{EVENT.title}</h1>
        <p className={styles.kicker}>Programa do espetáculo</p>
      </header>

      <ProgramSwitch
        tabs={SESSIONS.map(sessionTab)}
        initial={initial}
        today={today}
        sharedSections={SHARED_SECTIONS}
        shared={
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Obra original</h2>
              <Flourish />
              <p className={styles.prose}>{ORIGINAL_WORK}</p>
            </section>

            <section id="ficha-tecnica" className={styles.section}>
              <h2 className={styles.sectionTitle}>Ficha técnica</h2>
              <Flourish />
              <dl className={styles.credits}>
                {CREDITS.map((c) => (
                  <div key={c.label}>
                    <dt>{c.label}</dt>
                    <dd>{c.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={`${styles.section} ${styles.graduates}`}>
              <p className={styles.graduatesEyebrow}>Escola Municipal de Dança de Londrina</p>
              <h2 className={styles.sectionTitle}>Formandos 2026</h2>
              <Flourish />
              <ul>
                {GRADUATES.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </section>

            <section className={styles.supporters} aria-label="Realização, patrocínio e apoio">
              {SUPPORTERS.map((s) => (
                <div key={s.role} className={s.minor ? styles.supporterMinor : styles.supporter}>
                  <span className={styles.supporterRole}>{s.role}</span>
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- proporção dos logos varia
                    <img src={s.logo} alt={s.name} className={styles.supporterLogo} />
                  ) : (
                    <span className={styles.supporterName}>{s.name}</span>
                  )}
                  {s.detail && <span className={styles.supporterDetail}>{s.detail}</span>}
                </div>
              ))}
            </section>
          </>
        }
      />

      <footer className={styles.footer}>
        <p className={styles.footerName}>FUNCART</p>
        <p className={styles.footerFull}>Fundação Cultura Artística de Londrina</p>
        <div className={styles.units}>
          {FUNCART_UNITS.map((u) => (
            <div key={u.name} className={styles.unit}>
              <h3>{u.name}</h3>
              {u.address.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className={styles.phones}>
                {u.phones.map((p) => (
                  <a key={p.tel} href={p.whatsapp ? `https://wa.me/${p.tel.replace("+", "")}` : `tel:${p.tel}`}>
                    {p.display}
                    {p.whatsapp && <span className={styles.wa}> · WhatsApp</span>}
                  </a>
                ))}
              </p>
            </div>
          ))}
        </div>
        <a className={styles.instagram} href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.3" cy="6.7" r="1" className={styles.igDot} />
          </svg>
          {INSTAGRAM.handle}
        </a>
      </footer>
    </div>
  );
}
