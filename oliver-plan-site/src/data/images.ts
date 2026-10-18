/**
 * Banco de imagens (Unsplash, licença livre). Guardamos só o ID da foto;
 * o tamanho e a compressão são pedidos à CDN do Unsplash pelo image-loader.
 *
 * Antes de publicar, troque por fotos reais dos projetos da empresa.
 * Se alguma imagem falhar, o componente SmartImage mostra uma textura de material no lugar.
 */

const u = (id: string) => `https://images.unsplash.com/${id}`;

export const img = {
  kitchen: [
    u("photo-1556909114-f6e7ad7d3136"),
    u("photo-1556911220-bff31c812dba"),
    u("photo-1556912173-3bb406ef7e77"),
    u("photo-1484154218962-a197022b5858"),
    u("photo-1600585154526-990dced4db0d"),
    u("photo-1600566753190-17f0baa2a6c3"),
    u("photo-1588854337236-6889d631faa8"),
    u("photo-1556912167-f556f1f39fdf"),
    u("photo-1600607687939-ce8a6c25118c"),
  ],
  living: [
    u("photo-1618221195710-dd6b41faaea6"),
    u("photo-1586023492125-27b2c045efd7"),
    u("photo-1616486338812-3dadae4b4ace"),
    u("photo-1600210492486-724fe5c67fb0"),
    u("photo-1600121848594-d8644e57abab"),
    u("photo-1615529182904-14819c35db37"),
    u("photo-1493663284031-b7e3aefcae8e"),
    u("photo-1583847268964-b28dc8f51f92"),
    u("photo-1513694203232-719a280e022f"),
    u("photo-1600607687920-4e2a09cf159d"),
  ],
  bedroom: [
    u("photo-1616594039964-ae9021a400a0"),
    u("photo-1615874959474-d609969a20ed"),
    u("photo-1631049307264-da0ec9d70304"),
    u("photo-1540518614846-7eded433c457"),
    u("photo-1505693416388-ac5ce068fe85"),
    u("photo-1522771739844-6a9f6d5f14af"),
    u("photo-1560185007-cde436f6a4d0"),
  ],
  bathroom: [
    u("photo-1552321554-5fefe8c9ef14"),
    u("photo-1584622650111-993a426fbf0a"),
    u("photo-1620626011761-996317b8d101"),
    u("photo-1507652313519-d4e9174996dd"),
    u("photo-1600566752355-35792bedcfea"),
  ],
  office: [
    u("photo-1593062096033-9a26b09da705"),
    u("photo-1524758631624-e2822e304c36"),
    u("photo-1518455027359-f3f8164ba6bd"),
    u("photo-1497366811353-6870744d04b2"),
    u("photo-1585412727339-54e4bae3bbf9"),
  ],
  closet: [
    // Renders 3D gerados a partir da cena procedural do próprio site
    "/renders/closet-ambar.jpg",
    "/renders/closet-linho.jpg",
    u("photo-1595428774223-ef52624120d2"),
    u("photo-1489274495757-95c7c837b101"),
    u("photo-1556905055-8f358a7a47b2"),
  ],
  gourmet: [
    u("photo-1600585154340-be6161a56a0c"),
    u("photo-1600596542815-ffad4c1539a9"),
    u("photo-1613490493576-7fde63acd811"),
    u("photo-1600573472550-8090b5e0745e"),
  ],
  workshop: [
    u("photo-1504148455328-c376907d081c"),
    u("photo-1503387762-592deb58ef4e"),
    u("photo-1581291518857-4e27b48ff24e"),
    u("photo-1530124566582-a618bc2615dc"),
    u("photo-1581539250439-c96689b516dd"),
    u("photo-1600880292203-757bb62b4baf"),
  ],
  construction: [
    u("photo-1504307651254-35680f356dfd"),
    u("photo-1541888946425-d81bb19240f5"),
    u("photo-1560185893-a55cbc8c57e8"),
    u("photo-1513467535987-fd81bc7d62f8"),
  ],
  people: [
    u("photo-1573496359142-b8d87734a5a2"),
    u("photo-1560250097-0b93528c311a"),
    u("photo-1580489944761-15a19d654956"),
    u("photo-1507003211169-0a1dd7228f2d"),
    u("photo-1438761681033-6461ffad8d80"),
    u("photo-1472099645785-5658abf4ff4e"),
    u("photo-1494790108377-be9c29b29330"),
    u("photo-1500648767791-00dcc994a43e"),
    u("photo-1544005313-94ddf0286df2"),
  ],
  /** Renders 3D gerados das cenas do site (scripts/render-stills.mjs) */
  renders: {
    kitchen: "/renders/cozinha-jacaranda.jpg",
    kitchenOlive: "/renders/cozinha-oliva.jpg",
    kitchenEmpty: "/renders/cozinha-vazia.jpg",
    closet: "/renders/closet-ambar.jpg",
    closetLight: "/renders/closet-linho.jpg",
    living: "/renders/living-ripado.jpg",
    livingDark: "/renders/living-grafite.jpg",
  },
} as const;

/** Render local usado quando uma foto remota não carrega (por categoria de ambiente) */
export const renderFallback: Record<string, string | undefined> = {
  cozinha: img.renders.kitchen,
  "area-gourmet": img.renders.kitchenOlive,
  closet: img.renders.closetLight,
  quarto: img.renders.closetLight,
  sala: img.renders.living,
  "home-office": img.renders.livingDark,
};
