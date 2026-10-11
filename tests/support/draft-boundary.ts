import {expect, vi} from "vitest";
import type {HouseRuntime} from "../../src/house";
type Draft = NonNullable<Awaited<ReturnType<HouseRuntime["roomDraft"]["read"]>>>;
export function draftBoundary() {
  let presentation: unknown = {};
  let revision = 0;
  const held = new Map<string, Draft>();
  const listeners = new Set<(value: readonly Draft[]) => void>();
  const notify = () => {for (const listener of listeners) listener([...held.values()]);};
  let race: (() => void) | undefined;
  const md = {
    presentation: {read: vi.fn(async () => structuredClone(presentation)), write: vi.fn(async (value: unknown) => {presentation = structuredClone(value);})},
    roomDraft: {
      read: vi.fn(async (_room: string, path: string) => structuredClone(held.get(path) ?? null)),
      write: vi.fn(async (room: string, path: string, expected: string | null, parts: Draft["parts"]) => {
        if (race) {const run = race; race = undefined; run();}
        const current = held.get(path) ?? null;
        if ((current?.revision ?? null) !== expected) return {outcome: "stale", current: structuredClone(current)};
        const draft = {room, path, revision: `revision-${++revision}`, parts: structuredClone(parts), changedUnderneath: current?.changedUnderneath ?? {}, returned: current?.returned ?? null};
        held.set(path, draft); notify();
        return {outcome: "written", roomDraft: structuredClone(draft)};
      }),
      discard: vi.fn(),
    },
    observe: vi.fn(async (topic: string) => topic === "room-drafts" ? {
      current: () => [...held.values()], subscribe: (listener: (value: readonly Draft[]) => void) => {listeners.add(listener); return () => listeners.delete(listener);}, close: vi.fn(),
    } : {current: () => "open", subscribe: () => () => undefined, close: vi.fn()}),
    save: vi.fn(async (_room: string, selected: {path: string; revision: string}[]) => {
      for (const entry of selected) {expect(held.get(entry.path)?.revision).toBe(entry.revision); held.delete(entry.path);}
      notify(); return {outcome: "saved", identifier: "queued"};
    }),
    query: vi.fn(async () => ({documents: [
      {room: "r", path: "team.md", type: "hr_team", fields: {id: "team", name: "Design"}},
      {room: "r", path: "employee.md", type: "hr_employee", fields: {id: "employee", firstName: "Ada", lastName: "Test", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", jobTitle: "Design", email: "ada@example.test", teamId: "team", availableAnnualLeaveDays: 20}},
    ]})),
  };
  return {md: md as unknown as HouseRuntime, held, methods: md, setRace: (next: () => void) => {race = next;}, remote: (path: string, patch: Record<string, unknown>) => {
    const old = held.get(path)!; const creation = old.parts.creation!;
    if (!("fields" in creation)) throw new Error("Expected typed creation");
    held.set(path, {...old, revision: `revision-${++revision}`, parts: {creation: {...creation, fields: {...creation.fields, ...patch}}}}); notify();
  }};
}
