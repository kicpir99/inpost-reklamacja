# Środowisko Testowe: Integracja Paczkomatów InPost z Formularzem Reklamacji

To repozytorium zawiera gotowe, w pełni działające środowisko demonstracyjne oraz kod produkcyjny do wdrożenia w WordPressie.

## 📂 Struktura plików

1. [index.html](file:///c:/Users/kacpe/Desktop/test/index.html) - Gotowy formularz reklamacji wraz z sekcją wyboru Paczkomatu InPost, podglądem wybranego punktu oraz wyskakującym modalem mapy.
2. [style.css](file:///c:/Users/kacpe/Desktop/test/style.css) - Nowoczesne, responsywne style CSS (obsługa modalu, badge wybranego paczkomatu, karty).
3. [app.js](file:///c:/Users/kacpe/Desktop/test/app.js) - Logika JavaScript:
   - Tryb demonstracyjny z interaktywną listą i mapą paczkomatów (działa natychmiast, bez konieczności podawania tokenu API).
   - Tryb produkcyjny z oficjalnym SDK InPost Geowidget v5 (po podaniu tokenu).
   - Automatyczne przepisywanie danych do pól `paczkomat_kod` oraz `paczkomat_adres`.
4. [wordpress-integration-snippet.php](file:///c:/Users/kacpe/Desktop/test/wordpress-integration-snippet.php) - Gotowy kod PHP do wklejenia w `functions.php` motywu potomnego lub we wtyczce WPCode.

## 🚀 Jak uruchomić testowo?

Wystarczy otworzyć plik [index.html](file:///c:/Users/kacpe/Desktop/test/index.html) w dowolnej przeglądarce (np. Firefox, Edge).
Możesz kliknąć **"Wybierz Paczkomat z mapy"**, wybrać dowolny punkt i zobaczyć, jak wartości natychmiast wędrują do pól formularza!
