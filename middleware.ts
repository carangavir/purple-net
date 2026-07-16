import { NextResponse, type NextRequest } from "next/server";
const SESSION_COOKIE = "purple_net_session";
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (path === "/login" && hasSession) return NextResponse.redirect(new URL("/dashboard", request.url));
  if (path !== "/login" && !hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/", "/dashboard", "/prospects", "/schools", "/directors", "/visits", "/campaigns", "/tasks", "/reports", "/imports", "/templates", "/settings", "/login"] };
