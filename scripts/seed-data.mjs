// Licensed fixture adaptation. Prints proposed creates; never sends them.
// Existing Rooms require the operator to re-read exact bases and migrate safely.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adaptDemoData } from "./adapt-demo-data.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const types = { teams: "hr_team", employees: "hr_employee", "time-offs": "hr_time_off" };
export const seedRecords = adaptDemoData().records;
export function markdown(type, row) {
  return `---\ntype: ${type}\n${Object.entries(row).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n`;
}
export function buildSeedChanges(room, { includeSchema = true } = {}) {
  if (typeof room !== "string" || !/^[a-z0-9-]+$/.test(room)) throw new Error("Expected verified Room handle");
  return [
    ...(includeSchema ? [{ op: "create", path: `/rooms/${room}/settings/schema.yaml`, content: fs.readFileSync(path.join(root, "schema.yaml"), "utf8") }] : []),
    ...Object.entries(seedRecords).flatMap(([resource, rows]) => rows.map((row) => ({ op: "create", path: `/rooms/${room}/hr/${resource}/${row.id}.md`, content: markdown(types[resource], row) }))),
  ];
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--room");
  if (index < 0) throw new Error("Use --room <verified-handle> [--documents-only]");
  console.log(JSON.stringify({ changes: buildSeedChanges(process.argv[index + 1], { includeSchema: !process.argv.includes("--documents-only") }) }, null, 2));
}
