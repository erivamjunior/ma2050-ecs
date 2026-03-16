import { NextResponse } from "next/server";
import {
  createFundingSource,
  deleteFundingSource,
  listFundingSources,
  updateFundingSource,
} from "@/lib/funding-sources-store";
import { listProjects } from "@/lib/projects-store";

export const runtime = "nodejs";

function enrichSources(sources, projects) {
  return sources.map((source) => {
    const approvedCents = projects.reduce((sum, project) => {
      const entries = Array.isArray(project.fundingSources) ? project.fundingSources : [];
      const approved = entries
        .filter((entry) => entry.sourceId === source.id)
        .reduce((entrySum, entry) => entrySum + Number(entry.amountCents || 0), 0);
      return sum + approved;
    }, 0);

    const paidCents = projects.reduce((sum, project) => {
      const projectPaid = (project.measurements || []).reduce((measurementSum, measurement) => {
        const payments = Array.isArray(measurement.payments) ? measurement.payments : [];
        return (
          measurementSum +
          payments
            .filter((payment) => payment.sourceId === source.id)
            .reduce((paymentSum, payment) => paymentSum + Number(payment.amountCents || 0), 0)
        );
      }, 0);

      return sum + projectPaid;
    }, 0);

    return {
      ...source,
      approvedCents,
      paidCents,
      usedCents: paidCents,
      availableCents: Math.max(0, Number(source.amountCents || 0) - paidCents),
    };
  });
}

async function getEnrichedSourceById(id) {
  const [sources, projects] = await Promise.all([listFundingSources(), listProjects()]);
  return enrichSources(sources, projects).find((item) => item.id === id) || null;
}

export async function GET() {
  try {
    const [sources, projects] = await Promise.all([listFundingSources(), listProjects()]);
    return NextResponse.json({ sources: enrichSources(sources, projects) });
  } catch {
    return NextResponse.json({ error: "Falha ao listar fontes de recurso." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const source = await createFundingSource(body);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar fonte de recurso." },
      { status: 400 },
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: "Campo obrigatório: id." }, { status: 400 });
    }

    const current = await getEnrichedSourceById(body.id);
    if (!current) {
      return NextResponse.json({ error: "Fonte de recurso não encontrada." }, { status: 404 });
    }

    const nextAmount = Number(body.amountCents);
    if (Number.isFinite(nextAmount) && nextAmount < current.paidCents) {
      return NextResponse.json(
        { error: "O valor total da fonte não pode ser menor que o valor já pago por ela." },
        { status: 400 },
      );
    }

    const source = await updateFundingSource(body.id, body);
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar fonte de recurso." },
      { status: 400 },
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: "Campo obrigatório: id." }, { status: 400 });
    }

    const current = await getEnrichedSourceById(body.id);
    if (!current) {
      return NextResponse.json({ error: "Fonte de recurso não encontrada." }, { status: 404 });
    }

    if (current.approvedCents > 0 || current.paidCents > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir uma fonte já vinculada a projetos ou pagamentos." },
        { status: 400 },
      );
    }

    const deleted = await deleteFundingSource(body.id);
    if (!deleted) {
      return NextResponse.json({ error: "Fonte de recurso não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Falha ao excluir fonte de recurso." }, { status: 500 });
  }
}
