import type { CellValue, ParsedRow, ParsedSheet } from "./parser";

export const DIRECTOR_MAPPINGS: Record<string, string> = {
  Metro: "metros.name", School: "schools.name", District: "districts.name", "UIL Conf": "schools.uil_conference", "Director (UIL)": "directors.name", Email: "director_contact_methods.email", "Confidence / Source Note": "verification.rationale", "School Phone": "school_contact_methods.phone", "School Address": "school_addresses.line1", City: "school_addresses.city", Zip: "school_addresses.postal_code", "School Website": "school_contact_methods.website", Tier: "verification.status", "Outreach Notes": "outreach_notes.body",
};

export type ImportProposal = { entityType: "school" | "director" | "unresolved"; proposedAction: "create" | "conflict" | "unresolved"; payload: Record<string, unknown>; duplicateKey: string | null; fields: Array<{ fieldName: string; value: CellValue }> };
const normalise = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const text = (value: CellValue | undefined) => typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
const separateNames = (value: string) => value.split(/\s*(?:;|&|\band\b)\s*/i).map((item) => item.trim()).filter(Boolean);

export function mappingsForSheet(sheet: ParsedSheet) {
  if (!sheet.rows[0]) return [];
  return sheet.rows[0].values.map((header) => text(header)).filter((header) => DIRECTOR_MAPPINGS[header]).map((sourceColumn) => ({ sourceColumn, destinationField: DIRECTOR_MAPPINGS[sourceColumn] }));
}

export function proposalsForDirectorRow(row: ParsedRow, headers: string[], duplicateKeys: Set<string>): ImportProposal[] {
  const input = Object.fromEntries(headers.map((header, index) => [header, row.values[index] ?? null]));
  const school = text(input.School); const director = text(input["Director (UIL)"]);
  const fields = Object.entries(input).filter(([header]) => DIRECTOR_MAPPINGS[header]).map(([header, value]) => ({ fieldName: DIRECTOR_MAPPINGS[header], value }));
  if (!school && !director) return [{ entityType: "unresolved", proposedAction: "unresolved", duplicateKey: null, fields, payload: { reason: "School and director are both blank.", source: input } }];
  const result: ImportProposal[] = [];
  if (school) {
    const key = `school:${normalise(school)}`;
    const duplicate = duplicateKeys.has(key); duplicateKeys.add(key);
    result.push({ entityType: "school", proposedAction: duplicate ? "conflict" : "create", duplicateKey: key, fields, payload: { source: input, proposed: { name: school, metro: text(input.Metro), district: text(input.District), uilConference: text(input["UIL Conf"]), phone: text(input["School Phone"]), address: text(input["School Address"]), city: text(input.City), zip: text(input.Zip), website: text(input["School Website"]), tier: text(input.Tier) } } });
  }
  const names = separateNames(director);
  if (!names.length) result.push({ entityType: "unresolved", proposedAction: "unresolved", duplicateKey: null, fields, payload: { reason: "No director name could be parsed.", source: input } });
  for (const name of names) {
    const key = `director:${normalise(name)}:${normalise(school)}`;
    const duplicate = duplicateKeys.has(key); duplicateKeys.add(key);
    result.push({ entityType: "director", proposedAction: duplicate ? "conflict" : "create", duplicateKey: key, fields, payload: { source: input, proposed: { name, school, email: text(input.Email), phone: text(input["School Phone"]), verificationNote: text(input["Confidence / Source Note"]), tier: text(input.Tier), outreachNotes: text(input["Outreach Notes"]) } } });
  }
  return result;
}
