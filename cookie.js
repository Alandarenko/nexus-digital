(function() {
    // Prevent browser from restoring scroll position on navigation
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    var METRIKA_ID = 106813146;
    var consent = localStorage.getItem('cookie_consent');

    // If already consented — load Metrika immediately, no banner
    if (consent === 'accepted') {
        loadMetrika();
        return;
    }

    // If already declined — no Metrika, no banner
    if (consent === 'declined') return;

    // First visit — show banner
    var html = '<div class="cookie-banner" id="cookieBanner" role="alert">'
        + '<p>Мы используем файлы cookie и сервис Яндекс.Метрика для анализа посещаемости. '
        + 'Продолжая использовать сайт, вы соглашаетесь с <a href="/privacy.html">политикой конфиденциальности</a> '
        + 'и обработкой данных в соответствии с 152-ФЗ.</p>'
        + '<div class="cookie-btns">'
        + '<button class="cookie-decline" onclick="declineCookies()">Отклонить</button>'
        + '<button class="cookie-accept" onclick="acceptCookies()">Принять</button>'
        + '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    setTimeout(function() {
        document.getElementById('cookieBanner').classList.add('visible');
    }, 1500);

    window.acceptCookies = function() {
        localStorage.setItem('cookie_consent', 'accepted');
        document.getElementById('cookieBanner').classList.remove('visible');
        loadMetrika();
    };

    window.declineCookies = function() {
        localStorage.setItem('cookie_consent', 'declined');
        document.getElementById('cookieBanner').classList.remove('visible');
    };

    function loadMetrika() {
        // Preconnect
        var link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = 'https://mc.yandex.ru';
        document.head.appendChild(link);

        // Load tag.js
        (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
        })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID, 'ym');
        ym(METRIKA_ID, 'init', {
            ssr: true,
            webvisor: true,
            clickmap: true,
            ecommerce: 'dataLayer',
            referrer: document.referrer,
            url: location.href,
            accurateTrackBounce: true,
            trackLinks: true
        });
    }
})();
