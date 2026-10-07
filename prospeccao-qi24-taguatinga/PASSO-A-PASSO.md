# Passo a passo para começar: Site + Google por R$250/mês

Guia prático do [plano de negócio](PLANO-SITE-E-GOOGLE-R250.md). Conferido em 07/10/2026 com as páginas de ajuda do WhatsApp, do Cloudflare, do Registro.br e do Google (fontes no fim).

Os nomes de menu mudam entre versões do app. Se algum não bater com a sua tela, procure no menu **⋮ (Mais)**.

## O que já está pronto nesta pasta

- **3 prévias de site**, prontas para subir: [Churrasquinho do Bruce](previas/churrasquinho-do-bruce/index.html), [Seu Zé e Seu Mané](previas/seu-ze-e-seu-mane/index.html) e [Poco Loco Pizzaria](previas/poco-loco/index.html).
  - Usam só dados públicos (horário, endereço, WhatsApp, Instagram), sem inventar preço nem prato.
  - Têm faixa de "prévia, não é o site oficial" e não aparecem no Google.
  - Foram testadas na tela do celular e do computador.
- **Mensagens prontas** para os 10 comércios da lista (Passo 5).
- **Termo de serviço** pronto para mandar no WhatsApp (Passo 8).

---

# DIA 1 (2 horas)

## Passo 1. Nome da marca, logo e e-mail (15 min)

1. Escolha um nome de **marca + lugar**, por exemplo "Vitrine Local Taguatinga".
   - Não use o seu nome pessoal.
   - O WhatsApp recusa nomes que sejam só uma palavra genérica ("Sites") ou só um lugar ("Taguatinga").
2. Faça um logo quadrado no Canva grátis, legível mesmo pequeno. Não use foto sua.
3. Crie um Gmail da marca (ex.: vitrinelocaltaguatinga@gmail.com). Use ele no WhatsApp, no Cloudflare e no Registro.br.

## Passo 2. WhatsApp Business sem mostrar o rosto (25 min)

1. **Use um chip separado** (pré-pago ou eSIM). Se o celular for dual-SIM, o WhatsApp normal fica no chip pessoal e o WhatsApp Business no chip novo.
   - Assim, se o número de vendas for bloqueado, o pessoal não é afetado.
   - Também evita que o prospect veja sua foto e seus grupos pessoais.
   - Faça recarga de vez em quando: chip sem recarga é cancelado e a conta vai junto.
2. Instale o **WhatsApp Business** (Play Store ou App Store) e toque em "Concordar e continuar". Escolha Brasil (+55), digite o número novo e coloque o código do SMS.
3. Preencha o nome da marca, a categoria e o logo.
4. Vá em **Ferramentas > Perfil comercial** e preencha:
   - Descrição: "Site profissional + Perfil no Google para comércios de Taguatinga. Prévia grátis, sem compromisso."
   - E-mail da marca.
   - Horário de atendimento (o horário das suas 2h).
   - **Endereço: deixe em branco**, para não expor sua casa.
5. Em **Configurações > Privacidade > Foto do perfil**, escolha "Todos", para o prospect ver o logo.
6. Vá em **Ferramentas > Mensagem de ausência**, ative e escolha "Fora do horário de atendimento". Texto: "Recebi sua mensagem! Respondo hoje até as 20h."
7. Vá em **Ferramentas > Respostas rápidas** e crie os atalhos com os textos do Passo 5 e do Passo 8: `/previa`, `/preco`, `/pix`, `/termo` e `/semproblema`.
8. Crie 5 **Listas** (ou "Etiquetas" em versões antigas): Novo contato, Prévia enviada, Negociando, Cliente, Perdido.
9. **Importante:** abra **Configurações > Conversas** e veja se aparece um contador de "novas conversas iniciadas".
   - Em setembro de 2026 saíram notícias, ainda sem confirmação oficial, de um limite de **150 conversas novas por mês**.
   - A Meta já vinha testando um limite para mensagens que ficam sem resposta.
   - Por isso, este guia usa poucas mensagens por dia.

## Passo 3. Baixar as prévias para o notebook (5 min)

1. No navegador do notebook, abra o repositório no GitHub: `github.com/piticoalves0108-ui/octavio`.
2. No seletor de branch (canto superior esquerdo), escolha **`ccr-b059369c-tyu6ri`**.
3. Clique no botão verde **Code > Download ZIP** e descompacte o arquivo.
4. As pastas estão em `prospeccao-qi24-taguatinga/previas/`. Cada uma tem um `index.html` e um `_headers`, que esconde a prévia do Google. Não apague nenhum dos dois.

## Passo 4. Publicar as prévias no Cloudflare, de graça (25 min)

**Não use a Vercel grátis:** o plano Hobby proíbe site de cliente. O Cloudflare Pages grátis permite uso comercial.

1. Crie a conta em **dash.cloudflare.com/sign-up** (pode entrar com o Gmail da marca) e confirme o e-mail. Não precisa de cartão.
2. No menu lateral, clique em **Workers & Pages > Create application** ("Criar aplicativo" se o painel estiver em português).
3. A tela abre nas opções de Workers. Procure a opção do Pages: o link "Looking to deploy Pages? Get started" ou a aba **Pages**.
4. Escolha **Drag and drop your files** ("Upload assets") e clique em **Get started**.
5. Em **Project name**, digite um nome em minúsculas e com hífens, por exemplo `poco-loco-pizzaria`.
   - O endereço vai ser `poco-loco-pizzaria.pages.dev`.
   - **Esse nome não pode ser trocado depois.**
6. Clique em **Create project** e **arraste a pasta** `poco-loco`. O `index.html` precisa estar direto dentro dela, não numa subpasta.
7. Clique em **Deploy site** e depois em **Continue to project**. Em 1 a 2 minutos o site abre em `https://poco-loco-pizzaria.pages.dev`.
8. Repita para as outras 2 pastas.
9. Abra os 3 endereços **no celular** e confira: botão de WhatsApp, mapa e horário.

**Para atualizar um site depois:** abra o projeto > **Deployments > Create deployment** > escolha **Production** > arraste a pasta **inteira** de novo > **Save and Deploy**.

## Passo 5. Primeiras mensagens (35 min)

**Regras para não ser bloqueado:**
- No máximo **5 a 7 conversas novas por dia** no WhatsApp.
- **Uma mensagem só**, num balão só, com o nome do comércio e algo específico dele.
- **Peça permissão antes de mandar o link.** Quando a pessoa responde, a conversa deixa de contar como "sem resposta".
- Nada de disparo em massa, grupo, lista de transmissão ou WhatsApp "modificado" (GB WhatsApp, o antigo APK "WhatsApp Plus").
- Se alguém pedir para parar, pare e marque a conversa como "Perdido".
- Para aumentar o volume sem gastar a cota do WhatsApp, crie também um **Instagram da marca** (logo + prints das prévias, sem rosto) e mande mensagem direta.

**Hoje:** mande para os 7 primeiros da tabela pelo WhatsApp e para os 2 do Instagram. Amanhã, para o 8º e para os novos que você encontrar no Passo 7.

| # | Comércio | Canal | Prévia pronta? |
|---|---|---|---|
| 1 | Churrasquinho do Bruce | WhatsApp (61) 99177-8057 | Sim |
| 2 | Seu Zé e Seu Mané | WhatsApp (61) 98273-5004 | Sim |
| 3 | Poco Loco Pizzaria | WhatsApp (61) 99804-2052 | Sim |
| 4 | Barbearia Don Pietro | WhatsApp (61) 99334-7026 | Não |
| 5 | Pet Shop Premium | WhatsApp (61) 99186-0612 | Não |
| 6 | Só Salão Brasília | WhatsApp (61) 99999-7349 | Não |
| 7 | Snack Grill | WhatsApp (61) 3354-1491 | Não |
| 8 | Padaria Armazém do Pão | WhatsApp (61) 3967-0383 (amanhã) | Não |
| 9 | Mega Artesanatos e Festas | Direct no Instagram @megaartesanatoefestas (o celular público está em formato antigo) | Não |
| 10 | KSA Distribuidora de Gás | Direct no Instagram @ksa_gas (só tem telefone fixo público) | Não |

Troque [Seu nome] e [Marca] antes de enviar.

**1. Churrasquinho do Bruce**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Cuido de site e Google de comércios aqui de Taguatinga. Olhei o Instagram de vocês (27 mil seguidores, que moral!) e vi que o Churrasquinho do Bruce ainda não tem site. Montei uma prévia de como ficaria, com botão do WhatsApp e link do iFood. Posso te mandar o link? É grátis e sem compromisso. Se não fizer sentido, é só responder NÃO que eu não chamo mais.

**2. Seu Zé e Seu Mané**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Cuido de site e Google de bares aqui de Taguatinga. Vi que o Seu Zé e Seu Mané tem nota 4,5 no Tripadvisor e está no site do Comida di Buteco, mas ainda não tem site próprio. Montei uma prévia com horário, mapa e botão do WhatsApp. Posso te mandar o link? É grátis e sem compromisso. Se não fizer sentido, é só responder NÃO.

**3. Poco Loco Pizzaria**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Vi que a Poco Loco recebe pedido pelo cardápio do ola.click, mas não tem um site que apareça no Google quando alguém procura "pizzaria na QNL". Montei uma prévia que leva direto para o cardápio de vocês e mostra se a pizzaria está aberta agora. Posso te mandar o link? É grátis e sem compromisso.

**4. Barbearia Don Pietro**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Vi que a Don Pietro tem app próprio de agendamento, que é ótimo para quem já é cliente. Para quem ainda não conhece e pesquisa "barbearia Taguatinga Norte" no Google, falta um site levando para esse app. Posso montar uma prévia grátis de como ficaria? Se não fizer sentido, é só responder NÃO.

**5. Pet Shop Premium**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Cuido de site e Google de comércios aqui da QNL. Quem procura "banho e tosa perto de mim" decide pelo Google, e o Pet Shop Premium ainda não tem site. Posso montar uma prévia grátis com os serviços (banho e tosa, rações, vacinas) e o botão do WhatsApp para você ver como ficaria?

**6. Só Salão Brasília**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Vi que a Só Salão fabrica os móveis na QI 19, entrega em até 7 dias úteis e parcela em 12x, mas não tem site nem catálogo online. Dono de salão de outras cidades pesquisa no Google antes de comprar. Posso montar uma prévia grátis de um site-catálogo com os móveis e o botão do WhatsApp?

**7. Snack Grill**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Vi que o Snack Grill existe desde 2013 e faz delivery pelo WhatsApp, mas ainda não tem site. Posso montar uma prévia grátis com horário, endereço e botão de pedido pelo WhatsApp para você ver como ficaria?

**8. Padaria Armazém do Pão**
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. A Armazém do Pão é padaria, confeitaria, pizzaria e restaurante ao mesmo tempo, e quem procura no Google não descobre isso. Posso montar uma prévia grátis de um site mostrando tudo, com botão de pedido pelo WhatsApp e pelo iFood?

**9. Mega Artesanatos e Festas** (direct no Instagram)
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Vocês têm 43 mil seguidores e um grupo de WhatsApp com clientes, mas não têm site. Quem pesquisa "artigos de festa Taguatinga" no Google não encontra vocês. Posso montar uma prévia grátis de um site-vitrine com as categorias (MDF, festa, lembrancinhas) e o botão do WhatsApp?

**10. KSA Distribuidora de Gás** (direct no Instagram)
> Oi, tudo bem? Aqui é [Seu nome], da [Marca]. Quem fica sem gás pesquisa "gás perto de mim" no Google e liga para o primeiro que aparece. Vi que alguns sites ainda mostram o endereço antigo da KSA (QI 3) em vez da QI 16. Posso te mandar uma prévia grátis de um site simples com botão de ligar e pedir?

**Respostas rápidas para salvar no WhatsApp:**
- `/previa`: "Aqui está: [link]. É só uma prévia, dá para mudar cores, textos e fotos. Se gostar, eu coloco no ar com endereço próprio (ex.: seunegocio.com.br) e cuido do site e do Google Maps de vocês por R$250/mês, sem taxa de criação. Quer que eu explique como funciona?"
- `/preco`: "São R$250/mês, sem taxa de criação. Inclui: site no ar, hospedagem, Perfil da Empresa no Google completo, 4 postagens por mês no Google, respostas às avaliações, até 2 alterações por mês no site e um relatório mensal com quantas pessoas viram, ligaram e pediram rota. O Perfil da Empresa no Google é gratuito: os R$250 são pelo meu trabalho de montar e manter tudo. O domínio .com.br fica no seu nome (R$40/ano, pago direto ao Registro.br). Sem fidelidade: é só avisar com 30 dias."
- `/semproblema`: "Sem problema, obrigado pelo retorno! Não vou mais te chamar. Se um dia precisar, é só me mandar mensagem."

## Passo 6. Organizar (5 min)

Crie uma planilha no Google Sheets com as colunas: Comércio | Canal | Data do 1º contato | Status | Link da prévia | Dia do vencimento | Pagou?

Coloque cada conversa na Lista certa do WhatsApp.

---

# DIA 2 (2 horas)

## Passo 7. Responder, fazer prévias novas e achar mais comércios

1. **Quem disse "pode mandar":** envie `/previa` com o link e mova para "Prévia enviada".
2. **Quem pediu prévia e ainda não tem:** gere com o prompt rápido do [plano](PLANO-SITE-E-GOOGLE-R250.md#prompt-rápido-para-a-prévia-do-site), usando os dados do `comercios.json`. Publique como no Passo 4 (copie o `_headers` para a pasta nova) e mande o link. Leva uns 20 a 30 minutos por prévia.
3. **Quem não respondeu:** **não** mande lembrete hoje. Mande **um único** lembrete daqui a 3 a 5 dias. Sem resposta, mova para "Perdido".
4. **Novos comércios (até completar 5 a 7 conversas novas no dia):**
   - Pesquise no Google Maps: "barbearia Taguatinga Norte", "pet shop QNL", "lanchonete Setor Industrial Taguatinga", "salão de beleza Taguatinga Norte".
   - Escolha quem **não tem site** no perfil e mostra um **WhatsApp de celular**.
   - Use o modelo: "Pesquisei '[ramo] em Taguatinga' no Google e o [Negócio] [não aparece no mapa / aparece sem horário, sem fotos e sem site]. Posso te mandar um print do que encontrei e uma prévia grátis de site?"

## Passo 8. Fechar a venda

Quando alguém disser "quero":

1. Mande o termo (`/termo`):
   > **Serviço:** Site + Google para [Negócio].
   > **Inclui:** site de 1 página com hospedagem; configuração e manutenção do Perfil da Empresa no Google (o Perfil é gratuito, o valor é pelo meu trabalho); 4 postagens por mês no Google; respostas às avaliações; até 2 alterações por mês no site; relatório mensal.
   > **Valor:** R$250 por mês, pagos até o dia [dia]. O 1º mês é pago antes de o site ir para o ar. Sem taxa de criação.
   > **Domínio:** [nome].com.br, registrado no seu CPF ou CNPJ e pago por você direto ao Registro.br (R$40/ano). O domínio é seu.
   > **Google:** você continua dono do Perfil da Empresa e me adiciona como administrador. Você autoriza que eu edite o perfil e responda avaliações em nome da empresa. Não garanto posição no Google, ninguém pode garantir.
   > **Cancelamento:** aviso com 30 dias, sem multa. Ao cancelar, eu saio do seu Perfil do Google e o domínio continua seu.
   > **Atraso:** a partir de 7 dias de atraso, o site fica pausado até o pagamento.
   > Respondendo "Aceito", você concorda com estes termos.
2. Depois do "Aceito", mande `/pix` com a sua chave e o valor de R$250.
3. **Só depois do Pix cair**, faça os Passos 9 e 10 e anote na planilha.

**Se ninguém fechar nos 2 dias:** ofereça a **configuração avulsa do Perfil da Empresa no Google por R$150**, deixando claro que o Perfil é gratuito e que você cobra pelo serviço. Depois ofereça a mensalidade para manter tudo atualizado.

---

# DEPOIS DO PRIMEIRO PIX

## Passo 9. Domínio .com.br e site no ar (1 hora de trabalho, mais a espera)

O domínio fica **no CPF ou CNPJ do cliente**. Quem cria a conta no Registro.br é ele, e você **nunca pede a senha**. Guie pelo WhatsApp, passo a passo.

1. Combine o nome (ex.: `pocolocopizzaria.com.br`) e veja se está livre na busca de **registro.br**.
2. O cliente cria a conta em **registro.br/criar-conta** com os dados dele e confirma pelo e-mail.
3. Ele registra o domínio:
   - Informa o CPF ou CNPJ e clica em CONTINUAR.
   - Deixa os servidores DNS no padrão.
   - Paga **R$40 com Pix**. Com Pix ou cartão, o domínio fica ativo em minutos; com boleto, leva de 2 a 3 dias úteis.
   - **Acerte o CPF ou CNPJ na primeira vez:** trocar o dono do domínio depois exige um processo com documentos.
4. Você cria a **sua** conta grátis no Registro.br e manda o seu ID para o cliente.
5. Ele entra no domínio, vai em **Contatos > Alterar contatos**, coloca o seu ID em **Técnico** e salva. Você confirma pelo e-mail que receber. A partir daí você consegue trocar os DNS com o seu próprio login.
6. Prepare o site final:
   - No `index.html`, apague a linha `<meta name="robots" content="noindex, nofollow">`.
   - Apague também a faixa de prévia do topo e a frase repetida no rodapé.
   - Peça ao dono as fotos reais e troque os espaços da galeria. O comentário no topo de cada arquivo diz o que trocar.
   - **Mantenha o `_headers`**: ele esconde só o endereço `.pages.dev` do Google, e o `.com.br` continua aparecendo.
   - Publique como no Passo 4 (Create deployment > Production).
7. No Cloudflare, vá em **Account home > Onboard a domain** ("Add a site"), digite o domínio, escolha o plano **Free** e copie os **2 nameservers** que aparecerem.
8. No Registro.br, entre no domínio > **Alterar servidores DNS** > servidores DNS próprios > cole os 2 nameservers > Salvar.
9. Espere o domínio ficar **Active** no Cloudflare: normalmente de 2 a 4 horas, às vezes até 24h. Você recebe um e-mail.
10. No projeto do Pages, vá em **Custom domains > Set up a custom domain**, digite o domínio > **Continue > Activate domain**. Repita para `www.` + domínio. **Não crie os registros de DNS à mão.**
11. Em cerca de 15 minutos o HTTPS fica pronto. Abra `https://dominio.com.br` no celular para conferir.

## Passo 10. Perfil da Empresa no Google (30 a 60 min)

Cada um usa a própria Conta do Google: **o dono continua Proprietário e você entra como Administrador.**

1. **Veja a situação do perfil:** pesquise "nome do comércio Taguatinga" no Google Maps.
   - **Aparece e o dono já gerencia:** vá para o item 2.
   - **Aparece com "Reivindicar esta empresa"** (ou "É proprietário desta empresa?"): o dono clica, segue "Gerenciar agora" e faz a verificação.
   - **Não aparece:** o dono cria o perfil em **business.google.com/add**, na conta dele, e faz a verificação.
2. **O dono te adiciona:** ⋮ **Mais > Configurações do Perfil da Empresa > Pessoas e acesso > Adicionar** > seu e-mail > Acesso: **Administrador** > **Convidar**. Você aceita pelo e-mail.
3. **Verificação, quando precisar:** é o dono que faz, no local.
   - O método mais comum hoje é o **vídeo**: gravado ao vivo pelo celular, dentro do perfil, com no mínimo 30 segundos sem cortes.
   - O vídeo mostra a rua, a fachada com o nome e uma área interna (cozinha, estoque ou caixa).
   - A análise leva até 5 dias úteis.
   - O código de verificação **nunca** deve ser repassado, nem para você.
4. **Preencha, em Editar perfil:**
   - Categoria principal (a mais específica, ex.: "Pizzaria").
   - Horário.
   - **Site** (o .com.br novo).
   - **Chat > WhatsApp** com o link `https://wa.me/55...`.
   - **Perfis de redes sociais**, com o Instagram.
   - **Descrição** com até 750 caracteres, sem preço e sem link.
   - **Fotos:** logo, capa e pelo menos 3 da fachada, 3 do ambiente e 3 dos produtos. Use fotos reais, sem filtro.
5. Em **Ler avaliações > Receba mais avaliações**, copie o link e mande ao dono para ele divulgar aos clientes. **Nunca** ofereça brinde em troca de avaliação.
6. **Não** coloque cidade ou palavra-chave no nome do comércio: o Google pode suspender o perfil.

## Rotina mensal de cada cliente (cerca de 1 hora)

1. 4 postagens em **Adicionar atualização** (novidade, oferta ou evento). Não coloque telefone no texto.
2. Responda todas as avaliações novas, inclusive as negativas, com educação.
3. Faça até 2 alterações no site, se o cliente pedir (novo deploy).
4. Abra **Desempenho**, escolha o mês e tire print de ligações, rotas, cliques no site e visualizações.
5. No dia do vencimento, mande o relatório junto com o `/pix`.

---

## Erros que fazem perder tudo

- Disparo em massa, mensagem em vários balões ou app modificado no WhatsApp: bloqueio do número.
- Pedir a senha do Google ou do Registro.br do cliente: nunca.
- Registrar o domínio no seu CPF: o domínio é do cliente.
- Prometer "primeiro lugar no Google": é proibido pela política do Google.
- Comprar avaliações ou dar brinde em troca delas: o perfil pode ser suspenso.
- Hospedar site de cliente na Vercel grátis: proibido pelos termos.
- Colocar `Disallow` no robots.txt junto com o noindex: o Google deixa de ver o noindex.

## Checklist

- [ ] Nome da marca, logo e Gmail
- [ ] Chip separado e WhatsApp Business configurado
- [ ] Respostas rápidas e Listas criadas
- [ ] Contador de conversas novas conferido
- [ ] 3 prévias no ar em `*.pages.dev` e testadas no celular
- [ ] Dia 1: 7 mensagens no WhatsApp + 2 no Instagram
- [ ] Dia 2: respostas, prévias novas e de 5 a 7 comércios novos
- [ ] Planilha atualizada
- [ ] Primeiro "Aceito" e primeiro Pix

## Fontes

- WhatsApp: [baixar o app Business](https://faq.whatsapp.com/506788753356748/?locale=pt_BR), [editar perfil comercial](https://faq.whatsapp.com/634068973820786/?locale=pt_BR), [nomes de empresas](https://faq.whatsapp.com/793641088597363/?locale=pt_PT), [respostas rápidas](https://faq.whatsapp.com/1791149784551042/?locale=pt_BR&cms_platform=iphone), [mensagem de ausência](https://faq.whatsapp.com/2565868990219715/?locale=pt_BR&cms_platform=android), [listas](https://faq.whatsapp.com/1102928584767164/?cms_platform=android&locale=pt_BR), [contas restritas](https://faq.whatsapp.com/717472490411581/?locale=pt_BR), [política de mensagens](https://business.whatsapp.com/policy), [teste de limite de mensagens sem resposta (Tecnoblog)](https://tecnoblog.net/noticias/whatsapp-testa-limite-para-mensagens-sem-resposta/), [relato do limite de 150 conversas novas (El Tiempo, set/2026)](https://www.eltiempo.com/tecnosfera/apps/whatsapp-pondra-limite-de-mensajes-y-permitira-ampliar-el-tope-para-evitar-el-spam-3587946)
- Cloudflare: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [limites](https://developers.cloudflare.com/pages/platform/limits), [domínios personalizados](https://developers.cloudflare.com/pages/configuration/custom-domains/), [cabeçalho noindex no pages.dev](https://blog.cloudflare.com/custom-headers-for-pages), [status da zona](https://developers.cloudflare.com/dns/zone-setups/reference/domain-status/), [comunidade sobre sites de clientes no plano grátis](https://community.cloudflare.com/t/hosting-client-websites-on-pages-as-part-of-a-paid-service-permitted-under2-2-1-a/957002)
- Registro.br: [preço](https://registro.br/dominio/), [pagamento](https://registro.br/ajuda/pagamento-de-dominio/), [registro de novos domínios](https://registro.br/ajuda/registro-de-novos-dominios/), [transferência de titularidade](https://registro.br/ajuda/procedimentos-administrativos/transferencia-de-titularidade/)
- Google: [proprietários e administradores](https://support.google.com/business/answer/3403100?hl=pt-BR), [adicionar ou reivindicar](https://support.google.com/business/answer/2911778?hl=pt-BR), [verificação por vídeo](https://support.google.com/business/answer/14271705?hl=pt-BR), [postagens](https://support.google.com/business/answer/7342169?hl=pt-BR), [avaliações](https://support.google.com/business/answer/3474050?hl=pt-BR), [link de avaliações](https://support.google.com/business/answer/16816815?hl=pt-BR), [desempenho](https://support.google.com/business/answer/9918094?hl=pt-BR), [políticas de terceiros](https://support.google.com/business/answer/7353941?hl=pt-BR), [diretrizes de nome](https://support.google.com/business/answer/3038177?hl=pt-BR), [fim dos sites business.site](https://support.google.com/business/answer/14368911?hl=pt)
