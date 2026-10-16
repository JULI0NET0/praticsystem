"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Kanban, Users, MessageCircle, Megaphone, Zap } from "lucide-react";
import { countsForBadge } from "@/lib/prospeccao/classify";
import { prospeccaoBase } from "@/lib/prospeccao/paths";
import { useProspeccao } from "./ProspeccaoProvider";

const TABS = [
  { slug: "", label: "Funil", icon: Kanban, exact: true },
  { slug: "/leads", label: "Leads", icon: Users },
  { slug: "/conversas", label: "Conversas", icon: MessageCircle },
  { slug: "/agendadas", label: "Agendadas", icon: CalendarClock },
  { slug: "/campanhas", label: "Campanhas", icon: Megaphone },
  { slug: "/respostas", label: "Respostas rápidas", icon: Zap },
];

export default function ProspeccaoNav() {
  const pathname = usePathname();
  const base = prospeccaoBase(pathname);
  const { contacts } = useProspeccao();
  const unread = contacts.reduce((a, l) => a + (countsForBadge(l.tipo ?? "lead") ? l.unread_count : 0), 0);
  return (
    <nav className="pp-subnav" aria-label="Seções da prospecção">
      {TABS.map(({ slug, label, icon: Icon, exact }) => {
        const href = `${base}${slug}`;
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} data-active={active}>
            <Icon size={16} strokeWidth={1.75} />
            {label}
            {label === "Conversas" && unread > 0 && <span className="pp-unread">{unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
