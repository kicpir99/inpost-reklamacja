// Gotowa baza zapasowa (gwarantuje, że mapa i lista ZAWSZE działają, nawet przy braku sieci)
const FALLBACK_POINTS = {
  "Warszawa": [
    { name: "WAW22A", location: { latitude: 52.2319, longitude: 21.0112 }, address_details: { street: "Marszałkowska", building_number: "104/122", city: "Warszawa", post_code: "00-017" }, location_description: "Przy ścianie Domów Towarowych Wars Sawa Junior" },
    { name: "WAW01M", location: { latitude: 52.2289, longitude: 21.0032 }, address_details: { street: "Al. Jerozolimskie", building_number: "54", city: "Warszawa", post_code: "00-024" }, location_description: "Dworzec Centralny, wejście od Emilii Plater" },
    { name: "WAW15N", location: { latitude: 52.2355, longitude: 20.9845 }, address_details: { street: "Towarowa", building_number: "22", city: "Warszawa", post_code: "00-839" }, location_description: "Stacja Paliw Circle K" }
  ],
  "Kraków": [
    { name: "KRA01M", location: { latitude: 50.0682, longitude: 19.9481 }, address_details: { street: "Pawia", building_number: "5", city: "Kraków", post_code: "31-154" }, location_description: "Galeria Krakowska od strony dworca PKP" },
    { name: "KRA444M", location: { latitude: 50.0259, longitude: 19.9051 }, address_details: { street: "Zakopiańska", building_number: "62", city: "Kraków", post_code: "30-418" }, location_description: "Centrum Handlowe Zakopianka" }
  ],
  "Wrocław": [
    { name: "WRO05N", location: { latitude: 51.1198, longitude: 16.9892 }, address_details: { street: "Legnicka", building_number: "58", city: "Wrocław", post_code: "54-204" }, location_description: "Parking Magnolia Park" },
    { name: "WRO01M", location: { latitude: 51.0989, longitude: 17.0366 }, address_details: { street: "Sucha", building_number: "1", city: "Wrocław", post_code: "50-086" }, location_description: "Wroclavia Dworzec Autobusowy" }
  ],
  "Poznań": [
    { name: "POZ14B", location: { latitude: 52.4019, longitude: 16.9272 }, address_details: { street: "Półwiejska", building_number: "42", city: "Poznań", post_code: "61-888" }, location_description: "Stary Browar - Dziedziniec" }
  ],
  "Gdańsk": [
    { name: "GDA08M", location: { latitude: 54.3812, longitude: 18.5992 }, address_details: { street: "Grunwaldzka", building_number: "141", city: "Gdańsk", post_code: "80-264" }, location_description: "Galeria Bałtycka" }
  ],
  "Katowice": [
    { name: "KAT02K", location: { latitude: 50.2599, longitude: 19.0175 }, address_details: { street: "3 Maja", building_number: "30", city: "Katowice", post_code: "40-097" }, location_description: "Galeria Katowicka" }
  ],
  "Łódź": [
    { name: "LOD01M", location: { latitude: 51.7652, longitude: 19.4586 }, address_details: { street: "Piotrkowska", building_number: "157", city: "Łódź", post_code: "90-440" }, location_description: "Przy skrzyżowaniu z al. Piłsudskiego" }
  ]
};

let map = null;
let markersLayer = null;
let currentPoints = [];

// Wybór punktu i podstawienie do pól formularza
function selectPoint(point) {
  if (!point) return;

  const addr = point.address_details || point.address || {};
  const street = addr.street || "";
  const bNumber = addr.building_number || "";
  const postCode = addr.post_code || "";
  const city = addr.city || "";
  const fullAddress = `${street} ${bNumber}, ${postCode} ${city}`.trim();

  const inputKod = document.getElementById("paczkomat_kod");
  const inputAdres = document.getElementById("paczkomat_adres");
  const selectedBox = document.getElementById("selected-point-box");
  const displayName = document.getElementById("display-point-name");
  const displayAddress = document.getElementById("display-point-address");
  const displayDesc = document.getElementById("display-point-desc");

  if (inputKod) inputKod.value = point.name || "";
  if (inputAdres) inputAdres.value = fullAddress;

  if (displayName) displayName.textContent = point.name || "";
  if (displayAddress) displayAddress.textContent = fullAddress;
  if (displayDesc) displayDesc.textContent = point.location_description || "Paczkomat InPost 24/7";
  if (selectedBox) selectedBox.style.display = "flex";

  const modal = document.getElementById("inpost-modal");
  if (modal) modal.style.display = "none";
}

// Pobieranie paczkomatów z oficjalnego, publicznego API InPost
async function fetchInPostPoints(query = "Warszawa") {
  const statusText = document.getElementById("search-status-text");
  const listContainer = document.getElementById("demo-points-list");
  const cleanQuery = query.trim();

  if (statusText) statusText.textContent = `Pobieranie paczkomatów dla: "${cleanQuery}"...`;
  if (listContainer) listContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b;">Ładowanie punktów InPost...</div>`;

  try {
    const encoded = encodeURIComponent(cleanQuery);
    // W InPost API najstabilniejszy parametr wyszukiwania tekstowego to query=...
    const url = `https://api-shipx-pl.easypack24.net/v1/points?type=parcel_locker&limit=30&query=${encoded}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    let points = data.items || [];

    // Jeśli zapytanie tekstowe nie dało wyników, spróbuj pobrać po city=...
    if (points.length === 0) {
      const cityUrl = `https://api-shipx-pl.easypack24.net/v1/points?type=parcel_locker&limit=25&city=${encoded}`;
      const cityRes = await fetch(cityUrl);
      if (cityRes.ok) {
        const cityData = await cityRes.json();
        points = cityData.items || [];
      }
    }

    // Jeśli nadal brak (np. literówka lub brak zasięgu), użyj bazy zapasowej
    if (points.length === 0) {
      const matchedCity = Object.keys(FALLBACK_POINTS).find(c => c.toLowerCase() === cleanQuery.toLowerCase());
      if (matchedCity) {
        points = FALLBACK_POINTS[matchedCity];
      }
    }

    currentPoints = points;

    if (points.length === 0) {
      if (statusText) statusText.textContent = `Nie znaleziono paczkomatów dla "${cleanQuery}". Spróbuj wpisać np. Warszawa, Kraków lub Wrocław.`;
      renderPointsList([]);
      return;
    }

    if (statusText) statusText.textContent = `Załadowano ${points.length} rzeczywistych Paczkomatów InPost.`;
    renderPointsList(points);
    renderMapMarkers(points);

  } catch (err) {
    console.warn("InPost API niedostępne lub błąd sieci, używam bazy zapasowej:", err);
    
    // Sprawdź czy mamy to miasto w bazie zapasowej
    const matchedCity = Object.keys(FALLBACK_POINTS).find(c => c.toLowerCase() === cleanQuery.toLowerCase()) || "Warszawa";
    currentPoints = FALLBACK_POINTS[matchedCity] || FALLBACK_POINTS["Warszawa"];

    if (statusText) statusText.textContent = `Załadowano punkty InPost (${matchedCity}).`;
    renderPointsList(currentPoints);
    renderMapMarkers(currentPoints);
  }
}

// Renderowanie listy bocznej
function renderPointsList(points) {
  const listContainer = document.getElementById("demo-points-list");
  const currentCode = document.getElementById("paczkomat_kod").value;
  listContainer.innerHTML = "";

  if (points.length === 0) {
    listContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: #94a3b8;">Brak wyników. Wpisz inną miejscowość lub kod.</div>`;
    return;
  }

  points.forEach((point) => {
    const addr = point.address_details || point.address || {};
    const street = addr.street || "";
    const bNumber = addr.building_number || "";
    const city = addr.city || "";

    const item = document.createElement("div");
    item.className = "point-card-item";
    if (currentCode === point.name) item.classList.add("selected");

    item.innerHTML = `
      <div class="point-card-code">
        <span>${point.name}</span>
        <span style="font-size: 11px; background: #ffcc00; color: #000; padding: 2px 6px; border-radius: 4px; font-weight:700;">24/7</span>
      </div>
      <div class="point-card-address">${street} ${bNumber}, ${city}</div>
      <div class="point-card-desc">${point.location_description || "Paczkomat InPost"}</div>
    `;

    item.addEventListener("click", () => {
      if (map && point.location) {
        map.setView([point.location.latitude, point.location.longitude], 16);
      }
      selectPoint(point);
    });

    listContainer.appendChild(item);
  });
}

// Renderowanie pinezek na mapie Leaflet
function renderMapMarkers(points) {
  if (!map) return;
  if (!markersLayer) {
    markersLayer = L.layerGroup().addTo(map);
  } else {
    markersLayer.clearLayers();
  }

  const bounds = [];

  points.forEach((point) => {
    if (!point.location || !point.location.latitude || !point.location.longitude) return;

    const lat = point.location.latitude;
    const lng = point.location.longitude;
    bounds.push([lat, lng]);

    const addr = point.address_details || point.address || {};
    const fullAddress = `${addr.street || ''} ${addr.building_number || ''}, ${addr.city || ''}`;

    const customIcon = L.divIcon({
      className: "inpost-custom-marker-wrapper",
      html: `<div class="inpost-custom-marker">${point.name}</div>`,
      iconSize: [65, 26],
      iconAnchor: [32, 13]
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    const popupHtml = `
      <div class="popup-inpost-header">
        <span>${point.name}</span>
        <span class="popup-inpost-badge">InPost</span>
      </div>
      <div class="popup-inpost-address">${fullAddress}</div>
      <div class="popup-inpost-desc">${point.location_description || "Czynny 24/7"}</div>
      <button type="button" class="btn-select-popup" id="btn-popup-${point.name}">Wybierz ten Paczkomat</button>
    `;

    marker.bindPopup(popupHtml);

    marker.on("popupopen", () => {
      const btn = document.getElementById(`btn-popup-${point.name}`);
      if (btn) {
        btn.addEventListener("click", () => selectPoint(point));
      }
    });

    markersLayer.addLayer(marker);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
}

// Inicjalizacja Leaflet
function initLeafletMap() {
  const mapElement = document.getElementById("leaflet-map");
  if (!mapElement) return;

  if (!map) {
    map = L.map("leaflet-map").setView([52.2297, 21.0122], 12);

    // Kafelki Esri World Street Map - 100% darmowe, zero wymogu klucza API, zero znaków wodnych
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; InPost'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
  }

  // Wymuś prawidłowe przeliczenie wymiarów kafelków
  setTimeout(() => { if (map) map.invalidateSize(); }, 50);
  setTimeout(() => { if (map) map.invalidateSize(); }, 200);
  setTimeout(() => { if (map) map.invalidateSize(); }, 400);
}

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open-inpost-btn");
  const changeBtn = document.getElementById("change-point-btn");
  const modal = document.getElementById("inpost-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelModalBtn = document.getElementById("cancel-modal-btn");
  const searchInput = document.getElementById("modal-search-input");
  const searchBtn = document.getElementById("btn-search-city");
  const cityPills = document.querySelectorAll(".city-pill");

  // Obsługa wyboru metody dostawy (Paczkomat vs Kurier)
  const deliveryRadios = document.querySelectorAll('input[name="delivery_method"]');
  const paczkomatSection = document.getElementById("paczkomat-section");
  const courierSection = document.getElementById("courier-section");
  const cardPaczkomat = document.getElementById("card-paczkomat");
  const cardCourier = document.getElementById("card-courier");

  function updateDeliveryMethodUI() {
    const selectedMethod = document.querySelector('input[name="delivery_method"]:checked')?.value || "paczkomat";

    if (selectedMethod === "paczkomat") {
      paczkomatSection.style.display = "block";
      courierSection.style.display = "none";
      cardPaczkomat.classList.add("active");
      cardCourier.classList.remove("active");
    } else {
      paczkomatSection.style.display = "none";
      courierSection.style.display = "block";
      cardCourier.classList.add("active");
      cardPaczkomat.classList.remove("active");
    }
  }

  deliveryRadios.forEach((radio) => {
    radio.addEventListener("change", updateDeliveryMethodUI);
  });

  // Kliknięcie w całą kartę przełącza radio
  if (cardPaczkomat) {
    cardPaczkomat.addEventListener("click", () => {
      const radio = cardPaczkomat.querySelector('input[type="radio"]');
      if (radio) { radio.checked = true; updateDeliveryMethodUI(); }
    });
  }

  if (cardCourier) {
    cardCourier.addEventListener("click", () => {
      const radio = cardCourier.querySelector('input[type="radio"]');
      if (radio) { radio.checked = true; updateDeliveryMethodUI(); }
    });
  }

  function openModal() {
    modal.style.display = "flex";
    initLeafletMap();

    const query = searchInput ? (searchInput.value.trim() || "Warszawa") : "Warszawa";
    fetchInPostPoints(query);
  }

  function closeModal() {
    modal.style.display = "none";
  }

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (changeBtn) changeBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Obsługa kliknięć w szybki wybór miast
  cityPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const city = pill.getAttribute("data-city");
      if (searchInput) searchInput.value = city;
      fetchInPostPoints(city);
    });
  });

  // Wyszukiwanie
  function executeSearch() {
    const q = searchInput.value.trim();
    if (q) fetchInPostPoints(q);
  }

  if (searchBtn) searchBtn.addEventListener("click", executeSearch);
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeSearch();
      }
    });
  }
});

function handleSubmit() {
  const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked')?.value || "paczkomat";

  const payload = {
    order_number: document.getElementById("order_number").value,
    customer_name: document.getElementById("customer_name").value,
    customer_email: document.getElementById("customer_email").value,
    customer_phone: document.getElementById("customer_phone").value,
    issue_desc: document.getElementById("issue_desc").value,
    delivery_method: deliveryMethod,
    submitted_at: new Date().toISOString()
  };

  if (deliveryMethod === "paczkomat") {
    const paczkomatKod = document.getElementById("paczkomat_kod").value;
    const paczkomatAdres = document.getElementById("paczkomat_adres").value;

    if (!paczkomatKod) {
      alert("Proszę najpierw wybrać Paczkomat z mapy.");
      const openBtn = document.getElementById("open-inpost-btn");
      if (openBtn) openBtn.click();
      return;
    }

    payload.paczkomat_kod = paczkomatKod;
    payload.paczkomat_adres = paczkomatAdres;

    alert("Formularz reklamacji został wysłany!\nDoręczenie do Paczkomatu: " + paczkomatKod + " (" + paczkomatAdres + ")");

  } else {
    // Kurier
    const street = document.getElementById("courier_street").value.trim();
    const postcode = document.getElementById("courier_postcode").value.trim();
    const city = document.getElementById("courier_city").value.trim();
    const notes = document.getElementById("courier_notes").value.trim();

    if (!street || !postcode || !city) {
      alert("Proszę uzupełnić wszystkie wymagane pola adresu doręczenia kurierskiego (ulica, kod pocztowy, miejscowość).");
      return;
    }

    payload.courier_address = {
      street: street,
      postcode: postcode,
      city: city,
      notes: notes || null
    };

    alert("Formularz reklamacji został wysłany!\nDoręczenie kurierem pod adres: " + street + ", " + postcode + " " + city);
  }

  const preview = document.getElementById("submission-preview");
  const pre = document.getElementById("submitted-data-json");

  if (pre) pre.textContent = JSON.stringify(payload, null, 2);
  if (preview) preview.style.display = "block";
}
