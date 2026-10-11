// @vitest-environment node
import {describe, expect, it, vi} from "vitest";
import {createHouseDataProvider, openTimeOffDraft} from "../src/house";
import {draftBoundary as boundary} from "./support/draft-boundary";
describe("local-first HR creation draft", () => {
  it("persists each typed patch locally, hydrates on reopen, and only queues on explicit Save", async () => {
    const {md, held, methods} = boundary();
    const first = await openTimeOffDraft(md, "r", "employee");
    await first.write({notes: "Keep my typing even before dates exist"});
    expect(methods.save).not.toHaveBeenCalled();
    expect(methods.query).not.toHaveBeenCalled();
    expect(held.size).toBe(1);
    first.close();
    const reopened = await openTimeOffDraft(md, "r", "employee");
    expect(reopened.fields().notes).toBe("Keep my typing even before dates exist");
    const variables = await reopened.prepare({startsAt: "2026-10-19", endsAt: "2026-10-23"});
    await createHouseDataProvider(md, "r").create({resource: "time-offs", variables});
    expect(methods.save).toHaveBeenCalledOnce();
    expect(held.size).toBe(0);
    expect(methods.roomDraft.discard).not.toHaveBeenCalled();
    reopened.close();
  });
  it("merges disjoint tab edits and reapplies latest typing on stale CAS without prompts or recovery paths", async () => {
    const {md, held, methods, remote, setRace} = boundary();
    const first = await openTimeOffDraft(md, "r", "employee");
    await first.write({notes: "Original"});
    const path = [...held.keys()][0];
    const second = await openTimeOffDraft(md, "r", "employee");
    const redraw = vi.fn(); first.subscribe(redraw);
    await second.write({timeOffType: "Sick"});
    expect(first.fields().timeOffType).toBe("Sick");
    setRace(() => remote(path, {notes: "Other tab", status: "Approved"}));
    await first.write({notes: "Latest local input"});
    expect(second.fields()).toMatchObject({notes: "Latest local input", timeOffType: "Sick", status: "Approved"});
    expect(redraw).toHaveBeenCalled();
    expect(held.size).toBe(1);
    expect(methods.save).not.toHaveBeenCalled();
    expect(methods.roomDraft.discard).not.toHaveBeenCalled();
    first.close(); second.close();
  });
  it("retains provider-returned drafts for normal Save conflict handling", async () => {
    const {md, held, methods} = boundary();
    const first = await openTimeOffDraft(md, "r", "employee"); await first.write({notes: "Important"}); first.close();
    const [path, draft] = [...held][0];
    held.set(path, {...draft, returned: {kind: "expired"}});
    const reopened = await openTimeOffDraft(md, "r", "employee");
    expect(reopened.fields().notes).toBe("Important");
    await reopened.write({notes: "Reviewable revision"});
    expect(held.get(path)?.returned).toEqual({kind: "expired"});
    expect(methods.save).not.toHaveBeenCalled();
    reopened.close();
    expect(methods.roomDraft.discard).not.toHaveBeenCalled();
  });
  it("starts the next request without taking over an edit draft on the previously saved request", async () => {
    const {md,held,methods}=boundary();const first=await openTimeOffDraft(md,"r","employee");
    await first.write({notes:"First request"});const path=[...held.keys()][0];
    const original=held.get(path)!;held.set(path,{...original,parts:{fields:{notes:{value:"Later review",base:{value:"First request"}}}}});first.close();
    const edit=structuredClone(held.get(path));const next=await openTimeOffDraft(md,"r","employee");
    expect(next.fields().notes).toBe("");await next.write({notes:"Second request"});
    expect(held.size).toBe(2);expect(held.get(path)).toEqual(edit);expect(methods.save).not.toHaveBeenCalled();next.close();
  });
});
