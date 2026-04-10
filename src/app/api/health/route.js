import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("GET /api/health failed", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
