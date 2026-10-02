"use client";

/**
 * Configurador completo: modelo, estofado (tecido + cor), acabamento e dados do projeto.
 * O botão "Pedir orçamento deste modelo" abre o WhatsApp com tudo escrito na mensagem,
 * inclusive um link que reabre esta mesma configuração.
 */
import { useEffect, useId, useMemo, useState } from "react";
import { acabamentoPorId, avisoCores, corPorId, linhaPorModelo, tecidoPorId } from "@/content/catalogo";
import { secaoConfigurador } from "@/content/textos";
import { configuracaoDosParams, paramsDaConfiguracao, useConfiguracao } from "@/lib/configuracao";
import { linkWhatsapp, mensagemDoConfigurador, momentos, tiposDeEspaco } from "@/lib/whatsapp";
import { medir } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { classesBotao } from "@/components/ui/botao";
import { IconeCheck, IconeCopiar, IconeWhatsapp } from "@/components/ui/icones";
import { Magnetico } from "@/components/ui/Magnetico";
import { Texto } from "@/components/ui/Texto";
import { SeletorAcabamento, SeletorCor, SeletorModelo, SeletorTecido } from "./Seletores";
import { VisorConfigurador } from "./VisorConfigurador";

type Props = {
  /** Na página /configurador, lê e escreve a escolha na URL (link compartilhável). */
  sincronizarUrl?: boolean;
  className?: string;
};

export function Configurador({ sincronizarUrl = false, className }: Props) {
  const c = useConfiguracao();
  const id = useId();
  const [copiado, setCopiado] = useState(false);
  const [origem, setOrigem] = useState("");

  useEffect(() => setOrigem(window.location.origin), []);

  // Lê a configuração da URL uma vez (ex.: /configurador?modelo=lavatorio&cor=nude).
  useEffect(() => {
    if (!sincronizarUrl) return;
    const parcial = configuracaoDosParams(new URLSearchParams(window.location.search));
    if (Object.keys(parcial).length) useConfiguracao.getState().definir(parcial);
  }, [sincronizarUrl]);

  const params = paramsDaConfiguracao(c);

  // Mantém a URL atualizada (sem criar histórico a cada clique).
  useEffect(() => {
    if (!sincronizarUrl) return;
    const t = window.setTimeout(() => history.replaceState(history.state, "", `/configurador?${params}`), 250);
    return () => window.clearTimeout(t);
  }, [params, sincronizarUrl]);

  const linkConfiguracao = origem ? `${origem}/configurador?${params}` : undefined;
  const mensagem = useMemo(() => mensagemDoConfigurador({ ...c, linkConfiguracao }), [c, linkConfiguracao]);
  const linha = linhaPorModelo(c.modelo);

  const copiar = async () => {
    if (!linkConfiguracao) return;
    try {
      await navigator.clipboard.writeText(linkConfiguracao);
      setCopiado(true);
      medir("configuracao_copiada", { modelo: c.modelo });
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência: ignora.
    }
  };

  return (
    <div className={cn("grid gap-8 lg:grid-cols-12 lg:gap-10", className)}>
      <div className="lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          <VisorConfigurador className="aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[4/5] lg:max-h-[calc(100svh-8rem)]" />
          <p className="mt-4 text-sm text-nevoa">
            O estofado vai em: {linha.ondeVaiOEstofado}. O acabamento vai em: {linha.ondeVaiOAcabamento}.
          </p>
        </div>
      </div>

      <div className="lg:col-span-5">
        <ol className="space-y-9">
          <Passo numero="01" titulo="Escolha o modelo">
            <SeletorModelo nome={`${id}-modelo`} valor={c.modelo} aoMudar={(v) => c.definir({ modelo: v })} />
          </Passo>

          <Passo numero="02" titulo="Escolha o estofado">
            <div className="space-y-6">
              <SeletorTecido
                nome={`${id}-tecido`}
                valor={c.tecido}
                aoMudar={(v) => c.definir({ tecido: v })}
                tema="escuro"
                legenda="Tecido"
              />
              <p className="-mt-3 text-sm text-nevoa">{tecidoPorId(c.tecido).descricao}</p>
              <SeletorCor nome={`${id}-cor`} valor={c.cor} aoMudar={(v) => c.definir({ cor: v })} tema="escuro" />
              <p className="text-xs leading-relaxed text-nevoa">
                <Texto>{avisoCores}</Texto>
              </p>
            </div>
          </Passo>

          <Passo numero="03" titulo="Escolha o acabamento">
            <SeletorAcabamento
              nome={`${id}-acabamento`}
              valor={c.acabamento}
              aoMudar={(v) => c.definir({ acabamento: v })}
              tema="escuro"
            />
          </Passo>

          <Passo numero="04" titulo="Conte sobre o seu projeto">
            <div className="space-y-6">
              <div>
                <label htmlFor={`${id}-quantidade`} className="sobretitulo mb-3 block text-champanhe">
                  Quantidade
                </label>
                <div className="inline-flex items-center rounded-full border border-gelo/20">
                  <button
                    type="button"
                    onClick={() => c.definir({ quantidade: Math.max(1, c.quantidade - 1) })}
                    className="grid size-12 place-items-center rounded-full text-xl hover:bg-gelo/10"
                    aria-label="Diminuir quantidade"
                  >
                    −
                  </button>
                  <input
                    id={`${id}-quantidade`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    value={c.quantidade}
                    onChange={(e) => c.definir({ quantidade: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })}
                    className="w-14 bg-transparent text-center text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => c.definir({ quantidade: Math.min(99, c.quantidade + 1) })}
                    className="grid size-12 place-items-center rounded-full text-xl hover:bg-gelo/10"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
              </div>

              <Chips
                legenda="Tipo de espaço"
                nome={`${id}-espaco`}
                opcoes={tiposDeEspaco}
                valor={c.espaco}
                aoMudar={(v) => c.definir({ espaco: v })}
              />
              <Chips
                legenda="Momento"
                nome={`${id}-momento`}
                opcoes={momentos}
                valor={c.momento}
                aoMudar={(v) => c.definir({ momento: v })}
              />

              <div>
                <label htmlFor={`${id}-nome`} className="sobretitulo mb-3 block text-champanhe">
                  Seu nome <span className="normal-case tracking-normal text-nevoa">(opcional)</span>
                </label>
                <input
                  id={`${id}-nome`}
                  type="text"
                  autoComplete="given-name"
                  value={c.nome}
                  onChange={(e) => c.definir({ nome: e.target.value.slice(0, 60) })}
                  className="h-12 w-full rounded-xl border border-gelo/20 bg-gelo/5 px-4 text-gelo placeholder:text-nevoa/70 focus:border-rose"
                  placeholder="Como podemos te chamar?"
                />
              </div>
            </div>
          </Passo>
        </ol>

        <section aria-labelledby={`${id}-resumo`} className="mt-10 rounded-[1.5rem] bg-gelo p-6 text-tinta md:p-8">
          <h3 id={`${id}-resumo`} className="text-[1.9rem]">
            Seu pedido
          </h3>
          <dl className="mt-5 divide-y divide-grafite/10 text-[0.95rem]">
            <LinhaResumo rotulo="Modelo" valor={linha.nomeDoModelo} />
            <LinhaResumo
              rotulo="Estofado"
              valor={`${tecidoPorId(c.tecido).nome}, ${corPorId(c.cor).nome.toLowerCase()}`}
            />
            <LinhaResumo rotulo="Acabamento" valor={acabamentoPorId(c.acabamento).nome} />
            <LinhaResumo rotulo="Quantidade" valor={String(c.quantidade)} />
          </dl>
          <div className="mt-7 flex flex-col gap-3">
            <Magnetico className="flex">
              <a
                href={linkWhatsapp(mensagem)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  medir("orcamento_configurador", {
                    modelo: c.modelo,
                    tecido: c.tecido,
                    cor: c.cor,
                    acabamento: c.acabamento,
                    quantidade: c.quantidade,
                  })
                }
                className={classesBotao("primario", "w-full")}
              >
                <IconeWhatsapp className="size-5" />
                {secaoConfigurador.botaoOrcamento}
                <span className="sr-only"> (abre o WhatsApp em nova aba)</span>
              </a>
            </Magnetico>
            <button type="button" onClick={copiar} className={classesBotao("secundario", "w-full")}>
              {copiado ? <IconeCheck className="size-4" /> : <IconeCopiar className="size-4" />}
              {copiado ? secaoConfigurador.copiado : secaoConfigurador.botaoCopiar}
            </button>
            <p className="sr-only" aria-live="polite">
              {copiado ? secaoConfigurador.copiado : ""}
            </p>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-tinta-suave">
            Entrega em até 7 dias úteis. Parcelamento em até 12x sem juros no cartão. Você confirma tudo na conversa,
            antes de fechar.
          </p>
        </section>
      </div>
    </div>
  );
}

function Passo({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <li className="border-t border-gelo/15 pt-7">
      <h3 className="mb-6 flex items-baseline gap-4 font-serif text-[1.65rem] leading-none text-gelo">
        <span className="font-sans text-sm font-medium tracking-[0.2em] text-champanhe">{numero}</span>
        {titulo}
      </h3>
      {children}
    </li>
  );
}

function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="text-tinta-suave">{rotulo}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}

function Chips({
  legenda,
  nome,
  opcoes,
  valor,
  aoMudar,
}: {
  legenda: string;
  nome: string;
  opcoes: readonly { id: string; nome: string }[];
  valor: string;
  aoMudar: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sobretitulo mb-3 text-champanhe">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <label key={o.id} className="relative cursor-pointer">
            <input
              type="radio"
              name={nome}
              value={o.id}
              checked={valor === o.id}
              onChange={() => aoMudar(o.id)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-11 items-center rounded-full border border-gelo/20 px-4 text-sm text-nevoa transition-colors",
                "hover:border-gelo/50 peer-checked:border-rose peer-checked:bg-rose peer-checked:text-grafite",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rose",
              )}
            >
              {o.nome}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
