import * as XLSX from "xlsx";

export type CellValue = string | number | boolean | null;
export type ParsedCell = { columnNumber: number; columnLabel: string; rawValue: CellValue; displayValue: string | null; formula: string | null };
export type ParsedRow = { sourceRowNumber: number; values: CellValue[]; cells: ParsedCell[] };
export type ParsedSheet = { name: string; order: number; rows: ParsedRow[]; columnCount: number };
export type ParsedWorkbook = { sheets: ParsedSheet[] };

function serialiseValue(value: unknown): CellValue {
  if (value === undefined || value === null || value === "") return value === "" ? "" : null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function parseImportWorkbook(contents: Buffer): ParsedWorkbook {
  const workbook = XLSX.read(contents, { type: "buffer", cellFormula: true, cellText: true, cellDates: true, sheetStubs: true });
  if (!workbook.SheetNames.length) throw new Error("The uploaded workbook has no sheets.");
  return { sheets: workbook.SheetNames.map((name, order) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    const rows: ParsedRow[] = [];
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const values: CellValue[] = [];
      const cells: ParsedCell[] = [];
      for (let column = range.s.c; column <= range.e.c; column += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: column });
        const cell = sheet[address];
        const rawValue = serialiseValue(cell?.v);
        values.push(rawValue);
        cells.push({ columnNumber: column + 1, columnLabel: XLSX.utils.encode_col(column), rawValue, displayValue: cell?.w ?? (rawValue === null ? null : String(rawValue)), formula: cell?.f ?? null });
      }
      rows.push({ sourceRowNumber: row + 1, values, cells });
    }
    return { name, order, rows, columnCount: range.e.c - range.s.c + 1 };
  }) };
}
