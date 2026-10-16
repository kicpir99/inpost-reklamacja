<?php
/**
 * Gotowy kod integracji Paczkomatów InPost dla formularza reklamacji na honey4detailing.com
 * Formularz Avada ID: 2673
 * 
 * JAK TO WDROŻYĆ W WORDPRESSIE:
 * 
 * METODA 1 (NAJPROSTSZA - bez dotykania plików):
 * 1. Zaloguj się do panelu WordPressa na honey4detailing.com.
 * 2. Przejdź do: Avada -> Options -> Advanced -> Code Fields.
 * 3. Wklej zawartość pliku 'honey4detailing-inpost-integration.js' otoczoną znacznikami:
 *    <script>
 *       // TUTAJ KOD Z PLIKU honey4detailing-inpost-integration.js
 *    </script>
 *    do pola "Space before </body>".
 * 4. Zapisz opcje Avady.
 * 
 * METODA 2 (Wtyczka WPCode / Code Snippets lub functions.php motywu potomnego):
 * Wklej poniższy kod PHP jako nowy snippet:
 */

add_action('wp_footer', 'honey4detailing_inpost_reklamacja_script', 99);

function honey4detailing_inpost_reklamacja_script() {
    // Ładujemy skrypt na podstronie z formularzem (np. aa-testy lub ostateczny slug reklamacji)
    if (is_page('aa-testy') || is_page('reklamacje') || is_page('reklamacja')) {
        ?>
        <script>
        <?php echo file_get_contents(get_stylesheet_directory() . '/honey4detailing-inpost-integration.js'); ?>
        </script>
        <?php
    }
}
