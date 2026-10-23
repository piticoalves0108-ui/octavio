/**
 * ============================================================================
 *  Delícias na Chapada: status "Aberto / Fechado" do site
 * ============================================================================
 *  Este código roda no Google Apps Script (gratuito, na conta Google do dono).
 *  Ele guarda se a loja está aberta ou fechada e só deixa mudar com a senha.
 *
 *  Como instalar (passo a passo completo no README, seção "Painel do dono"):
 *   1. Acesse https://script.google.com e clique em "Novo projeto".
 *   2. Apague o que estiver lá e cole este arquivo inteiro.
 *   3. Troque a senha da linha SENHA abaixo e salve (Ctrl+S).
 *   4. Implantar > Nova implantação > tipo "App da Web":
 *        Executar como: Eu
 *        Quem pode acessar: Qualquer pessoa
 *   5. Autorize, copie a URL que termina em /exec e cole em
 *      src/data/site.ts, no campo painel.url.
 * ============================================================================
 */

// Troque pela senha do painel (mínimo de 6 caracteres).
var SENHA = 'troque-esta-senha';

/** O site pergunta: está aberto? (qualquer pessoa pode ler) */
function doGet() {
  return json_(lerStatus_());
}

/** O painel muda o status (só com a senha certa). */
function doPost(e) {
  var dados = {};
  try {
    dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (erro) {
    return json_({ ok: false, erro: 'Pedido inválido.' });
  }

  if (SENHA === 'troque-esta-senha' || String(SENHA).length < 6) {
    return json_({ ok: false, erro: 'Defina uma senha no Apps Script (linha SENHA).' });
  }
  if (dados.senha !== SENHA) {
    Utilities.sleep(1500); // atrasa quem tenta adivinhar a senha
    return json_({ ok: false, erro: 'Senha incorreta.' });
  }

  if (dados.acao === 'status' && typeof dados.aberto === 'boolean') {
    var status = { aberto: dados.aberto, atualizado: new Date().toISOString() };
    PropertiesService.getScriptProperties().setProperty('STATUS', JSON.stringify(status));
    CacheService.getScriptCache().put('STATUS', JSON.stringify(status), 21600);
    return json_({ ok: true, status: status });
  }

  // acao "entrar": só confere a senha e devolve o status atual
  return json_({ ok: true, status: lerStatus_() });
}

function lerStatus_() {
  var cache = CacheService.getScriptCache();
  var guardado = cache.get('STATUS') || PropertiesService.getScriptProperties().getProperty('STATUS');
  var status = guardado ? JSON.parse(guardado) : { aberto: true, atualizado: null };
  cache.put('STATUS', JSON.stringify(status), 21600);
  return status;
}

function json_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
