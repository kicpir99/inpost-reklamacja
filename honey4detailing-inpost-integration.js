/**
 * Dedykowany skrypt integracji Paczkomatów InPost dla formularza reklamacji na stronie honey4detailing.com
 * Formularz Avada: .fusion-form-2673
 */

(function () {
  'use strict';

  // Czekamy na załadowanie DOM
  function initHoneyInPost() {
    const form = document.querySelector('.fusion-form-2673');
    if (!form) return;
    if (document.getElementById('honey-inpost-wrapper')) return; // Zabezpieczenie przed podwójnym uruchomieniem

    // Pobieramy elementy formularza Honey4Detailing wewnątrz właściwego formularza
    const radioCourier = form.querySelector('#radio-czy_pracowales_na_honey-2-0') || form.querySelector('input[value="KURIER"]');
    const radioPaczkomat = form.querySelector('#radio-czy_pracowales_na_honey-2-1') || form.querySelector('input[value="PACZKOMAT"]');

    const inputUlica = form.querySelector('#ulica, [name="ulica"]');
    const inputNrDomu = form.querySelector('#Nr_Domu, [name="Nr_Domu"], #NrDomu, [name="NrDomu"]');
    const inputNrLokalu = form.querySelector('#Nr_lokalu, [name="Nr_lokalu"], #Nrlokalu, [name="Nrlokalu"]');
    const inputKodPocztowy = form.querySelector('#Kod_Pocztowy, [name="Kod_Pocztowy"], #KodPocztowy, [name="KodPocztowy"], input[placeholder*="Kod pocztowy"]');
    const inputMiasto = form.querySelector('#Miasto, [name="Miasto"]');

    if (!radioPaczkomat) return;

    // Załaduj Leaflet jeśli jeszcze nie istnieje
    loadLeafletAssets(function () {
      buildInPostUI(form, radioPaczkomat, radioCourier, {
        inputUlica,
        inputNrDomu,
        inputNrLokalu,
        inputKodPocztowy,
        inputMiasto
      });
    });
  }

  // Ładowanie styli i skryptu Leaflet
  function loadLeafletAssets(callback) {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (window.L) {
      callback();
      return;
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      linkScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', callback);
    } else {
      callback();
    }
  }

  function linkScript(src, cb) {
    const s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    document.body.appendChild(s);
  }

  // Bezpieczne ustawianie wartości pól w Avada Forms (z wywołaniem zdarzeń i wsparciem jQuery)
  function setInputValue(input, val) {
    if (!input) return;
    input.value = val;
    input.setAttribute('value', val);

    // Jeśli WordPress / Avada posiada załadowany jQuery
    if (window.jQuery) {
      try {
        window.jQuery(input).val(val).trigger('change').trigger('input');
      } catch (e) {}
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // Budowa interfejsu przycisku i modalu
  function buildInPostUI(form, radioPaczkomat, radioCourier, inputs) {
    // 1. Kontener na przycisk i podgląd paczkomatu wstawiony zaraz pod radiem
    const radioContainer = radioPaczkomat.closest('.fusion-form-radio-field') || radioPaczkomat.parentElement;
    
    const inpostWrapper = document.createElement('div');
    inpostWrapper.id = 'honey-inpost-wrapper';
    inpostWrapper.style.display = radioPaczkomat.checked ? 'block' : 'none';
    inpostWrapper.innerHTML = `
      <div id="honey-inpost-action-bar" class="honey-inpost-action-bar">
        <button type="button" id="btn-open-inpost-map" class="honey-btn-inpost">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
            <circle cx="12" cy="9" r="2.5"></circle>
          </svg>
          Wybierz Paczkomat z mapy
        </button>
        <span class="honey-inpost-hint">Wskaż Paczkomat odbioru reklamacji</span>
      </div>

      <div id="honey-selected-paczkomat" class="honey-point-card" style="display: none;">
        <div class="honey-point-badge">InPost</div>
        <div class="honey-point-info">
          <strong id="honey-point-name">KRA01M</strong>
          <span id="honey-point-addr">ul. Pawia 5, Kraków</span>
        </div>
        <button type="button" class="honey-btn-change" id="btn-change-inpost-point">Zmień paczkomat</button>
      </div>
    `;

    // Wstawienie pod opcjami wyboru
    radioContainer.parentNode.insertBefore(inpostWrapper, radioContainer.nextSibling);

    // 2. Wstawienie modalu na koniec body
    const modal = document.createElement('div');
    modal.id = 'honey-inpost-modal';
    modal.className = 'honey-modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="honey-modal-dialog">
        <div class="honey-modal-header">
          <div class="honey-modal-title">
            <span class="honey-logo-inpost">InPost</span>
            <h3>Wybierz Paczkomat odbioru reklamacji</h3>
          </div>
          <button type="button" class="honey-modal-close" id="honey-modal-close-btn">&times;</button>
        </div>

        <div class="honey-modal-search">
          <input type="text" id="honey-search-input" placeholder="Wpisz miasto lub kod paczkomatu (np. Wrocław, Warszawa, KRA01M)..." value="Wrocław">
          <button type="button" id="honey-search-btn">Szukaj</button>
        </div>

        <div class="honey-quick-pills">
          <span>Szybki wybór:</span>
          <button type="button" class="honey-pill" data-city="Wrocław">Wrocław</button>
          <button type="button" class="honey-pill" data-city="Warszawa">Warszawa</button>
          <button type="button" class="honey-pill" data-city="Kraków">Kraków</button>
          <button type="button" class="honey-pill" data-city="Poznań">Poznań</button>
          <button type="button" class="honey-pill" data-city="Gdańsk">Gdańsk</button>
          <button type="button" class="honey-pill" data-city="Katowice">Katowice</button>
          <button type="button" class="honey-pill" data-city="Łódź">Łódź</button>
        </div>

        <div class="honey-modal-body">
          <div class="honey-points-sidebar" id="honey-points-list">
            <div style="padding: 20px; text-align: center; color: #64748b;">Ładowanie paczkomatów...</div>
          </div>
          <div class="honey-map-wrapper">
            <div id="honey-leaflet-map" style="width: 100%; height: 100%;"></div>
          </div>
        </div>

        <div class="honey-modal-footer">
          <span>Kliknij Paczkomat na mapie lub z listy, aby go zatwierdzić</span>
          <button type="button" class="honey-btn-cancel" id="honey-modal-cancel-btn">Anuluj</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Style CSS wstrzyknięte do head
    injectStyles();

    // Zmienne mapy
    let map = null;
    let markersLayer = null;
    let currentPoints = [];

    // Otwieranie / zamykanie modalu
    function openModal() {
      modal.style.display = 'flex';
      initMap();
      const city = document.getElementById('honey-search-input').value.trim() || 'Wrocław';
      fetchPoints(city);
    }

    function closeModal() {
      modal.style.display = 'none';
    }

    document.getElementById('btn-open-inpost-map').addEventListener('click', openModal);
    document.getElementById('btn-change-inpost-point').addEventListener('click', openModal);
    document.getElementById('honey-modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('honey-modal-cancel-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    // Przełączanie KURIER vs PACZKOMAT
    const allRadios = form.querySelectorAll('input[name="czy_pracowales_na_honey"]');
    allRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        const actBar = document.getElementById('honey-inpost-action-bar');
        const selCard = document.getElementById('honey-selected-paczkomat');

        if (radioPaczkomat.checked) {
          inpostWrapper.style.display = 'block';
          if (selCard && selCard.style.display === 'flex') {
            if (actBar) actBar.style.display = 'none';
          } else {
            if (actBar) actBar.style.display = 'flex';
            openModal();
          }
        } else {
          inpostWrapper.style.display = 'none';
          if (actBar) actBar.style.display = 'flex';
          if (selCard) selCard.style.display = 'none';

          // Przywrócenie możliwości ręcznego wpisania adresu dla kuriera
          if (inputs.inputUlica && inputs.inputUlica.value.startsWith('Paczkomat')) {
            setInputValue(inputs.inputUlica, '');
            setInputValue(inputs.inputNrDomu, '');
            setInputValue(inputs.inputNrLokalu, '');
            setInputValue(inputs.inputKodPocztowy, '');
            setInputValue(inputs.inputMiasto, '');
          }
        }
      });
    });

    // Wybór punktu
    function selectPoint(point) {
      const addr = point.address_details || point.address || {};
      const street = addr.street || '';
      const bNum = addr.building_number || '';
      const pCode = addr.post_code || '';
      const city = addr.city || '';
      const fullAddress = `${street} ${bNum}, ${pCode} ${city}`.trim();

      // 1. Podstawienie do pól Avada Formularza
      if (inputs.inputUlica) setInputValue(inputs.inputUlica, `Paczkomat ${point.name} - ${street}`);
      if (inputs.inputNrDomu) setInputValue(inputs.inputNrDomu, bNum || '1');
      if (inputs.inputNrLokalu) setInputValue(inputs.inputNrLokalu, '-'); // Zapobiega błędom required Avady
      if (inputs.inputKodPocztowy) setInputValue(inputs.inputKodPocztowy, pCode);
      if (inputs.inputMiasto) setInputValue(inputs.inputMiasto, city);

      // 2. Podstawienie obu pól Kraj_zakupu (kraj zakupu oraz kraj w adresie dostawy) na Polska
      const krajInputs = form.querySelectorAll('#Kraj_zakupu, [name="Kraj_zakupu"], #Krajzakupu, [name="Krajzakupu"], input[placeholder*="Kraj"]');
      krajInputs.forEach(function (inp) {
        setInputValue(inp, 'Polska');
      });

      // 3. Pokazanie karty wybranego paczkomatu i ukrycie dużego przycisku
      document.getElementById('honey-point-name').textContent = point.name;
      document.getElementById('honey-point-addr').textContent = fullAddress;

      const actBar = document.getElementById('honey-inpost-action-bar');
      const selCard = document.getElementById('honey-selected-paczkomat');
      if (actBar) actBar.style.display = 'none';
      if (selCard) selCard.style.display = 'flex';

      closeModal();
    }

    // Inicjalizacja Leaflet
    function initMap() {
      if (!window.L) return;
      if (!map) {
        map = L.map('honey-leaflet-map').setView([51.1079, 17.0385], 12);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          attribution: '&copy; Esri & InPost'
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
      }
      setTimeout(function () { if (map) map.invalidateSize(); }, 100);
      setTimeout(function () { if (map) map.invalidateSize(); }, 300);
    }

    // Pobieranie paczkomatów z publicznego API InPost (per_page=1000 pobiera całe miasto!)
    async function fetchPoints(query) {
      const listEl = document.getElementById('honey-points-list');
      listEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">Szukanie paczkomatów dla "${query}"...</div>`;

      try {
        // per_page=1000 pobiera paczkomaty w danej miejscowości
        const url = `https://api-shipx-pl.easypack24.net/v1/points?type=parcel_locker&per_page=1000&query=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        let points = data.items || [];

        // Jeśli miejscowość ma więcej niż 1000 paczkomatów (np. Warszawa ma 1660), dociągamy pozostałe strony
        if (data.total_pages && data.total_pages > 1) {
          const extraPromises = [];
          for (let p = 2; p <= data.total_pages; p++) {
            extraPromises.push(
              fetch(`${url}&page=${p}`)
                .then(function (r) { return r.json(); })
                .then(function (d) { return d.items || []; })
                .catch(function () { return []; })
            );
          }
          const extraResults = await Promise.all(extraPromises);
          extraResults.forEach(function (extraItems) {
            points = points.concat(extraItems);
          });
        }

        // Fallback po city jeśli query nie zwróciło wyników
        if (points.length === 0) {
          const cityUrl = `https://api-shipx-pl.easypack24.net/v1/points?type=parcel_locker&per_page=1000&city=${encodeURIComponent(query)}`;
          const cityRes = await fetch(cityUrl);
          if (cityRes.ok) {
            const cityData = await cityRes.json();
            points = cityData.items || [];
            if (cityData.total_pages && cityData.total_pages > 1) {
              const extraPromises = [];
              for (let p = 2; p <= cityData.total_pages; p++) {
                extraPromises.push(
                  fetch(`${cityUrl}&page=${p}`)
                    .then(function (r) { return r.json(); })
                    .then(function (d) { return d.items || []; })
                    .catch(function () { return []; })
                );
              }
              const extraResults = await Promise.all(extraPromises);
              extraResults.forEach(function (extraItems) {
                points = points.concat(extraItems);
              });
            }
          }
        }

        currentPoints = points;
        renderSidebar(points);
        renderMarkers(points);
      } catch (e) {
        console.error('Błąd pobierania punktów InPost:', e);
        listEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #dc2626;">Błąd połączenia z API InPost. Spróbuj ponownie.</div>`;
      }
    }

    function renderSidebar(points) {
      const listEl = document.getElementById('honey-points-list');
      listEl.innerHTML = '';

      if (points.length === 0) {
        listEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8;">Nie znaleziono punktów. Wpisz inne miasto lub kod.</div>`;
        return;
      }

      // Nagłówek licznika punktów
      const countHeader = document.createElement('div');
      countHeader.className = 'honey-count-header';
      countHeader.textContent = `Znaleziono ${points.length} Paczkomatów InPost`;
      listEl.appendChild(countHeader);

      // Renderujemy punkty na liście (do 150 sztuk dla pełnej płynności przewijania)
      const renderLimit = Math.min(points.length, 150);

      for (let i = 0; i < renderLimit; i++) {
        const pt = points[i];
        const addr = pt.address_details || pt.address || {};
        const item = document.createElement('div');
        item.className = 'honey-point-item';
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${pt.name}</strong>
            <span class="honey-badge-small">24/7</span>
          </div>
          <div style="font-size:12.5px; color:#334155; margin-top:2px;">${addr.street || ''} ${addr.building_number || ''}, ${addr.city || ''}</div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">${pt.location_description || 'Paczkomat InPost'}</div>
        `;
        item.addEventListener('click', function () {
          if (map && pt.location) {
            map.setView([pt.location.latitude, pt.location.longitude], 16);
          }
          selectPoint(pt);
        });
        listEl.appendChild(item);
      }

      if (points.length > 150) {
        const moreInfo = document.createElement('div');
        moreInfo.style.cssText = 'padding: 10px; font-size: 11px; color: #64748b; text-align: center;';
        moreInfo.textContent = `...oraz ${points.length - 150} kolejnych (wszystkie widoczne na mapie)`;
        listEl.appendChild(moreInfo);
      }
    }

    function renderMarkers(points) {
      if (!map || !markersLayer) return;
      markersLayer.clearLayers();
      const bounds = [];

      points.forEach(function (pt) {
        if (!pt.location) return;
        const lat = pt.location.latitude;
        const lng = pt.location.longitude;
        bounds.push([lat, lng]);

        const icon = L.divIcon({
          className: 'honey-custom-marker-wrapper',
          html: `<div class="honey-inpost-marker">${pt.name}</div>`,
          iconSize: [65, 26],
          iconAnchor: [32, 13]
        });

        const marker = L.marker([lat, lng], { icon: icon });
        const addr = pt.address_details || pt.address || {};
        const fullAddr = `${addr.street || ''} ${addr.building_number || ''}, ${addr.city || ''}`;

        marker.bindPopup(`
          <div style="font-family: inherit; font-size:13px; min-width: 180px;">
            <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${pt.name}</div>
            <div>${fullAddr}</div>
            <div style="font-size:11px; color:#64748b; margin: 4px 0 8px;">${pt.location_description || 'Czynny 24/7'}</div>
            <button type="button" class="honey-btn-select-popup" id="honey-popup-${pt.name}">Wybierz ten Paczkomat</button>
          </div>
        `);

        marker.on('popupopen', function () {
          const btn = document.getElementById(`honey-popup-${pt.name}`);
          if (btn) btn.addEventListener('click', function () { selectPoint(pt); });
        });

        markersLayer.addLayer(marker);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }
    }

    // Wyszukiwanie
    const searchBtn = document.getElementById('honey-search-btn');
    const searchInput = document.getElementById('honey-search-input');
    function triggerSearch() {
      const q = searchInput.value.trim();
      if (q) fetchPoints(q);
    }
    if (searchBtn) searchBtn.addEventListener('click', triggerSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); triggerSearch(); }
      });
    }

    // Szybkie pigułki
    document.querySelectorAll('.honey-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        const c = pill.getAttribute('data-city');
        searchInput.value = c;
        fetchPoints(c);
      });
    });
  }

  // Wstrzykiwanie styli CSS dla Honey4Detailing (akcent: #f79428, tło ciemnego motywu: #212326)
  function injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      /* Wyrównanie wiersza Avady aby 'Preferowana forma wysyłki:' i opcje były w jednej linii */
      .fusion-builder-nested-column-24,
      .fusion-builder-nested-column-25 {
        align-self: flex-start !important;
      }
      .fusion-builder-nested-column-24 .fusion-text p {
        margin-top: 2px !important;
      }

      #honey-inpost-wrapper {
        margin-top: 10px;
        width: 100%;
      }
      .honey-inpost-action-bar {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        margin: 8px 0;
      }
      .honey-btn-inpost {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #f79428;
        color: #ffffff;
        font-weight: 700;
        font-size: 13.5px;
        padding: 10px 18px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 4px 14px rgba(247, 148, 40, 0.35);
      }
      .honey-btn-inpost:hover {
        background: #e68318;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(247, 148, 40, 0.5);
      }
      .honey-inpost-hint {
        font-size: 12px;
        color: #94a3b8;
      }
      .honey-point-card {
        background: #212326;
        border: 1px solid rgba(247, 148, 40, 0.45);
        color: #ffffff;
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        width: 100%;
        max-width: 480px;
        transition: border-color 0.2s;
      }
      .honey-point-card:hover {
        border-color: #f79428;
      }
      .honey-point-badge {
        background: #f79428;
        color: #141617;
        font-weight: 800;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }
      .honey-point-info {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .honey-point-info strong {
        font-size: 14.5px;
        color: #f79428;
        letter-spacing: 0.3px;
      }
      .honey-point-info span {
        font-size: 12px;
        color: #cbd5e1;
        margin-top: 2px;
      }
      .honey-btn-change {
        background: rgba(247, 148, 40, 0.12);
        border: 1px solid #f79428;
        color: #f79428;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .honey-btn-change:hover {
        background: #f79428;
        color: #141617;
      }

      /* Modal */
      .honey-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(4px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .honey-modal-dialog {
        background: #ffffff;
        color: #0f172a;
        width: 100%;
        max-width: 960px;
        height: 85vh;
        max-height: 720px;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      }
      .honey-modal-header {
        padding: 14px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .honey-modal-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .honey-logo-inpost {
        background: #f79428;
        color: #141617;
        font-weight: 800;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
      }
      .honey-modal-title h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      .honey-modal-close {
        background: none;
        border: none;
        font-size: 26px;
        cursor: pointer;
        color: #64748b;
      }
      .honey-modal-search {
        padding: 10px 20px;
        background: #f8fafc;
        display: flex;
        gap: 8px;
        border-bottom: 1px solid #e2e8f0;
      }
      .honey-modal-search input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 13.5px;
      }
      .honey-modal-search button {
        background: #f79428;
        color: #ffffff;
        border: none;
        padding: 8px 18px;
        font-weight: 700;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .honey-modal-search button:hover {
        background: #e68318;
      }
      .honey-quick-pills {
        padding: 8px 20px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        font-size: 12px;
      }
      .honey-pill {
        background: #fff;
        border: 1px solid #cbd5e1;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 11.5px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .honey-pill:hover {
        background: #f79428;
        border-color: #f79428;
        color: #ffffff;
      }
      .honey-modal-body {
        flex: 1;
        display: flex;
        height: 100%;
        min-height: 380px;
        overflow: hidden;
      }
      .honey-points-sidebar {
        width: 340px;
        border-right: 1px solid #e2e8f0;
        overflow-y: auto;
        background: #fff;
      }
      .honey-count-header {
        padding: 8px 16px;
        background: #f1f5f9;
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        border-bottom: 1px solid #e2e8f0;
      }
      .honey-point-item {
        padding: 12px 16px;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background 0.15s;
      }
      .honey-point-item:hover {
        background: #fff7ed;
      }
      .honey-badge-small {
        background: #f79428;
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 5px;
        border-radius: 4px;
      }
      .honey-map-wrapper {
        flex: 1;
        position: relative;
        height: 100%;
      }
      .honey-inpost-marker {
        background: #f79428;
        border: 2px solid #141617;
        color: #141617;
        font-weight: 800;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 6px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      }
      .honey-btn-select-popup {
        background: #141617;
        color: #fff;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        width: 100%;
        margin-top: 4px;
        transition: background 0.15s;
      }
      .honey-btn-select-popup:hover {
        background: #f79428;
        color: #141617;
      }
      .honey-modal-footer {
        padding: 12px 20px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #64748b;
      }
      .honey-btn-cancel {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  // Uruchomienie po załadowaniu strony
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHoneyInPost);
  } else {
    initHoneyInPost();
  }
})();
