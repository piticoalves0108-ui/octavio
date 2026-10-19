import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappLink } from "@/lib/whatsapp";

// Sem canonical: a 404 não deve apontar para nenhuma página (o layout não declara um)
export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="container-x flex min-h-[80svh] flex-col items-start justify-center pt-32 pb-20">
      <p className="eyebrow mb-6 text-muted">Erro 404</p>
      <h1 className="display-lg max-w-3xl text-balance">
        Essa página <span className="serif-accent text-wine">lascou</span>.
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">Mas a gente retoca rapidinho. Volte para o início ou fale com a Lumi pelo WhatsApp.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button href="/" variant="wine" size="lg">
          Voltar ao início
        </Button>
        <Button href={whatsappLink("Olá, Lumi! Gostaria de agendar um horário.")} external variant="outline" size="lg" arrow={false} icon={<WhatsAppIcon className="h-5 w-5" />}>
          Falar no WhatsApp
        </Button>
      </div>
    </section>
  );
}
