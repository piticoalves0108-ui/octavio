import { NextResponse } from "next/server";

/**
 * Recebe o pedido de orçamento do formulário.
 * Se LEADS_WEBHOOK_URL estiver configurada (Zapier, Make, n8n, CRM...), repassa o lead para lá.
 * O envio principal ao cliente acontece pelo WhatsApp/e-mail no navegador; isto é o registro.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  // Campo armadilha preenchido = robô. Responde ok sem registrar.
  if (typeof body.empresa === "string" && body.empresa.trim()) return NextResponse.json({ ok: true });

  const nome = String(body.nome ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").replace(/\D/g, "");
  if (nome.length < 2 || whatsapp.length < 10 || nome.length > 120) {
    return NextResponse.json({ ok: false, error: "Nome e WhatsApp são obrigatórios" }, { status: 422 });
  }

  const lead = {
    recebidoEm: new Date().toISOString(),
    nome,
    whatsapp,
    email: String(body.email ?? "").slice(0, 160),
    cidade: String(body.cidade ?? "").slice(0, 160),
    ambientes: Array.isArray(body.ambientes) ? body.ambientes.slice(0, 10).map(String) : [],
    estilo: String(body.estilo ?? ""),
    metragem: Number(body.metragem) || null,
    orcamento: String(body.orcamento ?? ""),
    prazo: String(body.prazo ?? ""),
    fase: String(body.fase ?? ""),
    arquiteto: String(body.arquiteto ?? ""),
    preferencia: String(body.preferencia ?? ""),
    referencia: String(body.referencia ?? ""),
    mensagem: String(body.mensagem ?? "").slice(0, 2000),
    canal: String(body.canal ?? ""),
  };

  const hook = process.env.LEADS_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
    } catch (err) {
      console.error("[orcamento] falha ao repassar o lead", err);
    }
  } else {
    console.info("[orcamento] novo lead (configure LEADS_WEBHOOK_URL para receber em um CRM):", lead);
  }

  return NextResponse.json({ ok: true });
}
