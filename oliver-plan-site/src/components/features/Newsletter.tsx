"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inscrição na newsletter (POST /api/newsletter). */
export function Newsletter({ dark }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setStatus("error");
      setMessage("Digite um e-mail válido.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error();
      setStatus("ok");
      setMessage("Inscrição confirmada. O próximo caderno de inspirações chega no seu e-mail.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Não foi possível inscrever agora. Tente novamente em instantes.");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="newsletter-email" className="sr-only">
        Seu e-mail
      </label>
      <div className={cn("flex items-center gap-3 border-b pb-3 transition-colors focus-within:border-wood", dark ? "border-linen/25" : "border-graphite/25")}>
        <input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-invalid={status === "error"}
          aria-describedby="newsletter-msg"
          className={cn("min-w-0 flex-1 bg-transparent py-2 font-display text-2xl font-light outline-none", dark ? "placeholder:text-linen/35" : "placeholder:text-graphite/30")}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Inscrever"
          className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors", dark ? "bg-linen text-graphite hover:bg-wood-light" : "bg-graphite text-linen hover:bg-wood")}
        >
          {status === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : status === "ok" ? <Check className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </button>
      </div>
      <p id="newsletter-msg" aria-live="polite" className={cn("mt-3 min-h-5 text-sm", status === "error" ? "text-terracotta" : dark ? "text-concrete" : "text-stone")}>
        {message}
      </p>
    </form>
  );
}
