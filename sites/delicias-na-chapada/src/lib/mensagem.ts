/**
 * Monta a mensagem do pedido para o WhatsApp (negrito com *asteriscos*).
 */
import { formasDeEntrega, formasDePagamento, type FormaEntrega, type FormaPagamento } from '../data/pedido'
import { formatarPreco, linkPedido, site } from '../data/site'
import type { ItemDetalhado } from './carrinho'

export interface DadosPedido {
  nome: string
  entrega: FormaEntrega | ''
  endereco: string
  bairro: string
  complemento: string
  pagamento: FormaPagamento | ''
  troco: string
  obs: string
}

export const dadosVazios: DadosPedido = {
  nome: '',
  entrega: '',
  endereco: '',
  bairro: '',
  complemento: '',
  pagamento: '',
  troco: '',
  obs: '',
}

/** Converte "50", "50,00" ou "R$ 50" em número. */
export function lerValor(texto: string) {
  const n = Number(texto.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function mensagemPedido(itens: ItemDetalhado[], total: number, d: DadosPedido) {
  const L: string[] = []
  L.push(`Olá, ${site.nome}! Quero fazer um pedido pelo site.`)
  L.push('')
  L.push('*PEDIDO*')
  itens.forEach((i, n) => {
    if (n > 0) L.push('')
    const unit = formatarPreco(i.precoUnit)
    L.push(`*${i.qtd}x ${i.produto.nome}* — ${unit}${i.qtd > 1 ? ' cada' : ''}`)
    for (const l of i.linhas) L.push(`   ${l.grupo}: ${l.texto}`)
    if (i.obs) L.push(`   Obs.: ${i.obs}`)
    if (i.qtd > 1) L.push(`   Subtotal: ${formatarPreco(i.subtotal)}`)
  })
  L.push('')
  L.push(`*TOTAL: ${formatarPreco(total)}*`)
  if (d.entrega === 'delivery') L.push('+ taxa de entrega (a combinar)')
  L.push('')
  L.push(`*Nome:* ${d.nome.trim()}`)
  const entrega = formasDeEntrega.find((f) => f.id === d.entrega)
  L.push(`*Entrega:* ${entrega?.nome ?? '-'}`)
  if (d.entrega === 'delivery') {
    L.push(`*Endereço:* ${d.endereco.trim()}${d.bairro.trim() ? `, ${d.bairro.trim()}` : ''}`)
    if (d.complemento.trim()) L.push(`*Complemento/referência:* ${d.complemento.trim()}`)
  }
  const pagamento = formasDePagamento.find((f) => f.id === d.pagamento)
  let pag = pagamento?.nome ?? '-'
  if (d.pagamento === 'dinheiro') {
    const troco = lerValor(d.troco)
    pag += troco ? ` (troco para ${formatarPreco(troco)})` : ' (sem troco)'
  }
  L.push(`*Pagamento:* ${pag}`)
  if (d.obs.trim()) L.push(`*Observações:* ${d.obs.trim()}`)
  return L.join('\n')
}

/** Link do WhatsApp com a mensagem (ou o direct do Instagram, se não houver número). */
export function linkDoPedido(mensagem: string) {
  return linkPedido(mensagem)
}
