# Publicar o seu site e entregar o site do cliente

Tudo na Cloudflare, de graça e com uso comercial permitido. O plano grátis dá 100 projetos por conta: 1 é o seu site e os outros 99 são clientes.

> As telas da Cloudflare mudam de nome com frequência. Se algum botão estiver diferente, procure por **Workers & Pages** e pela opção de criar um projeto **Pages** (não "Worker").

---

## Parte A · Publicar o site da Vitrine 61 (uma vez só, 15 minutos)

> **Os links das prévias só abrem depois deste passo.** Antes disso, o celular mostra "site não encontrado" ou "não foi possível acessar". É normal: o endereço ainda não existe.

### Jeito 1 (recomendado, dá para fazer pelo celular): subir o .zip
1. **Baixe o site pronto** neste link (abre direto o download):
   `https://github.com/piticoalves0108-ui/octavio/raw/claude/jolly-johnson-ck8gfh/negocio-sites/vitrine61-site.zip`
2. Crie a conta grátis em **dash.cloudflare.com/sign-up** (e-mail e senha) e confirme o e-mail.
3. No menu, vá em **Workers & Pages** → **Create application** (ou "Criar aplicativo").
4. A tela abre em "Workers". Procure a parte de **Pages** ("Looking to deploy Pages?" → **Get started**) e escolha **Drag and drop your files** (ou "Upload assets").
5. **Project name:** digite `vitrine61` → **Create project**.
6. Toque para escolher o arquivo e selecione o `vitrine61-site.zip` baixado no passo 1 → **Deploy site**.
7. Quando terminar, a Cloudflare mostra o endereço do site, embaixo do nome do projeto. **Anote esse endereço.** Se o nome `vitrine61` já tiver dono, ela coloca letras a mais (ex.: `vitrine61-4xz.pages.dev`) sem avisar.

### Jeito 2: ligado ao GitHub (atualiza sozinho quando algo muda)
1. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Autorize o GitHub e escolha o repositório **octavio**.
3. **Project name:** apague o `octavio` que vem preenchido e digite `vitrine61`.
4. **Production branch:** escolha `claude/jolly-johnson-ck8gfh`. Não deixe o que vem marcado: ele não tem o site.
5. **Framework preset:** None · **Build command:** `node negocio-sites/ferramentas/build.mjs --sem-imagens` · **Build output directory:** `negocio-sites/site`.
6. **Save and Deploy**. Se aparecer "Output directory not found", o Production branch está errado.

### Teste antes de mandar qualquer link (2 minutos, obrigatório)
1. No celular, abra o endereço que a Cloudflare mostrou. Precisa aparecer o site da Vitrine 61.
2. Abra `seu-endereço/previa/nina-pets/`. Precisa aparecer o site da Nina Pets com a faixa "Prévia".
3. Abra `seu-endereço/fabrica/` e use **Adicionar à tela inicial**. **A partir daqui, mande os links sempre pela Fábrica**: ela usa sozinha o endereço onde está publicada, mesmo que não seja `vitrine61.pages.dev`.
4. Se o endereço **não** for `https://vitrine61.pages.dev`, mande o endereço certo para o Claude. Ele gera de novo a lista de links, a planilha e as imagens de compartilhamento com o endereço certo, e você sobe o .zip novo.

| O que aparece no celular | O que fazer |
|---|---|
| "Site não encontrado" ou "não foi possível acessar" | O site ainda não foi publicado, ou o endereço é outro. Confira o endereço na Cloudflare. Logo depois de publicar, pode levar alguns minutos: espere e alterne entre Wi-Fi e 4G. |
| O site de outra pessoa | O nome `vitrine61` já tinha dono. Use o endereço que a Cloudflare mostrou para o seu projeto. |
| "Este link está incompleto ou errado" | O link foi cortado ao copiar. Mande de novo pela Fábrica. |
| A prévia abre, mas o botão "Quero no ar" não aparece | Falta o seu WhatsApp no `config.js` (veja abaixo). |

### Colocar o seu WhatsApp, a chave Pix e o Instagram
O jeito mais fácil: **mande o seu número para o Claude**. Ele coloca no `config.js`, gera o .zip de novo e você só sobe o arquivo novo (Cloudflare → projeto → **Create deployment** → envie o .zip).

Se quiser fazer sozinho, edite por este link: `https://github.com/piticoalves0108-ui/octavio/edit/claude/jolly-johnson-ck8gfh/negocio-sites/site/config.js` → **Commit changes**. No Jeito 2, a Cloudflare publica sozinha. No Jeito 1, peça o .zip novo.

## Parte B · Entregar o site de um cliente (cerca de 1 hora)

### 1. Pegar o material (WhatsApp)
Mande a mensagem "Pedir fotos e dados" (está na Fábrica). Peça para mandar as fotos **como documento** para não perderem qualidade.

### 2. Montar na Fábrica
1. Fábrica → **Clientes** → **Abrir** o cliente.
2. Ajuste os horários, os serviços e os preços (em **3 · Textos e serviços**) e os depoimentos reais.
3. Em **4 · Fotos**, coloque o logo, a capa (foto deitada da fachada ou do ambiente) e até 9 fotos.
4. Confira a prévia no celular e no computador.

### 3. Prévia com fotos para ele aprovar
1. Toque em **Baixar prévia com fotos (.zip)**.
2. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
3. Nome do projeto: o nome do negócio, ex.: `nina-pets` → envie o .zip → **Deploy**.
4. Mande o link `nina-pets.pages.dev` com a mensagem "Mandar a versão final para aprovar". Essa versão tem a faixa "Prévia" e não entra no Google.

### 4. Pagamento e site final
1. Cliente aprovou → mensagem de **Cobrança** (Pix).
2. Pix caiu → Fábrica → **Baixar site final (.zip)**.
3. Cloudflare → abra o projeto `nina-pets` → **Create deployment** (ou "Upload new version") → envie o .zip final.
4. Mesmo endereço, agora sem a faixa de prévia e liberado para o Google. Mande a mensagem de **Entrega**.

### 5. Domínio próprio (opcional, só se o cliente quiser)
1. O cliente registra `nomedele.com.br` no **registro.br**, no CPF ou CNPJ dele (cerca de R$40 por ano). Se ele não souber, faça junto por chamada de áudio ou mande prints. O domínio fica no nome dele.
2. Cloudflare → projeto do cliente → **Custom domains** → **Set up a custom domain** → digite o domínio.
3. A Cloudflare mostra o que fazer:
   - para `www.nomedele.com.br`: criar um registro **CNAME** no painel do registro.br, apontando para `nina-pets.pages.dev`;
   - para `nomedele.com.br` (sem www): adicionar o domínio na sua conta Cloudflare (plano Free) e trocar os **servidores DNS** no registro.br pelos dois que a Cloudflare indicar.
4. Em algumas horas o domínio passa a abrir o site, já com cadeado (HTTPS).

### 6. Google (valoriza a entrega e não custa nada)
- Se o cliente já tem **Perfil da Empresa no Google**, peça para colocar o link do site no campo "Site".
- Se não tem, mande o link **business.google.com** e explique que é grátis. A verificação é feita pelo dono.

### 7. Depois da entrega
- No mesmo dia: oferta do plano mensal (R$39,90).
- 7 dias depois: oferta de Reels (R$250 por mês).
- Sempre: pedido de indicação (R$50 por indicação que fechar).
- Na Fábrica, mude o status para **Pago** ou **Mensal ativo**.

### Mudanças do plano mensal
Fábrica → Clientes → Abrir → mude o que o cliente pediu → **Baixar site final (.zip)** → Cloudflare → projeto → **Create deployment** → envie. Leva 5 minutos.

---

## Parte C · Termos do serviço (mande antes de começar)

Mande por WhatsApp e peça um "ok". Isso vale como combinado por escrito.

```
Antes de começar, os termos combinados:

1. Serviço: site de uma página para {nome}, com até 9 fotos, lista de serviços, botão de WhatsApp, mapa e horário.
2. Prazo: até 48h depois de eu receber as fotos e as informações.
3. Ajustes: até 2 rodadas de ajustes inclusas.
4. Valor: R$250, pagamento único no Pix depois que você aprovar a versão final e antes de o site ir para o seu endereço oficial.
5. Hospedagem: grátis, na Cloudflare. Se quiser um domínio próprio (.com.br), ele fica no seu nome e custa cerca de R$40 por ano no Registro.br.
6. Conteúdo: você garante que tem direito de usar as fotos e os textos que me enviar, e que as informações (preços, horário, endereço) estão corretas.
7. O site é seu. Se pedir, te mando os arquivos.
8. Não existe garantia de posição no Google: o site vai pronto para ser encontrado, mas a posição depende do Google.
9. Mudanças depois da entrega: avulsas ou pelo plano mensal opcional (R$39,90, cancela quando quiser).
10. Posso mostrar o seu site como exemplo do meu trabalho. Se não quiser, é só me avisar.

Se estiver de acordo, me responde "ok" que eu começo.
```

### Recibo (depois do Pix)
```
RECIBO
Recebi de {nome do cliente ou empresa} o valor de R$250,00 (duzentos e cinquenta reais), via Pix, em {data}, referente à criação do site {endereço do site}.
{Seu nome completo} · CPF {seu CPF}
```
O recibo é o único lugar onde o seu nome aparece. Se não quiser mandar, só mande se o cliente pedir.
