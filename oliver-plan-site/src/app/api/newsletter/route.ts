import { NextResponse } from "next/server";

/** Inscrição na newsletter. Repassa para NEWSLETTER_WEBHOOK_URL quando configurada. */
export async function POST(req: Request) {
  let email = "";
  try {
    email = String((await req.json()).email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) {
    return NextResponse.json({ ok: false, error: "E-mail inválido" }, { status: 422 });
  }
  const hook = process.env.NEWSLETTER_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, origem: "site", em: new Date().toISOString() }) });
    } catch (err) {
      console.error("[newsletter] falha ao repassar", err);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
  } else {
    console.info("[newsletter] nova inscrição:", email);
  }
  return NextResponse.json({ ok: true });
}
