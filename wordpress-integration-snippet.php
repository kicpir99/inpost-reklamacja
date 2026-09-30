<?php
/**
 * Gotowy, niezawodny fragment kodu dla WordPressa do wdrożenia wyboru Paczkomatu InPost
 * w formularzu reklamacji BEZ WYMOGU TOKENU API (korzysta z oficjalnego, publicznego API punktów InPost).
 *
 * Możesz wkleić ten kod do pliku functions.php motywu potomnego (Child Theme)
 * lub dodać jako snippet we wtyczce WPCode / Code Snippets.
 */

add_action('wp_enqueue_scripts', 'inpost_reklamacja_enqueue_assets');

function inpost_reklamacja_enqueue_assets() {
    // 1. Ładujemy zasoby TYLKO na podstronie reklamacji (podmień 'reklamacja' na slug lub ID strony)
    if (is_page('reklamacja')) {
        
        // Biblioteka mapowa Leaflet (używana także przez InPost)
        wp_enqueue_style(
            'leaflet-css',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
            array(),
            '1.9.4'
        );

        wp_enqueue_script(
            'leaflet-js',
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            array(),
            '1.9.4',
            true
        );

        // 2. Skrypt łączący mapę z publicznym API InPost i polami Twojego formularza
        $custom_js = "
        let inpostMap = null;
        let inpostMarkers = null;

        function setClaimPaczkomat(point) {
            const addr = point.address_details || point.address || {};
            const fullAddress = (addr.street || '') + ' ' + (addr.building_number || '') + ', ' + (addr.post_code || '') + ' ' + (addr.city || '');
            
            const inputKod = document.getElementById('paczkomat_kod');
            const inputAdres = document.getElementById('paczkomat_adres');
            const box = document.getElementById('selected-point-box');

            if (inputKod) inputKod.value = point.name;
            if (inputAdres) inputAdres.value = fullAddress.trim();

            if (box) {
                const nameEl = document.getElementById('display-point-name');
                const addrEl = document.getElementById('display-point-address');
                if (nameEl) nameEl.textContent = point.name;
                if (addrEl) addrEl.textContent = fullAddress.trim();
                box.style.display = 'flex';
            }

            const modal = document.getElementById('inpost-modal');
            if (modal) modal.style.display = 'none';
        }

        async function loadInPostPoints(query = 'Warszawa') {
            try {
                const url = 'https://api-shipx-pl.easypack24.net/v1/points?type=parcel_locker&limit=30&relative_point=' + encodeURIComponent(query);
                const res = await fetch(url);
                const data = await res.json();
                const points = data.items || [];

                if (inpostMarkers) inpostMarkers.clearLayers();
                const bounds = [];

                points.forEach(point => {
                    if (!point.location) return;
                    const lat = point.location.latitude;
                    const lng = point.location.longitude;
                    bounds.push([lat, lng]);

                    const addr = point.address_details || point.address || {};
                    const marker = L.marker([lat, lng]).addTo(inpostMarkers);
                    
                    const popup = '<strong>' + point.name + '</strong><br>' + 
                                  (addr.street || '') + ' ' + (addr.building_number || '') + ', ' + (addr.city || '') + '<br>' +
                                  '<button type=\"button\" style=\"margin-top:6px;background:#ffcc00;border:none;padding:5px 10px;cursor:pointer;font-weight:bold;\" onclick=\"window._pickPaczkomat(\'' + point.name + '\')\">Wybierz ten Paczkomat</button>';
                    
                    marker.bindPopup(popup);
                });

                window._cachedPoints = points;
                if (bounds.length > 0 && inpostMap) inpostMap.fitBounds(bounds, { padding: [30, 30] });
            } catch(e) {
                console.error('Błąd InPost API:', e);
            }
        }

        window._pickPaczkomat = function(name) {
            const pt = (window._cachedPoints || []).find(p => p.name === name);
            if (pt) setClaimPaczkomat(pt);
        };

        document.addEventListener('DOMContentLoaded', function() {
            const openBtn = document.getElementById('open-inpost-btn');
            const modal = document.getElementById('inpost-modal');
            const closeBtn = document.getElementById('close-modal-btn');
            const cancelBtn = document.getElementById('cancel-modal-btn');
            const searchBtn = document.getElementById('btn-search-city');
            const searchInput = document.getElementById('modal-search-input');

            // Logika warunkowa: Paczkomat vs Kurier
            const deliveryRadios = document.querySelectorAll('input[name=\"delivery_method\"]');
            const paczkomatSection = document.getElementById('paczkomat-section');
            const courierSection = document.getElementById('courier-section');

            function toggleDeliveryMethod() {
                const method = document.querySelector('input[name=\"delivery_method\"]:checked')?.value;
                if (method === 'courier') {
                    if (paczkomatSection) paczkomatSection.style.display = 'none';
                    if (courierSection) courierSection.style.display = 'block';
                } else {
                    if (paczkomatSection) paczkomatSection.style.display = 'block';
                    if (courierSection) courierSection.style.display = 'none';
                }
            }

            deliveryRadios.forEach(radio => radio.addEventListener('change', toggleDeliveryMethod));

            function open() {
                if (modal) modal.style.display = 'flex';
                if (!inpostMap) {
                    inpostMap = L.map('leaflet-map').setView([52.2297, 21.0122], 12);
                    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                        maxZoom: 18,
                        attribution: '&copy; Esri &mdash; InPost'
                    }).addTo(inpostMap);
                    inpostMarkers = L.layerGroup().addTo(inpostMap);
                    loadInPostPoints(searchInput ? searchInput.value : 'Warszawa');
                }
                setTimeout(() => { if (inpostMap) inpostMap.invalidateSize(); }, 200);
            }

            function close() {
                if (modal) modal.style.display = 'none';
            }

            if (openBtn) openBtn.addEventListener('click', function(e) { e.preventDefault(); open(); });
            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);
            if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) close(); });

            if (searchBtn && searchInput) {
                searchBtn.addEventListener('click', () => loadInPostPoints(searchInput.value));
            }
        });
        ";

        wp_add_inline_script('leaflet-js', $custom_js);
    }
}
