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

export const metros = pgTable("metros", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("metros_normalized_name_unique").on(table.normalizedName)]);
export const districts = pgTable("districts", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("districts_normalized_name_unique").on(table.normalizedName)]);
export const schools = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), metroId: uuid("metro_id").references(() => metros.id, { onDelete: "set null" }), districtId: uuid("district_id").references(() => districts.id, { onDelete: "set null" }), uilConference: text("uil_conference"), priorityTier: text("priority_tier"), archivedAt: timestamp("archived_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("schools_name_index").on(table.normalizedName), index("schools_active_index").on(table.archivedAt)]);
export const schoolAddresses = pgTable("school_addresses", { id: uuid("id").defaultRandom().primaryKey(), schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }), line1: text("line1").notNull(), city: text("city"), postalCode: text("postal_code"), isPrimary: boolean("is_primary").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const schoolContactMethods = pgTable("school_contact_methods", { id: uuid("id").defaultRandom().primaryKey(), schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }), type: text("type").notNull(), value: text("value").notNull(), isPrimary: boolean("is_primary").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const tags = pgTable("tags", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), normalizedName: text("normalized_name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("tags_normalized_name_unique").on(table.normalizedName)]);
export const schoolTags = pgTable("school_tags", { schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }), tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("school_tags_unique").on(table.schoolId, table.tagId)]);
export const schoolVerifications = pgTable("school_verifications", { id: uuid("id").defaultRandom().primaryKey(), schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }), status: text("status").notNull(), confidence: text("confidence"), source: text("source"), verifiedAt: timestamp("verified_at", { withTimezone: true }), reviewDueAt: timestamp("review_due_at", { withTimezone: true }), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const directors = pgTable("directors", { id: uuid("id").defaultRandom().primaryKey(), legalName: text("legal_name").notNull(), normalizedName: text("normalized_name").notNull(), preferredName: text("preferred_name"), currentTitle: text("current_title"), archivedAt: timestamp("archived_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("directors_name_index").on(table.normalizedName), index("directors_active_index").on(table.archivedAt)]);
export const directorEmployments = pgTable("director_employments", { id: uuid("id").defaultRandom().primaryKey(), directorId: uuid("director_id").notNull().references(() => directors.id, { onDelete: "restrict" }), schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "restrict" }), title: text("title"), startDate: timestamp("start_date", { withTimezone: true }), endDate: timestamp("end_date", { withTimezone: true }), isCurrent: boolean("is_current").notNull().default(true), verificationStatus: text("verification_status"), source: text("source"), lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }), confidence: text("confidence"), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("director_employment_school_index").on(table.schoolId), index("director_employment_director_index").on(table.directorId)]);
export const directorContactMethods = pgTable("director_contact_methods", { id: uuid("id").defaultRandom().primaryKey(), directorId: uuid("director_id").notNull().references(() => directors.id, { onDelete: "cascade" }), type: text("type").notNull(), value: text("value").notNull(), isPrimary: boolean("is_primary").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const directorVerifications = pgTable("director_verifications", { id: uuid("id").defaultRandom().primaryKey(), directorId: uuid("director_id").notNull().references(() => directors.id, { onDelete: "cascade" }), status: text("status").notNull(), confidence: text("confidence"), source: text("source"), verifiedAt: timestamp("verified_at", { withTimezone: true }), reviewDueAt: timestamp("review_due_at", { withTimezone: true }), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const directorInterests = pgTable("director_interests", { id: uuid("id").defaultRandom().primaryKey(), directorId: uuid("director_id").notNull().references(() => directors.id, { onDelete: "cascade" }), status: text("status").notNull(), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const directorOpportunities = pgTable("director_opportunities", { id: uuid("id").defaultRandom().primaryKey(), directorId: uuid("director_id").notNull().references(() => directors.id, { onDelete: "cascade" }), type: text("type").notNull(), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const importFieldProvenance = pgTable("import_field_provenance", { id: uuid("id").defaultRandom().primaryKey(), proposalId: uuid("proposal_id").notNull().references(() => importProposals.id, { onDelete: "restrict" }), entityType: text("entity_type").notNull(), entityId: uuid("entity_id").notNull(), fieldName: text("field_name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("import_field_provenance_unique").on(table.proposalId, table.entityType, table.entityId, table.fieldName)]);

export const recruitingCycles = pgTable("recruiting_cycles", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), entryTerm: text("entry_term").notNull(), isActive: boolean("is_active").notNull().default(true), archivedAt: timestamp("archived_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("recruiting_cycles_entry_term_unique").on(table.entryTerm)]);
export const prospects = pgTable("prospects", { id: uuid("id").defaultRandom().primaryKey(), fullName: text("full_name").notNull(), normalizedName: text("normalized_name").notNull(), preferredName: text("preferred_name"), schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }), recruitingCycleId: uuid("recruiting_cycle_id").notNull().references(() => recruitingCycles.id, { onDelete: "restrict" }), source: text("source").notNull(), stage: text("stage").notNull(), interestLevel: text("interest_level").notNull().default("cool"), graduationYear: integer("graduation_year"), isTransfer: boolean("is_transfer").notNull().default(false), closedOutcome: text("closed_outcome"), archivedAt: timestamp("archived_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("prospects_cycle_stage_index").on(table.recruitingCycleId, table.stage), index("prospects_name_index").on(table.normalizedName)]);
export const prospectContacts = pgTable("prospect_contacts", { id: uuid("id").defaultRandom().primaryKey(), prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }), type: text("type").notNull(), value: text("value").notNull(), isPrimary: boolean("is_primary").notNull().default(false), provenance: text("provenance"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const prospectStageHistory = pgTable("prospect_stage_history", { id: uuid("id").defaultRandom().primaryKey(), prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }), stage: text("stage").notNull(), note: text("note"), changedByUserId: uuid("changed_by_user_id").references(() => users.id, { onDelete: "set null" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const prospectInterestHistory = pgTable("prospect_interest_history", { id: uuid("id").defaultRandom().primaryKey(), prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }), interestLevel: text("interest_level").notNull(), note: text("note"), changedByUserId: uuid("changed_by_user_id").references(() => users.id, { onDelete: "set null" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const prospectScoreSnapshots = pgTable("prospect_score_snapshots", { id: uuid("id").defaultRandom().primaryKey(), prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }), totalScore: integer("total_score").notNull(), missingData: jsonb("missing_data").notNull().default([]), overrideNote: text("override_note"), calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow() });
export const prospectScoreFactors = pgTable("prospect_score_factors", { id: uuid("id").defaultRandom().primaryKey(), snapshotId: uuid("snapshot_id").notNull().references(() => prospectScoreSnapshots.id, { onDelete: "cascade" }), factor: text("factor").notNull(), contribution: integer("contribution").notNull(), rationale: text("rationale").notNull() });
export const duplicateCandidates = pgTable("duplicate_candidates", { id: uuid("id").defaultRandom().primaryKey(), prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }), candidateProspectId: uuid("candidate_prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }), reason: text("reason").notNull(), status: text("status").notNull().default("pending"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("duplicate_candidate_pair_unique").on(table.prospectId, table.candidateProspectId)]);
export const duplicateReviews = pgTable("duplicate_reviews", { id: uuid("id").defaultRandom().primaryKey(), candidateId: uuid("candidate_id").notNull().references(() => duplicateCandidates.id, { onDelete: "cascade" }), reviewerUserId: uuid("reviewer_user_id").notNull().references(() => users.id, { onDelete: "restrict" }), decision: text("decision").notNull(), note: text("note"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });

export const tasks = pgTable("tasks", { id: uuid("id").defaultRandom().primaryKey(), title: text("title").notNull(), notes: text("notes"), dueAt: timestamp("due_at", { withTimezone: true }), reminderAt: timestamp("reminder_at", { withTimezone: true }), priority: text("priority").notNull().default("normal"), status: text("status").notNull().default("open"), source: text("source").notNull().default("manual"), prospectId: uuid("prospect_id").references(() => prospects.id, { onDelete: "set null" }), schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }), directorId: uuid("director_id").references(() => directors.id, { onDelete: "set null" }), completedAt: timestamp("completed_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("tasks_status_due_index").on(table.status, table.dueAt), index("tasks_priority_index").on(table.priority)]);
export const taskRecurrences = pgTable("task_recurrences", { id: uuid("id").defaultRandom().primaryKey(), taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }), rule: text("rule").notNull(), nextRunAt: timestamp("next_run_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const automationRules = pgTable("automation_rules", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), trigger: text("trigger").notNull(), isEnabled: boolean("is_enabled").notNull().default(false), configuration: jsonb("configuration").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const automationRuns = pgTable("automation_runs", { id: uuid("id").defaultRandom().primaryKey(), ruleId: uuid("rule_id").notNull().references(() => automationRules.id, { onDelete: "cascade" }), status: text("status").notNull(), details: jsonb("details").notNull().default({}), ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow() });

export const trips = pgTable("trips", { id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), startsAt: timestamp("starts_at", { withTimezone: true }), endsAt: timestamp("ends_at", { withTimezone: true }), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const tripStops = pgTable("trip_stops", { id: uuid("id").defaultRandom().primaryKey(), tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }), schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }), stopOrder: integer("stop_order").notNull(), notes: text("notes") }, (table) => [uniqueIndex("trip_stops_order_unique").on(table.tripId, table.stopOrder)]);
export const visits = pgTable("visits", { id: uuid("id").defaultRandom().primaryKey(), tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }), title: text("title").notNull(), type: text("type").notNull(), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), location: text("location"), goals: text("goals"), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("visits_starts_at_index").on(table.startsAt)]);
export const visitSchools = pgTable("visit_schools", { visitId: uuid("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }), schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "restrict" }) }, (table) => [uniqueIndex("visit_schools_unique").on(table.visitId, table.schoolId)]);
export const visitDirectors = pgTable("visit_directors", { visitId: uuid("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }), directorId: uuid("director_id").notNull().references(() => directors.id, { onDelete: "restrict" }) }, (table) => [uniqueIndex("visit_directors_unique").on(table.visitId, table.directorId)]);
export const visitProspects = pgTable("visit_prospects", { visitId: uuid("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }), prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }) }, (table) => [uniqueIndex("visit_prospects_unique").on(table.visitId, table.prospectId)]);
export const visitOutcomes = pgTable("visit_outcomes", { id: uuid("id").defaultRandom().primaryKey(), visitId: uuid("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }), outcome: text("outcome").notNull(), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const mileageEntries = pgTable("mileage_entries", { id: uuid("id").defaultRandom().primaryKey(), tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }), visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }), miles: integer("miles").notNull(), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const expenses = pgTable("expenses", { id: uuid("id").defaultRandom().primaryKey(), tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }), visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }), amountCents: integer("amount_cents").notNull(), category: text("category").notNull(), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });

export type User = typeof users.$inferSelect;
