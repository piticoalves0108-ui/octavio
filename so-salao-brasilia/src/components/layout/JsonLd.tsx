import { jsonLd } from "@/lib/schema";

export function JsonLd({ dados }: { dados: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dados) }} />;
}
