import { describe, it, expect } from "vitest";
import { makeEditingTasksFromCapture } from "./factory";
import { Task } from "@/types/operacao";

const capture: Task = {
  id: "cap_1",
  listId: "list_planejamento",
  title: "Captação - Balloarts",
  taskType: "captacao",
  statusId: "av_producao",
  assigneeIds: [],
  customValues: { mes_referente: "2026-07" },
  subtasks: [],
};

describe("makeEditingTasksFromCapture", () => {
  it("gera 2 tarefas, uma para cada fila de edição", () => {
    const [videos, fotos] = makeEditingTasksFromCapture("list_videos", "list_fotos", capture);
    expect(videos.listId).toBe("list_videos");
    expect(fotos.listId).toBe("list_fotos");
    expect(videos.title).toContain("vídeos");
    expect(fotos.title).toContain("fotos");
  });

  it("ambas ficam em PARA EDITAR e vinculadas à captação", () => {
    const tasks = makeEditingTasksFromCapture("list_videos", "list_fotos", capture);
    for (const t of tasks) {
      expect(t.statusId).toBe("ed_para_editar");
      expect(t.parentTaskId).toBe("cap_1");
      expect(t.customValues.mes_referente).toBe("2026-07");
    }
  });
});
