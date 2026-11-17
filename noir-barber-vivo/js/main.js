/**
 * NOIR BARBER CLUB — main.js
 * Configuração central, utilitários, interface e animações.
 * Todo agendamento é feito pelo WhatsApp do dono, configurado em WHATSAPP_NUMBER.
 */
'use strict';

/* ==========================================================================
   CONFIGURAÇÃO
   Tudo o que muda de um cliente para outro fica concentrado aqui.
   ========================================================================== */

/** WhatsApp do dono, em formato internacional, só dígitos (DDI + DDD + número). */
const WHATSAPP_NUMBER = '5511999999999';

const NOIR_CONFIG = Object.freeze({
  brand: 'NOIR BARBER CLUB',

  owner: {
    name: 'Rafael Monteiro',
    role: 'Fundador · responde em minutos',
  },

  whatsapp: {
    number: WHATSAPP_NUMBER,
    defaultMessage: 'Olá! Gostaria de agendar um horário no NOIR Barber Club.',
    /** {service} e {price} vêm de cada card de serviço; {owner} (opcional) vira o primeiro nome do dono. */
    serviceMessage: 'Olá! Gostaria de agendar o serviço *{service}* ({price}). Qual o próximo horário disponível?',
  },

  contact: {
    phoneDisplay: '(11) 99999-9999',
    email: 'contato@noirbarberclub.com.br',
  },

  address: {
    street: 'Rua Oscar Freire, 1987',
    district: 'Jardins',
    city: 'São Paulo',
    state: 'SP',
    zip: '01426-001',
  },

  /**
   * Mapa 3D (MapLibre GL + OpenFreeMap, sem chave de API).
   * coordinates: ponto exato do pino. Para pegar o seu: abra o Google Maps, clique com o botão
   * direito em cima da porta da barbearia e clique nos números que aparecem (latitude, longitude).
   */
  map: {
    query: 'Rua Oscar Freire, 1987 - São Paulo - SP',
    coordinates: { lat: -23.5596, lng: -46.6797 }, // APROXIMADO: troque pelo ponto exato da barbearia
    zoom: 17.3,
    pitch: 62, // inclinação da câmera (0 = visto de cima)
    bearing: -28, // rotação inicial em graus
    style: 'https://tiles.openfreemap.org/styles/dark',
    library: {
      js: 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
      css: 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
    },
  },

  businessHours: {
    days: [1, 2, 3, 4, 5, 6], // 0 = domingo … 6 = sábado
    open: '09:00',
    close: '19:00',
    timeZone: 'America/Sao_Paulo', // "aberto/fechado" usa o horário da barbearia, não o do visitante
  },

  /** O HTML traz os mesmos cards como conteúdo estático (SEO e fallback sem JavaScript). */
  services: [
    {
      id: 'corte', name: 'Corte Clássico / Moderno', price: 110, duration: '45 min',
      description: 'Corte de precisão com consultoria de estilo, lavagem e finalização com produtos premium.',
    },
    {
      id: 'barba', name: 'Ritual da Barba', price: 90, duration: '30 min',
      description: 'Barba desenhada na navalha com aplicação de toalha quente e óleos essenciais hidratantes.',
    },
    {
      id: 'combo', name: 'Combo NOIR (Corte + Barba)', price: 180, duration: '1h 15min',
      description: 'O ritual completo da casa, incluindo cortesia (espresso, cerveja artesanal ou whisky).',
    },
    {
      id: 'acabamento', name: 'Acabamento / Pés de Cabelo', price: 40, duration: '15 min',
      description: 'Manutenção rápida do contorno e pezinho para manter o visual alinhado entre os cortes.',
    },
  ],
});

/* ==========================================================================
   APLICAÇÃO
   ========================================================================== */
const Noir = (() => {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  /* ---------- Utilitários ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);

  const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
  const timeToMinutes = (hhmm) => {
    const [hours, minutes] = String(hhmm).split(':').map(Number);
    return hours * 60 + minutes;
  };

  const prefersReducedMotion = () => reducedMotionQuery.matches;
  const hasFinePointer = () => finePointerQuery.matches;
  const hasGSAP = () => typeof window.gsap !== 'undefined';
  const canAnimate = () => hasGSAP() && !prefersReducedMotion();

  function debounce(fn, wait = 150) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  /** Monta o link do WhatsApp a partir do número configurado em WHATSAPP_NUMBER. */
  function buildWhatsAppUrl(message = NOIR_CONFIG.whatsapp.defaultMessage, number = NOIR_CONFIG.whatsapp.number) {
    const digits = String(number).replace(/\D/g, '');
    const text = String(message).replace(/\{owner\}/g, NOIR_CONFIG.owner.name.split(' ')[0]);
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  function refreshIcons() {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
    try {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.6, 'aria-hidden': 'true' } });
    } catch (error) {
      console.warn('[NOIR] Não foi possível renderizar os ícones.', error);
    }
  }

  const refreshScroll = debounce(() => {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, 200);

  /* ---------- Diálogos ---------- */
  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('has-dialog');
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    }
  }

  function initDialogs() {
    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        const target = event.target;
        if (target === dialog || target.hasAttribute('data-dialog-backdrop')) closeDialog(dialog);
        if (target.closest('[data-dialog-close]')) closeDialog(dialog);
      });
      dialog.addEventListener('close', () => {
        if (!$$('dialog[open]').length) document.body.classList.remove('has-dialog');
      });
    });
  }

  /* ---------- Conteúdo dinâmico ---------- */
  function renderServices() {
    const list = $('[data-services-list]');
    if (!list || !NOIR_CONFIG.services.length) return;

    list.innerHTML = NOIR_CONFIG.services.map((service) => {
      const price = formatCurrency(service.price);
      return `
      <div class="service-card" role="listitem" data-service-item data-card-glow
           data-service-name="${escapeHTML(service.name)}" data-service-price="${escapeHTML(price)}">
        <div class="service-card__header">
          <h3>${escapeHTML(service.name)}</h3>
          <span class="service-card__price">${escapeHTML(price)}</span>
        </div>
        <p class="service-card__desc">${escapeHTML(service.description)}</p>
        <div class="service-card__footer">
          <span class="service-card__time"><i data-lucide="clock"></i> ${escapeHTML(service.duration)}</span>
          <a href="#" class="btn btn--sm btn--whatsapp" data-whatsapp-link
             data-whatsapp-message="${escapeHTML(serviceMessage(service))}"
             target="_blank" rel="noopener noreferrer" aria-label="Agendar ${escapeHTML(service.name)} pelo WhatsApp">
            <svg class="icon-wa" aria-hidden="true"><use href="#icon-whatsapp"></use></svg><span>Agendar este</span>
          </a>
        </div>
      </div>`;
    }).join('');
  }

  function serviceMessage(service) {
    return NOIR_CONFIG.whatsapp.serviceMessage
      .replace('{service}', service.name)
      .replace('{price}', formatCurrency(service.price));
  }

  function renderContactInfo() {
    const { address, contact } = NOIR_CONFIG;
    $$('[data-address-full]').forEach((element) => {
      element.innerHTML = `${escapeHTML(address.street)} — ${escapeHTML(address.district)}<br>${escapeHTML(address.city)} · ${escapeHTML(address.state)} · ${escapeHTML(address.zip)}`;
    });
    $$('[data-contact-phone]').forEach((link) => {
      link.textContent = contact.phoneDisplay;
      link.href = `tel:+${String(WHATSAPP_NUMBER).replace(/\D/g, '')}`;
    });
    $$('[data-contact-email]').forEach((link) => {
      link.textContent = contact.email;
      link.href = `mailto:${contact.email}`;
    });
  }

  function renderOwner() {
    const { name, role } = NOIR_CONFIG.owner;
    const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    $$('[data-owner-name]').forEach((element) => { element.textContent = name; });
    $$('[data-owner-role]').forEach((element) => { element.textContent = role; });
    $$('[data-owner-initials]').forEach((element) => { element.textContent = initials; });
    $$('[data-owner-first]').forEach((element) => { element.textContent = name.split(' ')[0]; });
  }

  function initWhatsAppLinks() {
    $$('[data-whatsapp-link]').forEach((link) => {
      link.href = buildWhatsAppUrl(link.dataset.whatsappMessage || undefined);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  }

  /* ---------- Mapa 3D ---------- */
  function mapTargets() {
    const { query, coordinates } = NOIR_CONFIG.map;
    const hasCoordinates = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng);
    const point = hasCoordinates ? `${coordinates.lat},${coordinates.lng}` : query;
    return {
      hasCoordinates,
      googleDirections: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`,
      waze: hasCoordinates
        ? `https://waze.com/ul?ll=${coordinates.lat},${coordinates.lng}&navigate=yes`
        : `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`,
      googleEmbed: `https://maps.google.com/maps?q=${encodeURIComponent(point)}&t=k&z=18&output=embed`,
    };
  }

  function loadAsset(tag, attributes) {
    return new Promise((resolve, reject) => {
      const element = document.createElement(tag);
      Object.assign(element, attributes);
      element.onload = resolve;
      element.onerror = () => reject(new Error(`Falha ao carregar ${attributes.src || attributes.href}`));
      document.head.appendChild(element);
    });
  }

  function supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (error) {
      return false;
    }
  }

  /** Prédios em 3D: usa a camada do estilo, se existir, ou cria uma na paleta do site. */
  function add3DBuildings(map) {
    const style = map.getStyle();
    if (style.layers.some((layer) => layer.type === 'fill-extrusion')) return;
    const sourceId = Object.keys(style.sources).find((id) => style.sources[id].type === 'vector');
    if (!sourceId) return;
    const firstLabel = style.layers.find((layer) => layer.type === 'symbol')?.id;
    const height = ['coalesce', ['get', 'render_height'], ['get', 'height'], 8];

    map.addLayer({
      id: 'noir-3d-buildings',
      type: 'fill-extrusion',
      source: sourceId,
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], height, 0, '#2a2630', 40, '#3b3442', 120, '#55465a'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, height],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.92,
      },
    }, firstLabel);
  }

  function createPin() {
    const pin = document.createElement('div');
    pin.className = 'map-pin';
    pin.setAttribute('aria-hidden', 'true');
    pin.innerHTML = `
      <span class="map-pin__label">${escapeHTML(NOIR_CONFIG.brand)}</span>
      <span class="map-pin__head"><span>N</span></span>
      <span class="map-pin__pulse"></span>`;
    return pin;
  }

  function initMap() {
    const wrapper = $('[data-map3d]');
    const container = $('[data-map]');
    const targets = mapTargets();

    $$('[data-directions-link]').forEach((link) => { link.href = targets.googleDirections; });
    $$('[data-waze-link]').forEach((link) => { link.href = targets.waze; });
    $$('[data-address-short]').forEach((element) => {
      element.textContent = `${NOIR_CONFIG.address.street} — ${NOIR_CONFIG.address.city}`;
    });
    if (!wrapper || !container) return;

    let started = false;
    const showFallback = (reason) => {
      if (wrapper.classList.contains('is-fallback')) return;
      if (reason) console.warn('[NOIR] Mapa 3D indisponível, usando o mapa do Google.', reason);
      const iframe = document.createElement('iframe');
      iframe.src = targets.googleEmbed;
      iframe.title = `Mapa com a localização da ${NOIR_CONFIG.brand}`;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;
      container.replaceChildren(iframe);
      wrapper.classList.add('is-fallback', 'is-ready');
      $('[data-map-toolbar]', wrapper).hidden = true;
    };

    const start = async () => {
      if (started) return;
      started = true;
      if (!supportsWebGL() || !targets.hasCoordinates) {
        showFallback(targets.hasCoordinates ? 'WebGL não suportado' : 'coordenadas não configuradas');
        return;
      }
      try {
        const { library } = NOIR_CONFIG.map;
        await Promise.all([
          loadAsset('link', { rel: 'stylesheet', href: library.css }),
          window.maplibregl ? Promise.resolve() : loadAsset('script', { src: library.js, async: true }),
        ]);
        create3DMap(wrapper, container, showFallback);
      } catch (error) {
        showFallback(error);
      }
    };

    // Só baixa a biblioteca quando o mapa estiver perto de aparecer na tela
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      }, { rootMargin: '400px 0px' });
      observer.observe(wrapper);
    } else {
      start();
    }
  }

  function create3DMap(wrapper, container, showFallback) {
    const { maplibregl } = window;
    const { coordinates, zoom, pitch, bearing, style } = NOIR_CONFIG.map;
    const center = [coordinates.lng, coordinates.lat];
    const reduced = prefersReducedMotion();
    const view = { center, zoom, pitch, bearing };
    let loaded = false;

    const map = new maplibregl.Map({
      container,
      style,
      center,
      zoom: reduced ? zoom : zoom - 1.6,
      pitch: reduced ? pitch : 20,
      bearing: reduced ? bearing : bearing + 50,
      maxPitch: 75,
      cooperativeGestures: true, // não "prende" a rolagem da página
      attributionControl: { compact: true },
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para dar zoom no mapa',
        'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para dar zoom no mapa',
        'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
        'NavigationControl.ZoomIn': 'Aproximar',
        'NavigationControl.ZoomOut': 'Afastar',
        'NavigationControl.ResetBearing': 'Apontar para o norte',
      },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    new maplibregl.Marker({ element: createPin(), anchor: 'bottom' }).setLngLat(center).addTo(map);

    const timeout = setTimeout(() => {
      if (!loaded) {
        map.remove();
        showFallback('tempo esgotado ao carregar o mapa');
      }
    }, 15000);

    map.on('error', (event) => {
      // Erro antes do estilo carregar = o serviço de mapas não respondeu
      if (!loaded && !map.isStyleLoaded()) {
        clearTimeout(timeout);
        map.remove();
        showFallback(event.error);
      }
    });

    map.on('load', () => {
      loaded = true;
      clearTimeout(timeout);
      add3DBuildings(map);
      wrapper.classList.add('is-ready');
      $('[data-map-toolbar]', wrapper).hidden = false;
      refreshIcons();
      if (!reduced) map.flyTo({ ...view, duration: 3200, essential: false, curve: 1.2 });
    });

    // ----- Controles -----
    const buttons = {
      toggle3d: $('[data-map-action="toggle-3d"]', wrapper),
      rotate: $('[data-map-action="rotate"]', wrapper),
      recenter: $('[data-map-action="recenter"]', wrapper),
    };
    let is3D = true;
    let rotating = false;
    let lastFrame = 0;

    const spin = (time) => {
      if (!rotating) return;
      const delta = lastFrame ? time - lastFrame : 16;
      lastFrame = time;
      map.setBearing((map.getBearing() + delta * 0.012) % 360);
      requestAnimationFrame(spin);
    };
    const setRotating = (value) => {
      rotating = value;
      lastFrame = 0;
      buttons.rotate.setAttribute('aria-pressed', String(value));
      $('span', buttons.rotate).textContent = value ? 'Parar' : 'Girar';
      if (value) requestAnimationFrame(spin);
    };

    buttons.toggle3d.addEventListener('click', () => {
      is3D = !is3D;
      buttons.toggle3d.setAttribute('aria-pressed', String(is3D));
      $('span', buttons.toggle3d).textContent = is3D ? '3D' : '2D';
      map.easeTo({ pitch: is3D ? pitch : 0, duration: reduced ? 0 : 900 });
    });
    buttons.rotate.addEventListener('click', () => setRotating(!rotating));
    buttons.recenter.addEventListener('click', () => {
      setRotating(false);
      map.flyTo({ ...view, pitch: is3D ? pitch : 0, duration: reduced ? 0 : 1600 });
    });

    // Qualquer gesto do usuário pausa a rotação automática
    ['mousedown', 'touchstart', 'wheel'].forEach((type) => {
      map.getCanvasContainer().addEventListener(type, () => setRotating(false), { passive: true });
    });
    // Pausa a rotação quando o mapa sai da tela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting && rotating) setRotating(false);
      }).observe(wrapper);
    }
  }

  /** Dia da semana (0–6) e minutos do dia no fuso da barbearia. */
  function shopNow() {
    const now = new Date();
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: NOIR_CONFIG.businessHours.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
      }).formatToParts(now);
      const get = (type) => parts.find((part) => part.type === type)?.value;
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
    } catch (error) {
      return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
    }
  }

  function getOpenStatus() {
    const { days, open, close } = NOIR_CONFIG.businessHours;
    const { day, minutes } = shopNow();
    const openMinutes = timeToMinutes(open);
    const closeMinutes = timeToMinutes(close);

    if (days.includes(day) && minutes >= openMinutes && minutes < closeMinutes) {
      return { isOpen: true, label: `Aberto agora · fecha às ${close}` };
    }

    for (let offset = 0; offset < 8; offset += 1) {
      const candidate = (day + offset) % 7;
      if (!days.includes(candidate)) continue;
      if (offset === 0 && minutes >= openMinutes) continue;
      const when = offset === 0 ? 'hoje'
        : offset === 1 ? 'amanhã'
          : DAY_NAMES[candidate].split('-')[0].toLowerCase();
      return { isOpen: false, label: `Fechado · abre ${when} às ${open}` };
    }
    return { isOpen: false, label: 'Fechado' };
  }

  function renderHours() {
    const { days, open, close } = NOIR_CONFIG.businessHours;
    const order = [1, 2, 3, 4, 5, 6, 0];

    const update = () => {
      const today = shopNow().day;
      $$('[data-hours-list]').forEach((list) => {
        list.innerHTML = order.map((day) => `
          <li class="${day === today ? 'is-today' : ''}">
            <span>${DAY_NAMES[day]}</span>
            <span>${days.includes(day) ? `${open} – ${close}` : 'Fechado'}</span>
          </li>`).join('');
      });

      const status = getOpenStatus();
      $$('[data-open-status]').forEach((badge) => {
        badge.textContent = status.label;
        badge.classList.toggle('is-open', status.isOpen);
        badge.classList.toggle('is-closed', !status.isOpen);
      });
      $$('[data-open-status-text]').forEach((element) => {
        element.textContent = `${status.label} · Seg a Sáb, ${open} às ${close}`;
      });
    };

    update();
    setInterval(update, 60000);
  }

  /* ---------- Header e navegação ---------- */
  function initHeader() {
    const header = $('[data-header]');
    if (!header) return;
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 30);
      const goingDown = y > lastY;
      header.classList.toggle('is-hidden', goingDown && y > 420 && !document.body.classList.contains('nav-open'));
      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  function initNavigation() {
    const toggle = $('[data-nav-toggle]');
    const nav = $('#nav');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('nav-open', open);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  function initActiveLinks() {
    const links = $$('.nav__link');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const linkById = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        });
        const active = linkById.get(entry.target.id);
        if (active) {
          active.classList.add('is-active');
          active.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    linkById.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* ---------- Imagens ---------- */
  function initImageFallback() {
    const FALLBACK_SRC = 'assets/images/placeholder.svg';
    const applyFallback = (img) => {
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = 'true';
      img.removeAttribute('srcset');
      img.src = FALLBACK_SRC;
      img.classList.add('is-fallback');
    };

    document.addEventListener('error', (event) => {
      if (event.target instanceof HTMLImageElement && !event.target.hasAttribute('data-lightbox-img')) {
        applyFallback(event.target);
      }
    }, true);

    // Imagens que falharam antes deste script ser executado
    $$('img:not([loading="lazy"]):not([data-lightbox-img])').forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) applyFallback(img);
    });
  }

  /* ---------- Fundo interativo ---------- */
  function initBackground() {
    const root = document.documentElement;

    if (hasFinePointer()) {
      let frame = null;
      window.addEventListener('pointermove', (event) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          root.style.setProperty('--mx', `${event.clientX}px`);
          root.style.setProperty('--my', `${event.clientY}px`);
          frame = null;
        });
      }, { passive: true });
    }

    const canvas = $('[data-particles]');
    if (!canvas || prefersReducedMotion()) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Âmbar predominante, com toques de vermelho e azul
    const PARTICLE_COLORS = ['255, 190, 80', '255, 190, 80', '255, 150, 50', '255, 80, 100', '110, 160, 255'];
    const pointer = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let particles = [];
    let animationId = null;

    const createParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.4 + 0.3,
      velocityX: (Math.random() - 0.5) * 0.16,
      velocityY: -(Math.random() * 0.22 + 0.04),
      alpha: Math.random() * 0.5 + 0.15,
      twinkle: Math.random() * Math.PI * 2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    });

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(70, (width * height) / 22000));
      particles = Array.from({ length: count }, createParticle);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.twinkle += 0.02;

        // Repulsão suave perto do cursor
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 120 && distance > 0) {
          const force = (1 - distance / 120) * 0.8;
          particle.x += (dx / distance) * force;
          particle.y += (dy / distance) * force;
        }

        if (particle.y < -10) { particle.y = height + 10; particle.x = Math.random() * width; }
        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;

        const alpha = particle.alpha * (0.6 + 0.4 * Math.sin(particle.twinkle));
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${particle.color}, ${alpha.toFixed(3)})`;
        context.fill();
      }
      animationId = requestAnimationFrame(draw);
    };

    const start = () => { if (!animationId) animationId = requestAnimationFrame(draw); };
    const stop = () => { cancelAnimationFrame(animationId); animationId = null; };

    resize();
    start();
    window.addEventListener('resize', debounce(resize, 200));
    window.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------- Cursor personalizado (desktop) ---------- */
  function initCursor() {
    const cursor = $('[data-cursor]');
    if (!cursor || !hasFinePointer() || prefersReducedMotion()) return;
    document.documentElement.classList.add('has-custom-cursor');

    const HOVER_SELECTOR = 'a, button, [role="button"], label, select, summary, [data-cursor-hover]';
    const TEXT_SELECTOR = 'input:not([type="radio"]):not([type="checkbox"]), textarea';
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let running = false;

    const render = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        requestAnimationFrame(render);
      } else {
        running = false;
      }
    };

    window.addEventListener('pointermove', (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      cursor.classList.add('is-visible');
      if (!running) {
        running = true;
        requestAnimationFrame(render);
      }
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      cursor.classList.toggle('is-text', Boolean(target?.closest(TEXT_SELECTOR)));
      cursor.classList.toggle('is-hover', Boolean(target?.closest(HOVER_SELECTOR)) && !target?.closest(TEXT_SELECTOR));
    });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  }

  /* ---------- Microinterações ---------- */
  function initCardGlow() {
    if (!hasFinePointer()) return;
    document.addEventListener('pointermove', (event) => {
      const card = event.target instanceof Element ? event.target.closest('[data-card-glow]') : null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
    }, { passive: true });
  }

  function initMagnetic() {
    if (!hasFinePointer() || !canAnimate()) return;
    const { gsap } = window;
    $$('[data-magnetic]').forEach((element) => {
      const moveX = gsap.quickTo(element, 'x', { duration: 0.5, ease: 'power3.out' });
      const moveY = gsap.quickTo(element, 'y', { duration: 0.5, ease: 'power3.out' });
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        moveX((event.clientX - rect.left - rect.width / 2) * 0.22);
        moveY((event.clientY - rect.top - rect.height / 2) * 0.32);
      });
      element.addEventListener('pointerleave', () => { moveX(0); moveY(0); });
    });
  }

  /* ---------- Galeria / lightbox ---------- */
  function initLightbox() {
    const dialog = $('[data-lightbox]');
    const triggers = $$('[data-lightbox-index]');
    if (!dialog || !triggers.length) return;

    const image = $('[data-lightbox-img]', dialog);
    const caption = $('[data-lightbox-caption]', dialog);
    const counter = $('[data-lightbox-counter]', dialog);
    let currentIndex = 0;

    const show = (index) => {
      currentIndex = (index + triggers.length) % triggers.length;
      const source = $('img', triggers[currentIndex]);
      image.src = source.dataset.fallbackApplied ? source.src : (source.dataset.full || source.currentSrc || source.src);
      image.alt = source.alt;
      caption.textContent = triggers[currentIndex].closest('figure')?.querySelector('figcaption')?.textContent ?? '';
      counter.textContent = `${currentIndex + 1} / ${triggers.length}`;
    };

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => {
        show(index);
        openDialog(dialog);
      });
    });
    $('[data-lightbox-prev]', dialog)?.addEventListener('click', () => show(currentIndex - 1));
    $('[data-lightbox-next]', dialog)?.addEventListener('click', () => show(currentIndex + 1));
    image.addEventListener('error', () => { image.src = 'assets/images/placeholder.svg'; });

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(currentIndex - 1);
      if (event.key === 'ArrowRight') show(currentIndex + 1);
    });

    // Gesto de arrastar no celular
    let startX = null;
    dialog.addEventListener('pointerdown', (event) => { startX = event.clientX; });
    dialog.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 50) show(currentIndex + (delta < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Rodapé ---------- */
  function initFooter() {
    $$('[data-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
    $$('[data-back-to-top]').forEach((button) => {
      button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        $('.logo')?.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- Animações (GSAP + ScrollTrigger) ---------- */
  function playHeroIntro(gsap, onComplete) {
    const root = document.documentElement;
    const curtain = $('[data-curtain]');
    const header = $('[data-header]');
    const lines = $$('[data-hero-line]');
    const items = $$('[data-hero]');
    const visual = $('[data-hero-visual]');
    const frame = $('[data-hero-frame]');
    const image = visual ? $('img', visual) : null;

    gsap.set(lines, { yPercent: 115 });
    gsap.set(items, { autoAlpha: 0, y: 26, filter: 'blur(10px)' });
    if (visual) gsap.set(visual, { clipPath: 'inset(100% 0% 0% 0%)' });
    if (frame) gsap.set(frame, { filter: 'blur(14px)' });
    if (image) gsap.set(image, { scale: 1.28 });
    if (header) gsap.set(header, { autoAlpha: 0, y: -20 });
    root.classList.add('is-loaded');

    const timeline = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        onComplete();
        curtain?.remove();
        gsap.set([header, frame, ...items].filter(Boolean), { clearProps: 'transform,filter' });
      },
    });

    if (curtain) {
      timeline
        .to($('.curtain__mark', curtain), { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power2.in' }, 0.35)
        .to(curtain, { yPercent: -100, duration: 1, ease: 'power4.inOut' }, '>-0.1');
    }

    timeline
      .to(visual, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4 }, curtain ? '-=0.55' : 0)
      .to(frame, { filter: 'blur(0px)', duration: 1.4 }, '<')
      .to(image, { scale: 1, duration: 2.1, ease: 'power3.out' }, '<')
      .to(lines, { yPercent: 0, duration: 1.1, stagger: 0.11 }, '<0.1')
      .to(items, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.95, stagger: 0.08 }, '<0.35')
      .to(header, { autoAlpha: 1, y: 0, duration: 0.8 }, '<');
  }

  function setupScrollAnimations(gsap) {
    const revealDefaults = { duration: 1, ease: 'power3.out' };

    $$('[data-reveal]').forEach((element) => {
      gsap.from(element, {
        ...revealDefaults,
        autoAlpha: 0,
        y: 40,
        filter: 'blur(8px)',
        clearProps: 'transform,filter,opacity,visibility',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      });
    });

    $$('[data-reveal-stagger]').forEach((group) => {
      if (!group.children.length) return;
      gsap.from(group.children, {
        ...revealDefaults,
        duration: 0.85,
        autoAlpha: 0,
        y: 34,
        stagger: 0.09,
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: group, start: 'top 86%', once: true },
      });
    });

    $$('[data-reveal-image]').forEach((element) => {
      const inner = $('[data-reveal-scale]', element);
      const timeline = gsap.timeline({ scrollTrigger: { trigger: element, start: 'top 88%', once: true } });
      timeline.fromTo(element,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', clearProps: 'clipPath' });
      if (inner) {
        timeline.fromTo(inner, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'power3.out', clearProps: 'transform' }, '<');
      }
    });

    $$('[data-count]').forEach((element) => {
      const raw = element.dataset.count;
      const target = parseFloat(raw);
      if (!Number.isFinite(target)) return;
      const decimals = (raw.split('.')[1] || '').length;
      const format = (value) => value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      const counter = { value: 0 };
      element.textContent = format(0);
      gsap.to(counter, {
        value: target,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: { trigger: element, start: 'top 95%', once: true },
        onUpdate: () => { element.textContent = format(counter.value); },
      });
    });

    // Parallax e transição da hero apenas em telas maiores (economia de bateria no celular)
    gsap.matchMedia().add('(min-width: 768px)', () => {
      $$('[data-parallax]').forEach((element) => {
        const speed = parseFloat(element.dataset.parallax) || 0.1;
        gsap.fromTo(element,
          { yPercent: speed * 40 },
          {
            yPercent: speed * -40,
            ease: 'none',
            scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          });
      });

      const heroContent = $('[data-hero-content]');
      if (heroContent) {
        gsap.to(heroContent, {
          yPercent: -10,
          opacity: 0.2,
          filter: 'blur(6px)',
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 15%', scrub: true },
        });
      }
    });
  }

  function initAnimations() {
    const root = document.documentElement;
    const finishIntro = () => root.classList.add('is-loaded', 'intro-done');

    if (!canAnimate()) {
      finishIntro();
      return;
    }

    const { gsap } = window;
    const hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
    if (hasScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    if (root.classList.contains('intro-done')) {
      // O failsafe já exibiu o conteúdo (scripts demoraram): não reanima a hero.
      finishIntro();
    } else {
      root.classList.add('intro-started');
      playHeroIntro(gsap, finishIntro);
    }

    if (hasScrollTrigger) setupScrollAnimations(gsap);
    window.addEventListener('load', refreshScroll);
  }

  /* ---------- Inicialização ---------- */
  function init() {
    const modules = [
      ['serviços', renderServices],
      ['contato', renderContactInfo],
      ['dono', renderOwner],
      ['horários', renderHours],
      ['mapa', initMap],
      ['WhatsApp', initWhatsAppLinks],
      ['ícones', refreshIcons],
      ['diálogos', initDialogs],
      ['header', initHeader],
      ['navegação', initNavigation],
      ['links ativos', initActiveLinks],
      ['imagens', initImageFallback],
      ['fundo', initBackground],
      ['cursor', initCursor],
      ['cards', initCardGlow],
      ['botões magnéticos', initMagnetic],
      ['galeria', initLightbox],
      ['rodapé', initFooter],
      ['animações', initAnimations],
    ];

    modules.forEach(([name, start]) => {
      try {
        start();
      } catch (error) {
        console.error(`[NOIR] Falha ao iniciar o módulo "${name}".`, error);
      }
    });

    // Garante que o conteúdo nunca fique oculto por erro em algum módulo
    if (!document.documentElement.classList.contains('intro-started')) {
      document.documentElement.classList.add('is-loaded', 'intro-done');
    }
  }

  return {
    config: NOIR_CONFIG,
    init,
    utils: { $, $$, escapeHTML, formatCurrency, debounce, buildWhatsAppUrl, refreshIcons, prefersReducedMotion },
  };
})();

window.Noir = Noir;
Noir.init();
