import {
  UserPlus,
  Clapperboard,
  PenTool,
  Archive,
  List as ListIcon,
  FileText,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  UserPlus,
  Clapperboard,
  PenTool,
  Archive,
  List: ListIcon,
  FileText,
};

/** Resolve um nome de ícone (string do mock) para o componente lucide. */
export function resolveIcon(name?: string): LucideIcon {
  return (name && MAP[name]) || ListIcon;
}
