import { mensagens, negocio } from "@/content/site";
import { pendente, semMarcador, soNumeros } from "@/lib/pendente";

/** encodeURIComponent deixa "!" passar; o link oficial do briefing usa %21. */
function codificar(texto: string) {
  return encodeURIComponent(texto).replace(/!/g, "%21");
}

export type LinkContato = { href: string; pendente: boolean };

/**
 * Link do WhatsApp com mensagem pronta.
 * Enquanto o número não for confirmado, cai no Direct do Instagram para o botão
 * continuar funcionando na prévia.
 */
export function linkWhatsApp(mensagem: string = mensagens.padrao): LinkContato {
  const numero = soNumeros(negocio.contato.whatsapp);
  if (!numero) return { href: negocio.instagram.direct, pendente: true };
  return { href: `https://wa.me/55${numero}?text=${codificar(mensagem)}`, pendente: false };
}

export function linkTelefone(): LinkContato | null {
  const numero = soNumeros(negocio.contato.telefone);
  if (!numero) return null;
  return { href: `tel:+55${numero}`, pendente: false };
}

/** Telefone formatado: (61) 3333-4444 ou (61) 99999-8888. */
export function telefoneFormatado(valor: string): string {
  const n = soNumeros(valor);
  if (!n) return valor;
  const ddd = n.slice(0, 2);
  const resto = n.slice(2);
  const meio = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}

export function enderecoCompleto(): string {
  const { logradouro, bairro, cep } = negocio.endereco;
  const partes = [logradouro, bairro, `${negocio.cidade} - ${negocio.uf}`, cep && !pendente(cep) ? `CEP ${cep}` : ""];
  return partes.filter(Boolean).join(", ");
}

/** Google Maps: usa o endereço confirmado; antes disso, busca pelo nome da loja. */
export function linkMapa(): string {
  const { logradouro } = negocio.endereco;
  const consulta = pendente(logradouro)
    ? `${negocio.nome}, ${negocio.cidade} - ${negocio.uf}`
    : semMarcador(enderecoCompleto());
  const { latitude, longitude } = negocio.geo;
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

/** Bairro para o título da home; enquanto pendente, usa a cidade. */
export function localTitulo(): string {
  const { bairro } = negocio.endereco;
  return pendente(bairro) ? negocio.cidade : bairro;
}
