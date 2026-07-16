# ADR 0003: Controlled live school and director records

## Status

Accepted — Phase 3

Live schools and directors remain separate from import staging. An approved proposal can create a record only through an explicit transaction; it never merges a possible match. Directors keep separate employment history, so a school change does not erase relationship history. Archive/restore is preferred to deletion, and imported fields retain a link to their source proposal.
