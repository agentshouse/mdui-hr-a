import React from "react";
import nativeProjection from "./support/native-full-fields.json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { HouseGate } from "../src/HouseGate";
import { useHRContext } from "../src/house-context";
const test = vi.hoisted(() => ({
  observations: new Map<string, any>(),
  connection: vi.fn(),
  mutation: undefined as any,
}));
function observation(key: string, value: any) {
  const item = {
    value,
    listeners: new Set<(value: any) => void>(),
    close: vi.fn(),
    current() {
      return item.value;
    },
    subscribe(listener: (value: any) => void) {
      item.listeners.add(listener);
      return () => item.listeners.delete(listener);
    },
    emit(next: any) {
      item.value = next;
      item.listeners.forEach((listener: any) => listener(next));
    },
  };
  test.observations.set(key, item);
  return item;
}
vi.mock("../src/house", async (original) => {
  const actual = await original<typeof import("../src/house")>();
  return {
    ...actual,
    houseRuntime: () => test.connection(),
    createHouseDataProvider: (_md: any, _room: any, options: any) => {
      test.mutation = options.onMutation;
      return {};
    },
    observeRooms: async () => test.observations.get("rooms"),
    observeSyncStatus: async () => test.observations.get("sync"),
    observeRoomDrafts: async () => test.observations.get("drafts"),
    observeServiceMode: async () => test.observations.get("mode"),
    observeStorageLoss: async () => test.observations.get("storage"),
    observeConnectionRefusal: async () => test.observations.get("refusal"),
    observeHR: async (_md: any, room: string) =>
      test.observations.get(`query:${room}`),
    observeQueue: async (_md: any, room: string) =>
      test.observations.get(`queue:${room}`),
  };
});
function data(room: string, id: string) {
  const stamp = "2026-10-01T09:00:00.000Z";
  return {
    documents: [
      {
        room,
        path: "team.md",
        type: "hr_team",
        fields: { id: "team-1", name: "Design" },
        markdown: "team",
      },
      {
        room,
        path: "employee.md",
        type: "hr_employee",
        fields: {
          id,
          createdAt: stamp,
          updatedAt: stamp,
          firstName: id,
          lastName: "Test",
          jobTitle: "Designer",
          email: "test@example.test",
          teamId: "team-1",
          availableAnnualLeaveDays: 25,
        },
        markdown: "employee",
      },
    ],
  };
}
function Child() {
  const { room, employee, employees, setEmployeeId } = useHRContext();
  return (
    <main>
      <p>Active {room.locator}</p>
      <p>Employee {employee?.id ?? "none"}</p>
      <p>Count {employees.length}</p>
      <button onClick={() => setEmployeeId("employee-3")}>
        Choose third employee
      </button>
    </main>
  );
}
beforeEach(() => {
  test.observations.clear();
  test.connection.mockReset().mockResolvedValue({});
  observation("rooms", [
    { locator: "room-1", name: "First" },
  ]);
  observation("sync", {
    state: "synced",
    lastCompleted: "2026-10-11T13:00:00Z",
    providerUnreachable: false,
    attentionRequired: [],
  });
  observation("drafts", []);
  observation("mode", "open");
  observation("storage", null);
  observation("refusal", null);
  for (const [room, id] of [
    ["room-1", "employee-1"],
    ["room-2", "employee-2"],
  ]) {
    observation(`query:${room}`, data(room, id));
    observation(`queue:${room}`, []);
  }
});
afterEach(cleanup);
const start = async () => {
  const result = render(
    <HouseGate>
      <Child />
    </HouseGate>,
  );
  await screen.findByText("Employee employee-1");
  return result;
};
describe("House status and Room gate", () => {
  it("renders the native full-fields HR snapshot instead of remaining on Loading data", async () => {
    test.observations.get("query:room-1").value = {documents: nativeProjection.result.documents.map(document => ({...document,room:"room-1"}))};
    render(<HouseGate><Child /></HouseGate>);
    await screen.findByText("Employee donor-employee-1");
    expect(screen.getByText("Count 5")).toBeVisible();
    expect(screen.queryByText(/Loading data/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unsupported.*field: type/)).not.toBeInTheDocument();
  });
  it("shows attached Room and selected synthetic employee", async () => {
    await start();
    expect(screen.getByText("Active room-1")).toBeInTheDocument();
    expect(screen.queryByText("Synced to House")).not.toBeInTheDocument();
  });
  it("does not seed or create fallback content without a Room", async () => {
    test.observations.get("rooms").value = [];
    render(
      <HouseGate>
        <Child />
      </HouseGate>,
    );
    await screen.findByText(/Attach a HR Room/);
    expect(screen.queryByText("Active room-1")).not.toBeInTheDocument();
  });
  it("rejects multiple host bindings without a Room picker and recovers from a sole binding", async () => {
    await start();
    expect(screen.queryByLabelText("HR Room")).not.toBeInTheDocument();
    act(() => test.observations.get("rooms").emit([{locator: "room-1", name: "First"}, {locator: "room-2", name: "Second"}]));
    expect(await screen.findByText(/received multiple data bindings/)).toBeInTheDocument();
    expect(screen.getByText("Employee employee-1")).not.toBeVisible();
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    act(() => test.observations.get("rooms").emit([{locator: "room-1", name: "First"}]));
    await screen.findByText("Employee employee-1");
  });
  it("switches employees locally without an unsaved-changes prompt", async () => {
    test.observations.get("query:room-1").value.documents.push(data("room-1", "employee-3").documents[1]);
    await start();
    fireEvent.click(screen.getByText("Choose third employee"));
    await screen.findByText("Employee employee-3");
    expect(screen.queryByText("View another employee?")).not.toBeInTheDocument();
    expect(screen.getByText("Active room-1")).toBeInTheDocument();
  });
  it("unlocks a newly selected Room after detachment during an old Room save", async () => {
    await start();
    const oldMutation = test.mutation;
    act(() => oldMutation({ phase: "saving", message: "Preparing change" }));
    expect(screen.queryByLabelText("HR Room")).not.toBeInTheDocument();
    act(() =>
      test.observations
        .get("rooms")
        .emit([{ locator: "room-2", name: "Second" }]),
    );
    await screen.findByText("Employee employee-2");
    expect(screen.queryByLabelText("HR Room")).not.toBeInTheDocument();
    expect(screen.queryByText("Queueing changes…")).not.toBeInTheDocument();
    act(() => oldMutation({ phase: "error", message: "Old Room failure" }));
    expect(screen.queryByText("Old Room failure")).not.toBeInTheDocument();
  });
  it("shows offline, queue, reset, draft and storage warnings separately", async () => {
    test.observations.get("sync").value = {
      state: "syncing",
      lastCompleted: "2026-10-11T13:00:00Z",
      providerUnreachable: true,
      attentionRequired: [{ room: "room-1", path: "needs-attention.md" }],
      reset: true,
    };
    test.observations.get("drafts").value = [
      { room: "room-1", path: "returned.md", returned: {} },
    ];
    test.observations.get("storage").value = "lost";
    test.observations.get("queue:room-1").value = [
      { state: "waiting" },
      { state: "submitted" },
      { state: "accepted" },
      { state: "reset" },
    ];
    test.observations.get("mode").value = "write-halted";
    await start();
    expect(screen.queryByText("Offline · changes waiting")).not.toBeInTheDocument();
    expect(screen.queryByText("4 Room change batches")).not.toBeInTheDocument();
    expect(
      screen.getByText(/2 Room drafts need attention/),
    ).toBeInTheDocument();
    expect(screen.getByText(/storage warning: lost/)).toBeInTheDocument();
    expect(screen.getByText(/sync reset/)).toBeInTheDocument();
    expect(screen.getByText(/changes queue locally/)).toBeInTheDocument();
  });
  it("does not render private data when connection is refused", async () => {
    test.observations.get("refusal").value = { code: "not-admitted", retryable: false };
    render(
      <HouseGate>
        <Child />
      </HouseGate>,
    );
    await screen.findByText("House connection refused: not-admitted");
    expect(screen.queryByText("Active room-1")).not.toBeInTheDocument();
  });
  it("supports retry after a connection failure", async () => {
    test.connection.mockRejectedValueOnce(new Error("Connection unavailable"));
    render(
      <HouseGate>
        <Child />
      </HouseGate>,
    );
    await screen.findByText(/Connection unavailable/);
    fireEvent.click(screen.getByText("Retry connection"));
    await screen.findByText("Employee employee-1");
    expect(test.connection).toHaveBeenCalledTimes(2);
  });
  it("closes all observation handles and subscriptions on unmount", async () => {
    const view = await start();
    view.unmount();
    for (const key of [
      "rooms",
      "sync",
      "drafts",
      "mode",
      "storage",
      "refusal",
      "query:room-1",
      "queue:room-1",
    ]) {
      expect(test.observations.get(key).close).toHaveBeenCalled();
      expect(test.observations.get(key).listeners.size).toBe(0);
    }
  });
  it("keeps existing Room active when query data becomes malformed", async () => {
    const view = await start();
    test.observations
      .get("query:room-1")
      .emit({ documents: [{ room: "other" }] });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("another Room"),
    );
    expect(screen.getByText("Employee employee-1")).toBeInTheDocument();
    view.unmount();
  });
});

it("waits for completed sync and recovers from both empty and ambiguous bindings", async () => {
  test.observations.get("rooms").value = [];
  test.observations.get("sync").value.lastCompleted = null;
  render(<HouseGate><Child /></HouseGate>);
  await screen.findByText("Loading…");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  act(() => test.observations.get("rooms").emit([{locator: "room-1"}, {locator: "room-2"}]));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  act(() => test.observations.get("sync").emit({...test.observations.get("sync").value, lastCompleted: "2026-10-11T13:00:00Z"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("multiple data bindings");
  act(() => test.observations.get("rooms").emit([]));
  expect(screen.getByRole("alert")).toHaveTextContent("Attach a HR Room");
  act(() => test.observations.get("rooms").emit([{locator: "room-1"}]));
  await screen.findByText("Employee employee-1");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("keeps an unsaved form mounted across lost reach and restores it unchanged", async () => {
  function Draft() {
    const [text, setText] = React.useState("");
    return <><Child /><input aria-label="Unsaved request" value={text} onChange={event => setText(event.target.value)} /></>;
  }
  render(<HouseGate><Draft /></HouseGate>);
  await screen.findByText("Employee employee-1");
  const input = screen.getByLabelText("Unsaved request");
  fireEvent.change(input, {target: {value: "Keep these leave notes"}});
  act(() => test.observations.get("rooms").emit([]));
  expect(input).toHaveValue("Keep these leave notes");
  expect(input).not.toBeVisible();
  act(() => test.observations.get("rooms").emit([{locator: "room-1"}]));
  await waitFor(() => expect(input).toBeVisible());
  expect(input).toHaveValue("Keep these leave notes");
});
