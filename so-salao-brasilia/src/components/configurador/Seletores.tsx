"use client";

/**
 * Seletores acessíveis (radio buttons nativos, navegáveis por setas do teclado)
 * para tecido, cor do estofado, acabamento e modelo.
 */
import {
  acabamentos,
  cores,
  linhas,
  tecidos,
  type AcabamentoId,
  type ModeloId,
  type TecidoId,
} from "@/content/catalogo";
import { cn } from "@/lib/cn";

type Tema = "claro" | "escuro";

const anel = (tema: Tema) =>
  tema === "escuro"
    ? "peer-checked:ring-rose peer-focus-visible:outline-rose ring-offset-grafite"
    : "peer-checked:ring-grafite peer-focus-visible:outline-grafite ring-offset-gelo";

export function SeletorTecido({
  valor,
  aoMudar,
  nome,
  tema = "claro",
  legenda = "Estofado",
  className,
}: {
  valor: TecidoId;
  aoMudar: (v: TecidoId) => void;
  nome: string;
  tema?: Tema;
  legenda?: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className={cn("sobretitulo mb-3", tema === "escuro" ? "text-champanhe" : "text-champanhe-texto")}>
        {legenda}
      </legend>
      <div className={cn("inline-flex rounded-full p-1", tema === "escuro" ? "bg-gelo/10" : "bg-grafite/[0.06]")}>
        {tecidos.map((t) => (
          <label key={t.id} className="relative cursor-pointer">
            <input
              type="radio"
              name={nome}
              value={t.id}
              checked={valor === t.id}
              onChange={() => aoMudar(t.id)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "block min-h-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
                tema === "escuro"
                  ? "text-nevoa peer-checked:bg-rose peer-checked:text-grafite peer-focus-visible:outline-rose"
                  : "text-tinta-suave peer-checked:bg-grafite peer-checked:text-gelo peer-focus-visible:outline-grafite",
              )}
            >
              {t.nome}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SeletorCor({
  valor,
  aoMudar,
  nome,
  tema = "claro",
  legenda = "Cor do estofado",
  mostrarNome = true,
  className,
  grade = "flex flex-wrap gap-2.5",
}: {
  valor: string;
  aoMudar: (v: string) => void;
  nome: string;
  tema?: Tema;
  legenda?: string;
  mostrarNome?: boolean;
  className?: string;
  grade?: string;
}) {
  const atual = cores.find((c) => c.id === valor);
  return (
    <fieldset className={className}>
      <legend className={cn("sobretitulo mb-3", tema === "escuro" ? "text-champanhe" : "text-champanhe-texto")}>
        {legenda}
        {mostrarNome && atual && (
          <span className={cn("ml-2 normal-case tracking-normal", tema === "escuro" ? "text-gelo" : "text-tinta")}>
            · {atual.nome}
          </span>
        )}
      </legend>
      <div className={grade}>
        {cores.map((c) => (
          <label key={c.id} className="relative cursor-pointer" title={c.nome}>
            <input
              type="radio"
              name={nome}
              value={c.id}
              checked={valor === c.id}
              onChange={() => aoMudar(c.id)}
              className="peer sr-only"
              aria-label={c.nome}
            />
            <span
              aria-hidden
              className={cn(
                "block size-9 rounded-full ring-offset-2 transition-[box-shadow,transform] duration-300 peer-checked:ring-2 hover:scale-110",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4",
                "shadow-[inset_0_-6px_10px_rgba(0,0,0,0.18),inset_0_4px_8px_rgba(255,255,255,0.35)]",
                anel(tema),
              )}
              style={{ backgroundColor: c.hex }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SeletorAcabamento({
  valor,
  aoMudar,
  nome,
  tema = "claro",
  legenda = "Acabamento da base",
  mostrarNome = true,
  className,
  grade = "flex flex-wrap gap-2.5",
}: {
  valor: AcabamentoId;
  aoMudar: (v: AcabamentoId) => void;
  nome: string;
  tema?: Tema;
  legenda?: string;
  mostrarNome?: boolean;
  className?: string;
  grade?: string;
}) {
  const atual = acabamentos.find((a) => a.id === valor);
  return (
    <fieldset className={className}>
      <legend className={cn("sobretitulo mb-3", tema === "escuro" ? "text-champanhe" : "text-champanhe-texto")}>
        {legenda}
        {mostrarNome && atual && (
          <span className={cn("ml-2 normal-case tracking-normal", tema === "escuro" ? "text-gelo" : "text-tinta")}>
            · {atual.nome}
          </span>
        )}
      </legend>
      <div className={grade}>
        {acabamentos.map((a) => (
          <label key={a.id} className="relative cursor-pointer" title={a.nome}>
            <input
              type="radio"
              name={nome}
              value={a.id}
              checked={valor === a.id}
              onChange={() => aoMudar(a.id)}
              className="peer sr-only"
              aria-label={a.nome}
            />
            <span
              aria-hidden
              className={cn(
                "block size-9 rounded-full ring-offset-2 transition-[box-shadow,transform] duration-300 peer-checked:ring-2 hover:scale-110",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4",
                anel(tema),
              )}
              style={{ background: a.amostra }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SeletorModelo({
  valor,
  aoMudar,
  nome,
  className,
}: {
  valor: ModeloId;
  aoMudar: (v: ModeloId) => void;
  nome: string;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="sobretitulo mb-3 text-champanhe">Modelo</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {linhas.map((l) => (
          <label key={l.modelo} className="relative cursor-pointer">
            <input
              type="radio"
              name={nome}
              value={l.modelo}
              checked={valor === l.modelo}
              onChange={() => aoMudar(l.modelo)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-12 items-center rounded-xl border border-gelo/15 px-3.5 py-2.5 text-sm leading-tight text-nevoa transition-colors duration-300",
                "hover:border-gelo/40 peer-checked:border-rose peer-checked:bg-rose/10 peer-checked:text-gelo",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rose",
              )}
            >
              {l.nomeDoModelo}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
