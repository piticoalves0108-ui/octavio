"use client";

import type { ReactNode } from "react";
import type { TourPreset } from "@/data/categories";
import type { V3 } from "../kit";
import type { Slot, SlotMap } from "../materials";
import { KitchenFurniture, KitchenRoom } from "./Kitchen";
import { ClosetFurniture, ClosetRoom } from "./Closet";
import { LivingFurniture, LivingRoom } from "./Living";
import { ShowroomFurniture, ShowroomRoom } from "./Showroom";

export interface Hotspot {
  id: string;
  position: V3;
  title: string;
  text: string;
  finish?: string;
}

export interface Viewpoint {
  id: string;
  label: string;
  position: V3;
  target: V3;
}

export interface TourConfig {
  title: string;
  subtitle: string;
  slots: Partial<SlotMap>;
  swappable: { slot: Slot; label: string; options: string[] }[];
  viewpoints: Viewpoint[];
  hotspots: Hotspot[];
  sun: V3;
  shadowSize: number;
  scene: () => ReactNode;
}

export const tourPresets: Record<TourPreset, TourConfig> = {
  cozinha: {
    title: "Cozinha Jacarandá",
    subtitle: "Ilha em cascata · torres em nogueira",
    slots: { front: "nogueira", base: "grafite", stone: "calacatta", wood: "freijo", glass: "canelado" },
    swappable: [
      { slot: "front", label: "Torres", options: ["nogueira", "carvalho", "freijo", "oliva", "areia", "grafite"] },
      { slot: "base", label: "Bases e ilha", options: ["grafite", "areia", "oliva", "terracota", "carvalho"] },
      { slot: "stone", label: "Bancadas", options: ["calacatta", "travertino", "nero", "concreto"] },
    ],
    viewpoints: [
      { id: "entrada", label: "Entrada", position: [2.6, 1.6, 2.3], target: [-1.2, 1.15, -1.6] },
      { id: "ilha", label: "Ilha", position: [0.2, 1.55, 1.75], target: [0.1, 0.95, -0.6] },
      { id: "torres", label: "Torres", position: [-0.9, 1.6, 0.4], target: [-2.8, 1.3, -2.6] },
    ],
    hotspots: [
      { id: "ilha", position: [1.66, 0.75, 0.75], title: "Ilha em cascata", text: "Tampo de 3.200 × 1.100 mm em Calacatta, com as laterais descendo até o piso.", finish: "calacatta" },
      { id: "torres", position: [-2.75, 1.95, -2.15], title: "Torres em nogueira", text: "Forno e micro-ondas embutidos; frentes de 22 mm com abertura por toque.", finish: "nogueira" },
      { id: "gola", position: [0.5, 0.83, -2.16], title: "Puxador gola", text: "Canal usinado em alumínio preto: nenhum puxador aparente nas bases.", finish: "grafite" },
      { id: "led", position: [-1.05, 1.55, -2.5], title: "LED embutido", text: "Perfil 2700K sob a prateleira flutuante, com sensor de presença." },
      { id: "ripado", position: [0.6, 0.5, 0.56], title: "Ripado maciço", text: "Ripas de 40 × 22 mm com espaçamento de 16 mm no lado das banquetas.", finish: "freijo" },
    ],
    sun: [-8, 6, 2.5],
    shadowSize: 6,
    scene: () => (
      <>
        <KitchenRoom closed />
        <KitchenFurniture />
      </>
    ),
  },
  closet: {
    title: "Closet Âmbar",
    subtitle: "Vidro bronze · nogueira · LED",
    slots: { front: "nogueira", glass: "bronze", metal: "champagne", stone: "travertino" },
    swappable: [
      { slot: "front", label: "Marcenaria", options: ["nogueira", "carvalho", "freijo", "areia", "grafite", "oliva"] },
      { slot: "glass", label: "Portas", options: ["bronze", "canelado"] },
      { slot: "metal", label: "Metais", options: ["champagne", "preto-fosco"] },
    ],
    viewpoints: [
      { id: "entrada", label: "Entrada", position: [0.6, 1.6, 1.5], target: [-0.3, 1.3, -1.9] },
      { id: "ilha", label: "Ilha", position: [1.4, 1.65, 0.9], target: [-0.6, 0.9, -0.4] },
      { id: "sapateira", label: "Sapateira", position: [0.4, 1.55, 0.2], target: [-2.3, 1.2, -0.7] },
    ],
    hotspots: [
      { id: "vidro", position: [-1.32, 1.7, -1.28], title: "Portas em vidro bronze", text: "Vidro temperado com película bronze e perfis champagne.", finish: "bronze" },
      { id: "led", position: [0, 2.0, -1.32], title: "Prateleiras iluminadas", text: "LED em cada prateleira, acionado ao abrir as portas." },
      { id: "ilha", position: [0.55, 0.95, 0.1], title: "Ilha com tampo de vidro", text: "Gavetas forradas em linho e expositor para relógios.", finish: "linho" },
      { id: "sapatos", position: [-2.1, 1.35, -0.75], title: "Sapateira inclinada", text: "Seis prateleiras inclinadas a 12° para 36 pares." },
      { id: "gavetas", position: [1.76, 0.65, -1.28], title: "Gaveteiro", text: "Corrediças Legrabox com fechamento suave e divisórias em veludo." },
    ],
    sun: [7, 5, 3],
    shadowSize: 4,
    scene: () => (
      <>
        <ClosetRoom closed />
        <ClosetFurniture />
      </>
    ),
  },
  sala: {
    title: "Living Ripado",
    subtitle: "Painel ripado · rack suspenso",
    slots: { wood: "freijo", base: "grafite", front: "carvalho", stone: "calacatta", fabric: "linho" },
    swappable: [
      { slot: "wood", label: "Ripado", options: ["freijo", "carvalho", "nogueira", "cumaru"] },
      { slot: "base", label: "Rack", options: ["grafite", "areia", "oliva", "terracota"] },
      { slot: "front", label: "Estante", options: ["carvalho", "nogueira", "areia", "oliva"] },
    ],
    viewpoints: [
      { id: "sofa", label: "Sofá", position: [0, 1.4, 2.0], target: [0, 1.15, -2.6] },
      { id: "estante", label: "Estante", position: [1.6, 1.6, 0.9], target: [-3.2, 1.2, -0.4] },
      { id: "janela", label: "Janela", position: [-1.6, 1.6, 1.4], target: [3.2, 1.2, 0.2] },
    ],
    hotspots: [
      { id: "ripado", position: [-2.3, 2.0, -2.52], title: "Painel ripado", text: "6 m de ripado maciço com fixação oculta e porta camuflada.", finish: "freijo" },
      { id: "rack", position: [1.3, 0.55, -2.1], title: "Rack suspenso", text: "4 m de rack flutuante com LED rente ao piso.", finish: "grafite" },
      { id: "estante", position: [-3.0, 1.7, -0.4], title: "Estante iluminada", text: "Nichos de 520 mm, prontos para livros de arte.", finish: "carvalho" },
      { id: "mesa", position: [0.4, 0.42, 0.25], title: "Mesa em travertino", text: "Peça maciça em travertino romano levigado.", finish: "travertino" },
    ],
    sun: [8, 5, 1],
    shadowSize: 5,
    scene: () => (
      <>
        <LivingRoom closed />
        <LivingFurniture />
      </>
    ),
  },
  showroom: {
    title: "Showroom",
    subtitle: "Cozinha, closet, living e amostras",
    slots: { front: "nogueira", base: "grafite", stone: "calacatta", wood: "freijo", glass: "bronze", metal: "champagne" },
    swappable: [
      { slot: "front", label: "Marcenaria", options: ["nogueira", "carvalho", "freijo", "areia", "oliva"] },
      { slot: "base", label: "Bases", options: ["grafite", "areia", "oliva", "terracota"] },
      { slot: "stone", label: "Pedras", options: ["calacatta", "travertino", "nero"] },
    ],
    viewpoints: [
      { id: "centro", label: "Centro", position: [0.2, 1.6, 0.8], target: [-0.5, 1.2, -5] },
      { id: "cozinha", label: "Cozinha", position: [-1.2, 1.6, 0.2], target: [-3.2, 1.1, -4.5] },
      { id: "closet", label: "Closet", position: [2.6, 1.6, -0.6], target: [3.4, 1.2, -5] },
      { id: "living", label: "Living", position: [0, 1.5, -1.0], target: [0, 1.2, 5] },
      { id: "amostras", label: "Amostras", position: [-2.6, 1.6, 2.2], target: [-6, 1.5, 2.2] },
    ],
    hotspots: [
      { id: "cozinha", position: [-2.4, 1.2, -1.6], title: "Vinheta cozinha", text: "Ilha em cascata e torres quentes montadas em escala real.", finish: "calacatta" },
      { id: "closet", position: [3.4, 1.9, -4.2], title: "Vinheta closet", text: "Vidro bronze, LED e ilha central para experimentar ao vivo.", finish: "bronze" },
      { id: "living", position: [-1.5, 2.0, 4.85], title: "Vinheta living", text: "Ripado de parede inteira e rack suspenso com LED.", finish: "freijo" },
      { id: "amostras", position: [-5.9, 2.4, 2.2], title: "Parede de amostras", text: "Todos os acabamentos do catálogo para ver e tocar." },
    ],
    sun: [9, 6, 0],
    shadowSize: 8,
    scene: () => (
      <>
        <ShowroomRoom />
        <ShowroomFurniture />
      </>
    ),
  },
};
