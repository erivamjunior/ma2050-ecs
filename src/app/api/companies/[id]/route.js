import { NextResponse } from "next/server";
import { deleteCompany, updateCompany } from "@/lib/companies-store";

export const runtime = "nodejs";

async function getRouteId(context) {
  const params = await context?.params;
  return params?.id || context?.params?.id || "";
}

export async function PUT(request, context) {
  try {
    const body = await request.json();
    const company = await updateCompany(await getRouteId(context), body || {});
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar empresa." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request, context) {
  try {
    await deleteCompany(await getRouteId(context));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao excluir empresa." },
      { status: 400 },
    );
  }
}
