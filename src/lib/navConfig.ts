import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  CreditCard,
  CalendarDays,
  ShieldAlert,
  Activity,
  MessageSquare,
  type LucideIcon
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

export interface NavGroup {
  title: string;
  roles: string[];
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Minha Área",
    roles: ['admin', 'board', 'social_media', 'filmmaker'],
    items: [
      { href: "/admin/workspace", label: "WorkSpace", icon: LayoutDashboard, roles: ['admin', 'board', 'social_media', 'filmmaker'] },
      { href: "/admin/chat", label: "Chat", icon: MessageSquare, roles: ['admin', 'board', 'social_media', 'filmmaker'] },
      { href: "/admin/schedule", label: "Minha Agenda", icon: CalendarDays, roles: ['admin', 'board', 'social_media', 'filmmaker'] },
    ]
  },
  {
    title: "Administrativo",
    roles: ['admin', 'board'],
    items: [
      { href: "/admin/billing", label: "Financeiro", icon: CreditCard, roles: ['admin', 'board'] },
      { href: "/admin/registrations", label: "Cadastros", icon: FileText, roles: ['admin', 'board'] },
      { href: "/admin/users", label: "Equipe", icon: ShieldAlert, roles: ['admin', 'board'] },
      { href: "/admin/management", label: "Gestão", icon: Activity, roles: ['admin', 'board'] },
    ]
  },
  {
    title: "Gestão Comercial",
    roles: ['admin', 'board', 'social_media'],
    items: [
      { href: "/admin/clients", label: "Clientes", icon: Users, roles: ['admin', 'board', 'social_media'] },
      { href: "/admin/services", label: "Serviços", icon: Briefcase, roles: ['admin', 'board'] },
      { href: "/admin/contracts", label: "Contratos", icon: FileText, roles: ['admin', 'board', 'social_media'] },
    ]
  }
];

/**
 * Itens principais da Bottom Nav Mobile.
 * O 5º item ("Mais") é tratado inline pelo MobileNav como toggle do drawer.
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/admin/workspace", label: "Work", icon: LayoutDashboard, roles: ['admin', 'board', 'social_media', 'filmmaker'] },
  { href: "/admin/clients", label: "Clientes", icon: Users, roles: ['admin', 'board', 'social_media'] },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare, roles: ['admin', 'board', 'social_media', 'filmmaker'] },
  { href: "/admin/billing", label: "Financeiro", icon: CreditCard, roles: ['admin', 'board'] },
];
