import { NextResponse } from "next/server";
import { deleteSecretaria, updateSecretaria } from "@/lib/registry-store";

export const runtime = "nodejs";

export async function PUT(request, context) {
  try {
    const body = await request.json();
    const secretaria = await updateSecretaria(context.params.id, body || {});
    return NextResponse.json({ secretaria });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar secretaria." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request, context) {
  try {
    await deleteSecretaria(context.params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao excluir secretaria." },
      { status: 400 },
    );
  }
}