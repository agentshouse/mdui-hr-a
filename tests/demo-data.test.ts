// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { validate, verify } from "@agentshouse/mdmodel";
// @ts-expect-error Source-only operator adapter intentionally has no runtime types.
import { adaptDemoData, readSourceFixture, verifySourceHashes, SNAPSHOT_AT } from "../scripts/adapt-demo-data.mjs";
// @ts-expect-error Standalone operator script has no declaration file.
import { buildSeedChanges, seedRecords } from "../scripts/seed-data.mjs";
import { validateRow, type Resource, type Row, durationDays } from "../src/house";

describe("licensed HR source fixture", () => {
  it("pins original source bytes, license, parser and deterministic snapshot", () => {
    expect(() => verifySourceHashes()).not.toThrow();
    const first = adaptDemoData();
    expect(adaptDemoData()).toEqual(first);
    expect(JSON.parse(readFileSync(new URL("./support/hr-demo/records.json", import.meta.url), "utf8"))).toEqual(first.records);
    expect(JSON.parse(readFileSync(new URL("./support/hr-demo/provenance.json", import.meta.url), "utf8"))).toEqual(first.provenance);
    expect(readFileSync(new URL("../public/licenses/HR_DEMO_DATA_LICENSE.txt", import.meta.url), "utf8")).toBe(readFileSync(new URL("./support/hr-demo/vendor/bitrock/LICENSE.txt", import.meta.url), "utf8"));
    expect(first.provenance.generator).toMatchObject({ parser: "typescript@5.8.3", randomSeed: null, network: "none" });
  });

  it("preserves every source employee and request without mixing unrelated donor identities", () => {
    const source = readSourceFixture();
    const { records, provenance } = adaptDemoData();
    expect(provenance.counts).toEqual({ teams: 4, employees: 5, "time-offs": 15 });
    expect(records.employees).toHaveLength(source.users.length);
    expect(records["time-offs"]).toHaveLength(source.leaveRequests.length);
    source.users.forEach((user: any, i: number) => {
      const employee = records.employees[i];
      expect(employee).toMatchObject({ firstName: user.name, lastName: user.surname, jobTitle: user.role, availableAnnualLeaveDays: source.userSummary.vacationDaysTotal, createdAt: SNAPSHOT_AT, updatedAt: SNAPSHOT_AT });
      expect(employee.email).toBe(`${user.email.split("@")[0]}@example.test`);
      expect(records.teams.find((team: any) => team.id === employee.teamId).name).toBe(`Role group: ${user.role}`);
    });
    source.leaveRequests.forEach((request: any, i: number) => {
      const target = records["time-offs"][i];
      expect(target.notes).toBe(request.reason);
      expect(target.employeeId).toBe(provenance.employeeMapping.find((entry: any) => entry.sourceId === request.user.id).targetId);
      expect(target.status.toLowerCase()).toBe(request.status);
      expect(provenance.requestMapping[i].sourceDays).toBe(request.days);
    });
    expect(provenance.employeeMapping.filter((row: any) => !row.sourceActive)).toHaveLength(1);
    expect(provenance.donorFirstCheck).toMatchObject({ loginProfiles: 6, completeEmployeeRecords: 0, teams: 0, timeOffs: 0 });
  });

  it("covers source states, all leave types, joins and honest calendar-day differences", () => {
    const { records, provenance } = adaptDemoData();
    const requests = records["time-offs"];
    expect([...new Set(requests.map((r: any) => r.status))].sort()).toEqual(["Approved", "Pending", "Rejected"]);
    expect([...new Set(requests.map((r: any) => r.timeOffType))].sort()).toEqual(["Annual", "Casual", "Sick"]);
    expect(requests.filter((r: any) => r.status === "Pending")).toHaveLength(2);
    expect(requests.filter((r: any) => r.status === "Approved")).toHaveLength(12);
    expect(requests.filter((r: any) => r.status === "Rejected")).toHaveLength(1);
    expect(requests.filter((r: any) => r.employeeId === "donor-employee-1")).toHaveLength(14);
    expect(requests.filter((r: any) => r.employeeId === "donor-employee-2")).toHaveLength(1);
    expect(provenance.requestMapping.filter((r: any) => r.sourceDays !== r.calendarDays)).toHaveLength(3);
    for (const request of requests) {
      expect(durationDays(request.startsAt, request.endsAt)).toBeGreaterThan(0);
      expect(records.employees.some((employee: any) => employee.id === request.employeeId)).toBe(true);
    }
    expect(JSON.stringify(records)).not.toMatch(/https?:|avatar|placeholder|bitrock\.it|dundermifflin/);
  });

  it("all 24 records satisfy the unchanged schema and runtime row validator", () => {
    const checked = verify(readFileSync(new URL("../schema.yaml", import.meta.url), "utf8"));
    expect(checked.verdict).toBe("accept");
    if (checked.verdict !== "accept") throw new Error(JSON.stringify(checked));
    const changes = buildSeedChanges("hr-test", { includeSchema: false });
    expect(changes).toHaveLength(24);
    expect(new Set(changes.map((change: any) => change.path)).size).toBe(24);
    for (const change of changes) expect(change.path).toMatch(/\/donor-(?:team|employee|time-off)-\d+\.md$/);
    expect(validate(Object.fromEntries(changes.map((change: any) => [change.path, change.content])), { binaryTargets: [] }, checked.model)).toEqual({ verdict: "accept" });
    for (const [resource, rows] of Object.entries(seedRecords))
      for (const row of rows as Row[]) expect(validateRow(resource as Resource, row)).toEqual(row);
  });

  it("prints only requested proposed creates and refuses unsafe Room handles", () => {
    expect(() => buildSeedChanges("../escape")).toThrow("Expected verified Room handle");
    expect(() => buildSeedChanges(undefined)).toThrow("Expected verified Room handle");
    const output = execFileSync(process.execPath, ["scripts/seed-data.mjs", "--room", "hr-test", "--documents-only"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
    expect(JSON.parse(output).changes).toEqual(buildSeedChanges("hr-test", { includeSchema: false }));
    expect(buildSeedChanges("hr-test")).toHaveLength(25);
  });
});
