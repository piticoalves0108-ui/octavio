import { Moldura } from "@/components/layout/Moldura";
import { JsonLd } from "@/components/layout/JsonLd";
import { schemaLoja } from "@/lib/schema";

/** Layout das páginas públicas (a rota interna /captura fica de fora). */
export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd dados={schemaLoja()} />
      <Moldura>{children}</Moldura>
    </>
  );
}
