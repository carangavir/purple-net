# ADR 0002: Immutable import staging before live recruiting records

## Status

Accepted — Phase 2

## Decision

Workbook uploads are persisted as immutable import batches before review. Each batch stores the original file bytes and SHA-256 hash, sheets, source row numbers, cells, display values, formulas, source mappings, proposals, field-change candidates, reviews, and errors.

The importer may create only staging proposals. It may identify in-batch duplicate candidates and split multiple director names, but it must never merge, create, or update live schools/directors automatically. A reviewer’s decision is transactional and audited, but remains a review decision until Phase 3 supplies the live entity model and an explicit apply workflow.

## Consequences

The source workbook remains fully auditable and reproducible. Imports are safe to inspect before any live data exists. Phase 3 must introduce a separate, transactional application service that uses approved proposals and records per-field provenance; it must not bypass this staging history.
