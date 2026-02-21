(function() {
    // Prevent browser from restoring scroll position on navigation
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    var METRIKA_ID = 106813146;
    var consent = localStorage.getItem('cookie_consent');

    // Banner HTML
    function bannerHTML(isRevoke) {
        var text = isRevoke
            ? '<p>Вы ранее ' + (consent === 'accepted' ? 'приняли' : 'отклонили')
              + ' cookie. Вы можете изменить своё решение.</p>'
            : '<p>Мы используем файлы cookie и сервис Яндекс.Метрика для анализа посещаемости. '
              + 'Продолжая использовать сайт, вы соглашаетесь с <a href="/privacy.html">политикой конфиденциальности</a> '
              + 'и обработкой данных в соответствии с 152-ФЗ.</p>';
        return '<div class="cookie-banner" id="cookieBanner" role="alert">'
            + text
            + '<div class="cookie-btns">'
            + '<button class="cookie-decline" onclick="declineCookies()">Отклонить</button>'
            + '<button class="cookie-accept" onclick="acceptCookies()">Принять</button>'
            + '</div></div>';
    }

    function showBanner(isRevoke) {
        var existing = document.getElementById('cookieBanner');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', bannerHTML(isRevoke));
        // Force reflow for transition
        document.getElementById('cookieBanner').offsetHeight;
        document.getElementById('cookieBanner').classList.add('visible');
    }

    function clearMetrikaCookies() {
        var cookies = ['_ym_uid', '_ym_d', '_ym_isad', '_ym_visorc'];
        var domain = location.hostname;
        cookies.forEach(function(name) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + domain;
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.' + domain;
        });
    }

    window.acceptCookies = function() {
        var wasDeclined = localStorage.getItem('cookie_consent') === 'declined';
        localStorage.setItem('cookie_consent', 'accepted');
        document.getElementById('cookieBanner').classList.remove('visible');
        if (wasDeclined) {
            location.reload();
        } else {
            loadMetrika();
        }
    };

    window.declineCookies = function() {
        var wasAccepted = localStorage.getItem('cookie_consent') === 'accepted';
        localStorage.setItem('cookie_consent', 'declined');
        document.getElementById('cookieBanner').classList.remove('visible');
        if (wasAccepted) {
            clearMetrikaCookies();
            location.reload();
        }
    };

    // Footer link: open cookie settings
    window.openCookieSettings = function(e) {
        if (e) e.preventDefault();
        consent = localStorage.getItem('cookie_consent');
        showBanner(true);
    };

    // If already consented — load Metrika, bind footer link
    if (consent === 'accepted') {
        loadMetrika();
        return;
    }

    // If already declined — no Metrika, no banner
    if (consent === 'declined') return;

    // First visit — show banner with delay
    showBanner(false);
    // Hide initially, show after delay
    document.getElementById('cookieBanner').classList.remove('visible');
    setTimeout(function() {
        document.getElementById('cookieBanner').classList.add('visible');
    }, 1500);

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
