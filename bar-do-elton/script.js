(() => {
  const WHATS_NUMERO = "5518996105460";
  const MENSAGENS = {
    geral: "Olá! Vim pelo site do Bar do Elton.",
    reserva: "Olá! Vim pelo site e quero reservar uma mesa no Bar do Elton.",
    programacao: "Olá! Vim pelo site e queria saber a programação do Bar do Elton.",
  };

  // Links do WhatsApp com a mensagem pronta
  document.querySelectorAll("[data-whats]").forEach((a) => {
    const msg = MENSAGENS[a.dataset.whats] || MENSAGENS.geral;
    a.href = `https://wa.me/${WHATS_NUMERO}?text=${encodeURIComponent(msg)}`;
  });

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

    // Animações contínuas param quando a parte da página sai da tela
    const pausa = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => e.target.classList.toggle("pausado", !e.isIntersecting));
    });
    document.querySelectorAll(".hero, .faixa, .secao").forEach((el) => pausa.observe(el));
  } else {
    revelar.forEach((el) => el.classList.add("visivel"));
  }

  // Mapa do Google só carrega quando a pessoa pede
  const botaoMapa = document.querySelector("[data-mapa]");
  if (botaoMapa) {
    botaoMapa.addEventListener("click", () => {
      const mapa = botaoMapa.closest(".mapa");
      const iframe = document.createElement("iframe");
      iframe.title = "Mapa: Bar do Elton, Rua Humberto de Campos, 2008 - Andradina - SP";
      iframe.src = "https://maps.google.com/maps?q=Rua%20Humberto%20de%20Campos%2C%202008%2C%20Andradina%20-%20SP%2C%2016901-012&z=16&output=embed";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      mapa.replaceChildren(iframe);
    });
  }

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
