import { NextResponse } from "next/server";

export function apiJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function databaseUnavailable() {
  return apiJson({ error: "Database unavailable" }, 503);
}
