# Plano: Site + Google por R$250/mês

Pesquisa feita em 07/10/2026. Pensado para quem tem notebook e internet, 2 horas por dia, não quer aparecer em vídeo, precisa da primeira receita em até 48 horas e quer cobrar mensalidade de R$250.

## Resumo em 30 segundos

- **O que vender:** "Presença Digital Local". Um site de 1 página e o Perfil da Empresa no Google (o que aparece no Maps) configurado e atualizado todo mês, por **R$250/mês, sem taxa de criação**.
- **Para quem:** comércios de bairro que só têm Instagram. Esta pasta já tem 10 em Taguatinga Norte, com telefone, Instagram e prompt de site.
- **Como vender sem aparecer:** pelo WhatsApp Business, com logo e nome de marca, mandando uma prévia pronta do site do próprio comércio.
- **Quanto gasta para começar:** R$0. O domínio (R$40/ano) fica no nome do cliente e é pago por ele direto ao Registro.br, depois que ele fecha.
- **Lucro em 2 dias:** dá para conseguir, mas não tem garantia. Depende do volume, e o WhatsApp limita conversas novas (veja o [passo a passo](PASSO-A-PASSO.md)). A meta é de 5 a 7 conversas novas por dia no WhatsApp, mais mensagens diretas no Instagram da marca.

## Por que esta ideia e não outras

| Ideia | Sem rosto | Cabe em 2h/dia | Dinheiro em 48h | Mensalidade de R$250 faz sentido | Veredito |
|---|---|---|---|---|---|
| **Site + Google por assinatura para comércio local** | Sim | Sim (cerca de 1h por cliente por mês depois de pronto) | Possível: o cliente vê a prévia e paga por Pix | Sim. Sai mais barato que o mercado e o serviço é contínuo (hospedagem, domínio, atualizações) | **Escolhida** |
| Gestão de Instagram (posts e stories) | Sim | Pouco: 12 posts por cliente toma muito tempo | Possível | Não. Social media iniciante cobra R$800 a R$1.500/mês; por R$250 o trabalho não fecha a conta | Vender depois, como adicional |
| Robô de atendimento no WhatsApp | Sim | Sim | Difícil: configuração mais técnica | Sim | Vender depois, como adicional |
| Freelancer em plataformas (Workana, 99Freelas) | Sim | Sim | Difícil: sem avaliações, o primeiro trabalho demora | Não, cobra-se por projeto | Não atende |
| Canal "dark" no YouTube ou TikTok | Sim | Sim | Não: monetização leva meses | Não | Não atende |
| "Ganhe para curtir vídeos ou fazer tarefas" | Sim | Sim | Não | Não | **Golpe.** Pagam pouco no começo e depois pedem "investimento" |

## O que a pesquisa mostrou

**Preço: R$250 é competitivo**
- Social media iniciante cobra de R$800 a R$1.500 por cliente/mês; gestão básica de 1 rede com 12 posts sai de R$1.200 a R$2.500/mês (HeroSpark).
- Uma agência anuncia gestão local de Google, SEO e tráfego por R$597/mês (página de cobrança no Asaas).
- Um plano de site anunciado no Asaas cobra R$2.497 de criação e mais R$99/mês. Sem taxa de criação, R$250/mês é bem mais fácil de aceitar para o dono de um comércio pequeno.
- Manutenção de site costuma custar entre R$50 e R$500/mês (Locaweb).

**Mercado**
- Na pesquisa do Sebrae de 2022, 74% dos pequenos negócios vendiam pelo WhatsApp, 42% pelas redes sociais e só 17% por um site próprio. Ou seja, a maioria ainda não vende por site.
- 98% dos pequenos empreendedores usam internet e 76% usam computador (Sebrae, 2025). O dono responde WhatsApp e consegue abrir um link de prévia.

**Custos**
- Domínio .com.br: R$40/ano no Registro.br.
- Hospedagem: R$0 no Cloudflare Pages, cujo plano grátis permite uso comercial e tem banda ilimitada.
- **Não use o plano Hobby da Vercel para site de cliente.** Os termos dele proíbem uso comercial, e site feito para cliente pagante conta como comercial. O plano pago custa US$20/mês.

**Formalização e impostos** (isto não é consultoria contábil)
- **Social media e criação de sites não podem ser MEI.** Social media saiu da lista no fim de 2022, e programação e desenvolvimento de sites não estão na lista de ocupações permitidas. Não abra MEI com uma ocupação "parecida": isso dá desenquadramento, imposto retroativo e multa.
- Para começar, dá para receber como pessoa física e declarar. Em 2026, quem ganha até R$5.000/mês fica isento de IR no ajuste anual (Lei 15.270/2025). O carnê-leão mensal continua existindo para valores recebidos de pessoas físicas, e o que for pago a mais volta na restituição.
- Quando passar de 3 a 4 clientes ou alguém pedir nota fiscal, abra uma ME no Simples Nacional com um contador.

**Cobrança mensal**
- O **Pix Automático** (cobrança recorrente por Pix) só é liberado para CNPJ ativo há pelo menos 6 meses (Resolução BCB 482). No começo você não consegue usar.
- Comece assim: Pix manual com lembrete no dia do vencimento. Outra opção é o link de assinatura do Mercado Pago (cartão, Pix ou boleto, com nova tentativa automática quando o pagamento falha). Confira se a sua conta de pessoa física tem acesso.

## Requisitos

### Checklist de contas e ferramentas (tudo grátis)
- [ ] WhatsApp Business com nome de marca (ex.: "Vitrine Local Taguatinga") e logo, sem foto pessoal. Se puder, use um chip separado.
- [ ] Gmail da marca.
- [ ] Conta no Cloudflare (Pages) para publicar os sites. Dá para subir a pasta do site arrastando, sem precisar de Git.
- [ ] Uma IA para gerar o site (Claude ou outra) e o Canva grátis para logo e imagens.
- [ ] Chave Pix. A conta de pessoa física serve no começo. O cliente vai ver o seu nome no comprovante, e isso é normal.
- [ ] Planilha simples de clientes: nome, contato, dia do vencimento, status do pagamento e data da última atualização.

### O que você precisa saber fazer (aprende em 1 a 2 horas)
- Pedir um site de 1 página para a IA (prompt pronto no fim deste arquivo) e publicar no Cloudflare Pages.
- Mexer no Perfil da Empresa no Google: o dono te adiciona como **administrador**, então você não precisa da senha dele. Se o perfil ainda não existe ou não foi verificado, quem faz a verificação é o dono (às vezes por um vídeo da fachada), e você orienta pelo WhatsApp.
- Registrar o domínio no Registro.br **no CPF ou CNPJ do cliente**. O domínio é dele, e isso evita briga se um dia ele cancelar.

## A oferta: o que entra nos R$250/mês

1. Site de 1 página feito para celular: o que vende, fotos, horário, mapa e botão de WhatsApp.
2. Hospedagem incluída. O domínio .com.br fica no CPF ou CNPJ do cliente, que paga R$40/ano direto ao Registro.br.
3. Perfil da Empresa no Google completo: categorias, horário, fotos, link do site e WhatsApp.
4. 4 postagens por mês no Perfil do Google (promoções, novidades).
5. Respostas às avaliações do Google.
6. Até 2 alterações por mês no site (preço, cardápio, horário, promoção).
7. Print mensal das visualizações e ligações vindas do Google.

**Regras:** o 1º mês é pago antes de o site ir para o ar. Depois, a mensalidade vence todo mês no mesmo dia. Para cancelar, basta avisar com 30 dias. Com 7 dias de atraso, o site fica pausado. O domínio é sempre do cliente. Por regra do Google, avise por escrito que o Perfil da Empresa é gratuito (os R$250 são pelo seu trabalho), nunca garanta posição no Google e, se o cliente cancelar, saia do perfil dele.

**Adicionais para vender depois:** 8 posts de Instagram por mês (+R$300), robô de respostas no WhatsApp e site "premium" com 3D, usando os prompts que já estão em `prompts/` (cobrando taxa de criação).

## Plano de 48 horas (2 horas por dia)

O roteiro clique a clique, as mensagens personalizadas para os 10 comércios e o termo de serviço estão no **[PASSO-A-PASSO.md](PASSO-A-PASSO.md)**. Resumo:

- **Dia 1:** marca e logo, WhatsApp Business num chip separado, publicar as 3 prévias prontas em `previas/` no Cloudflare Pages, e mandar 7 mensagens no WhatsApp e 2 no Instagram.
- **Dia 2:** mandar o link para quem respondeu, fazer prévias novas para quem pediu, abordar de 5 a 7 comércios novos e fechar com termo + Pix.

**Como abordar sem ser bloqueado:** uma mensagem só, personalizada, pedindo permissão para mandar o link da prévia. O link vai só depois da resposta. Faça um único lembrete, 3 a 5 dias depois. A Meta testa desde 2025 um limite para mensagens sem resposta, e em setembro de 2026 saíram relatos, ainda sem confirmação oficial, de um teto de 150 conversas novas por mês.

**Plano B (se ninguém fechar a mensalidade em 48h):** ofereça uma configuração avulsa do Perfil da Empresa no Google por R$150, paga antes, deixando claro que o Perfil é gratuito e que você cobra pelo serviço. Depois ofereça a mensalidade para manter tudo atualizado.

**Conta de volume (é uma hipótese, não um dado de pesquisa):** com umas 20 abordagens em 2 dias, entre WhatsApp e Instagram, 1 cliente já paga o primeiro mês (R$250, sem custo seu). Com 7 abordagens por dia útil, são cerca de 150 por mês. Se 1 em cada 20 fechar, isso dá uns 7 clientes novos por mês.

### Respostas para objeções
- **"Tá caro."** São menos de R$9 por dia. Um cliente a mais por mês já paga, e não tem taxa de criação.
- **"Já tenho Instagram."** O Instagram funciona para quem já te segue. O site e o Google são para quem ainda não te conhece e está pesquisando "[ramo] perto de mim".
- **"Vou pensar."** Claro! A prévia fica no ar até [dia]. Se quiser mudar alguma coisa nela antes de decidir, é só falar.
- **"Meu sobrinho faz."** Tranquilo! Se ele não tiver tempo de manter o Google e o site atualizados, estou por aqui.
- **"O Google não é de graça?"** É, sim! O Perfil da Empresa é gratuito. Os R$250 são pelo meu trabalho de montar, atualizar todo mês, responder avaliações e manter o site no ar.

## Termo de serviço

O termo atualizado, que inclui as regras do Google para quem gerencia o perfil de terceiros (perfil gratuito, dono continua proprietário, sem garantia de posição, saída do perfil ao cancelar), está no [Passo 8 do PASSO-A-PASSO.md](PASSO-A-PASSO.md#passo-8-fechar-a-venda).

## Prompt rápido para a prévia do site

Os prompts que já estão em `prompts/` pedem 3D e animações pesadas (React Three Fiber, GSAP). Eles servem para um pacote premium, mas demoram para fazer e ficam pesados no celular de quem está na rua. Para a prévia, use este:

```
Crie um site de UMA página, em um único arquivo index.html (HTML, CSS e o mínimo de JavaScript, sem frameworks), para [NOME], [RAMO], em [ENDEREÇO], Taguatinga - DF.

Use SÓ estes dados reais: [telefone/WhatsApp, Instagram, horário, produtos ou serviços]. Não invente preços, prêmios, depoimentos nem horários. Onde faltar informação, escreva {{CONFIRMAR}}.

Seções:
1. Topo com o nome, uma frase curta e o botão "Chamar no WhatsApp" (link https://wa.me/55DDDNUMERO?text=Oi,%20vim%20pelo%20site).
2. O que oferecemos (3 a 6 itens).
3. Galeria com 6 fotos (use espaços com imagem de exemplo).
4. Horário e endereço, com o mapa do Google incorporado.
5. Rodapé com o link do Instagram.

Requisitos: feito primeiro para celular; carregar rápido em 4G; botão de WhatsApp fixo no canto da tela; paleta [cores do Instagram do negócio]; uma fonte do Google Fonts; title, meta description e Open Graph; schema.org LocalBusiness com nome, endereço, telefone e horário; e <meta name="robots" content="noindex"> porque é uma prévia.
```

Os dados de cada comércio estão em `comercios.json`. As 3 primeiras prévias já estão prontas em `previas/`. Em cada pasta nova, copie também o arquivo `_headers`, que esconde o endereço `.pages.dev` do Google. Quando o cliente fechar, tire o `noindex` e a faixa de prévia e troque as fotos de exemplo pelas fotos dele.

## Quanto dá para ganhar

Tempo por cliente: de 2 a 3 horas para montar tudo e cerca de 1 hora por mês para manter. Com 2 horas por dia (60 horas por mês), sobra tempo para atender uns 20 clientes e ainda prospectar.

| Clientes | Receita por mês | Seu custo por mês | Horas de manutenção por mês |
|---|---|---|---|
| 1 | R$250 | R$0 | ~1 h |
| 4 | R$1.000 | R$0 | ~4 h |
| 8 | R$2.000 | R$0 | ~8 h |
| 12 | R$3.000 | R$0 | ~12 h |
| 20 | R$5.000 | R$0 | ~20 h |

O domínio é pago pelo cliente e a hospedagem no Cloudflare é grátis. Sua despesa é só a recarga do chip do WhatsApp e, quando formalizar, o contador e os impostos.

## Riscos e cuidados

- **Bloqueio no WhatsApp:** mande mensagens uma a uma, personalizadas e num balão só, com no máximo 5 a 7 conversas novas por dia, e sem programa de disparo em massa. Peça permissão antes de mandar o link. Se alguém pedir para parar, pare.
- **Prévia sem autorização:** deixe a prévia com `noindex` num endereço `*.pages.dev`, mande só para o dono e tire do ar se ele recusar. Nunca registre domínio com o nome de um negócio sem o dono pedir.
- **Hospedagem:** use o Cloudflare Pages, porque o Hobby da Vercel proíbe site de cliente.
- **Cliente que para de pagar:** o site fica pausado depois de 7 dias de atraso. Como o custo é quase zero, você não perde dinheiro.
- **Dados desatualizados:** os telefones e horários de `comercios.json` vêm de páginas públicas. Confirme antes de publicar.
- **Golpes de "trabalho em casa":** nenhum trabalho de verdade pede pagamento adiantado para você começar.

## Fontes

- Preços de social media: [HeroSpark](https://herospark.com/blog/quanto-cobra-um-social-media/), [Jamile Fernandes, precificação 2026](https://jamilefernandes.com.br/blog/precificacao-para-social-media-quanto-cobrar-em-2026)
- Manutenção de site: [Locaweb](https://www.locaweb.com.br/blog/?p=33997)
- Exemplos de preço no Asaas: [Gestão Completa Local, R$597/mês](https://www.asaas.com/c/i5f7lu7xu7jbqpwb), [Criação de Site, Plano Gold](https://www.asaas.com/c/920817489856)
- Sebrae: [Pequenos negócios ampliam presença digital](https://agenciasebrae.com.br/dados/pequenos-negocios-ampliam-presenca-digital-para-conquistar-clientes), [Digitalização recorde em 2025](https://agenciasebrae.com.br/inovacao-e-tecnologia/digitalizacao-recorde-pequenos-negocios-no-brasil-atingem-nivel-historico-em-2025/)
- Domínio: [TecMundo, preço do .com.br](https://www.tecmundo.com.br/internet/405860-descubra-quanto-custa-um-dominio-de-site-e-como-registrar-o-seu.htm)
- Hospedagem: [Limites do Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits), [Vercel Hobby sem uso comercial](https://vercel.com/docs/v2/platform/fair-use-policy)
- MEI: [Social media não pode ser MEI](https://tactus.com.br/social-media-pode-ser-mei), [Programador não pode ser MEI](https://contabilidade.com/blog/programador-pode-ser-mei-descubra-como-abrir-empresa/), [DAS MEI 2026](https://meutudo.com.br/blog/noticias/2025/12/11/contribuicao-do-mei-em-2026-sobe-com-reajuste-do-salario-minimo-veja-quanto-pagar-por-setor/)
- IR 2026: [Contabilizei, carnê-leão 2026](https://www.contabilizei.com.br/contabilidade-online/carne-leao-2026/)
- Cobrança: [Regras do Pix Automático (Mobile Time)](https://www.mobiletime.com.br/noticias/09/06/2025/pix-automatico-regras-bc/), [Fenacon sobre Pix Automático e MEI](https://fenacon.org.br/noticias/pix-automatico-torna-se-obrigatorio-e-promete-facilitar-a-vida-dos-microempreendedores-individuais/), [Assinaturas do Mercado Pago](https://www.mercadopago.com.br/blog/link-pagamento-recorrencia-servicos-assinatura)
- Golpes: [ESET, task scams](https://www.welivesecurity.com/pt/golpes-fraudes/task-scams-golpes-prometem-renda-extra-para-as-vitimas/)
