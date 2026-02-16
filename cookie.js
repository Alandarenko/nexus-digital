(function() {
    // Prevent browser from restoring scroll position on navigation
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    if (localStorage.getItem('cookie_consent')) return;

    var html = '<div class="cookie-banner" id="cookieBanner" role="alert">'
        + '<p>Мы используем файлы cookie и сервис Яндекс.Метрика для анализа посещаемости. '
        + 'Продолжая использовать сайт, вы соглашаетесь с <a href="/privacy.html">политикой конфиденциальности</a> '
        + 'и обработкой данных в соответствии с 152-ФЗ.</p>'
        + '<div class="cookie-btns">'
        + '<button class="cookie-accept" onclick="acceptCookies()">Принять</button>'
        + '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    setTimeout(function() {
        document.getElementById('cookieBanner').classList.add('visible');
    }, 1500);

    window.acceptCookies = function() {
        localStorage.setItem('cookie_consent', Date.now());
        document.getElementById('cookieBanner').classList.remove('visible');
    };
})();
