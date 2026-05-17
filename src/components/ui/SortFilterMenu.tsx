"use client";

import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import DropdownMenu, { DropdownMenuItem } from "./DropdownMenu";

export interface SortOption {
  label: string;
  value: string;
}

interface SortFilterMenuProps {
  options: SortOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  sortOrder?: 'asc' | 'desc';
  onToggleOrder?: () => void;
  label?: string;
  className?: string;
}

export default function SortFilterMenu({
  options,
  selectedValue,
  onSelect,
  sortOrder,
  onToggleOrder,
  label = "Ordenar por",
  className = ""
}: SortFilterMenuProps) {
  const currentOption = options.find(o => o.value === selectedValue);

  const items: DropdownMenuItem[] = options.map(opt => ({
    label: opt.label,
    icon: opt.value === selectedValue ? Check : undefined,
    action: () => onSelect(opt.value)
  }));

  if (onToggleOrder && sortOrder) {
    items.push({ separator: true } as DropdownMenuItem);
    items.push({
      label: sortOrder === 'asc' ? 'Ordem Crescente (A-Z)' : 'Ordem Decrescente (Z-A)',
      icon: ArrowUpDown,
      action: onToggleOrder
    });
  }

  return (
    <DropdownMenu
      className={className}
      trigger={
        <button
          className="btn btn-secondary glass-card"
          style={{
            padding: '10px 18px',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: 500,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          <ArrowUpDown size={16} color="var(--accent)" />
          <span>{label}: <strong>{currentOption?.label || selectedOptionLabel(selectedValue)}</strong></span>
          <ChevronDown size={14} color="var(--text-tertiary)" />
        </button>
      }
      items={items}
      align="right"
    />
  );
}

function selectedOptionLabel(val: string) {
  return val.charAt(0).toUpperCase() + val.slice(1);
}
