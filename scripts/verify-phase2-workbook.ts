import { readFile } from "node:fs/promises";
import { parseImportWorkbook } from "../src/server/imports/parser";
async function main() {
  const workbook = parseImportWorkbook(await readFile("TX_Metro_Orchestra_Directors_Phase2.xlsx"));
  const directors = workbook.sheets.find((sheet) => sheet.name === "Directors"); const summary = workbook.sheets.find((sheet) => sheet.name === "Summary"); const manual = workbook.sheets.find((sheet) => sheet.name === "Needs Manual Search");
  if (!directors || !summary || !manual) throw new Error("Expected Directors, Summary, and Needs Manual Search sheets.");
  const expectedHeaders = ["Metro", "School", "District", "UIL Conf", "Director (UIL)", "Email", "Confidence / Source Note", "School Phone", "School Address", "City", "Zip", "School Website", "Tier", "Outreach Notes"];
  if (JSON.stringify(directors.rows[0].values) !== JSON.stringify(expectedHeaders) || directors.rows.length !== 261 || manual.rows.length !== 89) throw new Error("Workbook structure does not match the Phase 2 source contract.");
  const totals = Object.fromEntries(summary.rows.slice(3, 8).map((row) => [String(row.values[0]), row.values[1]]));
  const expectedTotals = { "A - Verified": 19, "B - High-confidence inferred": 154, "C - Needs manual match": 24, "D - Not found": 63, TOTAL: 260 };
  if (JSON.stringify(totals) !== JSON.stringify(expectedTotals)) throw new Error("Workbook tier totals do not match the source contract.");
  console.log("Verified Phase 2 workbook: 260 Director rows, 19/154/24/63 tier totals, and all expected sheets.");
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Workbook validation failed"); process.exit(1); });
