/**
 * Falas curtas contextuais dos NPCs (balões sobre a cabeça / legendas).
 * Escolha: src/npc/barkPicker.ts — filtra por situação, NPC/papel/facção e
 * condições (flags, missões, hora, chuva, memória), com anti-repetição por NPC e global.
 */
import type { Cond } from '../rpg/dialogue/script';
import type { NpcRole } from './npcs';

export type BarkSituation =
  | 'greet' // jogador passou perto
  | 'ambient' // comentário solto durante a rotina
  | 'work' // enquanto trabalha (martelar, varrer, colher...)
  | 'magic' // magia lançada perto (civis)
  | 'magic_guard' // guarda advertindo sobre magia
  | 'flee' // monstro/combate por perto: correndo para abrigo
  | 'cower' // encolhido de medo
  | 'resume' // voltando à rotina depois do susto
  | 'rain' // correndo da chuva
  | 'night' // indo para casa ao anoitecer
  | 'flyover' // Kaelen voando por cima
  | 'guard_engage' // guarda indo enfrentar ameaça
  | 'hostile' // guardas hostis ao jogador
  | 'knockout' // caiu (nocauteado)
  | 'story'; // comentário sobre acontecimentos da história

export const BARK_SITUATIONS: BarkSituation[] = ['greet', 'ambient', 'work', 'magic', 'magic_guard', 'flee', 'cower', 'resume', 'rain', 'night', 'flyover', 'guard_engage', 'hostile', 'knockout', 'story'];

export interface BarkDef {
  situation: BarkSituation;
  text: string;
  /** Só este NPC. */
  npc?: string;
  /** Só estes papéis. */
  roles?: NpcRole[];
  faction?: 'villager' | 'guard';
  when?: Cond[];
  /** Peso relativo (padrão 1; falas de NPC específico ganham +2 automaticamente). */
  weight?: number;
}

/** Números das falas. */
export const BARK_RULES = {
  /** Intervalo mínimo (s) entre falas do mesmo NPC. */
  npcCooldown: 9,
  /** Intervalo mínimo (s) entre quaisquer duas falas ambientes (evita coro). */
  globalAmbientCooldown: 3.5,
  /** Quantas falas recentes cada NPC evita repetir. */
  npcMemory: 6,
  /** Quantas falas recentes o mundo inteiro evita repetir. */
  globalMemory: 14,
  /** Duração (s) do balão por caractere (com mínimo/máximo). */
  secondsPerChar: 0.055,
  minSeconds: 2.2,
  maxSeconds: 5.5,
  /** Chance (por checagem) de um comentário ambiente quando o jogador está perto. */
  ambientChance: 0.18,
  /** Raio (m) em que o jogador ouve/vê o balão. */
  hearRange: 22,
};

const B: BarkDef[] = [];
function add(situation: BarkSituation, lines: string[], opts: Omit<BarkDef, 'situation' | 'text'> = {}) {
  for (const text of lines) B.push({ situation, text, ...opts });
}

// ------------------------------------------------------------------ saudações
add('greet', ['Bom dia, senhor.', 'Dia bom pra secar roupa.', 'Ah, o mago. Bom dia.', 'Que a Aurora te guarde.'], { faction: 'villager', when: [{ hour: [5, 12] }] });
add('greet', ['Boa tarde.', 'Calor danado hoje, não?', 'Passando de novo, mago?'], { faction: 'villager', when: [{ hour: [12, 18] }] });
add('greet', ['Boa noite. Não demora na rua.', 'Já é tarde, mago.', 'Cuidado no escuro.'], { faction: 'villager', when: [{ night: true }] });
add('greet', ['Circulando.', 'Olhos abertos.', 'Tudo em ordem por aqui.'], { faction: 'guard' });
add('greet', ['Mãos longe do cajado.', 'Estou de olho em você, mago.'], { faction: 'guard', when: [{ flag: 'guardas_vigilantes' }] });
add('greet', ['Mago! Mostra uma mágica? Só uma pequena!', 'Você é mesmo de quatro mil anos atrás? Você é velhão!'], { roles: ['child'] });
add('greet', ['Hm.', 'Pisa leve.'], { npc: 'ilsa' });
add('greet', ['Ha! O mago!', 'Ei, mago! A bigorna mandou lembranças.'], { npc: 'doran' });
add('greet', ['Entra, que a sopa tá quente!', 'Olha quem voltou!'], { npc: 'hilda' });
add('greet', ['Ah! Bom... bom dia! Ou tarde?', 'Kaelen! Tenho perguntas! Muitas!'], { npc: 'teodoro' });
add('greet', ['Freguês com cara de ouro.', 'Mercadoria fresca, preço justo. Para mim.'], { npc: 'sabine' });
add('greet', ['Mago.', 'Ainda inteiro? Bom.'], { npc: 'bran' });
add('greet', ['O vento sempre muda quando você passa.'], { npc: 'maren' });
add('greet', ['Que a Aurora... bem. Que ela te veja.'], { npc: 'calen' });
add('greet', ['O herói da forja! Bom dia!'], { faction: 'villager', when: [{ quest: 'q_martelo', status: 'completed' }] });

// ------------------------------------------------------------------ ambiente
add('ambient', ['O trigo tá com manchas roxas de novo...', 'Dizem que o pântano cresce um palmo por noite.', 'Meu primo viu luzes nas ruínas.', 'Se chover mais, perco a colheita.'], { faction: 'villager', roles: ['villager'] });
add('ambient', ['Seis homens para uma muralha inteira...', 'Alguém abriu o portão leste de novo.', 'Turno longo. Cerveja curta.'], { faction: 'guard' });
add('ambient', ['Uma ovelha, duas ovelhas... cadê o Carvão?'], { npc: 'pedro' });
add('ambient', ['Do tamanho de três celeiros, eu juro!', 'No meu tempo, os dragões tinham respeito.'], { npc: 'ernesto' });
add('ambient', ['♪ O mago caiu do céu, tralalá... ♪ Não, não rima.', '♪ Na taverna do Javali, a cerveja é de lei... ♪'], { npc: 'fabricio' });
add('ambient', ['As abelhas estão inquietas hoje.'], { npc: 'anselmo' });
add('ambient', ['Esse tecido não vende nem com reza.'], { npc: 'sabine' });
add('ambient', ['Aurora, dai-nos paciência. Muita paciência.'], { npc: 'calen' });

// ------------------------------------------------------------------ trabalho
add('work', ['Mais uma, e mais uma...', 'Isso não se faz sozinho.', 'Ufa. Costas de velho.'], { faction: 'villager' });
add('work', ['Bate, vira, bate!', 'Aço honesto, ha!', 'Escuta como ela canta!'], { npc: 'doran' });
add('work', ['Lá vai poeira...', 'Quem traz lama pra dentro de um santuário?'], { npc: 'calen' });
add('work', ['Cresce, cresce, bonitinho...', 'Sai, mancha roxa, sai!'], { npc: 'lia' });

// ------------------------------------------------------------------ magia em público
add('magic', ['Pela Aurora! Que foi isso?!', 'Magia! Aqui dentro!', 'Ai! Quase me queima o cabelo!', 'Mãe do céu, o mago de novo!', 'Não faz isso perto das crianças!'], { faction: 'villager' });
add('magic', ['Faz de novo! Faz de novo!', 'Uaaau!'], { roles: ['child'] });
add('magic', ['SOBERBA! Apague essas luzes, mago!', 'Isto é uma vila de gente temente, não um laboratório de Aeternum!', 'A Aurora vê o que você faz, Kaelen!'], { npc: 'calen' });
add('magic', ['Ha! Esquenta a minha fornalha com isso, então!'], { npc: 'doran' });
add('magic', ['Fascinante! Como você canaliza sem foco de cristal?!'], { npc: 'teodoro' });
add('magic', ['Isso espanta freguês, sabia?'], { npc: 'sabine' });
add('magic', ['Bran pediu: nada de luzes dentro dos muros.'], { npc: 'maren' });
add('magic_guard', ['Ei! Nada de feitiços dentro dos muros!', 'Guarda essa luz, mago. É o último aviso.', 'Mais uma dessas e vai falar com o capitão.', 'Regulamento, mago: magia só fora da muralha.'], { faction: 'guard' });
add('magic_guard', ['Eu avisei no portão. Nada de luzes.', 'Quer assustar a vila inteira? Para com isso.'], { npc: 'bran' });

// ------------------------------------------------------------------ fuga / medo
add('flee', ['Corre! Pra dentro!', 'Socorro! Guardas!', 'Monstro! Monstro na estrada!', 'Fecha a porta, fecha a porta!', 'As crianças! Cadê as crianças?'], { faction: 'villager' });
add('flee', ['Mamãe!'], { roles: ['child'] });
add('flee', ['Ninguém mexe no meu balcão! Pra dentro, todo mundo!'], { npc: 'hilda' });
add('cower', ['Por favor, por favor...', 'Aurora, nos proteja...', 'Vai embora, vai embora...', '(soluça baixinho)'], { faction: 'villager' });
add('resume', ['Ufa... passou?', 'Que susto. Bom, de volta ao trabalho.', 'Acho que já foi embora.', 'Meu coração ainda tá na boca.'], { faction: 'villager' });
add('resume', ['Área limpa. Voltando ao posto.', 'Ninguém se feriu? Ótimo.'], { faction: 'guard' });

// ------------------------------------------------------------------ chuva / noite
add('rain', ['Chuva! Minha roupa no varal!', 'Corre que vem aguaceiro!', 'Esse céu não perdoa.', 'Pra debaixo do telhado!'], { faction: 'villager' });
add('rain', ['Chuva não tira guarda do posto. Infelizmente.'], { faction: 'guard' });
add('night', ['Já é hora de recolher.', 'Boa noite a todos.', 'Hora de trancar a porta.', 'Amanhã tem mais.'], { faction: 'villager' });
add('night', ['Troca de turno.', 'Acende as tochas da muralha!'], { faction: 'guard' });

// ------------------------------------------------------------------ voo por cima
add('flyover', ['Olha lá em cima! Ele voa!', 'Um homem voando... já vi de tudo.', 'Pela Aurora, ele tá no céu!', 'Ei! Desce daí antes que caia!'], { faction: 'villager' });
add('flyover', ['Eu quero voar tambééém!'], { roles: ['child'] });
add('flyover', ['Até no céu você me dá trabalho, mago.'], { faction: 'guard' });
add('flyover', ['Antinatural. Completamente antinatural.'], { npc: 'calen' });
add('flyover', ['Que ângulo! Que sustentação! Preciso anotar!'], { npc: 'teodoro' });

// ------------------------------------------------------------------ guardas em ação
add('guard_engage', ['Às armas! Protejam o povo!', 'Formação! Comigo!', 'Pela vila!', 'Ninguém passa da muralha!'], { faction: 'guard' });
add('hostile', ['Lá está ele! Prendam o mago!', 'Atacou um dos nossos! Cerquem!', 'Larga o cajado!'], { faction: 'guard' });
add('knockout', ['Ugh...', 'Ai... minha cabeça...', 'Tudo... rodando...'], {});

// ------------------------------------------------------------------ acontecimentos da história
add('story', ['É ele, o que voltou da cripta.', 'Dizem que esse aí dormiu quatro mil anos.'], { faction: 'villager', when: [{ quest: 'q_estranho', status: ['active', 'inactive'] }] });
add('story', ['Bran deixou o mago entrar. Que a Aurora nos ajude.'], { faction: 'villager', when: [{ quest: 'q_estranho', status: 'completed' }, { quest: 'q_corvos', status: 'active' }] });
add('story', ['Soltou a Corva... corajoso ou doido.', 'Se os Corvos voltarem, já sabemos de quem é a culpa.'], { faction: 'villager', when: [{ flag: 'ravena_poupada' }] });
add('story', ['As estradas estão mais calmas sem a Corva.', 'Dizem que ele acabou com a líder dos Corvos.'], { faction: 'villager', when: [{ flag: 'ravena_executada' }] });
add('story', ['Ouviu? O portão das ruínas abriu sozinho!'], { faction: 'villager', when: [{ flag: 'portao_ruinas_aberto' }, { quest: 'q_guardiao', status: 'active' }] });
add('story', ['O ar fica frio quando ele passa...', 'O Irmão Calen manda a gente rezar quando ele passa.'], { faction: 'villager', when: [{ flag: 'nucleo_absorvido' }] });
add('story', ['A luz azul das ruínas! Foi ele!', 'Calen até sorriu esta semana.'], { faction: 'villager', when: [{ flag: 'guardiao_libertado' }] });
add('story', ['Derrubou um gigante de metal, dizem.', 'Agora todo mundo só fala de Ferroluz.'], { faction: 'villager', when: [{ flag: 'ato1_concluido' }] });
add('story', ['O capitão tá de olho, mago. Literalmente.'], { faction: 'guard', when: [{ flag: 'ravena_poupada' }] });
add('story', ['Bom trabalho com a Corva. O capitão aprovou.'], { faction: 'guard', when: [{ flag: 'ravena_executada' }] });
add('story', ['Sem os lobos, os rebanhos dormem.'], { faction: 'villager', when: [{ quest: 'q_lobos', status: 'completed' }] });
add('story', ['A forja voltou a cantar!'], { faction: 'villager', when: [{ quest: 'q_martelo', status: 'completed' }] });

export const BARKS: readonly BarkDef[] = B;
