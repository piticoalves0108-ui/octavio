/** No arquivo único tudo já roda no navegador: renderiza direto. */
import type { ReactNode } from "react";

export function HidratarAoVer({ children }: { children: ReactNode; margem?: string }) {
  return <>{children}</>;
}
