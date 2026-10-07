const raw = window.BOREL_CONFIG || {};

const defaults = {
  nome: 'Borel Cell',
  instagram: 'borelcell',
  whatsapp: '',
  mensagemPadrao: 'Olá, Borel Cell! Vim pelo site e quero saber mais sobre os celulares.',
  endereco: {},
  horario: [],
  fuso: 'America/Sao_Paulo',
  pagamento: '',
  marcas: ['Apple', 'Samsung', 'Xiaomi', 'Motorola'],
  coresDestaque: [{ nome: 'Lima', hex: '#C8FF2E' }],
  instagramFotos: []
};

export const cfg = { ...defaults, ...raw, endereco: { ...(raw.endereco || {}) } };
cfg.instagram = String(cfg.instagram || 'borelcell').replace(/^@/, '').trim();
cfg.whatsapp = String(cfg.whatsapp || '').replace(/\D/g, '');
if (!Array.isArray(cfg.horario)) cfg.horario = [];
if (!Array.isArray(cfg.instagramFotos)) cfg.instagramFotos = [];
if (!Array.isArray(cfg.coresDestaque) || !cfg.coresDestaque.length) cfg.coresDestaque = defaults.coresDestaque;

export const catalog = (Array.isArray(window.BOREL_CATALOGO) ? window.BOREL_CATALOGO : [])
  .filter((p) => p && p.id && p.nome)
  .map((p) => ({
    selo: '',
    pontos: [],
    memorias: [],
    visual: 'float3',
    so: 'android',
    tamanho: 'grande',
    linha: 'mid',
    ...p,
    cores: Array.isArray(p.cores) && p.cores.length ? p.cores : [{ nome: 'Padrão', hex: '#8A8A94' }],
    notas: { camera: 3, desempenho: 3, bateria: 3, custo: 3, ...(p.notas || {}) }
  }));

export const igUrl = `https://www.instagram.com/${cfg.instagram}/`;
export const igDirect = `https://ig.me/m/${cfg.instagram}`;
export const hasWhatsApp = cfg.whatsapp.length >= 12;
export const channelName = hasWhatsApp ? 'WhatsApp' : 'Direct';
export const channelIcon = hasWhatsApp ? 'i-whatsapp' : 'i-instagram';

export function whatsappLink(text) {
  return `https://wa.me/${cfg.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function brandsText() {
  const brands = cfg.marcas.map((m) => (m === 'Apple' ? 'iPhone' : m));
  if (brands.length <= 1) return brands.join('');
  return `${brands.slice(0, -1).join(', ')} e ${brands[brands.length - 1]}`;
}

export function addressText() {
  const e = cfg.endereco || {};
  if (!e.linha) return '';
  const cityUf = [e.cidade, e.uf].filter(Boolean).join(' - ');
  return [e.linha, e.bairro, cityUf, e.cep].filter(Boolean).join(', ');
}

export function mapsLink() {
  const e = cfg.endereco || {};
  if (e.mapsUrl) return e.mapsUrl;
  const addr = addressText();
  return addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cfg.nome}, ${addr}`)}` : '';
}
