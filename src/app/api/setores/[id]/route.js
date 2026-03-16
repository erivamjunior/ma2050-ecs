import { NextResponse } from "next/server";
import { deleteSetor, updateSetor } from "@/lib/registry-store";

export const runtime = "nodejs";

export async function PUT(request, context) {
  try {
    const body = await request.json();
    const setor = await updateSetor(context.params.id, body || {});
    return NextResponse.json({ setor });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar subunidade." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request, context) {
  try {
    await deleteSetor(context.params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao excluir subunidade." },
      { status: 400 },
    );
  }
}