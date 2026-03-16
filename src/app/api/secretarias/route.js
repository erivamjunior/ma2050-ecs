import { NextResponse } from "next/server";
import { createSecretaria, listSecretarias } from "@/lib/registry-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const secretarias = await listSecretarias();
    return NextResponse.json({ secretarias });
  } catch {
    return NextResponse.json({ error: "Falha ao listar secretarias." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const secretaria = await createSecretaria(body || {});
    return NextResponse.json({ secretaria }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao criar secretaria." },
      { status: 400 },
    );
  }
}
