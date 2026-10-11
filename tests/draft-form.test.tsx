import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {useForm} from "react-hook-form";
import "@testing-library/jest-dom/vitest";
import {useTimeOffDraft} from "../src/hooks/use-time-off-draft";
import {TimeOffStatus, TimeOffType} from "../src/types";
import type {TimeOffFormValues} from "../src/utilities/time-off-form";
import {draftBoundary} from "./support/draft-boundary";
const fixture = vi.hoisted(() => ({runtime: undefined as unknown}));
vi.mock("../src/house", async original => ({...await original<typeof import("../src/house")>(), houseRuntime: async () => fixture.runtime}));
function Form({label = "Notes"}: {label?: string}) {
  const form = useForm<TimeOffFormValues>({defaultValues: {notes: "", dates: [null, null], timeOffType: TimeOffType.ANNUAL, status: TimeOffStatus.PENDING}});
  const draft = useTimeOffDraft("r", "employee", form);
  return <><input aria-label={label} {...form.register("notes")} /><select aria-label={`${label} type`} {...form.register("timeOffType")}><option>Annual</option><option>Sick</option></select>{draft.error && <p role="alert">{draft.error}</p>}</>;
}
afterEach(cleanup);
beforeEach(() => {fixture.runtime = draftBoundary().md;});
it("restores typed content after unmount and redraws another mounted tab without prompts", async () => {
  const {md, held, methods} = draftBoundary(); fixture.runtime = md;
  const first = render(<Form/>);
  await act(async () => {await Promise.resolve();});
  fireEvent.change(screen.getByLabelText("Notes"), {target: {value: "Durable local note"}});
  await waitFor(() => expect(held.size).toBe(1));
  await waitFor(() => expect(methods.presentation.write).toHaveBeenCalled());
  first.unmount();
  render(<><Form label="First tab"/><Form label="Second tab"/></>);
  await waitFor(() => expect(screen.getByLabelText("First tab")).toHaveValue("Durable local note"));
  await waitFor(() => expect(screen.getByLabelText("Second tab")).toHaveValue("Durable local note"));
  fireEvent.change(screen.getByLabelText("First tab"), {target: {value: "Later typing"}});
  await waitFor(() => expect(screen.getByLabelText("Second tab")).toHaveValue("Later typing"));
  fireEvent.change(screen.getByLabelText("Second tab type"), {target: {value: "Sick"}});
  await waitFor(() => expect(screen.getByLabelText("First tab type")).toHaveValue("Sick"));
  expect(methods.save).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("retains typing even when navigation unmounts before the local draft lookup finishes", async () => {
  const {md, held, methods} = draftBoundary(); fixture.runtime = md;
  let release!: (value: unknown) => void;
  methods.presentation.read.mockImplementationOnce(() => new Promise(resolve => {release = resolve;}));
  const view = render(<Form/>);
  fireEvent.change(screen.getByLabelText("Notes"), {target: {value: "Typed immediately before Back"}});
  view.unmount();
  await waitFor(() => expect(release).toBeTypeOf("function"));
  await act(async () => {release({}); await Promise.resolve();});
  await waitFor(() => expect(held.size).toBe(1));
  const creation = [...held.values()][0].parts.creation!;
  expect("fields" in creation && creation.fields.notes).toBe("Typed immediately before Back");
  expect(methods.save).not.toHaveBeenCalled();
});
