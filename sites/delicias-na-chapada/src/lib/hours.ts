/**
 * Calcula se a casa está aberta agora, a partir dos horários de site.ts.
 */
import { site, type Horario } from '../data/site'

const toMin = (h: string) => {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}

export interface Status {
  aberto: boolean
  texto: string
}

export function statusAgora(now = new Date()): Status {
  const horarios = site.horarios as readonly Horario[]
  const dia = now.getDay()
  const min = now.getHours() * 60 + now.getMinutes()

  // Aberto hoje?
  for (const h of horarios) {
    if (!h.dias.includes(dia as Horario['dias'][number])) continue
    const abre = toMin(h.abre)
    let fecha = toMin(h.fecha)
    if (fecha <= abre) fecha += 24 * 60
    if (min >= abre && min < fecha) return { aberto: true, texto: `Aberto agora · fecha às ${h.fecha === '24:00' ? '00:00' : h.fecha}` }
  }
  // Ainda aberto de ontem (depois da meia-noite)?
  const ontem = (dia + 6) % 7
  for (const h of horarios) {
    if (!h.dias.includes(ontem as Horario['dias'][number])) continue
    const abre = toMin(h.abre)
    const fecha = toMin(h.fecha)
    if (fecha < abre && min < fecha) return { aberto: true, texto: `Aberto agora · fecha às ${h.fecha}` }
  }
  // Próxima abertura
  for (let k = 0; k < 7; k++) {
    const d = (dia + k) % 7
    const h = horarios.find((x) => x.dias.includes(d as Horario['dias'][number]))
    if (!h) continue
    if (k === 0 && min >= toMin(h.abre)) continue
    const quando = k === 0 ? 'hoje' : k === 1 ? 'amanhã' : ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d]
    return { aberto: false, texto: `Fechado · abre ${quando} às ${h.abre}` }
  }
  return { aberto: false, texto: 'Fechado' }
}

/** Dia da semana de hoje (0 = domingo). */
export const hoje = () => new Date().getDay()
