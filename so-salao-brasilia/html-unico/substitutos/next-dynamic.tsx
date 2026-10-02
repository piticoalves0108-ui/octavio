/** Substituto de next/dynamic: React.lazy (o código já está no mesmo arquivo). */
import { lazy, Suspense, type ComponentType } from "react";

type Carregador = () => Promise<unknown>;

export default function dynamic<P extends object>(carregar: Carregador) {
  const Preguicoso = lazy(() =>
    carregar().then((m) => {
      const mod = m as { default?: ComponentType<P> } | ComponentType<P>;
      const componente = typeof mod === "function" ? mod : (mod.default as ComponentType<P>);
      return { default: componente };
    }),
  );
  return function Dinamico(props: P) {
    return (
      <Suspense fallback={null}>
        <Preguicoso {...props} />
      </Suspense>
    );
  };
}
