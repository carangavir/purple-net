import "server-only";
import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { auditEvents, importBatches, importCells, importFieldChanges, importFiles, importMappings, importProposals, importRows, importSheets } from "@/server/db/schema";
import { mappingsForSheet, proposalsForDirectorRow } from "./mapping";
import { parseImportWorkbook } from "./parser";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export async function stageImport(input: { createdByUserId: string; filename: string; mimeType: string; contents: Buffer }) {
  if (!input.filename.match(/\.(xlsx|csv)$/i)) throw new Error("Only .xlsx and .csv import files are accepted.");
  if (!input.contents.length || input.contents.length > MAX_UPLOAD_BYTES) throw new Error("Import files must be between 1 byte and 10 MB.");
  const parsed = parseImportWorkbook(input.contents);
  const hash = createHash("sha256").update(input.contents).digest("hex");
  const summary = { sheets: parsed.sheets.map((sheet) => ({ name: sheet.name, rows: sheet.rows.length, columns: sheet.columnCount })), proposals: 0, unresolved: 0, conflicts: 0 };
  return getDb().transaction(async (tx) => {
    const [batch] = await tx.insert(importBatches).values({ createdByUserId: input.createdByUserId, sourceFilename: input.filename, fileHash: hash, status: "staging", summary }).returning({ id: importBatches.id });
    await tx.insert(importFiles).values({ batchId: batch.id, originalFilename: input.filename, mimeType: input.mimeType || "application/octet-stream", byteSize: input.contents.length, sha256: hash, contents: input.contents });
    const duplicateKeys = new Set<string>();
    for (const sheet of parsed.sheets) {
      const [storedSheet] = await tx.insert(importSheets).values({ batchId: batch.id, sheetName: sheet.name, sheetOrder: sheet.order, rowCount: sheet.rows.length, columnCount: sheet.columnCount }).returning({ id: importSheets.id });
      const mapping = mappingsForSheet(sheet);
      if (mapping.length) await tx.insert(importMappings).values(mapping.map((entry) => ({ batchId: batch.id, sheetName: sheet.name, ...entry })));
      const storedRows = new Map<number, string>();
      for (const row of sheet.rows) {
        const [storedRow] = await tx.insert(importRows).values({ sheetId: storedSheet.id, sourceRowNumber: row.sourceRowNumber, rawValues: row.values }).returning({ id: importRows.id });
        storedRows.set(row.sourceRowNumber, storedRow.id);
        await tx.insert(importCells).values(row.cells.map((cell) => ({ rowId: storedRow.id, columnNumber: cell.columnNumber, columnLabel: cell.columnLabel, rawValue: cell.rawValue, displayValue: cell.displayValue, formula: cell.formula })));
      }
      if (mapping.some((entry) => entry.sourceColumn === "Director (UIL)") && sheet.rows.length > 1) {
        const headers = sheet.rows[0].values.map((value) => value === null ? "" : String(value));
        for (const row of sheet.rows.slice(1)) {
          for (const proposal of proposalsForDirectorRow(row, headers, duplicateKeys)) {
            const [storedProposal] = await tx.insert(importProposals).values({ batchId: batch.id, sourceRowId: storedRows.get(row.sourceRowNumber)!, entityType: proposal.entityType, proposedAction: proposal.proposedAction, payload: proposal.payload, duplicateKey: proposal.duplicateKey }).returning({ id: importProposals.id });
            if (proposal.fields.length) await tx.insert(importFieldChanges).values(proposal.fields.map((field) => ({ proposalId: storedProposal.id, fieldName: field.fieldName, incomingValue: field.value, existingValue: null, changeType: proposal.proposedAction })));
            summary.proposals += 1; if (proposal.proposedAction === "unresolved") summary.unresolved += 1; if (proposal.proposedAction === "conflict") summary.conflicts += 1;
          }
        }
      }
    }
    await tx.update(importBatches).set({ status: "review_ready", summary }).where(eq(importBatches.id, batch.id));
    await tx.insert(auditEvents).values({ actorUserId: input.createdByUserId, eventType: "import.batch_staged", metadata: { batchId: batch.id, fileHash: hash, proposalCount: summary.proposals } });
    return { batchId: batch.id, summary };
  });
}

export async function listImportBatches() { return getDb().select().from(importBatches).orderBy(desc(importBatches.createdAt)); }
