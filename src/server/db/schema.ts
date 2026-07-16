import { boolean, customType, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("administrator"),
  isActive: boolean("is_active").notNull().default(true),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const passwordCredentials = pgTable("password_credentials", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash), index("sessions_user_id_index").on(table.userId)]);

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  succeeded: boolean("succeeded").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  ipHash: text("ip_hash"),
}, (table) => [index("login_attempts_email_time_index").on(table.email, table.attemptedAt)]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_events_type_time_index").on(table.eventType, table.createdAt)]);

export const importBatches = pgTable("import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  sourceFilename: text("source_filename").notNull(),
  fileHash: text("file_hash").notNull(),
  status: text("status").notNull().default("staging"),
  summary: jsonb("summary").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [index("import_batches_status_index").on(table.status), index("import_batches_hash_index").on(table.fileHash)]);

export const importFiles = pgTable("import_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  contents: bytea("contents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("import_files_batch_unique").on(table.batchId)]);

export const importSheets = pgTable("import_sheets", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  sheetName: text("sheet_name").notNull(),
  sheetOrder: integer("sheet_order").notNull(),
  rowCount: integer("row_count").notNull(),
  columnCount: integer("column_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("import_sheets_batch_name_unique").on(table.batchId, table.sheetName)]);

export const importRows = pgTable("import_rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  sheetId: uuid("sheet_id").notNull().references(() => importSheets.id, { onDelete: "cascade" }),
  sourceRowNumber: integer("source_row_number").notNull(),
  rawValues: jsonb("raw_values").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("import_rows_sheet_row_unique").on(table.sheetId, table.sourceRowNumber)]);

export const importCells = pgTable("import_cells", {
  id: uuid("id").defaultRandom().primaryKey(),
  rowId: uuid("row_id").notNull().references(() => importRows.id, { onDelete: "cascade" }),
  columnNumber: integer("column_number").notNull(),
  columnLabel: text("column_label").notNull(),
  rawValue: jsonb("raw_value"),
  displayValue: text("display_value"),
  formula: text("formula"),
}, (table) => [uniqueIndex("import_cells_row_column_unique").on(table.rowId, table.columnNumber)]);

export const importMappings = pgTable("import_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  sheetName: text("sheet_name").notNull(),
  sourceColumn: text("source_column").notNull(),
  destinationField: text("destination_field").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importProposals = pgTable("import_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  sourceRowId: uuid("source_row_id").notNull().references(() => importRows.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  proposedAction: text("proposed_action").notNull(),
  status: text("status").notNull().default("pending"),
  payload: jsonb("payload").notNull(),
  duplicateKey: text("duplicate_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
}, (table) => [index("import_proposals_batch_status_index").on(table.batchId, table.status), index("import_proposals_duplicate_index").on(table.duplicateKey)]);

export const importFieldChanges = pgTable("import_field_changes", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").notNull().references(() => importProposals.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  incomingValue: jsonb("incoming_value"),
  existingValue: jsonb("existing_value"),
  changeType: text("change_type").notNull(),
});

export const importReviews = pgTable("import_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposalId: uuid("proposal_id").notNull().references(() => importProposals.id, { onDelete: "cascade" }),
  reviewerUserId: uuid("reviewer_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  decision: text("decision").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importErrors = pgTable("import_errors", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
  sheetName: text("sheet_name"),
  sourceRowNumber: integer("source_row_number"),
  code: text("code").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
