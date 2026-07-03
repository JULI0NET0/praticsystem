"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Area,
  EditorialGenerationInput,
  List,
  Space,
  Task,
} from "@/types/operacao";
import {
  createInitialState,
  generateEditorialPosts,
  buildCriacaoList,
  makeEditingTasksFromCapture,
} from "@/mocks/operacao";

// ---------------------------------------------------------------------------
// Helpers imutáveis de atualização da árvore
// ---------------------------------------------------------------------------

function mapTasks(space: Space, fn: (t: Task, list: List) => Task): Space {
  return {
    ...space,
    areas: space.areas.map((area) => ({
      ...area,
      lists: area.lists.map((list) => ({
        ...list,
        tasks: list.tasks.map((t) => fn(t, list)),
      })),
    })),
  };
}

function patchTask(space: Space, taskId: string, patch: (t: Task) => Task): Space {
  return mapTasks(space, (t) => (t.id === taskId ? patch(t) : t));
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

interface OperacaoContextValue {
  space: Space;
  // seletores
  getArea: (areaId: string) => Area | undefined;
  getList: (listId: string) => List | undefined;
  getTask: (taskId: string) => Task | undefined;
  getTasksByList: (listId: string) => Task[];
  // mutações
  moveTask: (taskId: string, toStatusId: string) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  addTask: (listId: string, task: Task) => void;
  deleteTask: (taskId: string) => void;
  toggleAction: (actionId: string) => void;
  updateCustomValue: (taskId: string, key: string, value: Task["customValues"][string]) => void;
  cloneTemplateList: (areaId: string, clientName: string) => List;
  generateEditorialCalendar: (input: EditorialGenerationInput) => Task[];
  generateEditingTasks: (captureTaskId: string) => Task[];
  moveListToArea: (listId: string, toAreaId: string) => void;
}

const OperacaoContext = createContext<OperacaoContextValue | null>(null);

export function OperacaoProvider({ children }: { children: ReactNode }) {
  const [space, setSpace] = useState<Space>(() => createInitialState());

  const getArea = useCallback(
    (areaId: string) => space.areas.find((a) => a.id === areaId),
    [space],
  );

  const getList = useCallback(
    (listId: string) => {
      for (const area of space.areas) {
        const list = area.lists.find((l) => l.id === listId);
        if (list) return list;
      }
      return undefined;
    },
    [space],
  );

  const getTasksByList = useCallback(
    (listId: string) => getList(listId)?.tasks ?? [],
    [getList],
  );

  const getTask = useCallback(
    (taskId: string) => {
      for (const area of space.areas) {
        for (const list of area.lists) {
          const t = list.tasks.find((x) => x.id === taskId);
          if (t) return t;
        }
      }
      return undefined;
    },
    [space],
  );

  const moveTask = useCallback((taskId: string, toStatusId: string) => {
    setSpace((s) => patchTask(s, taskId, (t) => ({ ...t, statusId: toStatusId })));
  }, []);

  const updateTask = useCallback((taskId: string, patch: Partial<Task>) => {
    setSpace((s) => patchTask(s, taskId, (t) => ({ ...t, ...patch })));
  }, []);

  const addTask = useCallback((listId: string, task: Task) => {
    setSpace((s) => ({
      ...s,
      areas: s.areas.map((area) => ({
        ...area,
        lists: area.lists.map((list) =>
          list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list,
        ),
      })),
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setSpace((s) => ({
      ...s,
      areas: s.areas.map((area) => ({
        ...area,
        lists: area.lists.map((list) => ({
          ...list,
          tasks: list.tasks.filter((t) => t.id !== taskId && t.parentTaskId !== taskId),
        })),
      })),
    }));
  }, []);

  const toggleAction = useCallback((actionId: string) => {
    setSpace((s) =>
      mapTasks(s, (t) => {
        let changed = false;
        const subtasks = t.subtasks.map((st) => {
          const actions = st.actions.map((a) => {
            if (a.id === actionId) {
              changed = true;
              return { ...a, done: !a.done };
            }
            return a;
          });
          return changed ? { ...st, actions } : st;
        });
        return changed ? { ...t, subtasks } : t;
      }),
    );
  }, []);

  const updateCustomValue = useCallback(
    (taskId: string, key: string, value: Task["customValues"][string]) => {
      setSpace((s) =>
        patchTask(s, taskId, (t) => ({
          ...t,
          customValues: { ...t.customValues, [key]: value },
        })),
      );
    },
    [],
  );

  const cloneTemplateList = useCallback((areaId: string, clientName: string) => {
    const newList = buildCriacaoList(areaId, clientName);
    setSpace((s) => ({
      ...s,
      areas: s.areas.map((area) =>
        area.id === areaId ? { ...area, lists: [...area.lists, newList] } : area,
      ),
    }));
    return newList;
  }, []);

  const generateEditorialCalendar = useCallback((input: EditorialGenerationInput) => {
    const posts = generateEditorialPosts(input);
    setSpace((s) => ({
      ...s,
      areas: s.areas.map((area) => ({
        ...area,
        lists: area.lists.map((list) =>
          list.id === input.listId ? { ...list, tasks: [...list.tasks, ...posts] } : list,
        ),
      })),
    }));
    return posts;
  }, []);

  const generateEditingTasks = useCallback((captureTaskId: string) => {
    let created: Task[] = [];
    setSpace((s) => {
      for (const area of s.areas) {
        const capture = area.lists.flatMap((l) => l.tasks).find((t) => t.id === captureTaskId);
        if (!capture) continue;
        if (capture.customValues["edicoes_geradas"]) return s; // já gerado — não duplica
        const videos = area.lists.find((l) => l.name === "Edição de vídeos");
        const fotos = area.lists.find((l) => l.name === "Edição de fotos");
        if (!videos || !fotos) return s;
        const [vTask, fTask] = makeEditingTasksFromCapture(videos.id, fotos.id, capture);
        created = [vTask, fTask];
        return {
          ...s,
          areas: s.areas.map((a) =>
            a.id !== area.id
              ? a
              : {
                  ...a,
                  lists: a.lists.map((l) => {
                    if (l.id === videos.id) return { ...l, tasks: [...l.tasks, vTask] };
                    if (l.id === fotos.id) return { ...l, tasks: [...l.tasks, fTask] };
                    return {
                      ...l,
                      tasks: l.tasks.map((t) =>
                        t.id === capture.id
                          ? { ...t, customValues: { ...t.customValues, edicoes_geradas: true } }
                          : t,
                      ),
                    };
                  }),
                },
          ),
        };
      }
      return s;
    });
    return created;
  }, []);

  const moveListToArea = useCallback((listId: string, toAreaId: string) => {
    setSpace((s) => {
      let moved: List | undefined;
      const areas = s.areas.map((area) => {
        const found = area.lists.find((l) => l.id === listId);
        if (found) moved = found;
        return { ...area, lists: area.lists.filter((l) => l.id !== listId) };
      });
      if (!moved) return s;
      const relocated = { ...moved, areaId: toAreaId };
      return {
        ...s,
        areas: areas.map((area) =>
          area.id === toAreaId ? { ...area, lists: [...area.lists, relocated] } : area,
        ),
      };
    });
  }, []);

  const value = useMemo<OperacaoContextValue>(
    () => ({
      space,
      getArea,
      getList,
      getTask,
      getTasksByList,
      moveTask,
      updateTask,
      addTask,
      deleteTask,
      toggleAction,
      updateCustomValue,
      cloneTemplateList,
      generateEditorialCalendar,
      generateEditingTasks,
      moveListToArea,
    }),
    [
      space,
      getArea,
      getList,
      getTask,
      getTasksByList,
      moveTask,
      updateTask,
      addTask,
      deleteTask,
      toggleAction,
      updateCustomValue,
      cloneTemplateList,
      generateEditorialCalendar,
      generateEditingTasks,
      moveListToArea,
    ],
  );

  return <OperacaoContext.Provider value={value}>{children}</OperacaoContext.Provider>;
}

export function useOperacao(): OperacaoContextValue {
  const ctx = useContext(OperacaoContext);
  if (!ctx) throw new Error("useOperacao deve ser usado dentro de <OperacaoProvider>");
  return ctx;
}
