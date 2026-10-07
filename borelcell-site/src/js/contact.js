import { cfg, hasWhatsApp, whatsappLink, igDirect, igUrl, channelName, channelIcon, addressText, mapsLink, brandsText } from './config.js';
import { $, $$, copyText, icon, escapeHTML } from './utils.js';
import { toast } from './toast.js';

/* Abre o WhatsApp com a mensagem pronta ou o Direct do Instagram com a mensagem copiada. */
export function sendMessage(text = cfg.mensagemPadrao) {
  if (hasWhatsApp) {
    window.open(whatsappLink(text), '_blank', 'noopener');
    return;
  }
  const copied = copyText(text.replace(/\*/g, ''));
  window.open(igDirect, '_blank', 'noopener');
  toast(copied ? 'Mensagem copiada. É só colar no Direct da Borel Cell.' : 'Abrimos o Direct da Borel Cell para você.', { iconId: 'i-instagram', duration: 5200 });
}

export function productMessage(product, color, memory) {
  const details = [color, memory].filter(Boolean).join(', ');
  const name = hasWhatsApp ? `*${product.nome}*` : product.nome;
  return `Olá, Borel Cell! Vim pelo site e quero saber o preço e a disponibilidade do ${name}${details ? ` (${details})` : ''}.`;
}

/* Horário: "Aberto agora" / "Fechado" */
function nowInZone() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: cfg.fuso, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const minutes = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
    return { day, minutes };
  } catch (e) {
    const d = new Date();
    return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  }
}
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };

export function openState() {
  if (!cfg.horario.length) return null;
  const { day, minutes } = nowInZone();
  const open = cfg.horario.some((h) => (h.dias || []).includes(day) && minutes >= toMin(h.abre) && minutes < toMin(h.fecha));
  return open;
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function daysLabel(days = []) {
  const sorted = [...days].sort((a, b) => a - b);
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (sorted.length > 2 && contiguous) return `${dayNames[sorted[0]]} a ${dayNames[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => dayNames[d]).join(', ');
}
export function hoursText() {
  return cfg.horario.map((h) => `${daysLabel(h.dias)}: ${h.abre} às ${h.fecha}`);
}

export function initContact() {
  // Rótulos e ícones de canal
  $$('[data-contact-label]').forEach((el) => { el.textContent = channelName; });
  $$('[data-label]').forEach((el) => { el.dataset.label = el.textContent.trim(); });
  $$('[data-contact-icon] use').forEach((use) => use.setAttribute('href', `#${channelIcon}`));
  $$('[data-ig-handle]').forEach((el) => { el.textContent = `@${cfg.instagram}`; });
  $$('[data-ig-link]').forEach((el) => { el.href = igUrl; });
  $$('[data-brands-text]').forEach((el) => { el.textContent = brandsText(); });
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-contact]');
    if (!btn) return;
    e.preventDefault();
    sendMessage(btn.dataset.message || cfg.mensagemPadrao);
  });

  renderCards();
  injectSchema();
}

function renderCards() {
  const wrap = $('[data-contact-cards]');
  if (!wrap) return;
  const cards = [];

  cards.push(`
    <a class="ccard" href="${igUrl}" target="_blank" rel="noopener" data-cursor="Abrir">
      <span class="ccard__icon">${icon('i-instagram')}</span>
      ${icon('i-arrow', 'class="ccard__arrow"')}
      <span class="ccard__label">Instagram</span>
      <span class="ccard__value">@${escapeHTML(cfg.instagram)}<small>Novidades e atendimento pelo Direct</small></span>
    </a>`);

  if (hasWhatsApp) {
    const n = cfg.whatsapp.replace(/^55/, '');
    const pretty = n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n.length === 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}` : n;
    cards.push(`
      <a class="ccard" href="${whatsappLink(cfg.mensagemPadrao)}" target="_blank" rel="noopener" data-cursor="Chamar">
        <span class="ccard__icon">${icon('i-whatsapp')}</span>
        ${icon('i-arrow', 'class="ccard__arrow"')}
        <span class="ccard__label">WhatsApp</span>
        <span class="ccard__value">${escapeHTML(pretty)}<small>Mensagem pronta em um toque</small></span>
      </a>`);
  }

  const addr = addressText();
  if (addr) {
    cards.push(`
      <a class="ccard" href="${mapsLink()}" target="_blank" rel="noopener" data-cursor="Mapa">
        <span class="ccard__icon">${icon('i-pin')}</span>
        ${icon('i-arrow', 'class="ccard__arrow"')}
        <span class="ccard__label">Endereço</span>
        <span class="ccard__value">${escapeHTML(addr)}<small>Abrir no mapa</small></span>
      </a>`);
  }

  if (cfg.horario.length) {
    const state = openState();
    cards.push(`
      <div class="ccard">
        <span class="ccard__icon">${icon('i-clock')}</span>
        <span class="ccard__label">Horário</span>
        <span class="ccard__value">${hoursText().map(escapeHTML).join('<br>')}</span>
        <span class="open-badge ${state ? 'is-open' : 'is-closed'}">${state ? 'Aberto agora' : 'Fechado agora'}</span>
      </div>`);
  }

  if (!addr) {
    cards.push(`
      <button class="ccard" type="button" data-contact data-cursor="Chamar">
        <span class="ccard__icon">${icon('i-chat')}</span>
        ${icon('i-arrow', 'class="ccard__arrow"')}
        <span class="ccard__label">Atendimento</span>
        <span class="ccard__value">Fale com a equipe<small>Tire dúvidas e combine a compra pelo ${channelName}</small></span>
      </button>`);
  }

  wrap.innerHTML = cards.join('');
}

function injectSchema() {
  const e = cfg.endereco || {};
  const data = {
    '@context': 'https://schema.org',
    '@type': 'MobilePhoneStore',
    name: cfg.nome,
    url: window.location.href.split('#')[0],
    sameAs: [igUrl]
  };
  if (hasWhatsApp) data.telephone = `+${cfg.whatsapp}`;
  if (e.linha) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: e.linha,
      addressLocality: e.cidade || undefined,
      addressRegion: e.uf || undefined,
      postalCode: e.cep || undefined,
      addressCountry: 'BR'
    };
  }
  if (cfg.horario.length) {
    const map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    data.openingHoursSpecification = cfg.horario.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: (h.dias || []).map((d) => map[d]),
      opens: h.abre,
      closes: h.fecha
    }));
  }
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}
