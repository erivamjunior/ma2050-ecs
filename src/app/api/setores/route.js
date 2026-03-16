import { NextResponse } from "next/server";
import { createSetor, listSetores } from "@/lib/registry-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const setores = await listSetores();
    return NextResponse.json({ setores });
  } catch {
    return NextResponse.json({ error: "Falha ao listar setores." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const setor = await createSetor(body || {});
    return NextResponse.json({ setor }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao criar setor." },
      { status: 400 },
    );
  }
}
