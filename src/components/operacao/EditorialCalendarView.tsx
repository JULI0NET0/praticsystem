"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { List, Task } from "@/types/operacao";

interface Props {
  list: List;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}

/** View de calendário mensal: mostra os posts nas datas, coloridos por status. */
export default function EditorialCalendarView({ list, tasks, onOpenTask }: Props) {
  const events = tasks
    .map((t) => {
      const date = (t.dueDate || (t.customValues["data"] as string | undefined)) ?? null;
      if (!date) return null;
      const status = list.statuses.find((s) => s.id === t.statusId);
      return {
        id: t.id,
        title: t.title,
        start: date,
        allDay: true,
        backgroundColor: status?.color ?? "var(--color-text-tertiary)",
        borderColor: status?.color ?? "var(--color-text-tertiary)",
      };
    })
    .filter(Boolean) as {
    id: string;
    title: string;
    start: string;
    allDay: boolean;
    backgroundColor: string;
    borderColor: string;
  }[];

  return (
    <div className="glass-card" style={{ padding: "16px 0", background: "var(--bg-secondary)" }}>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: "prev,today,next", center: "title", right: "" }}
        buttonText={{ today: "Hoje" }}
        locale={ptBrLocale}
        events={events}
        dayMaxEvents={3}
        fixedWeekCount={false}
        height="auto"
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          onOpenTask(info.event.id);
        }}
      />
    </div>
  );
}
