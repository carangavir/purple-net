import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/require-user";
import { stageImport } from "@/server/imports/service";

export const runtime = "nodejs";

function safeImportError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code.slice(0, 32) : undefined;
  const message = error instanceof Error ? error.message : "Unknown import error";
  return {
    code,
    message: message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted database URL]")
      .replace(/(password|token|secret)\s*=\s*\S+/gi, "$1=[redacted]")
      .slice(0, 500),
  };
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return redirectTo(request, "/imports?error=stage_failed");
    const result = await stageImport({ createdByUserId: user.id, filename: file.name, mimeType: file.type, contents: Buffer.from(await file.arrayBuffer()) });
    return redirectTo(request, `/imports/${result.batchId}`);
  } catch (error) {
    console.error("import.stage.failed", safeImportError(error));
    return redirectTo(request, "/imports?error=stage_failed");
  }
}
