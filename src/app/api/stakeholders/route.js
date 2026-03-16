import { NextResponse } from "next/server";
import { createStakeholder, listStakeholdersEnriched } from "@/lib/registry-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stakeholders = await listStakeholdersEnriched();
    return NextResponse.json({ stakeholders });
  } catch {
    return NextResponse.json({ error: "Falha ao listar stakeholders." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const stakeholder = await createStakeholder(body || {});
    return NextResponse.json({ stakeholder }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao criar stakeholder." },
      { status: 400 },
    );
  }
}
