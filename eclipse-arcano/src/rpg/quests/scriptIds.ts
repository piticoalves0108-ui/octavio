/**
 * Roteiros nomeados que os dados (missões/diálogos/pontos) podem disparar com
 * `{ script: id }`. Os que coincidem com uma cinemática de data/quests.ts
 * (CINEMATICS) tocam a cinemática; os demais têm lógica própria em scripts.ts.
 */
export const SCRIPT_IDS: readonly string[] = [
  // cinemáticas
  'intro',
  'vista_brumafria',
  'selo_aberto',
  'memoria_coracao',
  'memoria_cripta',
  'memoria_farol',
  'memoria_santuario',
  'revelacao_fragmentos',
  'epilogo_ato1',
  'memoria_forja',
  'epilogo_ato2',
  'memoria_templo',
  'epilogo_ato3',
  'cidadela_surge',
  'final_reunificacao',
  'final_selo',
  'final_sombrio',
  // lógica
  'ravena_poupar',
  'ravena_executar',
  'revistar_tenda',
  'guardiao_absorver',
  'guardiao_libertar',
  'garantir_cervo',
  'cacadores_atacam',
  'cacadores_cacam',
  'cacadores_fogem',
  'bencao_calen',
  'forja_acesa',
  'barao_exposto',
  'barao_convencido',
  'darian_redimir',
  'darian_matar',
  'eclipse_avanca',
  'fim_reunificacao',
  'fim_selo',
  'fim_sombrio',
];
