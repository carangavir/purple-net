import { z } from "zod";
export const schoolSchema = z.object({ name: z.string().trim().min(2).max(200), metro: z.string().trim().max(120).optional(), district: z.string().trim().max(200).optional(), uilConference: z.string().trim().max(80).optional(), priorityTier: z.string().trim().max(80).optional() });
export const directorSchema = z.object({ legalName: z.string().trim().min(2).max(200), preferredName: z.string().trim().max(120).optional(), title: z.string().trim().max(160).optional(), schoolId: z.string().uuid(), email: z.string().trim().email().max(254).optional(), phone: z.string().trim().max(64).optional() });
export const normaliseName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
