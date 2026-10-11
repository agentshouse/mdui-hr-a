// Source-only adapter: reads licensed fixture literals, never runs vendor code.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const fixtureRoot = path.join(root, "tests/support/hr-demo");
export const SNAPSHOT_AT = "2026-10-11T00:00:00.000Z";
export const upstream = {
  repository: "https://github.com/bitrockteam/bitrock-center",
  commit: "c23088d58a59adb07ac75ad38657abd701d1a0bf",
  source: "lib/mock-data.ts", license: "MIT",
};
export const sourceHashes = {
  "vendor/bitrock/mock-data.ts.txt": "5d0cb0738a16a66dc9018b03a15d99fcdfe318b57bc44083474ee1170662438e",
  "vendor/bitrock/LICENSE.txt": "be8cb969995e19b63036b08d63348fce0b8a4c84e8fedcb753849cb1e93d96ad",
  "vendor/bitrock/README.md": "feefb6213f355bf03a7c5316a0bbf89dfa2b7ffa217acdea243f0a6976dcb4e3",
  "vendor/refine/login.tsx.txt": "fc7c1ce2c02f36e3e7909ac881052772b0b25e7fc3cd0c358c29370fe7a3c244",
  "vendor/refine/constants.ts.txt": "5b57469c1a71026a5fb99fd7a2ec233c93f2b1c021e448bee5a78ee887039a52",
  "vendor/refine/LICENSE.txt": "ae616936d77df09838b97cb6d4a41921bcd47b676fe9ce623a5ee4cdbb1db91f",
};
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function verifySourceHashes() {
  for (const [name, hash] of Object.entries(sourceHashes))
    assert.equal(sha256(fs.readFileSync(path.join(fixtureRoot, name))), hash, `Pinned source changed: ${name}`);
  assert.equal(ts.version, "5.8.3", "Review fixture parser before upgrading TypeScript");
}

// Closed literal interpreter. No eval/VM/import/arbitrary property or call use.
export function readSourceFixture() {
  verifySourceHashes();
  const source = ts.createSourceFile("mock-data.ts", fs.readFileSync(path.join(fixtureRoot, "vendor/bitrock/mock-data.ts.txt"), "utf8"), ts.ScriptTarget.ESNext, true);
  const declarations = new Map();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations)
      if (ts.isIdentifier(declaration.name) && declaration.initializer)
        declarations.set(declaration.name.text, declaration.initializer);
  }
  // Freeze the upstream wall-clock inputs instead of regenerating on each load.
  const constants = new Map([["currentYear", 2026], ["currentMonth", 9]]);
  const resolving = new Set();
  const value = (node) => {
    if (ts.isParenthesizedExpression(node)) return value(node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(value);
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map((property) => {
      assert(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)), "Unsupported vendor object syntax");
      return [property.name.text, value(property.initializer)];
    }));
    if (ts.isIdentifier(node)) {
      if (constants.has(node.text)) return constants.get(node.text);
      assert(declarations.has(node.text) && !resolving.has(node.text), `Unknown or circular fixture identifier: ${node.text}`);
      resolving.add(node.text);
      const result = value(declarations.get(node.text));
      resolving.delete(node.text); constants.set(node.text, result);
      return result;
    }
    if (ts.isBinaryExpression(node)) {
      const left = value(node.left), right = value(node.right);
      assert(typeof left === "number" && typeof right === "number", "Only numeric date offsets are supported");
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return left + right;
      if (node.operatorToken.kind === ts.SyntaxKind.MinusToken) return left - right;
    }
    if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((span) => String(value(span.expression)) + span.literal.text).join("");
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const target = value(node.expression.expression);
      if (node.expression.name.text === "toString" && node.arguments.length === 0 && typeof target === "number") return String(target);
      if (node.expression.name.text === "padStart" && typeof target === "string" && node.arguments.length === 2) {
        const [length, fill] = node.arguments.map(value);
        assert.equal(length, 2); assert.equal(fill, "0");
        return target.padStart(2, "0");
      }
    }
    throw new Error(`Unsupported vendor fixture expression: ${node.getText(source)}`);
  };
  return Object.fromEntries(["users", "contractsData", "userSummary", "leaveRequests"].map((name) => [name, value(ts.factory.createIdentifier(name))]));
}
function isoDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  assert(match, `Unexpected source period: ${value}`);
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  assert.equal(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10), date);
  return date;
}
const leaveTypes = { vacation: "Annual", permission: "Casual", sickness: "Sick" };
const statuses = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
export function adaptDemoData() {
  const source = readSourceFixture();
  const roles = [...new Set(source.users.map((user) => user.role))];
  // Explicit role groups fit the required single-team field without pretending
  // the source's many-to-many project memberships are single-team assignments.
  const teams = roles.map((role, index) => ({ id: `donor-team-${index + 1}`, name: `Role group: ${role}` }));
  const employeeIds = new Map(source.users.map((user, index) => [user.id, `donor-employee-${index + 1}`]));
  const employees = source.users.map((user) => ({
    id: employeeIds.get(user.id),
    // Declared import metadata; source has no employee/request record timestamps.
    createdAt: SNAPSHOT_AT, updatedAt: SNAPSHOT_AT,
    firstName: user.name, lastName: user.surname, jobTitle: user.role,
    email: `${user.email.split("@")[0]}@example.test`,
    // getUserSummary() is a shared source demo summary, not per-user entitlement.
    availableAnnualLeaveDays: source.userSummary.vacationDaysTotal,
    teamId: teams[roles.indexOf(user.role)].id,
  }));
  const timeOffs = source.leaveRequests.map((request, index) => {
    assert(employeeIds.has(request.user.id), `Broken source employee link: ${request.user.id}`);
    const dates = request.period.split(" - ").map(isoDate);
    assert(leaveTypes[request.type] && statuses[request.status], "Unsupported source request category");
    assert(dates.length === 1 || dates.length === 2);
    const startsAt = dates[0], endsAt = dates[1] ?? dates[0];
    assert(endsAt >= startsAt, "Invalid source date ordering");
    return {
      id: `donor-time-off-${index + 1}`, createdAt: SNAPSHOT_AT, updatedAt: SNAPSHOT_AT,
      employeeId: employeeIds.get(request.user.id), timeOffType: leaveTypes[request.type],
      startsAt, endsAt, status: statuses[request.status], notes: request.reason,
    };
  });
  const records = { teams, employees, "time-offs": timeOffs };
  const provenance = {
    upstream, licenseNotice: "vendor/bitrock/LICENSE.txt", distributedNotice: "public/licenses/HR_DEMO_DATA_LICENSE.txt",
    sourceHashes, snapshotAt: SNAPSHOT_AT,
    generator: { kind: "literal-fixture-adapter", parser: "typescript@5.8.3", randomSeed: null, clock: { currentYear: 2026, currentMonth: 9 }, network: "none" },
    donorFirstCheck: {
      repository: "https://github.com/refinedev/refine", commit: "2352eb5b6539e2f39ad9aef652279ad1dcf2c467", directory: "examples/refine-hr-ce",
      loginProfiles: 6, completeEmployeeRecords: 0, teams: 0, timeOffs: 0,
      result: "Only login profile names/emails/remote avatars are checked in; runtime data comes from api.hr.refine.dev. No complete licensed backend seed found in the donor or official-organization search. Do not join these six profiles to unrelated sample leave requests.",
    },
    counts: Object.fromEntries(Object.entries(records).map(([key, rows]) => [key, rows.length])),
    recordsSha256: sha256(JSON.stringify(records, null, 2) + "\n"),
    employeeMapping: source.users.map((user) => ({ sourceId: user.id, targetId: employeeIds.get(user.id), sourceActive: user.active, sourceProjects: user.projects, sourceRole: user.role })),
    requestMapping: source.leaveRequests.map((request, index) => ({ sourceIndex: index, targetId: timeOffs[index].id, sourceEmployeeId: request.user.id, sourcePeriod: request.period, sourceDays: request.days, calendarDays: (Date.parse(timeOffs[index].endsAt) - Date.parse(timeOffs[index].startsAt)) / 86400000 + 1 })),
    limitations: [
      "MIT-licensed fallback sample, not a captured Refine HR backend or full Refine demo parity.",
      "Required teams are explicitly labelled source-role groups. Source project memberships remain in provenance, not misrepresented as single-team assignments.",
      "All five source users are retained, including one inactive upstream. The HR port has no active/inactive employee field.",
      "Shared upstream summary supplies 25 demo allowance days for each employee, not source per-person entitlements. Approved annual calendar days can exceed this allowance.",
      "The port uses inclusive calendar-day durations. Source days values remain in provenance; three vacation ranges have different counts and are not silently rewritten.",
      "Only two source users have requests: 14 for user-1 and one for user-2. No requests invented to fill other histories.",
      "Source Italian reasons, states, relative dates and employee joins are preserved. Date inputs are frozen to October 2026, never refreshed at runtime.",
      "Email local-parts are preserved with example.test domains. Avatars remain honest initials; no source placeholders or donor remote portraits imported.",
      "createdAt/updatedAt are declared import metadata. Source employee/request record creation/update timestamps do not exist.",
    ],
  };
  return { records, provenance };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { records, provenance } = adaptDemoData();
  for (const [name, data] of [["records.json", records], ["provenance.json", provenance]]) {
    const expected = JSON.stringify(data, null, 2) + "\n", file = path.join(fixtureRoot, name);
    if (process.argv.includes("--check")) assert.equal(fs.readFileSync(file, "utf8"), expected, `Stale demo artifact: ${name}`);
    else fs.writeFileSync(file, expected);
  }
  console.log(JSON.stringify({ counts: provenance.counts, recordsSha256: provenance.recordsSha256, checked: process.argv.includes("--check") }));
}
