/**
 * Diálogos de Brumafria e da campanha (Prólogo, Atos I a IV, finais e secundárias).
 * Estrutura: src/rpg/dialogue/runner.ts. Convenções:
 * - o falante padrão de cada nó é o NPC da conversa; as opções são falas de Kaelen;
 * - `tone` marca a postura (compassivo, pragmático, arrogante, curioso);
 * - prioridade: missão (20) > acontecimento (6–9) > genérico (1).
 */
import type { DialogueDef, DialogueNodeDef, DialogueOptionDef } from '../rpg/dialogue/runner';
import type { Cond, Effect } from '../rpg/dialogue/script';
import { NPCS, type NpcDef } from './npcs';

const stage = (q: string, s: string | string[]): Cond => ({ questStage: q, stage: s });
const done = (q: string): Cond => ({ quest: q, status: 'completed' });
const inactive = (q: string): Cond => ({ quest: q, status: 'inactive' });
const first: Cond = { mem: 'talks', max: 1 };
const end = (text: string, effects?: Effect[]): DialogueOptionDef => ({ text, effects });

const D: Record<string, DialogueDef> = {};
function dlg(d: DialogueDef) {
  D[d.id] = d;
}

// ===========================================================================
// PRÓLOGO — leituras da cripta
// ===========================================================================
dlg({
  id: 'lore_altar',
  npc: 'altar_cripta',
  start: 'altar',
  nodes: {
    altar: {
      speaker: 'narrador',
      text: [
        { when: [done('q_prologo')], text: 'O altar continua frio. As runas que acenderam ao seu toque agora dormem de novo.' },
        { text: 'Runas desbotadas cobrem o altar. Algumas ainda acendem sob seus dedos, como se lembrassem de você.' },
      ],
      next: 'altar2',
    },
    altar2: {
      speaker: 'narrador',
      text: '"Aqui repousa o Guardião do Tempo. Que ninguém o desperte, pois o despertar dele é o fim do selo." Logo abaixo, marcas frescas de pé de cabra.',
      next: 'altar3',
    },
    altar3: {
      speaker: 'kaelen',
      text: 'Ótimo. Alguém leu isso e decidiu arrancar os cristais mesmo assim.',
    },
  },
});

dlg({
  id: 'lore_mural',
  npc: 'cripta_mural',
  start: 'mural',
  nodes: {
    mural: {
      speaker: 'narrador',
      text: 'O mural mostra sete figuras de mãos dadas em volta de um sol negro. Uma oitava figura, sozinha, segura uma ampulheta contra o peito.',
      next: 'mural2',
    },
    mural2: { speaker: 'kaelen', text: 'Sete e um. Por que tenho a impressão de que o oitavo sou eu?' },
  },
});

// ===========================================================================
// ATO I — Estranho em Brumafria
// ===========================================================================
const postureOptions: DialogueOptionDef[] = [
  { text: 'Porque saí de um. Acordei numa cripta ao sul e não sei quanto tempo dormi.', tone: 'compassivo', next: 'honesto', effects: [{ set: 'bran_postura', value: 'honesto' }] },
  { text: 'Sou Kaelen Aurivar, Arquimago de Aeternum. Abra o portão.', tone: 'arrogante', next: 'arrogante', effects: [{ set: 'bran_postura', value: 'arrogante' }, { attitude: -1 }] },
  { text: 'Três saqueadores Corvos tentaram me matar na cripta. Agora são três a menos.', tone: 'pragmatico', next: 'pragmatico', effects: [{ set: 'bran_postura', value: 'pragmatico' }, { attitude: 1 }] },
];

dlg({
  id: 'bran_portao',
  npc: 'bran',
  priority: 20,
  when: [stage('q_estranho', 'portao')],
  start: 'abordagem',
  nodes: {
    abordagem: {
      text: [
        { when: [{ night: true }], text: 'Alto aí. Ninguém entra em Brumafria de noite com cara de quem saiu de um túmulo.' },
        { text: 'Alto aí. Ninguém entra em Brumafria com cara de quem saiu de um túmulo.' },
      ],
      options: [...postureOptions, { text: 'Que lugar é este?', tone: 'curioso', next: 'lugar' }],
    },
    lugar: {
      text: 'Brumafria. Trigo, ferro e gente teimosa. A estrada leste leva às ruínas e a Ferroluz; a do sul, de onde você veio, só leva à cripta. E ninguém volta da cripta. Até hoje.',
      next: 'abordagem2',
    },
    abordagem2: { text: 'E então? Vai me dizer quem é, ou vou ter que adivinhar?', options: postureOptions },
    honesto: {
      text: 'Uma cripta. Ao sul. Onde os Corvos andam cavando. ...Ou você é louco, ou é problema. Talvez os dois.',
      options: [
        { text: 'Talvez eu seja só alguém que precisa de ajuda.', tone: 'compassivo', next: 'entrar' },
        { text: 'Pode me chamar de problema, desde que me deixe passar.', tone: 'pragmatico', next: 'entrar' },
      ],
    },
    entrar: {
      text: 'Quem decide quem é ajudado aqui é a Anciã Maren. Casa a oeste da praça. E, mago... nada de luzes dentro dos muros. Povo assustado faz besteira.',
      effects: [{ set: 'bran_conheceu' }],
    },
    arrogante: {
      text: 'Aeternum. Claro. E eu sou o Rei dos Pântanos. Escuta, "Arquimago": aqui dentro tem criança, velho e gente que acha que magia é coisa do demônio. Entra, mas meus guardas vão estar de olho em cada passo seu.',
      effects: [{ set: 'guardas_vigilantes' }],
      options: [
        { text: 'Que olhem. Talvez aprendam alguma coisa.', tone: 'arrogante', next: 'arrogante2' },
        { text: 'Justo. Não vim causar problemas.', tone: 'compassivo', next: 'arrogante2', effects: [{ attitude: 1 }] },
      ],
    },
    arrogante2: {
      text: 'Vá falar com a Anciã Maren antes que eu mude de ideia. Casa a oeste da praça.',
      effects: [{ set: 'bran_conheceu' }],
    },
    pragmatico: {
      text: 'Corvos, é? Estão roubando cristal das ruínas há meses, e eu não tenho homens para ir atrás deles. Se você derrubou três, sabe se virar. Isso eu respeito. Toma, pelo serviço que era meu.',
      effects: [{ gold: 20 }, { set: 'bran_conheceu' }],
      options: [
        { text: 'Eles levavam um mapa com o nome da vila.', tone: 'curioso', next: 'mapa' },
        { text: 'Onde encontro quem manda aqui?', tone: 'pragmatico', next: 'mapa2' },
      ],
    },
    mapa: { text: 'Então estão de olho em nós também. Mais um motivo para a Anciã Maren ouvir você. Casa a oeste da praça.' },
    mapa2: { text: 'Quem manda sou eu, quando o assunto é lança. Quando o assunto é todo o resto, é a Anciã Maren. Casa a oeste da praça.' },
  },
});

dlg({
  id: 'maren_corvos',
  npc: 'maren',
  priority: 20,
  when: [stage('q_estranho', 'maren')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: [
        { when: [{ mem: 'acordada', is: true }], text: '(Maren abre a porta com um xale nos ombros.) A essa hora, só quem traz problema bate aqui. Entre, antes que o frio entre primeiro.' },
        { when: [{ flag: 'bran_postura', is: 'arrogante' }], text: 'Bran disse que um "arquimago" chegou batendo no peito. Pelo menos você não chegou batendo nos guardas. Sente-se.' },
        { text: 'Bran me mandou recado: um homem saído da cripta do sul. Você tem os olhos de quem viu coisas demais. Sente-se.' },
      ],
      options: [
        { text: 'Preciso entender onde estou. E quando.', tone: 'curioso', next: 'quando' },
        { text: 'Os Corvos me atacaram na cripta. Quem são eles?', tone: 'pragmatico', next: 'corvos' },
        { text: 'Você não parece surpresa em ver um mago.', tone: 'curioso', next: 'magia', once: true },
      ],
    },
    quando: {
      text: 'Você está no Vale de Brumafria. Quanto ao "quando"... as lendas falam de um império de magia e máquinas que caiu há quatro mil anos. Aeternum. Se você dormiu desde lá, dormiu muito.',
      options: [
        { text: 'Quatro mil anos. Todos que eu conhecia...', tone: 'compassivo', next: 'luto' },
        { text: 'Então o mundo esqueceu de nós. Conveniente.', tone: 'arrogante', next: 'corvos' },
      ],
    },
    luto: { text: 'Viraram canção. É o que acontece com todo mundo, cedo ou tarde. Mas os vivos ainda precisam de você, se servir de consolo. E agora mesmo, precisam por causa dos Corvos.', next: 'corvos' },
    magia: {
      text: 'Surpresa, não. Medo, talvez. A última vez que alguém usou magia de verdade no vale, o lago ferveu e um povoado inteiro sumiu. Meu avô contava. Por isso o povo daqui torce o nariz para gente como você.',
      next: 'inicio2',
    },
    inicio2: {
      text: 'Mas não foi para ouvir histórias de velha que você bateu aqui.',
      options: [
        { text: 'Preciso entender onde estou. E quando.', tone: 'curioso', next: 'quando' },
        { text: 'Os Corvos me atacaram na cripta. Quem são eles?', tone: 'pragmatico', next: 'corvos' },
      ],
    },
    corvos: {
      text: 'Saqueadores. Começaram roubando nas estradas, agora roubam as ruínas: arrancam cristais das paredes antigas e vendem para alguém. Desde que começaram, a corrupção do Pântano Sombrio cresce mais rápido. Plantas manchadas de roxo, bichos que não deviam acordar, máquinas velhas andando sozinhas.',
      options: [
        { text: 'E onde eu entro nisso?', tone: 'pragmatico', next: 'cristal' },
        { text: 'Talvez eu tenha acordado justamente porque arrancaram os cristais da minha cripta.', tone: 'compassivo', next: 'culpa' },
      ],
    },
    culpa: { text: 'Talvez. E talvez o que dorme no pântano tenha acordado junto. Não sei qual das duas ideias me assusta mais.', next: 'cristal' },
    cristal: {
      text: 'Os registros do Teodoro falam de um cristal diferente dos outros: o Cristal-Chave. Ele abre o selo das Ruínas de Aeternum. Sabine viu a líder dos Corvos, uma tal Ravena, mostrando um cristal assim na estrada. Se eles abrirem aquele selo antes de nós, não sei o que sai lá de dentro.',
      options: [
        { text: 'Eu trago o cristal.', tone: 'compassivo', important: true, effects: [{ set: 'maren_pedido' }, { attitude: 1 }] },
        { text: 'E o que eu ganho com isso?', tone: 'pragmatico', next: 'ganho' },
        { text: 'Um bando de ladrões? Isso é trabalho para guardas, não para mim.', tone: 'arrogante', next: 'desdem', effects: [{ attitude: -1 }] },
      ],
    },
    ganho: {
      text: 'Um teto, comida na taverna e a confiança de uma vila que não confia em ninguém. Se quiser ouro, Bran tem contratos pregados no quadro da taverna. O acampamento dos Corvos fica a sudeste, perto da estrada de Ferroluz.',
      effects: [{ set: 'maren_pedido' }],
    },
    desdem: {
      text: 'Então peça a Bran os guardas que ele não tem. ...Ou faça o que veio fazer, seja lá o que for. O acampamento fica a sudeste, perto da estrada de Ferroluz.',
      effects: [{ set: 'maren_pedido' }],
    },
  },
});

// ===========================================================================
// As Asas dos Corvos — Ravena
// ===========================================================================
dlg({
  id: 'ravena_rendicao',
  npc: 'ravena_rendida',
  priority: 20,
  when: [stage('q_corvos', 'escolha')],
  start: 'inicio',
  nodes: {
    inicio: {
      speaker: 'ravena',
      text: '(Ravena cospe sangue e ri.) Então é você, o fantasma da cripta. Meus homens disseram que você brilhava. Não disseram que batia tão forte.',
      options: [
        { text: 'Onde está o Cristal-Chave?', tone: 'pragmatico', next: 'cristal' },
        { text: 'Por que vocês roubam os cristais?', tone: 'curioso', next: 'porque', once: true },
        { text: 'Você mandou homens me matarem.', tone: 'arrogante', next: 'ameaca' },
      ],
    },
    porque: {
      speaker: 'ravena',
      text: 'Por ouro, ora. Por que mais? Alguém paga bem por pedra brilhante, e paga o dobro pelas da sua cripta. Não pergunto para quê. Quem pergunta não recebe.',
      options: [
        { text: 'Onde está o Cristal-Chave?', tone: 'pragmatico', next: 'cristal' },
        { text: 'Você mandou homens me matarem.', tone: 'arrogante', next: 'ameaca' },
      ],
    },
    ameaca: { speaker: 'ravena', text: 'Mandei. E eles foram. Agora estão mortos e eu estou de joelhos. A vida tem senso de humor.', next: 'cristal' },
    cristal: {
      speaker: 'ravena',
      text: 'Na minha tenda, num baú de fundo falso. Pode pegar; morta ou viva, não vou poder gastar. Então? Vai me matar, mago? Ou vai me deixar ir e torcer para eu não voltar?',
      next: 'decisao',
    },
    decisao: {
      speaker: 'ravena',
      text: [{ when: [{ flag: 'ravena_contou' }], text: 'Pronto, falei. Agora decide, que meus joelhos estão doendo.' }, { text: '(Ela espera, os olhos fixos nos seus.)' }],
      options: [
        {
          text: 'Vá embora. E diga a quem paga vocês que o fantasma acordou.',
          tone: 'compassivo',
          important: true,
          next: 'poupar',
          effects: [
            { choose: 'ravena', value: 'poupada' },
            { set: 'ravena_poupada' },
            { set: 'ravena_destino', value: 'poupada' },
            { attitude: -1, npc: 'bran' },
            { log: 'Poupei Ravena. Bran não vai gostar, mas uma inimiga viva pode virar outra coisa.', quest: 'q_corvos' },
          ],
        },
        {
          text: 'Você teria me matado na cripta. Não vou lhe dar uma segunda chance.',
          tone: 'pragmatico',
          important: true,
          next: 'executar',
          effects: [
            { choose: 'ravena', value: 'executada' },
            { set: 'ravena_executada' },
            { set: 'ravena_destino', value: 'executada' },
            { attitude: 1, npc: 'bran' },
            { log: 'Executei Ravena. Os Corvos perderam a cabeça — e eu fiquei com as lâminas dela.', quest: 'q_corvos' },
          ],
        },
        { text: 'Antes, me diga: quem paga vocês?', tone: 'curioso', next: 'quem', when: [{ noFlag: 'ravena_contou' }] },
      ],
    },
    quem: {
      speaker: 'ravena',
      text: 'Ha. Isso tem preço.',
      options: [
        { text: 'Sua vida é o preço. Fale.', tone: 'arrogante', next: 'quem2' },
        { text: 'Se falar, talvez eu entenda por que você faz isso.', tone: 'compassivo', next: 'quem2' },
      ],
    },
    quem2: {
      speaker: 'ravena',
      text: 'Um homem de Ferroluz, sempre de luvas, fala em nome de um nobre. Paga em ouro novo, cunhado com engrenagens. Diz que os cristais vão "devolver a luz ao povo". Bonito, né? Gente bonita é a que mais mente.',
      effects: [{ set: 'ravena_contou' }, { log: 'Ravena falou de um homem de luvas que compra cristais em nome de um nobre de Ferroluz.', quest: 'q_corvos' }],
      next: 'decisao',
    },
    poupar: {
      speaker: 'ravena',
      text: '(Ravena ergue as sobrancelhas.) Misericórdia. Fazia tempo. Toma: a carta do homem das luvas, brasão de Ferroluz, lacre do Barão. Talvez você saiba o que fazer com isso; eu só sei fugir. E, mago... os Corvos têm memória curta. Eu não. Te devo uma.',
      effects: [{ give: 'carta_barao' }, { script: 'ravena_poupar' }],
    },
    executar: {
      speaker: 'ravena',
      text: '(Ravena fecha os olhos.) Pelo menos você não é hipócrita.',
      effects: [{ give: 'lamina_vampirica' }, { script: 'ravena_executar' }],
    },
  },
});

// ===========================================================================
// O Guardião Mecânico — escolha do núcleo
// ===========================================================================
dlg({
  id: 'guardiao_nucleo',
  npc: 'nucleo_guardiao',
  priority: 20,
  when: [stage('q_guardiao', 'escolha')],
  start: 'inicio',
  nodes: {
    inicio: {
      speaker: 'guardiao',
      text: '(A voz vem de dentro do núcleo, metálica e cansada.) Arquimago... Aurivar... você voltou. Guardei a porta como ordenou. Quatro mil anos.',
      options: [
        { text: 'Eu ordenei? Não me lembro de nada.', tone: 'curioso', next: 'memoria' },
        { text: 'Você tentou me matar.', tone: 'pragmatico', next: 'matar' },
      ],
    },
    memoria: { speaker: 'guardiao', text: 'Você me fez guardião para que ninguém entrasse. Nem mesmo você, se voltasse... mudado. Perdoe-me. Eu não sabia se era mesmo você.', next: 'escolha' },
    matar: { speaker: 'guardiao', text: 'Tentei. Era o que você queria: testar quem entrasse. Você passou.', next: 'escolha' },
    escolha: {
      speaker: 'guardiao',
      text: 'Meu núcleo ainda guarda o Éter de Aeternum. Pode tomá-lo; é seu por direito. Ou pode me deixar ir. Estou cansado, Arquimago.',
      options: [
        {
          text: 'Seu poder me pertence. Eu o tomo de volta.',
          tone: 'arrogante',
          important: true,
          next: 'absorver',
          effects: [
            { choose: 'guardiao', value: 'absorvido' },
            { set: 'nucleo_absorvido' },
            { set: 'guardiao_destino', value: 'absorvido' },
            { unlockAbility: 'ascendantForm' },
            { statMod: 'nucleo_guardiao', mods: { spellPower: 0.1 } },
            { attitude: -2, npc: 'calen' },
            { mem: 'teme_kaelen', npc: 'calen', value: true },
            { log: 'Absorvi o núcleo do Guardião. A Forma Ascendente voltou para mim — e, com ela, um frio que não passa.', quest: 'q_guardiao' },
          ],
        },
        {
          text: 'Descanse. Você já guardou a porta por tempo demais.',
          tone: 'compassivo',
          important: true,
          next: 'libertar',
          effects: [
            { choose: 'guardiao', value: 'libertado' },
            { set: 'guardiao_libertado' },
            { set: 'guardiao_destino', value: 'libertado' },
            { attitude: 1, npc: 'calen' },
            { log: 'Libertei o espírito do Guardião. Ele subiu como uma luz azul e me deixou a Lâmina Temporal.', quest: 'q_guardiao' },
          ],
        },
        { text: 'O que havia atrás da porta que você guardava?', tone: 'curioso', next: 'porta', once: true },
      ],
    },
    porta: {
      speaker: 'guardiao',
      text: 'Nada. Atrás de mim só havia você, dormindo... e a lembrança do que você fez. Ela ficou presa aqui, comigo. Quando eu partir, ela fica livre.',
      next: 'escolha',
    },
    absorver: { speaker: 'guardiao', text: '(O núcleo escurece devagar.) Então seja. Que o poder lembre você do preço.', effects: [{ script: 'guardiao_absorver' }] },
    libertar: {
      speaker: 'guardiao',
      text: '(Uma luz azul sobe do núcleo.) Obrigado... Leve a lâmina que corta o tempo. E este pedaço de você que eu guardava.',
      effects: [{ give: 'lamina_temporal' }, { give: 'fragmento_memoria' }, { script: 'guardiao_libertar' }],
    },
  },
});

// ===========================================================================
// O Selo de Aeternum — pilar
// ===========================================================================
dlg({
  id: 'lore_terminal',
  npc: 'ruinas_terminal',
  start: 'pilar',
  nodes: {
    pilar: {
      speaker: 'narrador',
      text: 'O pilar zumbe. Uma tela de cristal acende com letras que se rearranjam até você entender: "ACESSO NEGADO. GUARDIÃO EM VIGÍLIA. CHAVE: AURIVAR."',
      next: 'pilar2',
    },
    pilar2: { speaker: 'kaelen', text: 'Até as máquinas sabem meu nome. Só eu que não.' },
  },
});

// ===========================================================================
// Ecos do Passado — Maren
// ===========================================================================
dlg({
  id: 'maren_ecos',
  npc: 'maren',
  priority: 20,
  when: [stage('q_ecos', 'maren')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'Você voltou com outros olhos, mago. O que encontrou nas ruínas?',
      options: [
        { text: 'Uma memória. Eu projetei algo chamado Coração do Eclipse.', tone: 'compassivo', next: 'coracao' },
        { text: 'Um guardião que me esperava há quatro mil anos. E respostas que eu não queria.', tone: 'pragmatico', next: 'coracao' },
      ],
    },
    coracao: {
      text: 'Coração do Eclipse... Nas canções antigas, o Eclipse é o fim do mundo: um rei que quis engolir o céu. Se você desenhou isso, mago, então desenhou o pesadelo de todas as avós deste vale.',
      next: 'corva',
    },
    corva: {
      text: [
        { when: [{ flag: 'ravena_poupada' }], text: 'E poupou a Corva. Bran resmunga pelos cantos, mas eu acho que essa misericórdia ainda vai pagar alguma dívida.' },
        { when: [{ flag: 'ravena_executada' }], text: 'E a Corva está morta. Bran dorme melhor. Eu não sei se durmo.' },
        { text: 'E os Corvos estão sem cabeça. Isso, pelo menos, é bom.' },
      ],
      next: 'nucleo',
    },
    nucleo: {
      text: [
        { when: [{ flag: 'nucleo_absorvido' }], text: 'Mas você... está diferente. O ar treme perto de você. O Irmão Calen veio me dizer que não quer você no santuário. Eu disse que ele não manda no santuário. Mas fiquei pensando.' },
        { when: [{ flag: 'guardiao_libertado' }], text: 'Calen disse que viu uma luz azul subir das ruínas, como uma alma indo embora. Disse que nunca viu nada tão bonito. Ele chorou, o velho teimoso.' },
        { text: 'E o gigante de metal não anda mais. Já é alguma coisa.' },
      ],
      next: 'ferroluz',
    },
    ferroluz: {
      text: [
        { when: [{ item: 'carta_barao' }], text: 'A carta que você trouxe tem o lacre de Ferroluz. O Barão Teodric fechou os portões há meses. Se alguém lá compra cristais, ele sabe quem é. Ou é ele.' },
        { when: [{ item: 'bilhete_corvos' }], text: 'O bilhete fala em "ouro de Ferroluz". O Barão Teodric fechou os portões há meses. Se alguém lá compra cristais, ele sabe quem é. Ou é ele.' },
        { text: 'Os cristais roubados vão para o leste, para Ferroluz. O Barão Teodric fechou os portões há meses. Se alguém lá compra cristais, ele sabe quem é.' },
      ],
      options: [
        { text: 'Então vou a Ferroluz.', tone: 'pragmatico', next: 'fim', effects: [{ set: 'rumo_ferroluz' }] },
        { text: 'E se eu for o problema, Maren? Se o que acorda no pântano veio comigo?', tone: 'compassivo', next: 'culpa', effects: [{ set: 'rumo_ferroluz' }, { attitude: 1 }] },
        { text: 'Um barão de província não vai me parar.', tone: 'arrogante', next: 'arrogante', effects: [{ set: 'rumo_ferroluz' }] },
      ],
    },
    fim: { text: 'Vá quando estiver pronto. Os portões de Ferroluz não abrem para qualquer um, mas você não é qualquer um. Até lá, o vale ainda precisa de você.' },
    culpa: { text: 'Então você vai ser o primeiro problema que conserta a si mesmo. Vá, mago. E volte.' },
    arrogante: { text: 'Barões de província já pararam reis, mago. Vá com cuidado. E vá com os olhos abertos, não com o peito estufado.' },
  },
});

// ===========================================================================
// Secundárias — retorno
// ===========================================================================
dlg({
  id: 'doran_martelo_volta',
  npc: 'doran',
  priority: 20,
  when: [stage('q_martelo', 'entregar'), { item: 'martelo_doran' }],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'Isso... isso é... O MARTELO! O martelo do vô! Por todas as bigornas do vale!',
      options: [
        { text: 'Estava preso entre as engrenagens do laboratório.', tone: 'pragmatico', next: 'final' },
        { text: 'Pelo peso, achei que fosse uma relíquia de Aeternum.', tone: 'curioso', next: 'final' },
      ],
    },
    final: {
      text: 'Olha essas marcas: três gerações de Forjafria. ...Não, não estou chorando, é a fumaça. Fica com a Espada Rúnica que eu guardava para o dia em que ele voltasse. E quando quiser, traz qualquer arma que eu aprimoro de graça.',
      effects: [{ take: 'martelo_doran' }],
    },
  },
});

dlg({
  id: 'ilsa_cervo_volta',
  npc: 'ilsa',
  priority: 20,
  when: [stage('q_cervo', 'relatar')],
  start: [
    { when: [{ flag: 'cervo_decisao', is: 'deixar' }], node: 'traicao' },
    { node: 'salvo' },
  ],
  nodes: {
    traicao: {
      text: 'Eu vi a clareira escura de longe. Não precisa dizer nada.',
      options: [
        { text: 'Eram três arcos contra um. Escolhi não lutar.', tone: 'pragmatico', next: 'traicao2' },
        { text: 'Eu me arrependo.', tone: 'compassivo', next: 'traicao3' },
      ],
    },
    traicao2: { text: 'Você escolheu o ouro. Some da minha frente.', effects: [{ attitude: -3 }, { mem: 'traiu', value: true }] },
    traicao3: { text: 'Arrependimento não acende clareira.', effects: [{ attitude: -2 }, { mem: 'traiu', value: true }] },
    salvo: {
      text: [
        { when: [{ flag: 'cacadores_fugiram' }], text: 'Os caçadores passaram pela estrada correndo como se o diabo estivesse atrás deles. Era você, não era?' },
        { text: 'Os bichos estão quietos hoje. Quietos de alívio. Você protegeu o Cervo.' },
      ],
      options: [
        { text: 'Ele está a salvo. Os caçadores não voltam.', tone: 'compassivo', next: 'premio' },
        { text: 'Foi mais fácil do que parecia.', tone: 'arrogante', next: 'premio' },
      ],
    },
    premio: {
      text: 'Isso era da minha avó. Ela dizia que o amuleto sente o mesmo que a floresta. Agora ele é seu. ...Obrigada, mago.',
      effects: [{ attitude: 2 }, { mem: 'ajudou', inc: 1 }],
    },
  },
});

dlg({
  id: 'teodoro_elyra_volta',
  npc: 'teodoro',
  priority: 20,
  when: [stage('q_elyra', 'teodoro'), { item: 'inscricao_elyra', min: 3 }],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'Elyra! Escrita de Elyra de verdade! Olha esses traços: isso é anterior ao próprio Império!',
      next: 'leitura',
    },
    leitura: {
      text: '"Sete vozes, um selo"... o Conselho dos Sete! E aqui: "Aurivar guarda o tempo, o tempo guarda Aurivar". Aurivar. Esse é... esse é o seu nome, não é?',
      options: [
        { text: 'É. E eu queria lembrar por quê.', tone: 'compassivo', next: 'final' },
        { text: 'Parece que eu era famoso.', tone: 'arrogante', next: 'final' },
        { text: 'O que mais diz sobre o selo?', tone: 'curioso', next: 'selo' },
      ],
    },
    selo: { text: 'Que ele foi feito para separar o que não podia ficar junto, e que uma "última voz" não deveria despertar nunca. Brrr. Eu não queria ser a última voz.', next: 'final' },
    final: {
      text: 'Tome. O Cajado do Vazio está no arquivo há gerações; ninguém conseguia nem segurar sem passar mal. Nas suas mãos ele... ronrona? Leve. E volte se lembrar de qualquer coisa. Qualquer coisa!',
      effects: [{ take: 'inscricao_elyra', qty: 3 }],
    },
  },
});

dlg({
  id: 'hilda_ervas_volta',
  npc: 'hilda',
  priority: 20,
  when: [stage('q_taverna', 'entregar'), { item: 'erva_lumen', min: 5 }],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'Ervas-lúmen! E frescas! Você colheu de madrugada, foi? Assim elas brilham mais.',
      next: 'rumor',
    },
    rumor: {
      text: 'Pagamento: três poções das boas. E uma fofoca, de graça, porque gostei de você: um carroceiro de Ferroluz bebeu demais aqui semana passada. Disse que o Barão anda falando sozinho na torre de comando. "Falando com o sábio", ele repetia.',
      effects: [{ take: 'erva_lumen', qty: 5 }],
    },
  },
});

dlg({
  id: 'bran_contrato_lobos',
  npc: 'bran',
  priority: 20,
  when: [stage('q_lobos', 'pagamento')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'A toca está limpa? ...Os pastores já sabiam; contaram antes de você chegar. Gente daqui fala rápido quando a notícia é boa. Toma: cento e cinquenta, como prometido.',
      options: [end('Bom negócio, capitão.'), end('Guarde um pouco para os pastores.', [{ attitude: 1 }])],
    },
  },
});

dlg({
  id: 'bran_contrato_automato',
  npc: 'bran',
  priority: 20,
  when: [stage('q_automato', 'pagamento')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'Sucata, hein? Os carroceiros vão poder usar a estrada de novo. Duzentos de ouro, e leve esta manopla: veio numa caixa de Ferroluz e ninguém aqui sabe nem calçar.',
      options: [end('Vou encontrar um uso para ela.'), end('Ferroluz manda caixas para cá?', [{ set: 'manopla_ferroluz' }])],
    },
  },
});

// ===========================================================================
// O Cervo de Luz — caçadores
// ===========================================================================
dlg({
  id: 'cacador_cervo',
  npc: 'cacador_lider',
  priority: 20,
  when: [stage('q_cervo', 'cacadores'), { noFlag: 'cervo_decisao' }],
  start: 'inicio',
  nodes: {
    inicio: {
      speaker: 'cacador',
      text: 'Ei, ei, devagar, mago. Ninguém aqui quer briga. Aquele bicho ali vale mais que a sua vila inteira: chifre de luz, sabe? Em Ferroluz pagam uma fortuna.',
      options: [
        { text: 'Esse cervo é o espírito desta floresta. Abaixem os arcos.', tone: 'compassivo', next: 'proteger' },
        { text: 'Quanto vale, exatamente?', tone: 'pragmatico', next: 'preco' },
        { text: 'Corram enquanto ainda têm pernas.', tone: 'arrogante', next: 'afugentar', when: [{ level: 3 }], lockedText: 'requer nível 3' },
      ],
    },
    preco: {
      speaker: 'cacador',
      text: 'Divido com você: cento e vinte de ouro, só para olhar para o outro lado.',
      options: [
        { text: 'Feito. Ele é de vocês.', tone: 'pragmatico', important: true, next: 'deixar' },
        { text: 'Nenhum ouro paga isso.', tone: 'compassivo', next: 'proteger' },
      ],
    },
    proteger: { speaker: 'cacador', text: 'Então você escolheu o lado errado da flecha. Atirem no bicho!', effects: [{ set: 'cervo_decisao', value: 'proteger' }, { script: 'cacadores_atacam' }] },
    deixar: { speaker: 'cacador', text: 'Homem sensato. Toma, conta aí. E não conta para a caçadora da vila.', effects: [{ set: 'cervo_decisao', value: 'deixar' }, { choose: 'cervo', value: 'deixar' }, { script: 'cacadores_cacam' }] },
    afugentar: {
      speaker: 'cacador',
      text: '(Os caçadores se entreolham. Um deles já está correndo.) Isso não vale a nossa pele! Vamos, vamos!',
      effects: [{ set: 'cervo_decisao', value: 'proteger' }, { set: 'cacadores_fugiram' }, { choose: 'cervo', value: 'proteger' }, { script: 'cacadores_fogem' }],
    },
  },
});

// ===========================================================================
// Quadro de missões e leituras da vila
// ===========================================================================
dlg({
  id: 'quadro_missoes',
  npc: 'quadro_missoes',
  start: 'inicio',
  nodes: {
    inicio: {
      speaker: 'narrador',
      text: [
        { when: [{ not: { quest: 'q_lobos', status: 'inactive' } }, { not: { quest: 'q_automato', status: 'inactive' } }], text: 'O quadro só tem avisos velhos agora. Alguém desenhou um lobo com um X por cima.' },
        { text: 'Pregados no quadro, entre avisos de casamento e uma receita de torta, há contratos com o selo da guarda.' },
      ],
      options: [
        { text: '[Contrato] Lobos Sombrios — 150 de ouro', when: [inactive('q_lobos')], next: 'lobos' },
        { text: '[Contrato] Autômato Errante — 200 de ouro', when: [inactive('q_automato')], next: 'automato' },
        { text: 'Ler os avisos da vila', next: 'avisos', once: true },
        { text: 'Sair' },
      ],
    },
    lobos: {
      speaker: 'narrador',
      text: '"A matilha da toca na Floresta de Lúmen está atacando os rebanhos. Matem o alfa e quantos lobos puderem. Pagamento com o Capitão Bran. — B. Holt"',
      options: [
        { text: 'Aceitar o contrato', important: true, effects: [{ startQuest: 'q_lobos' }] },
        { text: 'Deixar para depois', next: 'inicio' },
      ],
    },
    automato: {
      speaker: 'narrador',
      text: '"Autômato de elite saído do Laboratório Abandonado esmagou duas carroças na estrada. Destruam a coisa. Recompensa em ouro e peças. — B. Holt"',
      options: [
        { text: 'Aceitar o contrato', important: true, effects: [{ startQuest: 'q_automato' }] },
        { text: 'Deixar para depois', next: 'inicio' },
      ],
    },
    avisos: {
      speaker: 'narrador',
      text: '"Perdeu-se ovelha preta. Atende por Carvão. Falar com Pedro." / "Casamento da filha do moleiro no fim da colheita. Tragam pão." / "Proibido usar feitiços dentro dos muros. — Irmão Calen" (alguém riscou "Irmão Calen" e escreveu "bom senso").',
      next: 'inicio',
    },
  },
});

dlg({
  id: 'lore_estante',
  npc: 'arquivo_estante',
  start: 'a',
  nodes: {
    a: {
      speaker: 'narrador',
      text: 'Crônicas de Brumafria, ano após ano: colheitas, invernos, um casamento que acabou em briga de faca. Num tomo bem mais antigo, um trecho sublinhado três vezes: "E o Arquimago dormiu para que o mundo acordasse."',
      next: 'b',
    },
    b: { speaker: 'kaelen', text: 'Bonito. Agora só falta alguém explicar por que o mundo acordou tão mal-humorado.' },
  },
});

dlg({
  id: 'lore_torre',
  npc: 'torre_cristal_porta',
  start: 'a',
  nodes: {
    a: {
      speaker: 'narrador',
      text: 'A porta da torre é lisa como vidro e não tem fechadura. No centro, a marca de uma mão. Quando você encosta, ela esquenta... e nada acontece. Ainda.',
      next: 'b',
    },
    b: { speaker: 'kaelen', text: 'Falta energia. Ou falta lembrança.' },
  },
});

// ===========================================================================
// Acontecimentos (reações às escolhas)
// ===========================================================================
dlg({
  id: 'bran_ravena',
  npc: 'bran',
  priority: 7,
  once: true,
  when: [{ flag: 'ravena_destino' }, done('q_corvos')],
  start: [
    { when: [{ flag: 'ravena_poupada' }], node: 'poupada' },
    { node: 'executada' },
  ],
  nodes: {
    poupada: {
      text: 'Soube que você soltou a Corva. Já vi esse filme, mago: termina com a vila pegando fogo e todo mundo dizendo "mas ela parecia arrependida".',
      options: [
        { text: 'Às vezes uma inimiga viva vale mais que uma morta.', tone: 'pragmatico', next: 'p2' },
        { text: 'Ela me contou quem paga pelos cristais.', tone: 'curioso', next: 'p3', when: [{ flag: 'ravena_contou' }] },
        end('A decisão era minha, capitão.'),
      ],
    },
    p2: { text: 'Vale, se você estiver por perto quando ela voltar. Eu estarei.' },
    p3: { text: 'Ferroluz, é? ...Isso explica as carroças fechadas que passam de madrugada pela estrada leste. Mira vai adorar saber.' },
    executada: {
      text: 'Ravena está morta? ...Bom. Uma coisa a menos para me tirar o sono. Os Corvos sem ela são só ladrões de galinha.',
      options: [end('Era ela ou eu.'), end('Não foi uma decisão fácil.', [{ attitude: 1 }])],
    },
  },
});

dlg({
  id: 'calen_nucleo',
  npc: 'calen',
  priority: 7,
  once: true,
  when: [{ flag: 'nucleo_absorvido' }],
  start: 'a',
  nodes: {
    a: {
      text: 'Eu senti quando você fez aquilo. O ar ficou pesado como antes de uma tempestade, e as velas do santuário apagaram sozinhas. Fique longe do altar, Kaelen.',
      options: [
        { text: 'O poder era meu. Só o peguei de volta.', tone: 'arrogante', next: 'b', effects: [{ attitude: -1 }] },
        { text: 'Eu também senti, irmão. E não gostei.', tone: 'compassivo', next: 'c', effects: [{ attitude: 1 }] },
      ],
    },
    b: { text: 'Foi o que disse o último rei que tentou engolir o céu.' },
    c: { text: '...Então ainda há algo em você que a Aurora pode alcançar. Reze comigo, quando quiser. Mas de longe, por enquanto.' },
  },
});

dlg({
  id: 'calen_libertou',
  npc: 'calen',
  priority: 7,
  once: true,
  when: [{ flag: 'guardiao_libertado' }],
  start: 'a',
  nodes: {
    a: {
      text: 'Eu vi a luz azul subir das ruínas. Uma alma indo embora em paz. Passei a vida dizendo que magia só traz ruína, e você me faz duvidar. Não me faça me arrepender disso.',
      options: [end('Vou tentar, irmão.', [{ attitude: 1 }]), end('Nem toda magia é soberba.')],
    },
  },
});

dlg({
  id: 'bran_multa',
  npc: 'bran',
  priority: 9,
  when: [{ mem: 'multa_pendente', npc: 'bran', is: true }],
  start: 'a',
  nodes: {
    a: {
      text: 'Três vezes, mago. Três vezes meus guardas viram você soltando luzes dentro dos muros. A multa é de vinte e cinco de ouro. Regra é regra, até para quem tem quatro mil anos.',
      options: [
        { text: 'Pagar a multa (25 de ouro).', tone: 'pragmatico', when: [{ gold: 25 }], lockedText: 'ouro insuficiente', next: 'pago', effects: [{ gold: -25 }, { mem: 'multa_pendente', value: false }, { mem: 'avisos_magia', value: 0 }, { attitude: 1 }] },
        { text: 'Eu salvei esta vila. Não vou pagar por acender uma luz.', tone: 'arrogante', next: 'recusa', effects: [{ attitude: -1 }, { mem: 'multa_pendente', value: false }, { mem: 'avisos_magia', value: 0 }, { set: 'guardas_vigilantes' }] },
      ],
    },
    pago: { text: 'Pronto. Agora some com essas luzes de perto das crianças.' },
    recusa: { text: 'Então meus guardas vão te seguir até a sombra cansar. Considere-se avisado.' },
  },
});

// ===========================================================================
// Conversas gerais dos NPCs nomeados
// ===========================================================================
dlg({
  id: 'maren_geral',
  npc: 'maren',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ mem: 'acordada', is: true }], text: '(Maren aparece na porta, sonolenta.) Se não for o fim do mundo, mago, volte de manhã. ...Bom, já que me acordou, diga.' },
        { when: [{ flag: 'ato1_concluido' }], text: 'Ferroluz espera, mago. Mas Brumafria sempre vai ter uma cadeira perto do fogo para você.' },
        { when: [{ night: true }], text: 'Não ande na rua à noite, mago. Os ventos do pântano trazem coisas.' },
        { when: [{ raining: true }], text: 'Chuva boa para o trigo e ruim para os ossos. Os meus, pelo menos.' },
        { when: [first], text: 'O vento mudou desde que você chegou, mago.' },
        { text: 'Sente-se um pouco. Velhos falam melhor sentados.' },
      ],
      options: [
        { text: 'Fale-me de Brumafria.', tone: 'curioso', next: 'vila', once: true },
        { text: 'O que a senhora sabe sobre a corrupção?', tone: 'curioso', next: 'corrupcao' },
        { text: 'Onde está o Cristal-Chave?', when: [stage('q_corvos', ['acampamento', 'ravena', 'escolha', 'cristal'])], next: 'dica_corvos' },
        end('Preciso ir.'),
      ],
    },
    vila: { text: 'Brumafria sobreviveu a invernos, pestes e reis. Fundaram a vila em volta daquelas torres de cristal apagadas; diziam que um dia elas voltariam a brilhar. Até hoje, nada.', next: 'ola2' },
    corrupcao: {
      text: [
        { when: [{ flag: 'ato1_concluido' }], text: 'Ficou mais lenta desde que o Guardião caiu, mas não parou. É como se alguém do outro lado tivesse aprendido a ter paciência.' },
        { text: 'Começou no Pântano Sombrio, a noroeste. Primeiro a água ficou preta, depois as plantas manchadas, agora bichos e máquinas. Não chegue perto do pântano sem estar pronto.' },
      ],
      next: 'ola2',
    },
    dica_corvos: { text: 'O acampamento dos Corvos fica a sudeste, perto da estrada para Ferroluz. Ravena é a que tem asas pretas no capuz. Traga o cristal, Kaelen.', next: 'ola2' },
    ola2: {
      text: 'Mais alguma coisa?',
      options: [
        { text: 'O que a senhora sabe sobre a corrupção?', tone: 'curioso', next: 'corrupcao' },
        end('Por enquanto, não.'),
      ],
    },
  },
});

dlg({
  id: 'bran_geral',
  npc: 'bran',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ flag: 'guardas_vigilantes' }, { attitude: 1, below: true }], text: 'Meus guardas me contam cada passo seu, sabia? Até agora, nada de errado. Até agora.' },
        { when: [{ flag: 'ravena_poupada' }], text: 'O homem que solta corvas. Precisa de alguma coisa?' },
        { when: [{ flag: 'ato1_concluido' }], text: 'Dizem que você derrubou um gigante de metal. Eu digo que ainda quero ver você derrubar a papelada da guarda.' },
        { when: [{ night: true }], text: 'Noite longa. Se vir algo se mexendo fora da muralha, me avisa antes de explodir.' },
        { text: 'Olhos abertos, mago. Os meus estão.' },
      ],
      options: [
        { text: 'Algum trabalho para mim?', tone: 'pragmatico', next: 'trabalho' },
        { text: 'Como está a guarda?', tone: 'curioso', next: 'guarda', once: true },
        end('Nada, capitão.'),
      ],
    },
    trabalho: { text: 'Contratos ficam no quadro da taverna. Eu pago quando o serviço estiver feito, não antes. E nada de trazer cabeças para dentro da vila; o Calen desmaia.' },
    guarda: { text: 'Tenho seis homens, uma muralha velha e uma vila que acha que o perigo é lenda. Faça as contas. Wen quer ser sargento, Joran quer dormir, Mira quer prender alguém. Alaric quer se aposentar. E eu quero uma cerveja.' },
  },
});

const doranOffer: DialogueOptionDef = { text: 'Você parece mais quieto que a bigorna hoje.', tone: 'compassivo', when: [inactive('q_martelo'), done('q_estranho')], next: 'martelo' };
dlg({
  id: 'doran_geral',
  npc: 'doran',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ mem: 'ajudou', min: 1 }], text: 'Ha! Meu herói favorito! O martelo canta toda manhã graças a você. O que vai ser hoje?' },
        { when: [{ night: true }], text: 'A forja dorme, mas eu não. Quer conversar ou quer aço?' },
        { when: [first], text: 'Ha! O mago das runas! Veio ver aço de verdade?' },
        { text: 'Cuidado com as fagulhas, elas não respeitam magia.' },
      ],
      options: [
        { text: 'Quero ver suas armas e aprimoramentos.', tone: 'pragmatico', effects: [{ shop: 'forja_doran' }] },
        doranOffer,
        { text: 'O martelo ainda está no laboratório.', when: [stage('q_martelo', ['laboratorio', 'martelo'])], next: 'lembrete' },
        { text: 'De onde vem o nome Forjafria?', tone: 'curioso', next: 'nome', once: true },
        end('Até mais, Doran.'),
      ],
    },
    martelo: {
      text: 'Ah, percebeu. Meu pai foi ao Laboratório Abandonado trocar sucata com uns andarilhos, anos atrás, e voltou sem o martelo da família. Disse que uma máquina "acordou" e ele correu. Agora tem um autômato errante rondando lá. Sem aquele martelo, minhas peças saem... honestas. Só honestas.',
      options: [
        { text: 'Eu busco o martelo para você.', tone: 'compassivo', important: true, effects: [{ startQuest: 'q_martelo' }], next: 'aceito' },
        { text: 'E o que eu levo com isso?', tone: 'pragmatico', next: 'paga' },
        end('Talvez outro dia.'),
      ],
    },
    paga: {
      text: 'Uma espada que eu guardo para o dia em que o martelo voltar. E aprimoramento de graça. Palavra de Forjafria.',
      options: [{ text: 'Fechado.', tone: 'pragmatico', important: true, effects: [{ startQuest: 'q_martelo' }], next: 'aceito' }, end('Vou pensar.')],
    },
    aceito: { text: 'O laboratório fica no extremo nordeste, depois das ruínas. Cuidado com o autômato: bate feito marreta e aguenta pancada feito bigorna. O núcleo dele fica nas costas.' },
    lembrete: { text: 'Nordeste, depois das ruínas. E não deixa aquela lata velha te amassar.' },
    nome: { text: 'Meu tataravô temperava aço na neve do norte. "Forja fria", zombavam. Ele fez a melhor espada do vale e o apelido virou sobrenome. Orgulho de família, sabe como é.' },
  },
});

const hildaRumor: DialogueNodeDef = {
  text: [
    { when: [{ flag: 'rumores_hilda' }, { flag: 'ato1_concluido' }], text: 'Dizem que o Barão de Ferroluz mandou buscar engenheiros até da capital. Para quê? Ninguém sabe. Mas ele pagou adiantado, e barão que paga adiantado está com pressa.' },
    { when: [{ flag: 'ravena_poupada' }], text: 'Um viajante jurou que viu uma mulher de capa preta na estrada do sul, sozinha, andando para Ferroluz. Sorrindo. Quem sorri sozinha na estrada?' },
    { when: [{ flag: 'nucleo_absorvido' }], text: 'O Irmão Calen está rezando o dobro desde que você voltou das ruínas. Não leve para o lado pessoal. Ou leve, sei lá.' },
    { when: [done('q_corvos')], text: 'Desde que os Corvos perderam a líder, as estradas estão mais calmas. Sabine até baixou o preço das velas. Um pouco.' },
    { when: [{ quest: 'q_cervo', status: 'inactive' }], text: 'Ilsa anda nervosa. Diz que tem gente de fora caçando à noite na Floresta de Lúmen, atrás do Cervo de Luz.' },
    { text: 'Doran anda resmungando que o martelo do avô sumiu. E o Pedro perdeu de novo a ovelha preta. Vida de vila.' },
  ],
  next: 'ola2',
};

dlg({
  id: 'hilda_geral',
  npc: 'hilda',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ mem: 'ajudou', min: 1 }], text: 'Meu fornecedor preferido de ervas! Senta, senta. O que vai ser?' },
        { when: [{ raining: true }], text: 'Entra, entra, que a chuva não tem pena de ninguém! Sopa quente saindo.' },
        { when: [first], text: 'Entra! Você é o assunto da vila, sabia? O mago da cripta. Senta que eu conto o que andam dizendo.' },
        { text: 'De volta ao Javali Rúnico! Sopa, cama ou fofoca?' },
      ],
      options: [
        { text: 'Quero comprar algo.', tone: 'pragmatico', effects: [{ shop: 'taverna_hilda' }] },
        { text: 'Quero alugar um quarto (10 de ouro).', when: [{ gold: 10 }], lockedText: 'ouro insuficiente', next: 'quarto' },
        { text: 'Algum rumor?', tone: 'curioso', next: 'rumor' },
        { text: 'Você parece preocupada com alguma coisa.', tone: 'compassivo', when: [inactive('q_taverna'), done('q_prologo')], next: 'ervas' },
        end('Até mais, Hilda.'),
      ],
    },
    quarto: {
      text: 'Cama limpa, cobertor grosso e ninguém roncando do lado. Quase ninguém. Até quando?',
      options: [
        { text: 'Até amanhecer.', effects: [{ gold: -10 }, { rest: 'morning', checkpoint: 'taverna_porta' }] },
        { text: 'Até anoitecer.', effects: [{ gold: -10 }, { rest: 'night', checkpoint: 'taverna_porta' }] },
        { text: 'Mudei de ideia.', next: 'ola2' },
      ],
    },
    rumor: hildaRumor,
    ervas: {
      text: 'As ervas-lúmen acabaram, e sem elas nada de poção decente. Crescem na Floresta de Lúmen, entre as raízes; brilham de leve, mais ainda à noite. Se trouxer cinco, pago em poção e em fofoca, que é a moeda mais valiosa da taverna.',
      options: [
        { text: 'Trago as cinco ervas.', tone: 'compassivo', important: true, effects: [{ startQuest: 'q_taverna' }] },
        end('Agora não posso.'),
      ],
    },
    ola2: {
      text: 'Mais alguma coisa, querido?',
      options: [
        { text: 'Quero comprar algo.', effects: [{ shop: 'taverna_hilda' }] },
        { text: 'Outro rumor?', next: 'rumor' },
        end('Só isso.'),
      ],
    },
  },
});

dlg({
  id: 'teodoro_geral',
  npc: 'teodoro',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ flag: 'lore_elyra' }], text: 'Kaelen! Passei a noite comparando as inscrições com as crônicas. Dormir? Dormir é para quem não tem quatro mil anos de história para ler!' },
        { when: [first], text: 'Ah! Você! Quer dizer... bom dia. Você é... você é DE Aeternum? De verdade? Posso tocar no seu manto? Não? Tudo bem.' },
        { text: 'Cuidado com essa pilha, é do século... bem, é velha. O que traz você ao arquivo?' },
      ],
      options: [
        { text: 'O que você sabe sobre Aeternum?', tone: 'curioso', next: 'aeternum' },
        { text: 'Você mencionou as ilhas no céu...', tone: 'curioso', when: [inactive('q_elyra'), done('q_prologo')], next: 'elyra' },
        { text: 'Sobre o Coração do Eclipse...', tone: 'curioso', when: [{ quest: 'q_ecos', status: ['active', 'completed'] }], next: 'eclipse', once: true },
        end('Volto outra hora.'),
      ],
    },
    aeternum: { text: 'Cidade de pedra e circuito, fundada sobre a Arcanotecnia: runas que guiavam o Éter como canos guiam água. Caiu na Grande Cisão. Os livros dizem "por soberba". Eu acho que livro que culpa soberba é livro com preguiça de explicar.', next: 'ola2' },
    elyra: {
      text: 'As Ilhas Suspensas! Elyra era um povo anterior ao Império, e as ilhas têm inscrições nas pedras. Eu vejo pela luneta, mas não leio daqui. Se você voar até lá e decalcar três inscrições... eu daria um olho. Bem, metade de um. E tenho um cajado estranho que talvez sirva para você.',
      options: [
        { text: 'Eu trago os decalques.', tone: 'compassivo', important: true, effects: [{ startQuest: 'q_elyra' }] },
        end('Talvez mais tarde.'),
      ],
    },
    eclipse: { text: 'Coração do Eclipse... há uma única menção nas crônicas: "o coração que une, o coração que devora". Ninguém sabe se é o mesmo coração ou dois. Eu tenho medo de descobrir.', next: 'ola2' },
    ola2: { text: 'Mais alguma pergunta? Por favor, diga que sim.', options: [{ text: 'O que você sabe sobre Aeternum?', next: 'aeternum' }, end('Por hoje, não.')] },
  },
});

dlg({
  id: 'ilsa_geral',
  npc: 'ilsa',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ mem: 'traiu', is: true }], text: '(Ilsa olha através de você, como se fosse neblina.)' },
        { when: [{ mem: 'ajudou', min: 1 }], text: 'Mago. A floresta anda calma. Calma boa.' },
        { when: [first], text: 'Hm. Pisa leve. Tem coisa que ouve longe.' },
        { text: 'Hm.' },
      ],
      options: [
        { text: 'Você parece estar vigiando alguma coisa.', tone: 'curioso', when: [inactive('q_cervo'), done('q_prologo'), { not: { mem: 'traiu', is: true } }], next: 'cervo' },
        { text: 'O que sabe sobre a floresta?', tone: 'curioso', next: 'floresta', when: [{ not: { mem: 'traiu', is: true } }] },
        end('Até mais.'),
      ],
    },
    cervo: {
      text: 'Tem gente de fora caçando à noite. Atrás do Cervo de Luz, o espírito da Floresta de Lúmen. Se matarem ele, a floresta apaga. Eu sou uma só, eles são três. Você... você é um mago.',
      options: [
        { text: 'Eu protejo o cervo.', tone: 'compassivo', important: true, effects: [{ startQuest: 'q_cervo' }], next: 'aceito' },
        { text: 'Quanto pagam por um cervo desses?', tone: 'pragmatico', next: 'preco' },
        end('Não posso agora.'),
      ],
    },
    preco: { text: '...Muito. Mais do que vale a sua alma, se for isso que está perguntando.', options: [{ text: 'Era só curiosidade. Eu ajudo.', important: true, effects: [{ startQuest: 'q_cervo' }], next: 'aceito' }, end('Entendi.')] },
    aceito: { text: 'Ele só aparece à noite, na clareira no coração da floresta. Vá depois do pôr do sol. E não deixe ninguém atirar.' },
    floresta: { text: 'A floresta dá o que você precisa, se você não pegar o que não precisa. As ervas-lúmen brilham à noite. Os lobos também, os olhos. Uns são bons de achar, outros não.' },
  },
});

dlg({
  id: 'sabine_geral',
  npc: 'sabine',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ raining: true }], text: 'Chuva espanta cliente e encharca tecido. Hoje o preço está ótimo. Para mim.' },
        { when: [first], text: 'Tecidos de Ferroluz, poções, quinquilharias. Tudo com preço justo. Justo para mim.' },
        { text: 'Um cliente que voa! Imagine os fretes que eu economizaria.' },
      ],
      options: [
        { text: 'Mostre o que tem.', tone: 'pragmatico', effects: [{ shop: 'loja_sabine' }] },
        { text: 'Olhe esta carta. Reconhece o lacre?', tone: 'curioso', when: [{ item: 'carta_barao' }], next: 'carta', once: true },
        { text: 'Por que vender em Brumafria?', tone: 'curioso', next: 'porque', once: true },
        end('Até mais, Sabine.'),
      ],
    },
    carta: { text: '(Sabine assobia.) Lacre do Barão Teodric. Cera azul com engrenagem: é da chancelaria dele, não de um capanga qualquer. Quem tem isso tem uma porta aberta em Ferroluz. Ou uma corda no pescoço.', effects: [{ set: 'sabine_lacre' }], next: 'ola' },
    porque: { text: 'Brumafria é pequena, mas paga em dia. Em Ferroluz até o ar tem imposto. Um dia eu abro minha casa de comércio lá. Até lá, vendo pano para lavrador e poção para mago.', next: 'ola' },
  },
});

dlg({
  id: 'calen_geral',
  npc: 'calen',
  priority: 1,
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ mem: 'teme_kaelen', is: true }], text: '(Calen dá um passo para trás.) Fale daí mesmo, por favor.' },
        { when: [{ attitude: -2, below: true }], text: 'Já não basta o que você faz na praça? Diga o que quer.' },
        { when: [first], text: 'Que a Aurora ilumine o seu caminho. E que ele passe longe daqui.' },
        { text: 'Guarde as suas luzes, mago. Esta é uma casa de oração.' },
      ],
      options: [
        { text: 'Peço uma bênção, irmão.', tone: 'compassivo', when: [{ attitude: 0 }, { noFlag: 'nucleo_absorvido' }], next: 'bencao' },
        { text: 'Por que o senhor teme tanto a magia?', tone: 'curioso', next: 'medo', once: true },
        { text: 'Sua fé não me impressiona.', tone: 'arrogante', next: 'arrogante', effects: [{ attitude: -1 }] },
        end('Que a Aurora o guarde.'),
      ],
    },
    bencao: { text: '(Calen hesita, depois põe a mão na sua testa.) Que a Aurora cure o que o tempo feriu. ...Pronto. Não conte para ninguém que eu abençoei um mago.', effects: [{ script: 'bencao_calen', now: true }] },
    medo: { text: 'Meu mestre contava que, na Cisão, a magia arrancou o céu do lugar. Que cidades inteiras flutuaram e caíram. Soberba, ele dizia. A Aurora pede humildade. A magia de Aeternum pediu tudo, e levou.', next: 'ola' },
    arrogante: { text: 'Não é para impressionar. É para consolar. Mas acho que você ainda não precisa de consolo. Vai precisar.' },
  },
});

// ===========================================================================
// ATO II — A Cidade de Ferro
// ===========================================================================
dlg({
  id: 'sentinela_portao',
  npc: 'sentinela_ferroluz',
  priority: 20,
  when: [stage('q_ferroluz', 'portao')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'Alto. Ferroluz está fechada por ordem do Barão Teodric. Ninguém entra, ninguém sai. Volte por onde veio, viajante.',
      options: [
        { text: 'Os cristais roubados do meu vale vêm parar aqui.', tone: 'pragmatico', next: 'cristais' },
        { text: 'Esta carta tem o lacre do seu Barão.', tone: 'curioso', when: [{ item: 'carta_barao' }], next: 'carta' },
        { text: 'Abra o portão, ou eu abro.', tone: 'arrogante', next: 'ameaca' },
        { text: 'Meu nome é Kaelen Aurivar.', tone: 'curioso', next: 'nome' },
      ],
    },
    cristais: {
      text: '(Ela baixa a voz.) Chegam carroças de madrugada, cobertas de lona, direto para a torre do Barão. Eu não pergunto. Ninguém pergunta. Quem é você, afinal?',
      options: [
        { text: 'Kaelen Aurivar.', tone: 'pragmatico', next: 'nome' },
        { text: 'Alguém que vai perguntar.', tone: 'arrogante', next: 'nome' },
      ],
    },
    carta: {
      text: '(Mirela examina o lacre e empalidece.) Cera azul com engrenagem. É da chancelaria. Se o Barão anda pagando bandido... não, não é problema meu. Mas ele vai querer ver você. Como se chama?',
      options: [{ text: 'Kaelen Aurivar.', tone: 'pragmatico', next: 'nome' }],
    },
    ameaca: { text: '(Ela ri, sem graça.) Já ouvi isso de gente maior. (Pausa.) Mas nunca de alguém com os olhos brilhando assim. Quem é você?', options: [{ text: 'Kaelen Aurivar.', tone: 'arrogante', next: 'nome' }] },
    nome: {
      text: 'Aurivar? (Mirela recua um passo.) O Barão repete esse nome há semanas. "Quando o Arquimago Aurivar chegar, abram o portão." Eu achava que era mais uma das manias dele.',
      next: 'abrir',
    },
    abrir: {
      text: 'ABRAM O PORTÃO! (Engrenagens rangem atrás da muralha.) O Barão está no pátio, diante da torre de comando. E, forasteiro... tome cuidado com o que ele promete. Ele promete muito.',
      effects: [{ gate: 'portao_ferroluz', open: true }, { set: 'ferroluz_aberta' }, { log: 'A sentinela abriu o portão de Ferroluz. O Barão me esperava pelo nome.', quest: 'q_ferroluz' }],
    },
  },
});

dlg({
  id: 'barao_encontro',
  npc: 'barao',
  priority: 20,
  when: [stage('q_ferroluz', 'barao')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: 'Ah! Finalmente! (Um homem de óculos e capa dourada desce a escada quase correndo.) Teodric Vael, Barão de Ferroluz, a seu dispor. O sábio disse que o senhor viria. Disse até a cor dos seus olhos!',
      options: [
        { text: 'Que sábio?', tone: 'curioso', next: 'sabio' },
        { text: 'Você compra os cristais que os Corvos roubam.', tone: 'pragmatico', next: 'cristais' },
        { text: 'Então sabe quem eu sou.', tone: 'arrogante', next: 'quem' },
      ],
    },
    sabio: {
      text: 'Um conselheiro antigo. Muito antigo. Fala comigo por um espelho de cristal, na minha torre. Me ensinou mais Arcanotecnia em um ano do que a Academia em vinte. Ele quer o mesmo que eu: devolver ao povo as maravilhas de Aeternum.',
      effects: [{ set: 'barao_falou_sabio' }],
      next: 'plano',
    },
    cristais: {
      text: '(Ele ajeita os óculos.) Compro. Não me orgulho. Mas aqueles cristais apodreciam em criptas! Aqui, iluminam ruas e aquecem casas. O sábio diz que é um empréstimo do passado para o futuro.',
      next: 'plano',
    },
    quem: { text: 'O Arquimago Kaelen Aurivar, Guardião do Tempo! Bem, é o que o sábio diz. Confesso que eu imaginava o senhor mais alto.', next: 'plano' },
    plano: {
      text: 'Ferroluz guarda a Forja Celeste, a maior máquina que o Império deixou. Está apagada há quatro mil anos. Acesa, nenhum vilarejo do vale passaria frio de novo. Mas o sábio pediu uma prova antes. Precisa ver que o senhor é quem diz ser.',
      options: [
        { text: 'Que tipo de prova?', tone: 'curioso', next: 'prova' },
        { text: 'Não tenho nada a provar a você.', tone: 'arrogante', next: 'prova' },
      ],
    },
    prova: {
      text: '(Ele estala os dedos. No fundo do pátio, algo enorme se levanta, soltando vapor.) O Colosso de Ferroluz! Ferro, runa e um núcleo de cristal do tamanho de um barril. Se o senhor é mesmo Aurivar, ele não será problema. Se não for... bem, vamos descobrir juntos!',
      effects: [{ log: 'O Barão quer uma prova. A prova tem seis metros de altura.', quest: 'q_ferroluz' }],
      options: [end('Então afaste-se.'), end('Vinte anos de trabalho, e você vai me ver desmontá-lo.')],
    },
  },
});

dlg({
  id: 'barao_pedido',
  npc: 'barao',
  priority: 20,
  when: [stage('q_ferroluz', 'pedido')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: '(Teodric aplaude, encantado.) Magnífico! Vinte anos para construir, e o senhor o desmontou em minutos! O sábio tinha razão. O senhor é ele.',
      options: [
        { text: 'Aquilo podia ter matado alguém.', tone: 'compassivo', next: 'perigo' },
        { text: 'Agora diga o que quer de mim.', tone: 'pragmatico', next: 'pedido' },
      ],
    },
    perigo: { text: 'Ninguém se feriu! Bem, quase ninguém. O Ruço quebrou o braço, mas foi pulando de alegria. (Pigarreia.) Desculpe. Eu me empolgo.', next: 'pedido' },
    pedido: {
      text: 'A Forja Celeste precisa de dois núcleos para acender. O Coração da Tempestade, no pico ao norte, onde chove há quatro mil anos. Uma bruxa guarda o lugar. E um Cristal Primordial, dos Picos de Cristal, a oeste. Lá dorme um dragão.',
      options: [
        { text: 'Uma bruxa e um dragão. Só isso?', tone: 'arrogante', next: 'so' },
        { text: 'Por que o seu sábio quer tanto essa forja?', tone: 'curioso', next: 'porque', once: true },
        { text: 'Eu trago os núcleos.', tone: 'pragmatico', next: 'fim' },
      ],
    },
    so: { text: '(Ele ri, nervoso.) O sábio disse que o senhor diria isso. Com essas mesmas palavras.', next: 'fim' },
    porque: {
      text: 'Ele diz que a forja é o coração de Ferroluz. E que, quando ela bater, ele vai poder vir nos ver em pessoa. (Os olhos dele brilham.) Imagine, mestre: um sábio de Aeternum andando entre nós!',
      effects: [{ set: 'barao_sabio_vir' }],
      options: [
        { text: 'Isso não me tranquiliza.', tone: 'pragmatico', next: 'fim' },
        { text: 'Eu trago os núcleos.', tone: 'pragmatico', next: 'fim' },
      ],
    },
    fim: {
      text: 'Ferroluz fica em dívida com o senhor. Leve estas poções para a viagem. A forja espera há quatro mil anos, e o sábio diz que não espera nem mais um.',
      effects: [{ give: 'pocao_vida', qty: 3 }, { give: 'pocao_energia', qty: 2 }],
    },
  },
});

dlg({
  id: 'barao_espera',
  npc: 'barao',
  priority: 9,
  when: [{ any: [{ quest: 'q_tempestade', status: 'active' }, { quest: 'q_dragao', status: 'active' }] }],
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ item: 'coracao_tempestade' }], text: 'O Coração da Tempestade! Sinto cheiro de chuva daqui. Agora só falta o cristal do dragão.' },
        { when: [{ item: 'cristal_primordial' }], text: 'O Cristal Primordial! Ouviu? Ele canta. Agora só falta o Coração da Tempestade.' },
        { text: 'Alguma notícia da bruxa? Do dragão? O sábio pergunta de hora em hora.' },
      ],
      options: [
        { text: 'Fale mais desse sábio.', tone: 'curioso', next: 'sabio', once: true },
        { text: 'Onde ficam o pico e os picos de cristal?', tone: 'pragmatico', next: 'onde' },
        end('Volto quando tiver os núcleos.'),
      ],
    },
    sabio: {
      text: 'Ele nunca diz o nome. Diz que nomes são correntes. Às vezes, de madrugada, ouço ele rir no espelho. Deve ser o cansaço. O meu, claro. Não o dele.',
      next: 'ola',
    },
    onde: {
      text: 'O Pico das Tempestades é o pico isolado da serra norte, acima do Pântano Sombrio. Os Picos de Cristal ficam no extremo oeste, ao sul do santuário. Siga o brilho: dá para ver de longe à noite.',
      next: 'ola',
    },
  },
});

dlg({
  id: 'barao_forja',
  npc: 'barao',
  priority: 20,
  when: [stage('q_forja', 'forja')],
  start: 'ola',
  nodes: {
    ola: {
      text: 'Os dois núcleos! Rápido, mestre, a forja! Os encaixes ficam na frente, perto dos caixotes. Eu mesmo poli as runas.',
      options: [
        { text: 'Posso ver o seu arquivo?', tone: 'curioso', next: 'arquivo', once: true },
        end('Vamos acender essa forja.'),
      ],
    },
    arquivo: {
      text: 'Meu arquivo? (Ele hesita.) São só cartas. Contas. Nada que interesse a um Arquimago. A porta fica nos fundos da torre, se o senhor faz questão. Eu... não tranco.',
      effects: [{ set: 'barao_hesitou' }],
    },
  },
});

dlg({
  id: 'barao_confronto',
  npc: 'barao',
  priority: 20,
  when: [stage('q_forja', 'confronto')],
  start: 'inicio',
  nodes: {
    inicio: {
      text: '(Teodric está pálido, as mãos tremendo.) Eu ouvi. Todos ouviram. A voz saiu da forja, chamou o senhor de Arquimago e me chamou de "servo fiel". Mestre, quem é o sábio?',
      options: [
        { text: 'É Aldric Valmora, o Antigo Rei. Ele usou você.', tone: 'pragmatico', next: 'rei' },
        { text: 'Você sabia. Lá no fundo, você sabia.', tone: 'arrogante', next: 'sabia' },
      ],
    },
    sabia: { text: '(Ele abre a boca e fecha.) Eu queria acreditar. Ele sabia tanta coisa. Ninguém em Ferroluz me ouvia, e ele me ouvia.', next: 'rei' },
    rei: {
      text: 'O Rei do Eclipse... das canções das avós. (Ele se senta no degrau.) Eu acendi a forja dele. Comprei os cristais dele. Fiz tudo que ele pediu.',
      next: 'decisao',
    },
    decisao: {
      text: 'O que eu faço agora, mestre? O que o senhor vai fazer comigo?',
      options: [
        {
          text: 'Os engenheiros merecem a verdade. Vou contar tudo a Ferroluz, diante de todos.',
          tone: 'pragmatico',
          important: true,
          next: 'expor',
          effects: [
            { choose: 'barao', value: 'exposto' },
            { set: 'barao_exposto' },
            { set: 'barao_destino', value: 'exposto' },
            { log: 'Expus o Barão diante de Ferroluz. A cidade tirou Teodric da torre e agora briga entre si.', quest: 'q_forja' },
          ],
        },
        {
          text: 'Você foi enganado, não é um traidor. Quebre o espelho e me ajude a consertar o que fez.',
          tone: 'compassivo',
          important: true,
          when: [{ any: [{ flag: 'ravena_poupada' }, { item: 'carta_barao' }, { item: 'cartas_arquivo' }] }],
          lockedText: 'Preciso de provas de que ele foi manipulado: a carta com o lacre, as cartas do arquivo ou o testemunho de Ravena.',
          next: 'convencer',
          effects: [
            { choose: 'barao', value: 'redimido' },
            { set: 'barao_redimido' },
            { set: 'barao_destino', value: 'redimido' },
            { attitude: 2 },
            { log: 'Convenci Teodric em particular. Ele quebrou o espelho do "sábio". Ferroluz vai lutar do meu lado.', quest: 'q_forja' },
          ],
        },
        { text: 'Por que os cristais da minha cripta?', tone: 'curioso', next: 'porque', once: true },
      ],
    },
    porque: {
      text: 'Ele disse que os cristais da cripta eram especiais. Que guardavam um homem dormindo, e que esse homem precisava acordar para a forja funcionar. (Ele olha para você, horrorizado.) Ele precisava que o senhor acordasse. Fui eu que mandei os Corvos à cripta.',
      effects: [{ set: 'barao_confessou' }],
      next: 'decisao',
    },
    expor: {
      speaker: 'narrador',
      text: '(Você sobe a escada da torre e fala alto. Os engenheiros param as máquinas para ouvir. Quando você termina, ninguém diz nada por um bom tempo. Então a sentinela Mirela tira o elmo e segura o Barão pelo braço.)',
      effects: [{ script: 'barao_exposto' }],
    },
    convencer: {
      text: [
        { when: [{ item: 'cartas_arquivo' }], text: '(Você mostra as cartas do arquivo, com as respostas escritas numa letra de quatro mil anos.) ...Eu nunca reparei na letra. Nunca quis reparar.' },
        { when: [{ flag: 'ravena_poupada' }], text: '(Você conta o que Ravena disse do homem de luvas.) A própria Corva sabia, e eu não. Que tolo eu fui.' },
        { text: '(Você mostra a carta com o lacre da chancelaria.) Minha própria cera, pagando bandidos. Que tolo eu fui.' },
      ],
      next: 'convencer2',
    },
    convencer2: {
      text: '(Teodric sobe a torre. Você ouve vidro se partindo.) Pronto. O espelho acabou. Ferroluz vai pagar a dívida que eu fiz, mestre. Quando o Rei vier, os canhões da cidade vão estar apontados para ele, não para o senhor.',
      effects: [{ script: 'barao_convencido' }],
    },
  },
});

dlg({
  id: 'barao_depois',
  npc: 'barao',
  priority: 7,
  when: [{ flag: 'barao_redimido' }],
  start: 'ola',
  nodes: {
    ola: {
      text: [
        { when: [{ flag: 'jogo_concluido' }], text: 'Mestre! Ferroluz inteira fala do senhor. Os canhões nunca dispararam tão bonito.' },
        { text: 'Os canhões estão limpos e apontados para o céu, mestre. Quando o Rei aparecer, Ferroluz responde.' },
      ],
      options: [{ text: 'Como está a cidade?', tone: 'curioso', next: 'cidade' }, end('Até breve, Teodric.')],
    },
    cidade: { text: 'Envergonhada, mas de pé. Os engenheiros me deixaram ficar na torre se eu varrer a oficina toda manhã. É justo. A vassoura é a primeira máquina honesta que eu uso em anos.' },
  },
});

// ===========================================================================
// ATO III — O Cavaleiro do Eclipse
// ===========================================================================
dlg({
  id: 'darian_escolha',
  npc: 'darian_rendido',
  priority: 20,
  when: [stage('q_darian', 'escolha')],
  start: 'inicio',
  nodes: {
    inicio: {
      speaker: 'darian',
      text: '(Darian está de joelhos, a espada negra cravada na terra. A voz sai rouca de dentro do elmo.) Quatro mil anos, mestre. Quatro mil anos no farol, esperando você voltar. Você fechou a porta e me deixou do lado de fora.',
      options: [
        { text: 'Eu me lembro. Escolhi o mundo em vez de você.', tone: 'compassivo', next: 'lembro' },
        { text: 'E você escolheu servir ao Rei.', tone: 'pragmatico', next: 'rei' },
        { text: 'Você foi fraco, Darian.', tone: 'arrogante', next: 'fraco' },
      ],
    },
    lembro: { speaker: 'darian', text: 'Você lembra. (Ele ri, e soa como choro.) Eu achava que, se você lembrasse, doeria menos. Não dói menos.', next: 'decisao' },
    rei: { speaker: 'darian', text: 'O Rei me achou no farol. Disse que você tinha nos traído e que só ele podia trazer você de volta. Ele cumpriu, não cumpriu? Aqui está você.', next: 'decisao' },
    fraco: { speaker: 'darian', text: 'Fraco. (Ele aperta o cabo da espada.) Eu tinha dezesseis anos, mestre. Você era tudo que eu tinha.', next: 'decisao' },
    decisao: {
      speaker: 'darian',
      text: 'Acabe com isso. Ou não. Eu já não sei o que quero. O Rei vai saber que eu perdi.',
      options: [
        {
          text: 'Volte comigo, Darian. Você ainda pode acender aquele farol.',
          tone: 'compassivo',
          important: true,
          when: [{ flag: 'frag_farol' }, { item: 'fragmento_memoria', min: 5 }],
          lockedText: 'Preciso lembrar mais de Darian: o fragmento do Farol Celeste e pelo menos 5 fragmentos de memória.',
          next: 'redimir',
          effects: [
            { choose: 'darian', value: 'redimido' },
            { set: 'darian_redimido' },
            { set: 'darian_destino', value: 'redimido' },
            { give: 'emblema_darian' },
            { log: 'Estendi a mão para Darian, e ele aceitou. Disse que vai estar comigo quando o eclipse vier.', quest: 'q_darian' },
          ],
        },
        {
          text: 'Você fez a sua escolha há quatro mil anos. Esta é a minha.',
          tone: 'pragmatico',
          important: true,
          next: 'matar',
          effects: [
            { choose: 'darian', value: 'morto' },
            { set: 'darian_morto' },
            { set: 'darian_destino', value: 'morto' },
            { give: 'insignia_eclipse' },
            { log: 'Darian caiu diante da torre onde aprendeu os primeiros feitiços. Fiquei com a insígnia dele.', quest: 'q_darian' },
          ],
        },
        { text: 'Onde está o Rei?', tone: 'curioso', next: 'onde', once: true },
      ],
    },
    onde: {
      speaker: 'darian',
      text: 'Na Cidadela Celeste, onde sempre esteve. Ela dorme nas nuvens sobre o Desfiladeiro das Cinzas. Quando o Coração bater forte o bastante, ela desce. Falta pouco.',
      next: 'decisao',
    },
    redimir: {
      speaker: 'darian',
      text: '(Darian tira o elmo. É só um rapaz, de olhos fundos e cansados.) O farol. Você lembra do farol. (Ele se levanta devagar.) Quando o eclipse vier, mestre, eu vou estar lá. Desta vez eu fico.',
      effects: [{ script: 'darian_redimir' }],
    },
    matar: {
      speaker: 'darian',
      text: '(Darian fecha os olhos e abaixa a cabeça.) Então faça direito. Ele nunca fazia direito.',
      effects: [{ script: 'darian_matar' }],
    },
  },
});

// ===========================================================================
// ATO IV — O Coração do Eclipse (a escolha final)
// ===========================================================================
dlg({
  id: 'coracao_final',
  npc: 'coracao_eclipse',
  priority: 20,
  when: [stage('q_eclipse', 'escolha')],
  start: 'inicio',
  nodes: {
    inicio: {
      speaker: 'coracao',
      text: '(O Coração do Eclipse pulsa no ar, devagar, como se respirasse. De dentro dele vem a sua própria voz, mais jovem.) "Ele vai unir magia e máquina sem que nenhuma devore a outra."',
      next: 'kaelen',
    },
    kaelen: {
      speaker: 'kaelen',
      text: 'Eu desenhei você para unir. Aldric usou você para devorar. E agora você espera por mim, como sempre esperou.',
      next: 'escolha',
    },
    escolha: {
      speaker: 'narrador',
      text: [
        { when: [{ flag: 'nucleo_absorvido' }], text: 'O Coração bate no mesmo ritmo que o núcleo do Guardião dentro de você. Ele sabe o que você já tomou. Três caminhos se abrem.' },
        { text: 'O Coração bate devagar, esperando. Três caminhos se abrem diante dele.' },
      ],
      options: [
        {
          text: 'Usar o Coração como ele foi pensado: reunir magia e máquina. E deixar meu poder ir junto.',
          tone: 'compassivo',
          important: true,
          when: [{ flag: 'guardiao_libertado' }, { any: [{ flag: 'barao_redimido' }, { flag: 'darian_redimido' }] }, { item: 'fragmento_memoria', min: 6 }],
          lockedText: 'Reunificação: exige ter libertado o Guardião, redimido o Barão ou Darian e reunido 6 fragmentos de memória.',
          next: 'reunificacao',
          effects: [{ choose: 'final', value: 'reunificacao' }],
        },
        {
          text: 'Selar Aldric de novo, e eu junto com ele. O mundo fica dividido, mas seguro.',
          tone: 'pragmatico',
          important: true,
          next: 'selo',
          effects: [{ choose: 'final', value: 'selo' }],
        },
        {
          text: 'Beber o Coração. Se alguém tem que ser o eclipse, que seja eu.',
          tone: 'arrogante',
          important: true,
          when: [{ flag: 'nucleo_absorvido' }, { any: [{ flag: 'ravena_executada' }, { flag: 'barao_exposto' }, { flag: 'darian_morto' }] }],
          lockedText: 'Ascensão Sombria: exige ter absorvido o núcleo do Guardião e ter feito ao menos uma escolha implacável.',
          next: 'sombrio',
          effects: [{ choose: 'final', value: 'sombrio' }],
        },
        { text: '(Ficar mais um pouco em silêncio.)', tone: 'curioso', next: 'silencio', once: true },
      ],
    },
    silencio: {
      speaker: 'kaelen',
      text: 'Quatro mil anos dormindo, e a decisão continua a mesma. Eu só tenho menos desculpas agora.',
      next: 'escolha',
    },
    reunificacao: { speaker: 'kaelen', text: 'Seja o que você deveria ter sido.', effects: [{ script: 'final_reunificacao' }] },
    selo: { speaker: 'kaelen', text: 'Mais uma vez, então. Pela última vez.', effects: [{ script: 'final_selo' }] },
    sombrio: { speaker: 'kaelen', text: 'Você é meu. Sempre foi.', effects: [{ script: 'final_sombrio' }] },
  },
});

// ===========================================================================
// Moradores e guardas — conversa gerada a partir de src/data/npcs.ts
// ===========================================================================
/** Rumores por estágio da história (cada NPC escolhe um pelo índice, para variar). */
const RUMORS: { when: Cond[]; lines: string[] }[] = [
  {
    when: [{ flag: 'ato1_concluido' }],
    lines: [
      'Dizem que você derrubou um gigante de metal nas ruínas. Meu primo jura que ouviu o estrondo daqui.',
      'Agora que as ruínas estão abertas, Teodoro não sai mais do arquivo. Nem para comer.',
      'Ferroluz, Ferroluz... todo mundo só fala de Ferroluz agora. O que tem lá que não tem aqui? Além de imposto.',
    ],
  },
  {
    when: [{ flag: 'nucleo_absorvido' }],
    lines: ['O Irmão Calen disse que você trouxe uma sombra das ruínas. Eu não vejo sombra nenhuma. Vejo?', 'Minha vela apagou quando você passou ontem. Deve ter sido o vento. Né?'],
  },
  {
    when: [{ flag: 'guardiao_libertado' }],
    lines: ['Vi uma luz azul subindo das ruínas, noite passada. Bonita que só. Foi você?', 'O Irmão Calen está estranho. Sorrindo. Calen sorrindo! Fim dos tempos.'],
  },
  {
    when: [{ flag: 'ravena_poupada' }],
    lines: ['Você soltou a líder dos Corvos? O capitão ficou uma fera. Eu acho que foi bonito. Arriscado, mas bonito.', 'Se a Corva voltar, a culpa é sua, viu? Brincadeira. Quase.'],
  },
  {
    when: [{ flag: 'ravena_executada' }],
    lines: ['Dizem que a líder dos Corvos não vai roubar mais ninguém. As estradas estão mais calmas.', 'O capitão anda até sorrindo desde que a Corva caiu. Assusta mais que ele bravo.'],
  },
  {
    when: [{ quest: 'q_corvos', status: 'active' }],
    lines: ['Os Corvos levaram as carroças do Tomás no mês passado. Se for atrás deles, acerta um por mim.', 'Dizem que a líder dos Corvos corta uma vela ao meio no escuro. Com os olhos fechados.'],
  },
  {
    when: [],
    lines: [
      'Apareceram manchas roxas nas plantações perto do pântano. Lia está desesperada.',
      'As abelhas do Anselmo não voam mais para o norte. Ele diz que é mau sinal. Ele diz isso de tudo.',
      'O Vovô Ernesto jura que viu um dragão de novo. Do tamanho de três celeiros. Sempre três.',
      'Os guardas andam dobrando o turno. Alguém abre o portão leste de madrugada.',
      'Tem cavalos selvagens nos campos ao sul da vila. Chegando de mansinho, dá para montar. Segurar é outra história.',
    ],
  },
];

function villagerDialogue(n: NpcDef, index: number): DialogueDef {
  const lines = n.lines ?? { hello: ['Bom dia.'], about: 'A vida aqui é simples.' };
  const hello0 = lines.hello[0];
  const hello1 = lines.hello[1] ?? lines.hello[0];
  const guard = n.faction === 'guard';
  const greet = [
    { when: [{ mem: 'assustado', is: true }] as Cond[], text: guard ? 'Mãos longe do cajado, mago. Já vi o que você faz na praça.' : 'Você de novo... só não faça aquelas luzes perto de mim, por favor.' },
    { when: [{ attitude: -2, below: true }] as Cond[], text: guard ? 'Diga o que quer e siga em frente.' : '(Desvia o olhar.) O que foi?' },
    { when: [{ raining: true }] as Cond[], text: guard ? 'Chuva de rachar. Nem o pântano anda com um tempo desses.' : 'Que aguaceiro! Corre para debaixo de um telhado, mago.' },
    { when: [{ night: true }] as Cond[], text: guard ? 'Noite fechada. Volta para dentro dos muros, se puder.' : 'Tão tarde e você na rua? Cuidado com o que vem do pântano.' },
    { when: [first] as Cond[], text: hello0 },
    { text: hello1 },
  ];
  const rumorNode: DialogueNodeDef = {
    text: RUMORS.map((r) => ({ when: r.when, text: r.lines[index % r.lines.length] })),
    next: 'ola2',
  };
  const opts: DialogueOptionDef[] = [
    { text: guard ? 'Como está a vigília?' : 'Como vão as coisas por aqui?', tone: 'curioso', next: 'vida' },
    { text: 'Ouviu alguma novidade?', tone: 'curioso', next: 'rumor' },
  ];
  if (lines.worry) opts.push({ text: 'Você parece preocupado com alguma coisa.', tone: 'compassivo', next: 'worry', once: true });
  opts.push(end(guard ? 'Bom turno.' : 'Até logo.'));
  const nodes: Record<string, DialogueNodeDef> = {
    ola: { text: greet, options: opts },
    vida: { text: lines.about, next: 'ola2' },
    rumor: rumorNode,
    ola2: {
      text: guard ? 'Mais alguma coisa? Estou de serviço.' : 'Mais alguma coisa?',
      options: [{ text: 'Ouviu alguma novidade?', next: 'rumor' }, end('Não, obrigado.')],
    },
  };
  if (lines.worry) nodes.worry = { text: lines.worry, next: 'ola2' };
  return { id: `${n.id}_geral`, npc: n.id, priority: 1, start: 'ola', nodes };
}

NPCS.forEach((n, i) => {
  if (!D[`${n.id}_geral`]) dlg(villagerDialogue(n, i));
});

export const DIALOGUES: Record<string, DialogueDef> = D;
