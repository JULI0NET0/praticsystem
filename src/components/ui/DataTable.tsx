"use client";

import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Alinha à direita e liga tabular-nums. Use em toda coluna de valor. */
  numeric?: boolean;
  width?: string | number;
  render: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  density?: "standard" | "compact";
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  density = "standard",
  onRowClick,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("table-container", className)}>
      <table className={cn("table", density === "compact" && "table-compact")}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                data-numeric={col.numeric ? "" : undefined}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} data-numeric={col.numeric ? "" : undefined}>
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
