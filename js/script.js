const API_ENDPOINT = '/.netlify/functions/itunes-proxy';

/* Solo términos de búsqueda de estilos electrónicos */
const FEATURED_TERMS = [
  'trance',
  'deep house',
  'progressive house',
  'progressive trance'
];

const LIMITE_DESTACADOS = 10;
const LIMITE_CARGA_CATALOGO_POR_TERMINO = 1000;
const TAMANO_PAGINA_CATALOGO = 30;
const CLAVE_ALMACENAMIENTO_CARRITO = 'beatflow_cart_v1';
const CLAVE_ALMACENAMIENTO_BUSQUEDA = 'BF_search_query';

let globalCatalog = [];
let currentAudio = null;
let currentPlayingBtn = null;
let cart = loadCartFromStorage();

/* ---------------------------
   Filtro música electrónica
   --------------------------- */
function isElectronic(item) {
  // Para iTunes API, usar primaryGenreName
  const genre = (item.primaryGenreName || '').toLowerCase();

  const allowed = [
    'electronic',
    'dance',
    'trance',
    'house',
    'techno',
    'ambient',
    'progressive house',
    'deep house',
    'progressive trance'
  ];

  return allowed.some(term => genre.includes(term));
}

/* ---------------------------
   DOM HELPERS
   --------------------------- */
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------------------------
   UTILIDADES
   --------------------------- */
function q(params) {
  return Object.keys(params)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
}

function safePrice(raw) {
  const p = Number(raw);
  if (isNaN(p) || p <= 0) return 0;
  return p;
}

function escapeHtml(s){
  return (s||'').toString().replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s){
  return (s||'').toString().replace(/"/g,'&quot;');
}

/* ---------------------------
   ALMACENAMIENTO: CARRITO
   --------------------------- */
function loadCartFromStorage() {
  try {
    const s = localStorage.getItem(CLAVE_ALMACENAMIENTO_CARRITO);
    return s ? JSON.parse(s) : [];
  } catch (e) {
    console.warn('Error reading cart', e);
    return [];
  }
}
function saveCartToStorage() {
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO_CARRITO, JSON.stringify(cart));
  } catch (e) {
    console.warn('Error saving cart', e);
  }
}

/* ---------------------------
   CARRITO - LÓGICA + INTERFAZ
   --------------------------- */
function getCartCount() {
  return cart.reduce((acc, it) => acc + (it.qty || 0), 0);
}
function updateCartBadge() {
  const badges = $$('#cart-count');
  badges.forEach(b => b.textContent = getCartCount());

  const cartBtn = $('#cart-toggle');
  if (cartBtn) {
    if (getCartCount() > 0) cartBtn.classList.add('cart-has-items');
    else cartBtn.classList.remove('cart-has-items');
  }
}
function findCartItem(id) {
  return cart.find(c => String(c.id) === String(id));
}
function addToCartMinimal(data) {
  const id = String(data.id);
  const existing = findCartItem(id);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id,
      track: {
        trackId: id,
        trackName: data.name,
        artistName: data.artist,
        artworkUrl100: data.image,
        trackPrice: data.price
      },
      qty: 1
    });
  }

  saveCartToStorage();
  renderCartPanel();
  updateCartBadge();
}
function removeFromCart(id) {
  cart = cart.filter(c => String(c.id) !== String(id));
  saveCartToStorage();
  renderCartPanel();
  updateCartBadge();
}
function updateQtyInCart(id, qty) {
  const it = findCartItem(id);
  if (!it) return;
  it.qty = Math.max(1, parseInt(qty) || 1);
  saveCartToStorage();
  renderCartPanel();
  updateCartBadge();
}
function clearCart() {
  cart = [];
  saveCartToStorage();
  renderCartPanel();
  updateCartBadge();
}
function renderCartPanel() {
  const container = $('#cart-items');
  const totalEl   = $('#cart-total');
  if (!container) return;

  container.innerHTML = '';
  if (!cart.length) {
    container.innerHTML = `<p class="muted">Tu carrito está vacío.</p>`;
    if (totalEl) totalEl.textContent = '0.00';
    return;
  }

  let total = 0;
  const frag = document.createDocumentFragment();

  cart.forEach(item => {
    const price = safePrice(item.track.trackPrice);
    total += price * (item.qty || 1);

    const wrap = document.createElement('div');
    wrap.className = 'cart-item';
    wrap.innerHTML = `
      <img src="${(item.track.artworkUrl100 || '').replace('100x100','600x600')}" alt="">
      <div class="meta">
        <h4>${escapeHtml(item.track.trackName)}</h4>
        <p>${escapeHtml(item.track.artistName)}</p>
        <div class="price">$${price.toFixed(2)}</div>
      </div>
      <div class="actions">
        <button class="btn-secondary-outline btn-qty-decr" data-id="${item.id}">-</button>
        <input class="qty" type="number" value="${item.qty}" min="1" data-id="${item.id}">
        <button class="btn-secondary-outline btn-qty-incr" data-id="${item.id}">+</button>
        <button class="btn-secondary-outline btn-remove" data-id="${item.id}" aria-label="Eliminar del carrito">🗑</button>
      </div>
    `;
    frag.appendChild(wrap);
  });

  container.appendChild(frag);
  if (totalEl) totalEl.textContent = total.toFixed(2);
}

/* ---------------------------
   PREVISUALIZACIÓN
   --------------------------- */
function handlePreviewClick(btn) {
  const url = btn.dataset.preview;
  if (!url) return;

  if (currentPlayingBtn === btn) {
    if (currentAudio.paused) {
      currentAudio.play();
      btn.classList.add('playing');
      btn.textContent = 'Pausar';
    } else {
      currentAudio.pause();
      btn.classList.remove('playing');
      btn.textContent = 'Previsualizar';
    }
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    currentPlayingBtn.classList.remove('playing');
    currentPlayingBtn.textContent = 'Previsualizar';
  }

  currentAudio = new Audio(url);
  currentAudio.play();
  btn.classList.add('playing');
  btn.textContent = 'Pausar';
  currentPlayingBtn = btn;

  currentAudio.onended = () => {
    btn.classList.remove('playing');
    btn.textContent = 'Previsualizar';
    currentAudio = null;
    currentPlayingBtn = null;
  };
}

/* ---------------------------
   OBTENER DATOS DE ITUNES
   --------------------------- */
async function fetchFromApi(term, limit = 50) {
  // Usar proxy local que evita problemas de CORS
  const url = `${API_ENDPOINT}?${q({
    term: encodeURIComponent(term),
    media: 'music',
    limit: limit,
    country: 'US'
  })}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10 segundos

    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!r.ok) {
      throw new Error(`Error en API: ${r.status} ${r.statusText}`);
    }

    const data = await r.json();

    // Verificar si hay error en la respuesta
    if (data.error) {
      throw new Error(data.error);
    }

    // Filtrar y mapear los tracks electrónicos
    const tracks = (data.results || [])
      .filter(track => track.trackName && track.artistName && isElectronic(track))
      .map(track => ({
        trackId: track.trackId,
        trackName: track.trackName,
        artistName: track.artistName,
        collectionName: track.collectionName || 'Álbum Desconocido',
        previewUrl: track.previewUrl,
        artworkUrl100: track.artworkUrl100,
        trackPrice: track.trackPrice || 0,
        trackTimeMillis: track.trackTimeMillis || 0
      }));

    return tracks;
  } catch (error) {
    // Error silencioso - devolver array vacío
    return [];
  }
}

/* ---------------------------
   DATOS MOCK PARA FALLBACK
   --------------------------- */
function getMockDataForTerm(term) {
  const mockTracks = {
    'trance': [
      { trackId: 'mock-trance-1', trackName: 'Trance Energy', artistName: 'DJ TranceMaster', collectionName: 'Trance Collection Vol.1', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=1', trackPrice: 1.99, trackTimeMillis: 420000 },
      { trackId: 'mock-trance-2', trackName: 'Uplifting Vibes', artistName: 'Trance Producer', collectionName: 'Progressive Trance', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=2', trackPrice: 2.49, trackTimeMillis: 380000 },
      { trackId: 'mock-trance-3', trackName: 'Melodic Journey', artistName: 'Trance Artist', collectionName: 'Trance Essentials', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=3', trackPrice: 1.79, trackTimeMillis: 450000 }
    ],
    'deep house': [
      { trackId: 'mock-dh-1', trackName: 'Deep Groove', artistName: 'House Master', collectionName: 'Deep House Mix', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=4', trackPrice: 2.29, trackTimeMillis: 400000 },
      { trackId: 'mock-dh-2', trackName: 'Soulful Nights', artistName: 'Deep Producer', collectionName: 'House Vibes', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=5', trackPrice: 1.99, trackTimeMillis: 420000 }
    ],
    'progressive house': [
      { trackId: 'mock-ph-1', trackName: 'Progressive Build', artistName: 'House Innovator', collectionName: 'Progressive House', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=6', trackPrice: 2.49, trackTimeMillis: 380000 },
      { trackId: 'mock-ph-2', trackName: 'Tech House Groove', artistName: 'Progressive DJ', collectionName: 'House Revolution', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=7', trackPrice: 1.89, trackTimeMillis: 410000 }
    ],
    'progressive trance': [
      { trackId: 'mock-pt-1', trackName: 'Trance Progression', artistName: 'Trance Pioneer', collectionName: 'Progressive Trance', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=8', trackPrice: 2.19, trackTimeMillis: 430000 },
      { trackId: 'mock-pt-2', trackName: 'Epic Trance', artistName: 'Trance Legend', collectionName: 'Trance Classics', previewUrl: null, artworkUrl100: 'https://picsum.photos/300/300?random=9', trackPrice: 2.99, trackTimeMillis: 460000 }
    ]
  };

  const lowerTerm = term.toLowerCase();
  if (mockTracks[lowerTerm]) {
    return mockTracks[lowerTerm];
  }

  // Para términos no conocidos, generar datos mock genéricos
  const mockGeneric = [];
  for (let i = 0; i < 5; i++) {
    mockGeneric.push({
      trackId: `mock-${lowerTerm}-${i}`,
      trackName: `${term.charAt(0).toUpperCase() + term.slice(1)} Track ${i + 1}`,
      artistName: `${term.charAt(0).toUpperCase() + term.slice(1)} Artist`,
      collectionName: `${term.charAt(0).toUpperCase() + term.slice(1)} Collection`,
      previewUrl: null,
      artworkUrl100: `https://picsum.photos/300/300?random=${Math.floor(Math.random() * 1000)}`,
      trackPrice: (Math.random() * 2 + 0.99).toFixed(2),
      trackTimeMillis: Math.floor(Math.random() * 200000 + 300000)
    });
  }

  return mockGeneric;
}

/* ---------------------------
   DESTACADOS (inicio)
   --------------------------- */
async function loadFeatured() {
  const cont = $('#featured-container');
  const info = $('#results-info');
  if (!cont) return;

  if (info) info.textContent = 'Cargando destacados...';

  try {
    // Si el catálogo global no está cargado, cargarlo primero
    if (!globalCatalog.length) {
      const all = [];
      for (const t of FEATURED_TERMS) {
        const r = await fetchFromApi(t, LIMITE_CARGA_CATALOGO_POR_TERMINO);
        all.push(...r);
      }
      globalCatalog = [...new Map(all.map(i => [i.trackId, i])).values()].slice(0, 500);
    }

    // Tomar 10 canciones aleatorias del catálogo
    const shuffled = [...globalCatalog].sort(() => 0.5 - Math.random());
    const featured = shuffled.slice(0, LIMITE_DESTACADOS);

    cont.innerHTML = featured.map(createCardHTML).join('');
    if (info) {
      info.textContent = `Mostrando ${featured.length} lanzamientos destacados.`;
    }
  } catch (e) {
    console.error('Error cargando destacados:', e);
    cont.innerHTML = `<p class="error">No se pudieron cargar destacados.</p>`;
  }
}

/* ---------------------------
   PLANTILLA DE TARJETA
   --------------------------- */
function createCardHTML(track) {
  const art = (track.artworkUrl100 || `https://picsum.photos/600/600?random=${track.trackId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)}`).replace('100x100', '600x600');
  const price = Math.max(0, track.trackPrice ?? 0);
  const pr = price ? `$${price.toFixed(2)}` : 'Gratis';
  const previewBtn = track.previewUrl ? `<button class="btn-preview" data-preview="${escapeAttr(track.previewUrl)}">Previsualizar</button>` : '';

  return `
    <article class="card" data-id="${track.trackId}">
      <img src="${art}" loading="lazy" alt="${escapeAttr(track.trackName)}">
      <div>
        <h3>${escapeHtml(track.trackName)}</h3>
        <p class="muted">${escapeHtml(track.artistName)}</p>
      </div>
      <div class="controls">
        ${previewBtn}
        <button class="add-btn"
          data-id="${track.trackId}"
          data-name="${escapeAttr(track.trackName)}"
          data-artist="${escapeAttr(track.artistName)}"
          data-image="${escapeAttr(art)}"
          data-price="${price}">Añadir</button>
      </div>
      <span class="price">${pr}</span>
    </article>`;
}

/* ---------------------------
   CATALOGO
   --------------------------- */
async function loadCatalogIfNeeded() {
  const cont = $('#catalog-container') || $('#catalog-results');
  const info = $('#results-info');
  if (!cont) return;

  if (info) info.textContent = 'Cargando catálogo...';

  try {
    const saved = localStorage.getItem(CLAVE_ALMACENAMIENTO_BUSQUEDA);
    const terms = saved ? [saved] : FEATURED_TERMS;
    const all = [];

    // Cargar datos de los términos principales
    const promises = terms.map(t => fetchFromApi(t, LIMITE_CARGA_CATALOGO_POR_TERMINO));
    const results = await Promise.all(promises);
    results.forEach(r => all.push(...r));

    // Si no tenemos suficientes resultados (menos de 500), intentar cargar términos adicionales
    if (all.length < 500 && !saved) {
      const additionalTerms = ['techno', 'ambient', 'electronic', 'house'];
      const additionalPromises = additionalTerms.map(t => fetchFromApi(t, LIMITE_CARGA_CATALOGO_POR_TERMINO));
      const additionalResults = await Promise.all(additionalPromises);
      additionalResults.forEach(r => all.push(...r));
    }

    globalCatalog = [...new Map(all.map(i => [i.trackId, i])).values()].slice(0, 500);

    if (saved) {
      localStorage.removeItem(CLAVE_ALMACENAMIENTO_BUSQUEDA);
    }

    renderCatalogPage(1);
    if (info) info.textContent = `${globalCatalog.length} pistas disponibles`;
  } catch (e) {
    console.error('Error loading catalog:', e);
    cont.innerHTML = `<p class="error">Error cargando catálogo.</p>`;
  }
}

function renderCatalogPage(page = 1) {
  const cont  = $('#catalog-container') || $('#catalog-results');
  const pager = $('#catalog-pager');
  if (!cont || !pager) return;

  const total = globalCatalog.length;
  const pages = Math.max(1, Math.ceil(total / TAMANO_PAGINA_CATALOGO));
  const start = (page - 1) * TAMANO_PAGINA_CATALOGO;
  const items = globalCatalog.slice(start, start + TAMANO_PAGINA_CATALOGO);

  cont.innerHTML = items.map(createCardHTML).join('');

  pager.innerHTML = '';
  for (let p = 1; p <= pages; p++) {
    const b = document.createElement('button');
    b.textContent = p;
    if (p === page) b.classList.add('activo');
    b.onclick = () => {
      renderCatalogPage(p);
      window.scrollTo({ top: 180, behavior:'smooth' });
    };
    pager.appendChild(b);
  }
}

/* ---------------------------
   MODAL DE BÚSQUEDA
   --------------------------- */
function initSearchModal() {
  const modal  = $('#search-modal');
  const navBtn = $('#nav-search-btn');
  const input  = $('#modal-search-input');
  const btn    = $('#modal-search-btn');
  const cancel = $('#modal-cancel-btn');

  if (!modal || !navBtn || !input || !btn || !cancel) return;

  navBtn.onclick = () => {
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 50);
  };
  cancel.onclick = () => modal.classList.add('hidden');

  btn.onclick = () => {
    const v = input.value.trim();
    if (!v) return input.focus();

    if (v.length < 2) {
      alert('Por favor ingresa al menos 2 caracteres para buscar.');
      return input.focus();
    }

    localStorage.setItem(CLAVE_ALMACENAMIENTO_BUSQUEDA, v);
    modal.classList.add('hidden');
    window.location.href = 'catalogo.html';
  };

  input.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
    if (e.key === 'Escape') modal.classList.add('hidden');
  };

  modal.onclick = e => {
    if (e.target === modal) modal.classList.add('hidden');
  };
}

/* ---------------------------
   NAV TOGGLE (hamburguesa)
   --------------------------- */
function initNavToggle() {
  const btn = $('#nav-toggle');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Cerrar al hacer click en un link/botón del menú (en mobile)
  nav.addEventListener('click', e => {
    if (e.target.closest('.nav-link') || e.target.closest('.nav-btn')) {
      if (nav.classList.contains('nav-open')) {
        nav.classList.remove('nav-open');
        btn.setAttribute('aria-expanded','false');
      }
    }
  });
}

/* ---------------------------
   EVENTOS DELEGADOS GLOBALES
   --------------------------- */
function initDelegatedListeners() {
  document.addEventListener('click', e => {
    const preview = e.target.closest('.btn-preview');
    if (preview) return handlePreviewClick(preview);

    const add = e.target.closest('.add-btn');
    if (add) {
      const {id, name, artist, image, price} = add.dataset;
      addToCartMinimal({id, name, artist, image, price: parseFloat(price)});
      add.classList.add('added');
      setTimeout(() => add.classList.remove('added'), 350);
      return;
    }

    if (e.target.closest('#cart-toggle')) {
      const panel = $('#cart-panel');
      if (panel) panel.classList.toggle('open');
      return;
    }
    if (e.target.closest('#close-cart')) {
      const panel = $('#cart-panel');
      if (panel) panel.classList.remove('open');
      return;
    }
    if (e.target.closest('#clear-cart')) return clearCart();
    if (e.target.closest('#checkout')) {
      window.location.href = 'checkout.html';
      return;
    }

    const rm = e.target.closest('.btn-remove');
    if (rm) return removeFromCart(rm.dataset.id);

    const rmCheckout = e.target.closest('.btn-remove-checkout');
    if (rmCheckout) {
      const index = Number(rmCheckout.dataset.remove);
      cart.splice(index, 1);
      saveCartToStorage();
      renderCartPanel();
      updateCartBadge();
      initCheckout(); // Re-render checkout
      return;
    }

    const inc = e.target.closest('.btn-qty-incr');
    if (inc) {
      const it = findCartItem(inc.dataset.id);
      if (it) it.qty++;
      saveCartToStorage();
      renderCartPanel();
      updateCartBadge();
      return;
    }
    const dec = e.target.closest('.btn-qty-decr');
    if (dec) {
      const it = findCartItem(dec.dataset.id);
      if (it && it.qty > 1) it.qty--;
      saveCartToStorage();
      renderCartPanel();
      updateCartBadge();
      return;
    }
  });

  document.addEventListener('change', e => {
    if (e.target.matches('.qty')) {
      updateQtyInCart(e.target.dataset.id, e.target.value);
    }
  });
}

/* ---------------------------
   FORMULARIO DE CONTACTO
   --------------------------- */
function initContactForm() {
  const frm = $('#contact-form');
  if (!frm) return;
  const msg = $('#contact-msg') || $('#contact-feedback');

  frm.addEventListener('submit', e => {
    if (!frm.checkValidity()) {
      e.preventDefault();
      if (msg) msg.textContent = 'Por favor completa todos los campos.';
      return;
    }
    if (msg) msg.textContent = 'Enviando...';
  });
}

/* ---------------------------
   CHECKOUT
   --------------------------- */
function initCheckout() {
  const itemsContainer = $('#checkout-items');
  const totalEl        = $('#checkout-total');
  const form           = $('#payment-form');
  if (!itemsContainer || !totalEl) return;

  function renderCheckout() {
    if (!cart.length) {
      itemsContainer.innerHTML = `<p class="muted">Tu carrito está vacío.</p>`;
      totalEl.textContent = '0.00';
      return;
    }

    let html  = '';
    let total = 0;

    cart.forEach((item, index) => {
      const t       = item.track;
      const price   = safePrice(t.trackPrice);
      const subtotal= price * item.qty;
      total += subtotal;

      html += `
        <div class="checkout-item">
          <img src="${(t.artworkUrl100 || '').replace('100x100','600x600')}" alt="">
          <div class="info">
            <h4>${escapeHtml(t.trackName)}</h4>
            <p class="muted">${escapeHtml(t.artistName)}</p>
            <p>Cantidad: ${item.qty}</p>
          </div>
          <strong>$${subtotal.toFixed(2)}</strong>
          <button class="btn-secondary-outline btn-remove-checkout" data-remove="${index}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    });

    itemsContainer.innerHTML = html;
    totalEl.textContent = total.toFixed(2);
  }

  const cardNameInput = $('#card-name');
  const cardNumberInput = $('#card-number');
  const cardExpInput = $('#card-exp');
  const cardCvcInput = $('#card-cvc');

  if (cardNameInput) {
    cardNameInput.addEventListener('input', e => {
      // Permitir sólo letras y espacios
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
      validateField(e.target);
    });
  }

  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', e => {
      // Permitir sólo números, y un límite de 16
      let value = e.target.value.replace(/\D/g, '');
      value = value.slice(0, 16);
      value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
      e.target.value = value;
      validateField(e.target);
    });
  }

  if (cardExpInput) {
    cardExpInput.addEventListener('input', e => {
      // Permitir sólo números formato MM/YY
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
      validateField(e.target);
    });
  }

  if (cardCvcInput) {
    cardCvcInput.addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, '');
      validateField(e.target);
    });
  }

  function validateField(input) {
    let isValid = false;
    if (input.id === 'card-number') {
      // Verificar 16 dígitos exactos, ignorando espacios
      const digits = input.value.replace(/\s/g, '');
      isValid = digits.length === 16 && /^\d{16}$/.test(digits);
    } else if (input.id === 'card-cvc') {
      // Verificar 3 dígitos exactos
      isValid = /^\d{3}$/.test(input.value);
    } else {
      // Para el resto de los campos, sólo verificar que no estén vacíos
      isValid = input.value.trim() !== '';
    }

    if (isValid) {
      input.classList.remove('input-invalid');
      input.classList.add('input-valid');
    } else {
      input.classList.remove('input-valid');
      input.classList.add('input-invalid');
    }
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const msgEl = $('#payment-msg');

      // Verificar que el carrito no esté vacío
      if (!cart.length) {
        if (msgEl) msgEl.textContent = 'No hay elementos en el carrito. Agrega productos antes de pagar.';
        return;
      }

      // Validación de formulario
      if (!form.checkValidity()) {
        if (msgEl) msgEl.textContent = 'Por favor completa todos los campos obligatorios.';
        // Destacar campos inválidos
        const inputs = form.querySelectorAll('input[required]');
        inputs.forEach(input => {
          if (!input.checkValidity()) {
            input.classList.add('input-invalid');
            input.classList.remove('input-valid');
          }
        });
        return;
      }

      // Si todo es correcto, proceder
      alert("¡Gracias por tu compra!");
      clearCart();
      if (msgEl) msgEl.textContent = '';
      // Re-render checkout después de limpiar carrito
      renderCheckout();
    });
  }

  renderCheckout();
}

/* ---------------------------
   BOOT
   --------------------------- */
function boot() {
  renderCartPanel();
  updateCartBadge();

  initDelegatedListeners();
  initSearchModal();
  initContactForm();
  initNavToggle();
  initCheckout();

  if ($('#featured-container')) loadFeatured();
  if ($('#catalog-container') || $('#catalog-results')) loadCatalogIfNeeded();
}

document.addEventListener('DOMContentLoaded', boot);
