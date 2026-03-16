import { NextResponse } from "next/server";
import { createCompany, listCompanies } from "@/lib/companies-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const companies = await listCompanies();
    return NextResponse.json({ companies });
  } catch {
    return NextResponse.json({ error: "Falha ao listar empresas." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const company = await createCompany(body || {});
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao cadastrar empresa." },
      { status: 400 },
    );
  }
}
