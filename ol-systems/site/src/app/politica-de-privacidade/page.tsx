import type { Metadata } from "next";
import { Fill } from "@/components/Fill";
import { Logo } from "@/components/Header";
import { confirmar, site } from "@/config/site";

export const metadata: Metadata = {
  title: `Política de privacidade | ${site.name}`,
  alternates: { canonical: "/politica-de-privacidade/" },
};

// Texto-base. {{CONFIRMAR}}: revisar com o dono (e, se possível, com um advogado) antes de publicar.
export default function Privacidade() {
  const p = "mt-4 leading-relaxed text-muted";
  return (
    <main className="relative z-10 mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <a href="/" aria-label="Voltar para a página inicial">
        <Logo />
      </a>
      <h1 className="mt-14 font-display text-4xl font-bold tracking-tight">Política de privacidade</h1>
      <p className={p}>
        <Fill text={confirmar("revisar este texto com o dono antes de publicar; data da última atualização")} />
      </p>
      <h2 className="mt-10 font-display text-xl font-bold">O que coletamos</h2>
      <p className={p}>
        Esta página não tem formulário. Quando você clica em um botão de contato, abrimos o WhatsApp ou o Instagram e a
        conversa acontece por lá. Para entender de onde vêm as visitas, usamos ferramentas de medição (Google Analytics,
        Meta Pixel e Vercel Analytics), que registram dados de navegação como páginas vistas, cliques nos botões e a origem
        da visita.
      </p>
      <h2 className="mt-10 font-display text-xl font-bold">Para que usamos</h2>
      <p className={p}>Para saber quais anúncios e publicações trazem clientes e melhorar a página. Não vendemos seus dados.</p>
      <h2 className="mt-10 font-display text-xl font-bold">Seus direitos (LGPD)</h2>
      <p className={p}>
        Você pode pedir acesso, correção ou exclusão dos seus dados pelo Instagram @{site.instagram.handle}.{" "}
        <Fill text={confirmar("e-mail ou canal oficial para pedidos de privacidade")} />
      </p>
      <p className="mt-10 text-sm text-dim">
        {site.name}
        {site.cnpj && (
          <>
            {" "}
            · CNPJ <Fill text={site.cnpj} />
          </>
        )}
      </p>
    </main>
  );
}
