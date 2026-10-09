"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, Users, MessageCircle, Megaphone, Zap } from "lucide-react";
import { useProspeccao } from "./ProspeccaoProvider";

const TABS = [
  { href: "/admin/prospeccao", label: "Funil", icon: Kanban, exact: true },
  { href: "/admin/prospeccao/leads", label: "Leads", icon: Users },
  { href: "/admin/prospeccao/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/admin/prospeccao/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/admin/prospeccao/respostas", label: "Respostas rápidas", icon: Zap },
];

export default function ProspeccaoNav() {
  const pathname = usePathname();
  const { leads } = useProspeccao();
  const unread = leads.reduce((a, l) => a + l.unread_count, 0);
  return (
    <nav className="pp-subnav" aria-label="Seções da prospecção">
      {TABS.map(({ href, label, icon: Icon, exact }) => {
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
