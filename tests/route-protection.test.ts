import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
describe("route protection", () => {
  it("redirects a visitor without a session to login", () => { const response = middleware(new NextRequest("http://localhost:3000/dashboard")); expect(response.headers.get("location")).toBe("http://localhost:3000/login"); });
  it("redirects a signed-in visitor away from login", () => { const request = new NextRequest("http://localhost:3000/login", { headers: { cookie: "purple_net_session=token" } }); expect(middleware(request).headers.get("location")).toBe("http://localhost:3000/dashboard"); });
});
