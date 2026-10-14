# Publicar o seu site e entregar o site do cliente

Tudo na Cloudflare, de graça e com uso comercial permitido. O plano grátis dá 100 projetos por conta: 1 é o seu site e os outros 99 são clientes.

> As telas da Cloudflare mudam de nome com frequência. Se algum botão estiver diferente, procure por **Workers & Pages** e pela opção de criar um projeto **Pages**.

---

## Parte A · Publicar o site da Vitrine 61 (uma vez só, 15 minutos)

### Jeito 1: ligado ao GitHub (recomendado, atualiza sozinho)
1. Crie a conta grátis em **dash.cloudflare.com/sign-up** (só e-mail e senha).
2. Menu **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**.
3. Autorize o GitHub e escolha o repositório **octavio**.
4. Preencha:
   - **Project name:** `vitrine61` (o endereço vira `vitrine61.pages.dev`; se o nome estiver ocupado, escolha outro e troque o `url` no `config.js`)
   - **Production branch:** `claude/jolly-johnson-ck8gfh` (depois que isso for para o `main`, troque para `main`)
   - **Framework preset:** None
   - **Build command:** deixe vazio
   - **Build output directory:** `negocio-sites/site`
5. **Save and Deploy**. Em 1 ou 2 minutos o site está no ar.

Para mudar o seu WhatsApp, a chave Pix ou o preço: no GitHub, abra `negocio-sites/site/config.js`, toque no lápis, edite e toque em **Commit changes**. A Cloudflare publica de novo sozinha.

### Jeito 2: subir o .zip (sem GitHub)
1. **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Nome do projeto: `vitrine61` → envie o arquivo `negocio-sites/vitrine61-site.zip` → **Deploy**.
3. Nesse jeito, o `config.js` vai como está (sem o seu WhatsApp). Peça para o Claude gerar o .zip de novo com o seu número.

### Conferir
- `https://vitrine61.pages.dev` → site da marca
- `https://vitrine61.pages.dev/fabrica/` → Fábrica (adicione à tela inicial do celular)
- `https://vitrine61.pages.dev/previa/nina-pets/` → exemplo de prévia pronta

Se o endereço for diferente de `vitrine61.pages.dev`, troque o `url` no `config.js` e peça ao Claude para rodar o build de novo. Isso atualiza as imagens que aparecem quando o link é colado no WhatsApp.

---

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
