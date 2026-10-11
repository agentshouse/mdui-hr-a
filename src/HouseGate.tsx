import { useEffect, useMemo, useRef, useState } from "react";
import "./house.css";
import { QueryClient } from "@tanstack/react-query";
import { HRContext } from "./house-context";
import type { Employee } from "./types";
import type { PropsWithChildren } from "react";
import {
  createHouseDataProvider,
  houseRuntime,
  observeRooms,
  observeHR,
  readHR,
  observeSyncStatus,
  observeRoomDrafts,
  observeServiceMode,
  observeStorageLoss,
  observeConnectionRefusal,
  observeQueue,
  type HouseRuntime,
  type Database,
} from "./house";

type Room = Awaited<ReturnType<HouseRuntime["rooms"]>>[number];
type Observation<T> = {
  current(): T;
  subscribe(listener: (value: T) => void): () => void;
  close(): void;
};
type Attention = { room: string; path: string };
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function HouseGate({ children }: PropsWithChildren) {
  const [runtime, setRuntime] = useState<HouseRuntime | null>(null);
  const [rooms, setRooms] = useState<readonly Room[]>([]);
  const [room, setRoom] = useState("");
  const [lastRoom, setLastRoom] = useState<Room | null>(null);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const reachReady = useRef(false);
  const hasOpened = useRef(false);
  const activeRoom = useRef(room);
  activeRoom.current = room;
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState(false);
  const [refused, setRefused] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [resetWarning, setResetWarning] = useState(false);
  const [attention, setAttention] = useState<readonly Attention[]>([]);
  const [draftAttention, setDraftAttention] = useState<readonly Attention[]>(
    [],
  );
  const [halted, setHalted] = useState(false);
  const [, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [database, setDatabase] = useState<{room: string; value: Database} | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const retainedEmployee = useRef<{room: string; value: Employee} | null>(null);
  const currentEmployee = employees.find((e) => e.id === employeeId);
  if (currentEmployee) retainedEmployee.current = {room, value: currentEmployee};
  const [queue, setQueue] = useState({
    waiting: 0,
    submitted: 0,
    accepted: 0,
    reset: 0,
  });

  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];
    async function listen<T>(
      promise: Promise<Observation<T>>,
      apply: (value: T) => void,
    ) {
      const observation = await promise;
      if (disposed) {
        observation.close();
        return;
      }
      apply(observation.current());
      cleanups.push(
        observation.subscribe((value) => {
          if (!disposed) apply(value);
        }),
        () => observation.close(),
      );
    }
    async function connect() {
      setFatal(false);
      setError("");
      const md = await houseRuntime();
      if (disposed) return;
      setRuntime(md);
      await Promise.all([
        listen(observeRooms(md), (values) => {
          if (values.length !== 1 || values[0].locator !== activeRoom.current) reachReady.current = false;
          setRooms(values);
          if (values.length === 1) {
            setRoom(values[0].locator);
            setLastRoom(values[0]);
          }
        }),
        listen(observeSyncStatus(md), (value) => {
          if (value.lastCompleted === null) reachReady.current = false;
          setSyncCompleted(value.lastCompleted !== null);
          setAttention(value.attentionRequired);
          setResetWarning(Boolean(value.reset));
        }),
        listen(observeRoomDrafts(md), (value) =>
          setDraftAttention(value.filter((draft) => Boolean(draft.returned))),
        ),
        listen(observeServiceMode(md), (value) =>
          setHalted(value === "write-halted"),
        ),
        listen(observeStorageLoss(md), (value) =>
          setStorageWarning(value ?? ""),
        ),
        listen(observeConnectionRefusal(md), (value) =>
          setRefused(value ? `House connection refused: ${value.reason}` : ""),
        ),
      ]);
    }
    void connect().catch((value) => {
      if (!disposed) {
        setError(errorText(value));
        setFatal(true);
      }
    });
  return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [attempt]);

  reachReady.current = syncCompleted && rooms.length === 1 && rooms[0].locator === room && !fatal && !refused;
  if (reachReady.current) hasOpened.current = true;

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            meta: { room },
          },
          mutations: { retry: false },
        },
      }),
    [room],
  );
  useEffect(() => () => queryClient.clear(), [queryClient]);
  const provider = useMemo(
    () =>
      runtime && room
        ? createHouseDataProvider(runtime, room, {
            canWrite: () => reachReady.current,
            onMutation: (event) => {
              if (activeRoom.current !== room) return;
              setSaving(event.phase === "saving");
              if (event.phase === "error") setError(event.message);
              if (event.phase === "queued") {
                setError("");
                }
            },
          })
        : null,
    [runtime, room],
  );

  useEffect(() => {
    setQueue({ waiting: 0, submitted: 0, accepted: 0, reset: 0 });
    setEmployees([]);
    setDatabase(null);
    setEmployeeId("");
    setSaving(false);
  }, [runtime, room]);

  const canObserve = syncCompleted && rooms.length === 1 && rooms[0].locator === room;
  useEffect(() => {
    if (!runtime || !room || !canObserve) return;
    let disposed = false;
    const cleanups: (() => void)[] = [];
    async function watch<T>(
      promise: Promise<Observation<T>>,
      apply: (value: T) => void,
    ) {
      const observation = await promise;
      if (disposed) {
        observation.close();
        return;
      }
      apply(observation.current());
      cleanups.push(
        observation.subscribe((value) => {
          if (!disposed) apply(value);
        }),
        () => observation.close(),
      );
    }
    void Promise.all([
      watch(observeHR(runtime, room), (value) => {
        if (!reachReady.current) return;
        try {
          const db = readHR(value, room);
          setDatabase({room, value: db});
          setEmployees(db.employees as Employee[]);
          setEmployeeId((previous) =>
            previous || (db.employees[0]?.id ?? ""),
          );
          void queryClient.invalidateQueries();
        } catch (failure) {
          setError(errorText(failure));
        }
      }),
      watch(observeQueue(runtime, room), (entries) => {
        const summary = { waiting: 0, submitted: 0, accepted: 0, reset: 0 };
        entries.forEach((entry) => {
          summary[entry.state]++;
        });
        setQueue(summary);
      }),
    ]).catch((value) => {
      if (!disposed) setError(errorText(value));
    });
  return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [runtime, room, queryClient, canObserve]);

  const returnedPaths = [
    ...new Set(
      [...attention, ...draftAttention]
        .filter((entry) => entry.room === room)
        .map((entry) => entry.path),
    ),
  ];
  const bindingError = syncCompleted && rooms.length !== 1 ? (rooms.length > 1 ? "This App received multiple data bindings. Check its configuration in House." : "Attach a HR Room to this App in House to begin.") : "";
  return (
    <div className="house-hr">
      {(bindingError || error || refused) && (
        <div role="alert" className="house-message house-error">
          {bindingError || refused || error}
          {fatal && (
            <button onClick={() => setAttempt((value) => value + 1)}>
              Retry connection
            </button>
          )}
        </div>
      )}
      {returnedPaths.length > 0 && (
        <div role="alert" className="house-message house-warning">
          <strong>
            {returnedPaths.length} Room draft
            {returnedPaths.length === 1 ? "" : "s"} need attention.
          </strong>{" "}
          Review returned or conflicting Room Drafts before trying Save again.
          <details>
            <summary>Show affected documents</summary>
            <ul>
              {returnedPaths.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
      {storageWarning && (
        <div role="alert" className="house-message house-warning">
          House storage warning: {storageWarning}. Check queued changes in
          House.
        </div>
      )}
      {(resetWarning || queue.reset > 0) && (
        <div role="alert" className="house-message house-warning">
          House reported a sync reset. Check Room drafts before retrying
          changes.
        </div>
      )}
      {halted && (
        <div role="status" className="house-message house-warning">
          House has paused provider writes. You can keep typing and Save;
          changes queue locally until provider writes resume.
        </div>
      )}
      {!syncCompleted && <p role="status">Loading…</p>}
      {provider && lastRoom && hasOpened.current && database?.room === room ? (
        <div hidden={!reachReady.current} inert={!reachReady.current}>
        <HRContext.Provider
          key={room}
          value={{
            dataProvider: provider,
            database: database.value,
            queryClient,
            room: lastRoom,
            employees,
            employee: currentEmployee ?? (retainedEmployee.current?.room === room ? retainedEmployee.current.value : null),
            setEmployeeId: (id) => {
              setEmployeeId(id);
            },
          }}
        >
          {children}
        </HRContext.Provider>
        </div>
      ) : (
        <main className="house-empty">
          <h1>HR</h1>
          <p>
            {fatal || refused
              ? "The House connection needs attention before HR can load."
              : syncCompleted && !rooms.length
                ? "Bind exactly one HR Room in House."
                : "Loading data…"}
          </p>
        </main>
      )}
    </div>
  );
}
