import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { mappingsForSheet, proposalsForDirectorRow } from "@/server/imports/mapping";
import { parseImportWorkbook } from "@/server/imports/parser";
function sampleWorkbook() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["Metro", "School", "Director (UIL)", "Email", "Tier"], ["North", "Example High", "Alex Smith & Jordan Lee", "director@example.org", "A - Verified"]]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Directors"); return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
describe("import parser and mapping", () => {
  it("preserves source rows/cells and maps known headers", () => { const parsed = parseImportWorkbook(sampleWorkbook()); const sheet = parsed.sheets[0]; expect(sheet.rows).toHaveLength(2); expect(sheet.rows[1].cells[2]).toMatchObject({ columnLabel: "C", rawValue: "Alex Smith & Jordan Lee" }); expect(mappingsForSheet(sheet)).toContainEqual({ sourceColumn: "School", destinationField: "schools.name" }); });
  it("creates separate director proposals rather than collapsing multiple names", () => { const sheet = parseImportWorkbook(sampleWorkbook()).sheets[0]; const proposals = proposalsForDirectorRow(sheet.rows[1], sheet.rows[0].values.map(String), new Set()); expect(proposals.filter((proposal) => proposal.entityType === "director")).toHaveLength(2); expect(proposals.map((proposal) => proposal.proposedAction)).toEqual(["create", "create", "create"]); });
  it("marks a repeated candidate as a conflict for review", () => { const sheet = parseImportWorkbook(sampleWorkbook()).sheets[0]; const keys = new Set<string>(); proposalsForDirectorRow(sheet.rows[1], sheet.rows[0].values.map(String), keys); expect(proposalsForDirectorRow(sheet.rows[1], sheet.rows[0].values.map(String), keys).every((proposal) => proposal.proposedAction === "conflict")).toBe(true); });
});
