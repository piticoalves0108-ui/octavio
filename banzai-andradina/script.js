(() => {
  const WHATS_NUMERO = "5518998027388";
  const WHATS_MENSAGEM = "Olá! Vim pelo site do Banzai e gostaria de fazer um pedido.";

  // Horário de atendimento (hora de Brasília). Dias: 0 = domingo ... 6 = sábado.
  // Se algum dia fechar, é só tirar o número dele da lista.
  const HORARIO = { abre: 18 * 60, fecha: 23 * 60, dias: [0, 1, 2, 3, 4, 5, 6] };

  // Links do WhatsApp com a mensagem pronta
  const linkWhats = `https://wa.me/${WHATS_NUMERO}?text=${encodeURIComponent(WHATS_MENSAGEM)}`;
  document.querySelectorAll(".js-whats").forEach((a) => { a.href = linkWhats; });

  // Topo muda ao rolar (no máximo uma vez por quadro)
  const topo = document.getElementById("topo");
  let rolado = null;
  let pendente = false;
  const marcaTopo = () => {
    pendente = false;
    const agora = window.scrollY > 24;
    if (agora === rolado) return;
    rolado = agora;
    topo.classList.toggle("rolado", agora);
  };
  marcaTopo();
  window.addEventListener("scroll", () => {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(marcaTopo);
  }, { passive: true });

  // Revela elementos ao entrarem na tela
  const revelar = document.querySelectorAll("[data-revela]");
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        obs.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -40px 0px" });
    revelar.forEach((el) => obs.observe(el));
  } else {
    revelar.forEach((el) => el.classList.add("visivel"));
  }

  // Animações contínuas param quando a parte da página sai da tela
  if ("IntersectionObserver" in window) {
    const pausa = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => e.target.classList.toggle("pausado", !e.isIntersecting));
    });
    document.querySelectorAll(".hero, .faixa, .secao").forEach((el) => pausa.observe(el));
  }

  // Mapa do Google só carrega quando a pessoa pede
  const botaoMapa = document.querySelector("[data-mapa]");
  if (botaoMapa) {
    botaoMapa.addEventListener("click", () => {
      const mapa = botaoMapa.closest(".mapa");
      const iframe = document.createElement("iframe");
      iframe.title = "Mapa: Banzai, Av. Bandeirantes, 1767 - Centro, Andradina - SP";
      iframe.src = "https://maps.google.com/maps?q=Av.%20Bandeirantes%2C%201767%20-%20Centro%2C%20Andradina%20-%20SP&z=16&output=embed";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      mapa.replaceChildren(iframe);
    });
  }

  // Aberto agora / fechado
  const status = document.querySelector("[data-status]");
  const statusCartao = document.querySelector("[data-status-cartao]");
  const agoraEmBrasilia = () => {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const val = (t) => partes.find((p) => p.type === t).value;
    const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return { dia: dias.indexOf(val("weekday")), minutos: parseInt(val("hour"), 10) * 60 + parseInt(val("minute"), 10) };
  };
  const hhmm = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
  const proximaAbertura = (dia, minutos) => {
    if (HORARIO.dias.includes(dia) && minutos < HORARIO.abre) return `abre hoje às ${hhmm(HORARIO.abre)}`;
    for (let i = 1; i <= 7; i++) {
      const d = (dia + i) % 7;
      if (HORARIO.dias.includes(d)) {
        const nome = i === 1 ? "amanhã" : ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][d];
        return `abre ${nome} às ${hhmm(HORARIO.abre)}`;
      }
    }
    return "";
  };
  const atualizaStatus = () => {
    let agora;
    try { agora = agoraEmBrasilia(); } catch (_) { return; }
    const { dia, minutos } = agora;
    const aberto = HORARIO.dias.includes(dia) && minutos >= HORARIO.abre && minutos < HORARIO.fecha;
    const texto = aberto ? `Aberto agora · até ${hhmm(HORARIO.fecha)}` : `Fechado agora · ${proximaAbertura(dia, minutos)}`;
    if (status) {
      status.classList.toggle("aberto", aberto);
      status.querySelector(".status-texto").textContent = texto;
    }
    if (statusCartao) {
      statusCartao.classList.toggle("aberto", aberto);
      statusCartao.textContent = aberto ? "Aberto agora" : proximaAbertura(dia, minutos).replace(/^a/, "A");
    }
  };
  atualizaStatus();
  setInterval(atualizaStatus, 60 * 1000);

  // Foto ampliada
  const caixa = document.getElementById("caixa");
  const fotos = [...document.querySelectorAll(".galeria .foto")];
  let atual = 0;
  if (caixa && typeof caixa.showModal === "function") {
    const img = caixa.querySelector("img");
    const legenda = caixa.querySelector("figcaption");
    const mostra = (i) => {
      atual = (i + fotos.length) % fotos.length;
      const f = fotos[atual];
      const origem = f.querySelector("img");
      img.src = origem.currentSrc || origem.src;
      img.alt = origem.alt;
      legenda.textContent = f.querySelector("figcaption").textContent;
      img.style.animation = "none";
      void img.offsetWidth;
      img.style.animation = "";
    };
    fotos.forEach((f, i) => {
      f.querySelector("[data-ampliar]").addEventListener("click", () => {
        mostra(i);
        caixa.showModal();
      });
    });
    caixa.querySelector("[data-fechar]").addEventListener("click", () => caixa.close());
    caixa.querySelector("[data-ant]").addEventListener("click", () => mostra(atual - 1));
    caixa.querySelector("[data-prox]").addEventListener("click", () => mostra(atual + 1));
    caixa.addEventListener("click", (e) => { if (e.target === caixa) caixa.close(); });
    caixa.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") mostra(atual - 1);
      if (e.key === "ArrowRight") mostra(atual + 1);
    });
    let toqueX = null;
    caixa.addEventListener("touchstart", (e) => { toqueX = e.touches[0].clientX; }, { passive: true });
    caixa.addEventListener("touchend", (e) => {
      if (toqueX === null) return;
      const dx = e.changedTouches[0].clientX - toqueX;
      if (Math.abs(dx) > 50) mostra(atual + (dx < 0 ? 1 : -1));
      toqueX = null;
    });
  } else {
    // Navegador sem <dialog>: abre a foto direto
    fotos.forEach((f) => {
      f.querySelector("[data-ampliar]").addEventListener("click", () => {
        window.open(f.querySelector("img").src, "_blank", "noopener");
      });
    });
  }

  // Dica do botão flutuante aparece uma vez
  const flutua = document.querySelector(".whats-flutua");
  if (flutua) {
    setTimeout(() => {
      flutua.classList.add("dica");
      setTimeout(() => flutua.classList.remove("dica"), 4000);
    }, 4500);
  }

  const ano = document.querySelector("[data-ano]");
  if (ano) ano.textContent = new Date().getFullYear();
})();
