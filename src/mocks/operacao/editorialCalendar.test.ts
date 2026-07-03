import { describe, it, expect } from "vitest";
import {
  parseMonthRef,
  selectEditorialDates,
  generateEditorialPosts,
} from "./editorialCalendar";
import { Weekday } from "@/types/operacao";

describe("parseMonthRef", () => {
  it("interpreta formato ISO", () => {
    expect(parseMonthRef("2026-07")).toEqual({ year: 2026, month0: 6 });
  });
  it("interpreta formato BR abreviado", () => {
    expect(parseMonthRef("Jul/2026")).toEqual({ year: 2026, month0: 6 });
  });
});

describe("selectEditorialDates", () => {
  it("3 posts/semana × 4 semanas em seg/qua/sex = 12 datas", () => {
    const dates = selectEditorialDates(2026, 6, 3, 4, [1, 3, 5] as Weekday[]);
    expect(dates).toHaveLength(12);
  });

  it("todas as datas caem nos dias da semana escolhidos", () => {
    const weekdays: Weekday[] = [2, 4]; // ter/qui
    const dates = selectEditorialDates(2026, 6, 2, 4, weekdays);
    for (const d of dates) {
      const wd = new Date(d + "T00:00:00").getDay();
      expect(weekdays).toContain(wd as Weekday);
    }
    expect(dates).toHaveLength(8);
  });

  it("datas são crescentes", () => {
    const dates = selectEditorialDates(2026, 6, 3, 4, [1, 3, 5] as Weekday[]);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });
});

describe("generateEditorialPosts", () => {
  it("numera POST 01..N sequencialmente e herda mídia/mês", () => {
    const posts = generateEditorialPosts({
      listId: "list_x",
      monthRef: "2026-07",
      postsPerWeek: 3,
      weeks: 4,
      weekdays: [1, 3, 5],
      channels: ["FEED"],
      startFunnel: "TOPO",
    });
    expect(posts).toHaveLength(12);
    expect(posts[0].title).toBe("POST 01");
    expect(posts[11].title).toBe("POST 12");
    expect(posts.every((p) => p.taskType === "post")).toBe(true);
    expect(posts.every((p) => p.customValues.midia === "FEED")).toBe(true);
    expect(posts.every((p) => p.customValues.mes_referente === "2026-07")).toBe(true);
    expect(posts.every((p) => p.statusId === "cr_planejamento")).toBe(true);
  });

  it("distribui canais em round-robin quando há múltiplos", () => {
    const posts = generateEditorialPosts({
      listId: "list_x",
      monthRef: "2026-07",
      postsPerWeek: 2,
      weeks: 2,
      weekdays: [1, 3],
      channels: ["FEED", "STORIES"],
    });
    expect(posts[0].customValues.midia).toBe("FEED");
    expect(posts[1].customValues.midia).toBe("STORIES");
    expect(posts[2].customValues.midia).toBe("FEED");
  });
});
