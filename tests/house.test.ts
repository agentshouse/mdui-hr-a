// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { parse, validate, verify } from "@agentshouse/mdmodel";
// @ts-expect-error Standalone operator script has no declaration file.
import { seedRecords, buildSeedChanges } from "../scripts/seed-data.mjs";
import {
  createHouseDataProvider,
  readHR,
  definitions,
  fieldChange,
  matchesFilter,
  durationDays,
  validDay,
  hrQuery,
  observeHR,
  type HouseRuntime,
  type MutationStatus,
  type Resource,
  type Row,
} from "../src/house";
vi.mock("@agentshouse/app-bridge", () => ({ houseBridge: vi.fn() }));
const ROOM = "house://hr-test";
const stamp = "2026-10-01T09:00:00.000Z";
const team = { id: "team-1", name: "Design" };
const employee = {
  id: "employee-1",
  createdAt: stamp,
  updatedAt: stamp,
  firstName: "Ada",
  lastName: "Vale",
  jobTitle: "Designer",
  email: "ada@example.test",
  availableAnnualLeaveDays: 25,
  teamId: team.id,
};
const request = {
  id: "time-off-1",
  createdAt: stamp,
  updatedAt: stamp,
  employeeId: employee.id,
  timeOffType: "Annual",
  startsAt: "2026-10-19",
  endsAt: "2026-10-23",
  notes: "Autumn break.",
  status: "Pending",
};
type Entry = [Resource, Row];
const rows = (): Entry[] => [
  ["teams", { ...team }],
  ["employees", { ...employee }],
  ["time-offs", { ...request }],
];
function doc(resource: Resource, row: Row) {
  return {
    room: ROOM,
    path: `hr/${resource}/${row.id}.md`,
    type: definitions[resource].type,
    fields: structuredClone(row),
    markdown: JSON.stringify(row),
  };
}
function fixture(entries: Entry[] = rows()) {
  const documents = entries.map(([resource, row]) => doc(resource, row)),
    drafts = new Map<string, any>(),
    pending = new Map<string, any>();
  let mode = "open";
  const close = vi.fn();
  const md = {
    query: vi.fn(async () => ({ documents: structuredClone(documents) })),
    observe: vi.fn(async () => ({
      current: () => mode,
      subscribe: vi.fn(() => vi.fn()),
      close,
    })),
    roomDraft: {
      read: vi.fn(
        async (_room: string, path: string) =>
          drafts.get(path) ?? pending.get(path) ?? null,
      ),
      write: vi.fn(
        async (_room: string, path: string, revision: unknown, parts: any) => {
          expect(revision).toBeNull();
          const roomDraft = { path, revision: `draft-${pending.size}`, parts };
          pending.set(path, roomDraft);
          return { outcome: "written", roomDraft };
        },
      ),
      discard: vi.fn(),
    },
    save: vi.fn(async (_room: string, saved: { path: string }[]) => {
      for (const { path } of saved) {
        const draft = pending.get(path),
          index = documents.findIndex((document) => document.path === path);
        if (draft.parts.creation)
          documents.push({
            room: ROOM,
            path,
            type: draft.parts.creation.type,
            fields: draft.parts.creation.fields,
            markdown: JSON.stringify(draft.parts.creation.fields),
          });
        else if (draft.parts.removal) documents.splice(index, 1);
        else {
          for (const [key, part] of Object.entries(draft.parts.fields) as [
            string,
            any,
          ][])
            documents[index].fields[key] = part.value;
          documents[index].markdown = JSON.stringify(documents[index].fields);
        }
        pending.delete(path);
      }
      return { outcome: "saved", identifier: "batch-1" };
    }),
  };
  const statuses: MutationStatus[] = [];
  const provider = createHouseDataProvider(
    md as unknown as HouseRuntime,
    ROOM,
    { onMutation: (event) => statuses.push(event) },
  );
  return {
    md,
    provider,
    documents,
    drafts,
    pending,
    statuses,
    close,
    setMode: (value: string) => (mode = value),
  };
}
const getRequest = async (f: ReturnType<typeof fixture>) =>
  (await f.provider.getOne({ resource: "time-offs", id: request.id })).data;
const update = (f: ReturnType<typeof fixture>, opened: any, variables: any) =>
  f.provider.update({
    resource: "time-offs",
    id: request.id,
    variables,
    meta: { opened },
  });
function noWrites(f: ReturnType<typeof fixture>) {
  expect(f.md.roomDraft.write).not.toHaveBeenCalled();
  expect(f.md.save).not.toHaveBeenCalled();
  expect(f.md.roomDraft.discard).not.toHaveBeenCalled();
}
describe("typed Room model", () => {
  it("loads all three entity types and exact snapshots", () => {
    const f = fixture();
    const db = readHR({ documents: f.documents }, ROOM);
    expect(db.employees[0]).toMatchObject(employee);
    expect(db["time-offs"][0]._house?.fields).toEqual(request);
  });
  for (const invalid of [
    "2026-02-30",
    "2026-13-01",
    "2026-1-01",
    "not-a-date",
    "2025-02-29",
  ])
    it(`rejects invalid date ${invalid}`, () =>
      expect(validDay(invalid)).toBe(false));
  it("counts inclusive UTC days across leap/daylight boundaries", () => {
    expect(durationDays("2024-02-28", "2024-03-01")).toBe(3);
    expect(durationDays("2026-10-31", "2026-11-02")).toBe(3);
    expect(() => durationDays("2026-10-23", "2026-10-19")).toThrow(
      "date range",
    );
  });
  for (const [field, value] of [
    ["status", "Unknown"],
    ["timeOffType", "Other"],
    ["startsAt", "2026-02-30"],
    ["endsAt", "2026-09-01"],
    ["notes", null],
    ["employeeId", "../x"],
    ["backendToken", "secret"],
  ] as const)
    it(`refuses malformed request ${field}`, () => {
      const f = fixture();
      f.documents[2].fields[field] = value;
      expect(() => readHR({ documents: f.documents }, ROOM)).toThrow();
    });
  it("refuses cross-Room query data", () => {
    const f = fixture();
    f.documents[0].room = "other";
    expect(() => readHR({ documents: f.documents }, ROOM)).toThrow(
      "another Room",
    );
  });
  it("refuses duplicate entity IDs", () => {
    const f = fixture();
    expect(() =>
      readHR({ documents: [...f.documents, f.documents[2]] }, ROOM),
    ).toThrow("Duplicate");
  });
  it("refuses broken employee and team references", () => {
    const f = fixture();
    f.documents[2].fields.employeeId = "missing";
    expect(() => readHR({ documents: f.documents }, ROOM)).toThrow(
      "missing employee",
    );
    f.documents[2].fields.employeeId = employee.id;
    f.documents[1].fields.teamId = "missing";
    expect(() => readHR({ documents: f.documents }, ROOM)).toThrow(
      "missing team",
    );
  });
  it("validates authoritative schema and every seed through MD Model", () => {
    const schema = readFileSync(
      new URL("../schema.yaml", import.meta.url),
      "utf8",
    );
    const contract = verify(schema);
    expect(contract.verdict).toBe("accept");
    if (contract.verdict !== "accept") throw new Error("Schema refused");
    const changes = buildSeedChanges("hr-port").slice(1) as {
      path: string;
      content: string;
    }[];
    const library = Object.fromEntries(
      changes.map((change) => [
        change.path.replace("/rooms/hr-port/", ""),
        change.content,
      ]),
    );
    expect(validate(library, { binaryTargets: [] }, contract.model)).toEqual({
      verdict: "accept",
    });
    for (const [path, content] of Object.entries(library))
      expect(parse(content, path).ok).toBe(true);
    expect(Object.values(seedRecords).flat()).toHaveLength(24);
  });
});
describe("Refine read contracts", () => {
  it("scopes all queries and observation to selected Room", async () => {
    const f = fixture();
    await getRequest(f);
    expect(f.md.query).toHaveBeenCalledWith({ ...hrQuery, rooms: [ROOM] });
    await observeHR(f.md as unknown as HouseRuntime, ROOM);
    expect(f.md.observe).toHaveBeenCalledWith("query", {
      ...hrQuery,
      rooms: [ROOM],
    });
  });
  it("hydrates employee joins using same Room", async () => {
    const f = fixture();
    const one = await f.provider.getOne<any>({
      resource: "time-offs",
      id: request.id,
      meta: { join: ["employee"] },
    });
    expect(one.data.employee).toMatchObject(employee);
    const list = await f.provider.getList<any>({
      resource: "time-offs",
      meta: { join: ["employee"] },
    });
    expect(list.data[0].employee.id).toBe(employee.id);
  });
  it("paginates, filters and sorts after Room hydration", async () => {
    const f = fixture([
      ...rows(),
      ["time-offs", { ...request, id: "time-off-2", status: "Approved" }],
      ["time-offs", { ...request, id: "time-off-3", status: "Approved" }],
    ]);
    const result = await f.provider.getList({
      resource: "time-offs",
      pagination: { currentPage: 2, pageSize: 1 },
      filters: [{ field: "status", operator: "eq", value: "Approved" }],
      sorters: [{ field: "id", order: "desc" }],
    });
    expect(result.total).toBe(2);
    expect(result.data[0].id).toBe("time-off-2");
  });
  it("supports all-record mode and getMany", async () => {
    const f = fixture();
    expect(
      (
        await f.provider.getList({
          resource: "employees",
          pagination: { mode: "off" },
        })
      ).total,
    ).toBe(1);
    expect(
      (await f.provider.getMany!({ resource: "employees", ids: [employee.id] }))
        .data,
    ).toHaveLength(1);
  });
  it("refuses unsupported resource, missing record and bad pagination", async () => {
    const f = fixture();
    await expect(f.provider.getList({ resource: "unknown" })).rejects.toThrow(
      "Unsupported",
    );
    await expect(
      f.provider.getOne({ resource: "employees", id: "missing" }),
    ).rejects.toThrow("not found");
    await expect(
      f.provider.getList({
        resource: "employees",
        pagination: { pageSize: 0 },
      }),
    ).rejects.toThrow("pagination");
  });
  for (const [operator, value, expected] of [
    ["eq", "Pending", true],
    ["ne", "Approved", true],
    ["in", ["Pending"], true],
    ["nin", ["Approved"], true],
    ["contains", "pend", true],
    ["containss", "pend", false],
    ["null", null, false],
    ["nnull", null, true],
  ] as const)
    it(`supports ${operator} filter`, () =>
      expect(
        matchesFilter(request, [{ field: "status", operator, value } as any]),
      ).toBe(expected));
  it("supports logical/date filters and rejects unknown operators", () => {
    expect(
      matchesFilter(request, [
        {
          operator: "or",
          value: [
            { field: "status", operator: "eq", value: "Approved" },
            { field: "startsAt", operator: "gte", value: "2026-10-01" },
          ],
        },
      ]),
    ).toBe(true);
    expect(() =>
      matchesFilter(request, [
        { field: "id", operator: "invalid", value: "x" } as any,
      ]),
    ).toThrow("Unsupported filter");
  });
});
describe("mutations and exact bases", () => {
  it("creates one entity doc, validates and reports queued", async () => {
    const f = fixture();
    const result = await f.provider.create({
      resource: "time-offs",
      variables: {
        employeeId: employee.id,
        timeOffType: "Casual",
        startsAt: "2026-11-01",
        endsAt: "2026-11-01",
      },
    });
    expect(result.data.id).toMatch(/^time-offs-/);
    expect(f.md.roomDraft.write.mock.calls[0][3].creation.type).toBe(
      "hr_time_off",
    );
    expect(f.statuses.at(-1)?.phase).toBe("queued");
    expect(f.md.observe).not.toHaveBeenCalled();
  });
  it("creates employee/team only with typed fields", async () => {
    const f = fixture();
    await f.provider.create({
      resource: "teams",
      variables: { id: "team-new", name: "Research" },
    });
    await f.provider.create({
      resource: "employees",
      variables: { ...employee, id: "employee-new", teamId: "team-new" },
    });
    expect(f.md.save).toHaveBeenCalledTimes(2);
  });
  it("updates only actual delta plus timestamp with exact opened bases", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    await update(f, opened, { status: "Approved" });
    const fields = f.md.roomDraft.write.mock.calls[0][3].fields;
    expect(fields.status).toEqual({
      value: "Approved",
      base: { value: "Pending" },
    });
    expect(Object.keys(fields).sort()).toEqual(["status", "updatedAt"]);
  });
  it("preserves unrelated concurrent changes and returns effective current row", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.documents[2].fields.notes = "Changed by colleague";
    f.documents[2].fields.employeeId = employee.id;
    const result = await update(f, opened, { ...opened, status: "Approved" });
    expect(result.data.notes).toBe("Changed by colleague");
    expect(f.md.roomDraft.write.mock.calls[0][3].fields).not.toHaveProperty(
      "notes",
    );
  });
  it("returns effective snapshot fields after a queued edit and requires reopening before deletion", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    const result = await update(f, opened, { status: "Approved" });
    expect((result.data as any)._house.fields.status).toBe("Approved");
    expect((result.data as any)._house.markdown).toBeUndefined();
    await expect(
      f.provider.deleteOne({
        resource: "time-offs",
        id: request.id,
        meta: { opened: result.data },
      }),
    ).rejects.toThrow("changed");
    expect(f.md.save).toHaveBeenCalledOnce();
  });
  it("keeps opened base when same user-edited field changed concurrently", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.documents[2].fields.status = "Rejected";
    await update(f, opened, { status: "Approved" });
    expect(f.md.roomDraft.write.mock.calls[0][3].fields.status.base.value).toBe(
      "Pending",
    );
  });
  it("no-op stale full form returns current untouched values without save", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.documents[2].fields.notes = "New note";
    const result = await update(f, opened, { ...opened });
    expect(result.data.notes).toBe("New note");
    noWrites(f);
  });
  it("validates effective current dates rather than stale unchanged dates", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.documents[2].fields.endsAt = "2026-10-21";
    await expect(
      update(f, opened, { ...opened, startsAt: "2026-10-22" }),
    ).rejects.toThrow("date range");
    noWrites(f);
  });
  it("rejects forged/wrong-room/missing snapshot", async () => {
    for (const kind of ["none", "room", "id"]) {
      const f = fixture(),
        opened: any = await getRequest(f);
      if (kind === "room") opened._house.room = "other";
      if (kind === "id") opened.id = "wrong";
      await expect(
        update(f, kind === "none" ? undefined : opened, { status: "Approved" }),
      ).rejects.toThrow();
      noWrites(f);
    }
  });
  it("supports explicit snapshot supplied in variables", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    await f.provider.update({
      resource: "time-offs",
      id: request.id,
      variables: { ...opened, status: "Approved" },
    });
    expect(f.md.save).toHaveBeenCalledOnce();
  });
  it("refuses changed ID, unsupported field and invalid relations before writing", async () => {
    for (const variables of [
      { id: "different" },
      { dates: [] },
      { employeeId: "missing" },
    ]) {
      const f = fixture(),
        opened = await getRequest(f);
      await expect(update(f, opened, variables)).rejects.toThrow();
      noWrites(f);
    }
  });
  it("refuses duplicate creation and invalid new dates", async () => {
    const f = fixture();
    await expect(
      f.provider.create({ resource: "time-offs", variables: request }),
    ).rejects.toThrow("already exists");
    await expect(
      f.provider.create({
        resource: "time-offs",
        variables: { ...request, id: "new", endsAt: "2026-02-30" },
      }),
    ).rejects.toThrow("date range");
    noWrites(f);
  });
  it("preserves existing/returned drafts", async () => {
    const f = fixture(),
      opened: any = await getRequest(f);
    f.drafts.set(opened._house.path, { returned: { reason: "conflict" } });
    await expect(update(f, opened, { status: "Approved" })).rejects.toThrow(
      "unfinished",
    );
    noWrites(f);
  });
  it("preserves drafts on racing draft write", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.md.roomDraft.write.mockResolvedValueOnce({ outcome: "conflict" } as any);
    await expect(update(f, opened, { status: "Approved" })).rejects.toThrow(
      "kept",
    );
    expect(f.md.save).not.toHaveBeenCalled();
    expect(f.md.roomDraft.discard).not.toHaveBeenCalled();
  });
  it("preserves drafts on rejected save", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.md.save.mockResolvedValueOnce({
      outcome: "refused",
      rule: "conflict",
    } as any);
    await expect(update(f, opened, { status: "Approved" })).rejects.toThrow(
      "Drafts have been kept",
    );
    expect(f.pending.size).toBe(1);
    expect(f.md.roomDraft.discard).not.toHaveBeenCalled();
  });
  it("queues local Save during provider write-halt without a service-mode Action gate", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.setMode("write-halted");
    await update(f, opened, { status: "Approved" });
    expect(f.md.roomDraft.write).toHaveBeenCalledOnce();
    expect(f.md.save).toHaveBeenCalledOnce();
    expect(f.statuses.at(-1)?.phase).toBe("queued");
    expect(f.md.observe).not.toHaveBeenCalled();
  });
  it("deletes with exact opened Markdown", async () => {
    const f = fixture(),
      opened: any = await getRequest(f);
    await f.provider.deleteOne({
      resource: "time-offs",
      id: request.id,
      meta: { opened },
    });
    expect(f.md.roomDraft.write.mock.calls[0][3].removal.base).toBe(
      opened._house.markdown,
    );
  });
  it("refuses stale deletion or deletion of referenced employee/team", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.documents[2].markdown += " changed";
    await expect(
      f.provider.deleteOne({
        resource: "time-offs",
        id: request.id,
        meta: { opened },
      }),
    ).rejects.toThrow("changed");
    for (const resource of ["employees", "teams"] as const) {
      const row = (await f.provider.getList({ resource })).data[0];
      await expect(
        f.provider.deleteOne({ resource, id: row.id!, meta: { opened: row } }),
      ).rejects.toThrow("missing");
    }
    noWrites(f);
  });
  it("refuses moved/deleted opened record", async () => {
    const f = fixture(),
      opened = await getRequest(f);
    f.documents[2].path = "moved.md";
    await expect(update(f, opened, { status: "Approved" })).rejects.toThrow(
      "moved",
    );
    noWrites(f);
  });
  it("fieldChange suppresses unchanged and ignores runtime metadata", async () => {
    const f = fixture(),
      opened: any = await getRequest(f);
    expect(fieldChange("time-offs", opened, { ...opened }, ROOM)).toBeNull();
  });
});
