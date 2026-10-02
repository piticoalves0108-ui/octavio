"use client";

import { useEffect, useId, useState } from "react";
import { mensagens } from "@/content/site";
import { BotaoCotar } from "@/components/motion/BotaoCotar";
import { Revelar } from "@/components/motion/Revelar";
import { IconeWhatsApp } from "@/components/ui/Icones";
import { linkWhatsApp } from "@/lib/contato";
import { aros, formatarMedida, larguras, perfis, quantidades } from "@/lib/medidas";
import { avisar, palco } from "@/lib/palco";
import { medir } from "@/lib/track";

/**
 * 2. ENCONTRE SEU PNEU PELA MEDIDA (parte 2): seletor.
 * O cliente escolhe largura, perfil e aro; o pneu 3D ao lado mostra essa medida
 * gravada no flanco e o botão manda a mensagem pronta para o WhatsApp.
 * Selects nativos: no celular abrem o seletor do sistema, que é o mais rápido.
 */
export function Seletor() {
  const [largura, setLargura] = useState("175");
  const [perfil, setPerfil] = useState("70");
  const [aro, setAro] = useState("14");
  const [qtd, setQtd] = useState<number>(4);
  const [carro, setCarro] = useState("");
  const id = useId();
  const medida = formatarMedida(largura, perfil, aro);

  useEffect(() => {
    palco.medidaEscolhida = medida;
    avisar();
  }, [medida]);

  const mensagem = `Olá! Vim pelo site e quero cotar ${qtd} ${qtd > 1 ? "pneus" : "pneu"} ${medida}.${
    carro.trim() ? ` Carro: ${carro.trim()}.` : ""
  }`;
  const semMedida = linkWhatsApp(mensagens.semMedida);

  const campo =
    "h-14 w-full appearance-none rounded-none border-0 border-b-2 border-faixa/20 bg-transparent pr-8 font-display text-2xl font-bold text-faixa transition-colors focus:border-sinal focus:outline-none";

  return (
    <section id="seletor" data-ato="seletor" aria-labelledby={`${id}-titulo`} className="relative z-10 flex min-h-[130svh] items-start pt-[22svh] md:items-center md:pt-0">
      <div className="grade">
        <Revelar className="col-span-4 md:col-span-6 lg:col-span-5">
          <form
            className="rounded-[28px] border border-linha bg-borracha/85 p-6 backdrop-blur-md md:p-10"
            onSubmit={(e) => e.preventDefault()}
            aria-describedby={`${id}-ajuda`}
          >
            <p className="rotulo mb-3">
              <b>01</b> Monte a sua medida
            </p>
            <h2 id={`${id}-titulo`} className="text-[clamp(1.8rem,3.4vw,2.8rem)]">
              Cote pelo WhatsApp
            </h2>
            <p id={`${id}-ajuda`} className="mt-3 text-cinza">
              Escolha a medida que está no flanco do seu pneu. A mensagem já vai pronta.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {(
                [
                  ["Largura", largura, setLargura, larguras, "mm"],
                  ["Perfil", perfil, setPerfil, perfis, "%"],
                  ["Aro", aro, setAro, aros, "pol."],
                ] as const
              ).map(([rotulo, valor, set, opcoes, unidade]) => (
                <div key={rotulo} className="relative">
                  <label htmlFor={`${id}-${rotulo}`} className="mb-1 block font-display text-xs font-semibold tracking-[0.16em] text-cinza uppercase">
                    {rotulo} <span className="normal-case tracking-normal text-faixa/60">({unidade})</span>
                  </label>
                  <select id={`${id}-${rotulo}`} className={campo} value={valor} onChange={(e) => set(e.target.value)}>
                    {opcoes.map((o) => (
                      <option key={o} value={o} className="bg-borracha text-base">
                        {rotulo === "Aro" ? `R${o}` : o}
                      </option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-1 bottom-5 h-3 w-3 text-sinal" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M1 4l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              ))}
            </div>

            <fieldset className="mt-8">
              <legend className="mb-2 font-display text-xs font-semibold tracking-[0.16em] text-cinza uppercase">Quantos pneus?</legend>
              <div className="flex gap-2">
                {quantidades.map((q) => (
                  <label key={q} className="relative">
                    <input
                      type="radio"
                      name={`${id}-qtd`}
                      value={q}
                      checked={qtd === q}
                      onChange={() => setQtd(q)}
                      className="peer sr-only"
                    />
                    <span className="flex h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border border-faixa/25 px-4 font-display font-bold transition-colors peer-checked:border-sinal peer-checked:bg-sinal peer-checked:text-asfalto peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sinal">
                      {q}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6">
              <label htmlFor={`${id}-carro`} className="mb-1 block font-display text-xs font-semibold tracking-[0.16em] text-cinza uppercase">
                Carro <span className="normal-case tracking-normal text-faixa/60">(opcional)</span>
              </label>
              <input
                id={`${id}-carro`}
                type="text"
                value={carro}
                onChange={(e) => setCarro(e.target.value.slice(0, 60))}
                placeholder="Ex.: modelo e ano"
                autoComplete="off"
                className="h-12 w-full border-0 border-b-2 border-faixa/20 bg-transparent text-lg placeholder:text-faixa/55 focus:border-sinal focus:outline-none"
              />
            </div>

            <div className="mt-8 flex flex-col gap-6 border-t border-linha pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-display text-4xl leading-none font-bold" aria-live="polite">
                <span className="sr-only">Medida escolhida: </span>
                {medida}
              </p>
              <BotaoCotar origem="seletor" mensagem={mensagem} extra={{ medida, quantidade: qtd }}>
                Cotar esta medida
              </BotaoCotar>
            </div>

            <p className="mt-8 text-sm text-cinza">
              Não sabe a medida?{" "}
              <a
                href={semMedida.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => medir("cotar_pneu", { origem: "sem_medida" })}
                className="inline-flex items-center gap-1 font-semibold text-faixa underline decoration-sinal decoration-2 underline-offset-4 hover:text-sinal"
              >
                <IconeWhatsApp className="h-4 w-4" />
                Mande uma foto da lateral do pneu
              </a>
            </p>
          </form>
        </Revelar>
      </div>
    </section>
  );
}
