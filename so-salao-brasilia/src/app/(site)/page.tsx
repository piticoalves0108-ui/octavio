import { Intro } from "@/components/layout/Intro";
import { HidratarAoVer } from "@/components/layout/HidratarAoVer";
import { JsonLd } from "@/components/layout/JsonLd";
import { Hero } from "@/components/secoes/Hero";
import { Linhas } from "@/components/secoes/Linhas";
import { SecaoConfigurador } from "@/components/secoes/SecaoConfigurador";
import { MonteSeuSalao } from "@/components/secoes/MonteSeuSalao";
import { ComoFunciona } from "@/components/secoes/ComoFunciona";
import { Galeria } from "@/components/secoes/Galeria";
import { Showroom } from "@/components/secoes/Showroom";
import { Duvidas } from "@/components/secoes/Duvidas";
import { schemaPerguntas } from "@/lib/schema";

/**
 * Home: 1. Hero com a cadeira 3D · 2. Linhas de produto · 3. Configurador ·
 * Monte seu salão · 4. Como funciona · 5. Salões que já montamos ·
 * 6. Showroom na QI 19 · 7. Perguntas frequentes.
 */
export default function Inicio() {
  return (
    <>
      <Intro />
      <Hero />
      {/*
        Seções abaixo da dobra: HTML completo do servidor, hidratação só quando a seção
        chega perto da tela (ver HidratarAoVer). O carregamento hidrata só a 1ª dobra.
      */}
      <HidratarAoVer>
        <Linhas />
      </HidratarAoVer>
      <HidratarAoVer>
        <SecaoConfigurador />
      </HidratarAoVer>
      <HidratarAoVer>
        <MonteSeuSalao />
      </HidratarAoVer>
      <HidratarAoVer>
        <ComoFunciona />
      </HidratarAoVer>
      <HidratarAoVer>
        <Galeria />
      </HidratarAoVer>
      <HidratarAoVer>
        <Showroom />
      </HidratarAoVer>
      <HidratarAoVer>
        <Duvidas />
      </HidratarAoVer>
      <JsonLd dados={schemaPerguntas()} />
    </>
  );
}
