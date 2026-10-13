import { houseBridge } from "@agentshouse/app-bridge";
import type { DataProvider, CrudFilters, CrudSorting } from "@refinedev/core";
export type HouseRuntime = Awaited<ReturnType<typeof houseBridge>["runtime"]>;
export type HouseRoom = Awaited<ReturnType<HouseRuntime["rooms"]>>[number];
export type Row = { id: string; _house?: Snapshot; [key: string]: any };
export type Snapshot = {
  room: string;
  path: string;
  type: string;
  fields: Record<string, unknown>;
  markdown?: string;
};
export type MutationStatus = {
  phase: "saving" | "queued" | "error" | "idle";
  message: string;
  identifier?: string;
};
type Change = {
  path: string;
  parts: Parameters<HouseRuntime["roomDraft"]["write"]>[3];
};
export const definitions = {
  teams: { type: "hr_team", string: "id name", required: "id name" },
  employees: {
    type: "hr_employee",
    string: "id createdAt updatedAt firstName lastName jobTitle email teamId",
    number: "availableAnnualLeaveDays",
    required:
      "id createdAt updatedAt firstName lastName jobTitle email availableAnnualLeaveDays teamId",
  },
  "time-offs": {
    type: "hr_time_off",
    string:
      "id createdAt updatedAt employeeId timeOffType startsAt endsAt notes status",
    required:
      "id createdAt updatedAt employeeId timeOffType startsAt endsAt status",
  },
} as const;
export type Resource = keyof typeof definitions;
export type Database = Record<Resource, Row[]>;
const resources = Object.keys(definitions) as Resource[];
const fieldsFor = (resource: Resource): Record<string, "string" | "number"> => {
  const def = definitions[resource] as { string: string; number?: string };
  return Object.fromEntries([
    ...def.string.split(" ").map((key) => [key, "string"]),
    ...(def.number?.split(" ") ?? []).map((key) => [key, "number"]),
  ]);
};
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export class HouseWriteError extends Error {
  constructor(
    message: string,
    readonly details: unknown = null,
  ) {
    super(message, { cause: details });
    this.name = "HouseWriteError";
  }
}
function fail(message: string, details: unknown = null): never {
  throw new HouseWriteError(message, details);
}
function canonical(resource: string): Resource {
  if (!resources.includes(resource as Resource))
    fail(`Unsupported HR resource: ${resource}.`);
  return resource as Resource;
}
function validId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value))
    fail(
      "HR IDs must contain only letters, numbers, underscores, and hyphens.",
    );
  return value;
}
export function validDay(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
export function durationDays(startsAt: string, endsAt: string): number {
  if (!validDay(startsAt) || !validDay(endsAt) || endsAt < startsAt)
    fail("Choose a valid date range with the end on or after the start.");
  return (
    (Date.parse(`${endsAt}T00:00:00Z`) - Date.parse(`${startsAt}T00:00:00Z`)) /
      86400000 +
    1
  );
}
export function validateRow(resource: Resource, input: Row): Row {
  const kinds = fieldsFor(resource),
    row: Row = { id: validId(input.id) };
  for (const [key, value] of Object.entries(input)) {
    // fields:'all' includes the frontmatter discriminator as well as business
    // fields. Keep it in the exact source snapshot, never in editable row data.
    if (key === "type") {
      if (value !== definitions[resource].type)
        fail(`Invalid ${resource} discriminator: expected ${definitions[resource].type}.`);
      continue;
    }
    if (key === "_house" || value === undefined || key === "id") continue;
    if (!kinds[key]) fail(`Unsupported ${resource} field: ${key}.`);
    if (typeof value !== kinds[key])
      fail(`Invalid ${key}: expected ${kinds[key]}.`);
    if (
      typeof value === "number" &&
      (!Number.isFinite(value) || value < 0 || !Number.isInteger(value))
    )
      fail(`${key} must be a non-negative integer.`);
    row[key] = value;
  }
  for (const key of definitions[resource].required.split(" "))
    if (row[key] == null || row[key] === "") fail(`${key} is required.`);
  for (const key of ["createdAt", "updatedAt"])
    if (
      row[key] &&
      (!/^\d{4}-\d{2}-\d{2}T/.test(row[key]) ||
        !Number.isFinite(Date.parse(row[key])))
    )
      fail(`${key} must be an ISO timestamp.`);
  if (resource === "employees") {
    validId(row.teamId);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
      fail("A valid employee email is required.");
  }
  if (resource === "time-offs") {
    validId(row.employeeId);
    durationDays(row.startsAt, row.endsAt);
    if (!["Annual", "Sick", "Casual"].includes(row.timeOffType))
      fail("Invalid leave type.");
    if (!["Pending", "Approved", "Rejected"].includes(row.status))
      fail("Invalid request status.");
  }
  return row;
}
function references(db: Database) {
  for (const row of db.employees)
    if (!db.teams.some((team) => team.id === row.teamId))
      fail(`Employee ${row.id} refers to a missing team.`);
  for (const row of db["time-offs"])
    if (!db.employees.some((employee) => employee.id === row.employeeId))
      fail(`Time off ${row.id} refers to a missing employee.`);
}
export function readHR(result: any, room: string): Database {
  if (!result || !Array.isArray(result.documents))
    fail("House returned an invalid query result.");
  const db: Database = { teams: [], employees: [], "time-offs": [] },
    seen = new Set<string>();
  for (const document of result.documents) {
    if (document.room !== room)
      fail("House query included data from another Room.");
    const resource = resources.find(
      (key) => definitions[key].type === document.type,
    );
    if (!resource) fail(`Unsupported HR document at ${document.path}.`);
    if (
      typeof document.path !== "string" ||
      !document.path ||
      !document.fields ||
      typeof document.fields !== "object"
    )
      fail("Invalid House document.");
    const row = validateRow(resource, document.fields as Row),
      key = `${resource}/${row.id}`;
    if (seen.has(key))
      fail(`Duplicate ${resource} ID ${row.id}. Resolve it in House.`);
    seen.add(key);
    row._house = {
      room,
      path: document.path,
      type: document.type,
      fields: structuredClone(document.fields),
      markdown: document.markdown,
    };
    db[resource].push(row);
  }
  references(db);
  return db;
}
let connection: Promise<HouseRuntime> | undefined;
export function houseRuntime(): Promise<HouseRuntime> {
  connection ??= (async () => {
    const bridge = houseBridge();
    bridge.setTab({ title: "HR" });
    return bridge.runtime;
  })().catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
export const hrQuery = {
  types: resources.map((key) => definitions[key].type),
  select: { fields: "all" as const, markdown: true as const },
  orderBy: [{ by: "path" as const, direction: "asc" as const }],
};
export const observeHR = (md: HouseRuntime, room: string) =>
  md.observe("query", { ...hrQuery, rooms: [room] });
export const observeRooms = (md: HouseRuntime) => md.observe("rooms");
export const observeSyncStatus = (md: HouseRuntime) =>
  md.observe("sync-status");
export const observeRoomDrafts = (md: HouseRuntime) =>
  md.observe("room-drafts");
export const observeStorageLoss = (md: HouseRuntime) =>
  md.observe("storage-loss");
export const observeConnectionRefusal = (md: HouseRuntime) =>
  md.observe("connection-refusal");
export const observeServiceMode = (md: HouseRuntime) =>
  md.observe("service-mode");
export const observeQueue = (md: HouseRuntime, room: string) =>
  md.observe("queue", room);
export function matchesFilter(row: Row, filters: CrudFilters = []): boolean {
  return filters.every((filter) => {
    if (filter.operator === "and" || filter.operator === "or") {
      const values = filter.value as CrudFilters;
      return filter.operator === "and"
        ? matchesFilter(row, values)
        : values.some((item) => matchesFilter(row, [item]));
    }
    if (!("field" in filter)) fail("Unsupported filter.");
    const { field, operator, value } = filter,
      actual = row[field];
    if (value === undefined) return true;
    switch (operator) {
      case "eq":
        return actual === value;
      case "ne":
        return actual !== value;
      case "in":
        return Array.isArray(value) && value.includes(actual);
      case "nin":
        return Array.isArray(value) && !value.includes(actual);
      case "lt":
        return actual != null && actual < value;
      case "lte":
        return actual != null && actual <= value;
      case "gt":
        return actual != null && actual > value;
      case "gte":
        return actual != null && actual >= value;
      case "contains":
        return String(actual ?? "")
          .toLowerCase()
          .includes(String(value).toLowerCase());
      case "containss":
        return String(actual ?? "").includes(String(value));
      case "null":
        return actual == null || actual === "";
      case "nnull":
        return actual != null && actual !== "";
      default:
        fail(`Unsupported filter operator: ${operator}.`);
    }
  });
}
function hydrated(resource: Resource, db: Database, meta: any): Row[] {
  if (resource !== "time-offs" || !meta?.join?.includes("employee"))
    return db[resource];
  return db[resource].map((row) => ({
    ...row,
    employee: db.employees.find((employee) => employee.id === row.employeeId),
  }));
}
function sorted(rows: Row[], sorters: CrudSorting = []) {
  return [...rows].sort((a, b) => {
    for (const { field, order } of sorters) {
      const left = a[field],
        right = b[field];
      const delta =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left ?? "").localeCompare(String(right ?? ""));
      if (delta) return delta * (order === "desc" ? -1 : 1);
    }
    return a.id.localeCompare(b.id);
  });
}
function snapshot(opened: Row, resource: Resource, room: string): Snapshot {
  const snap = opened?._house;
  if (
    !snap ||
    snap.room !== room ||
    snap.type !== definitions[resource].type ||
    snap.fields.id !== opened.id
  )
    fail("Open this exact record before changing it.");
  return snap;
}
function currentRow(
  db: Database,
  resource: Resource,
  opened: Row,
  room: string,
) {
  const snap = snapshot(opened, resource, room),
    current = db[resource].find((row) => row.id === opened.id);
  if (!current || current._house?.path !== snap.path)
    fail("This record moved or was deleted. Reload before editing.");
  return current;
}
export function fieldChange(
  resource: Resource,
  opened: Row,
  patch: Record<string, unknown>,
  room: string,
): Change | null {
  const snap = snapshot(opened, resource, room),
    before = validateRow(resource, opened),
    next = validateRow(resource, { ...opened, ...patch });
  const fields: Record<
    string,
    { value: unknown; base: { value: unknown } | null }
  > = {};
  for (const key of Object.keys(patch)) {
    if (key === "id" || key === "_house" || patch[key] === undefined) continue;
    if (equal(before[key], next[key])) continue;
    fields[key] = {
      value: next[key],
      base: Object.hasOwn(snap.fields, key)
        ? { value: snap.fields[key] }
        : null,
    };
  }
  return Object.keys(fields).length
    ? { path: snap.path, parts: { fields } }
    : null;
}
function effectiveChange(
  resource: Resource,
  current: Row,
  change: Change | null,
) {
  const patch = Object.fromEntries(
    Object.entries(change?.parts.fields ?? {}).map(([key, part]) => [
      key,
      part.value,
    ]),
  );
  return validateRow(resource, { ...current, ...patch });
}
async function queueChanges(md: HouseRuntime, room: string, changes: Change[], owned: Record<string, string> = {}) {
  if (!changes.length) return null;
  if (new Set(changes.map((change) => change.path)).size !== changes.length)
    fail("A grouped save contains the same document twice.");
  const revisions = new Map<string, string | null>();
  for (const change of changes) {
    const draft = await md.roomDraft.read(room, change.path);
    if (draft && (!Object.hasOwn(owned, change.path) || owned[change.path] !== draft.revision))
      fail(
        "This item has an unfinished House draft. Resolve it in House before editing again.",
        draft,
      );
    if (owned[change.path] && !draft) fail("The local draft was saved or changed in another tab. Reopen before saving.");
    if (draft && owned[change.path]) {
      const before = draft.parts.creation, after = change.parts.creation;
      if (!before || !after || !("fields" in before) || !("fields" in after) || Object.keys(draft.parts).length !== 1 || before.type !== after.type || Object.keys(before.fields).length !== Object.keys(after.fields).length || !Object.entries(after.fields).every(([key, value]) => equal(before.fields[key], value)) || !equal(before.sections, after.sections)) {
        fail("The saved form no longer matches its exact local draft. Reopen it before saving.");
      }
    }
    revisions.set(change.path, draft?.revision ?? null);
  }
  const drafts = [];
  for (const change of changes) {
    const result = await md.roomDraft.write(
      room,
      change.path,
      revisions.get(change.path) ?? null,
      change.parts,
    );
    if (result.outcome !== "written" || !result.roomDraft)
      fail(
        "A House draft changed elsewhere. Prepared drafts have been kept.",
        result,
      );
    drafts.push({ path: change.path, revision: result.roomDraft.revision });
  }
  const result = await md.save(room, drafts);
  if (result.outcome !== "saved")
    fail(
      `House did not queue this change: ${result.code}. Drafts have been kept.`,
      result,
    );
  return result.identifier;
}
export function readLocalRows(db: Database, resourceName: string, options: {filters?: CrudFilters; sorters?: CrudSorting; pagination?: {mode?: string; currentPage?: number; pageSize?: number}; meta?: any}) {
  const resource = canonical(resourceName);
  const all = sorted(hydrated(resource, db, options.meta).filter(row => matchesFilter(row, options.filters)), options.sorters);
  if (options.pagination?.mode === "off") return {data: all, total: all.length};
  const {currentPage = 1, pageSize = 25} = options.pagination ?? {};
  return {data: all.slice((currentPage - 1) * pageSize, currentPage * pageSize), total: all.length};
}
export function createHouseDataProvider(
  md: HouseRuntime,
  room: string,
  options: { onMutation?: (status: MutationStatus) => void; canWrite?: () => boolean } = {},
): DataProvider {
  if (!room) fail("Select an attached HR Room.");
  let serial: Promise<unknown> = Promise.resolve();
  const fetchDb = async () =>
    readHR(await md.query({ ...hrQuery, rooms: [room] }), room);
  function mutation<T>(
    operation: (
      save: (changes: (Change | null)[], owned?: Record<string, string>) => Promise<void>,
    ) => Promise<T>,
  ): Promise<T> {
    const run = async () => {
      options.onMutation?.({
        phase: "saving",
        message: "Preparing House change…",
      });
      try {
        if (options.canWrite && !options.canWrite()) fail("The Room binding is not ready. Your open form is kept.");
        let queued = false;
        const result = await operation(async (changes, owned) => {
          if (options.canWrite && !options.canWrite()) fail("The Room binding is not ready. Your open form is kept.");
          const identifier = await queueChanges(
            md,
            room,
            changes.filter((change): change is Change => change !== null),
            owned,
          );
          if (identifier) {
            queued = true;
            options.onMutation?.({
              phase: "queued",
              message: "Queued in House. Waiting for synchronization.",
              identifier,
            });
          }
        });
        if (!queued)
          options.onMutation?.({
            phase: "idle",
            message: "No changes needed.",
          });
        return result;
      } catch (error) {
        options.onMutation?.({
          phase: "error",
          message:
            error instanceof Error
              ? error.message
              : "House could not save this change.",
        });
        throw error;
      }
    };
    const result = serial.then(run, run);
    serial = result.catch(() => undefined);
    return result;
  }
  const getOpened = (
    resource: Resource,
    id: unknown,
    meta: any,
    variables: any,
  ): Row => {
    const supplied =
      meta?.opened ?? (variables?._house ? { ...variables, id } : null);
    if (!supplied || supplied.id !== id)
      fail("Open this exact record before changing it.");
    const snap = snapshot(supplied, resource, room);
    return { ...validateRow(resource, snap.fields as Row), _house: snap };
  };
  const provider = {
    getApiUrl: () => "",
    async getList({
      resource: resourceName,
      pagination,
      filters,
      sorters,
      meta,
    }: any) {
      const resource = canonical(resourceName),
        db = await fetchDb();
      const all = sorted(
        hydrated(resource, db, meta).filter((row) =>
          matchesFilter(row, filters),
        ),
        sorters,
      );
      if (pagination?.mode === "off") return { data: all, total: all.length };
      const { currentPage = 1, pageSize = 25 } = pagination ?? {};
      if (
        !Number.isInteger(currentPage) ||
        currentPage < 1 ||
        !Number.isInteger(pageSize) ||
        pageSize < 1
      )
        fail("Invalid pagination.");
      return {
        data: all.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        total: all.length,
      };
    },
    async getOne({ resource: resourceName, id, meta }: any) {
      const resource = canonical(resourceName),
        db = await fetchDb(),
        data = hydrated(resource, db, meta).find((row) => row.id === id);
      if (!data)
        throw Object.assign(
          new Error("HR record was not found in this Room."),
          { statusCode: 404 },
        );
      return { data };
    },
    async getMany({ resource: resourceName, ids, meta }: any) {
      const resource = canonical(resourceName),
        db = await fetchDb();
      if (!Array.isArray(ids)) fail("IDs must be a list.");
      return {
        data: hydrated(resource, db, meta).filter((row) =>
          ids.includes(row.id),
        ),
      };
    },
    create({ resource: resourceName, variables }: any) {
      const {_draftRevision, ...input} = variables;
      return mutation(async (save) => {
        const resource = canonical(resourceName),
          db = await fetchDb(),
          now = new Date().toISOString();
        const data = validateRow(resource, {
          ...(resource !== "teams" ? { createdAt: now, updatedAt: now } : {}),
          ...(resource === "time-offs" ? { notes: "", status: "Pending" } : {}),
          ...input,
          id: input.id ?? `${resource}-${crypto.randomUUID()}`,
        });
        if (db[resource].some((row) => row.id === data.id))
          fail("An HR record with this ID already exists.");
        db[resource].push(data);
        references(db);
        const path = `hr/${resource}/${data.id}.md`;
        await save([
          {
            path,
            parts: {
              creation: {
                type: definitions[resource].type,
                fields: data,
                sections: {},
              },
            },
          },
        ], typeof _draftRevision === "string" ? {[path]: _draftRevision} : {});
        return {
          data: {
            ...data,
            _house: {
              room,
              path,
              type: definitions[resource].type,
              fields: data,
            },
          },
        };
      });
    },
    update({ resource: resourceName, id, variables, meta }: any) {
      return mutation(async (save) => {
        const resource = canonical(resourceName),
          opened = getOpened(resource, id, meta, variables),
          db = await fetchDb(),
          current = currentRow(db, resource, opened, room);
        if (variables.id != null && variables.id !== id)
          fail("An edit cannot change a record ID.");
        let change = fieldChange(resource, opened, variables, room);
        if (change && resource !== "teams") {
          change = {
            ...change,
            parts: {
              ...change.parts,
              fields: {
                ...change.parts.fields,
                updatedAt: {
                  value: new Date().toISOString(),
                  base: { value: opened._house!.fields.updatedAt },
                },
              },
            },
          };
        }
        const next = effectiveChange(resource, current, change);
        db[resource] = db[resource].map((row) => (row.id === id ? next : row));
        references(db);
        await save([change]);
        const fields = {
          ...current._house!.fields,
          ...Object.fromEntries(
            Object.entries(change?.parts.fields ?? {}).map(([key, part]) => [
              key,
              part.value,
            ]),
          ),
        };
        return {
          data: {
            ...current,
            ...next,
            _house: change
              ? { ...current._house!, fields, markdown: undefined }
              : current._house,
          },
        };
      });
    },
    deleteOne({ resource: resourceName, id, meta, variables }: any) {
      return mutation(async (save) => {
        const resource = canonical(resourceName),
          opened = getOpened(resource, id, meta, variables),
          db = await fetchDb(),
          current = currentRow(db, resource, opened, room),
          before = snapshot(opened, resource, room),
          after = snapshot(current, resource, room);
        if (
          typeof before.markdown !== "string" ||
          before.markdown !== after.markdown ||
          !equal(before.fields, after.fields)
        )
          fail(
            "This record changed since you opened it. Reload and review before deleting.",
          );
        db[resource] = db[resource].filter((row) => row.id !== id);
        references(db);
        await save([
          { path: before.path, parts: { removal: { base: before.markdown } } },
        ]);
        return { data: current };
      });
    },
  };
  return provider as DataProvider;
}

/** Durable creation form state at its final document path. Runtime storage is local. */
export async function openTimeOffDraft(md: HouseRuntime, room: string, employeeId: string) {
  validId(employeeId);
  const scope = `${room}/time-off/${employeeId}`;
  const presentation = await md.presentation.read();
  const pointers = presentation && typeof presentation === "object" && "timeOffDrafts" in presentation
    ? (presentation as {timeOffDrafts: Record<string, string>}).timeOffDrafts : {};
  const pointed = typeof pointers?.[scope] === "string" ? pointers[scope] : "";
  let draft = pointed ? await md.roomDraft.read(room, pointed) : null;
  // A previous creation may now be a saved request with a separate edit draft.
  // Preserve that draft and give the next request its own actual document path.
  if (draft && !draft.parts.creation) draft = null;
  type Draft = NonNullable<typeof draft>;
  const creationFields = (value: Draft) => {
    const creation = value.parts.creation;
    if (!creation || !("type" in creation) || creation.type !== "hr_time_off" || creation.fields.employeeId !== employeeId || Object.keys(value.parts).some(key => key !== "creation")) {
      fail("This time-off draft needs review in House. It has been kept.", value);
    }
    return {...creation.fields};
  };
  const now = new Date().toISOString();
  let fields: Record<string, unknown> = draft ? creationFields(draft)
    : {id: `time-offs-${crypto.randomUUID()}`, employeeId, createdAt: now, updatedAt: now, notes: "", timeOffType: "Annual", status: "Pending", startsAt: "", endsAt: ""};
  const path = draft?.path ?? `hr/time-offs/${fields.id}.md`;
  let serial = Promise.resolve();
  let sequence = 0;
  const pending = new Map<string, {value: unknown; sequence: number}>();
  const listeners = new Set<(value: Record<string, unknown>) => void>();
  const shown = () => ({...fields, ...Object.fromEntries([...pending].map(([key, value]) => [key, value.value]))});
  const redraw = () => {for (const listener of listeners) listener(shown());};
  const observation = await md.observe("room-drafts");
  const accept = (values: readonly Draft[]) => {
    const value = values.find(item => item.room === room && item.path === path);
    if (!value) return;
    draft = value;
    fields = creationFields(value);
    redraw();
  };
  accept(observation.current());
  const unsubscribe = observation.subscribe(accept);
  const write = (patch: Record<string, unknown>) => {
    const inputSequence = ++sequence;
    for (const [key, value] of Object.entries(patch)) pending.set(key, {value, sequence: inputSequence});
    const next = serial.then(async () => {
      let current = await md.roomDraft.read(room, path);
      for (;;) {
        const latestPatch = Object.fromEntries(Object.keys(patch).map(key => [key, pending.get(key)?.value ?? patch[key]]));
        const nextFields = {...(current ? creationFields(current) : fields), ...latestPatch};
        const result = await md.roomDraft.write(room, path, current?.revision ?? null, {creation: {type: "hr_time_off", fields: nextFields, sections: {}}});
        if (result.outcome === "stale") {current = result.current; continue;}
        if (!result.roomDraft) fail("The local time-off draft is unavailable.");
        draft = result.roomDraft;
        fields = creationFields(draft);
        for (const key of Object.keys(patch)) if (equal(pending.get(key)?.value, latestPatch[key])) pending.delete(key);
        redraw();
        // Presentation State stores only a pointer; form content stays in Room Draft.
        const state = await md.presentation.read();
        const base = state && typeof state === "object" ? state as Record<string, unknown> : {};
        const held = base.timeOffDrafts && typeof base.timeOffDrafts === "object" ? base.timeOffDrafts as Record<string, string> : {};
        await md.presentation.write({...base, timeOffDrafts: {...held, [scope]: path}});
        return;
      }
    });
    serial = next.catch(() => undefined);
    return next;
  };
  return {
    fields: shown,
    write,
    subscribe(listener: (value: Record<string, unknown>) => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    close() {unsubscribe(); observation.close();},
    async prepare(patch: Record<string, unknown>) {
      await write(patch);
      if (!draft) fail("The local time-off draft is unavailable.");
      return {...fields, _draftRevision: draft.revision};
    },
  };
}
