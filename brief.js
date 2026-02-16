(function() {
    // Inject brief modal HTML
    var html = '<div class="modal-overlay" id="briefModal" role="dialog" aria-modal="true" aria-label="Форма заявки">'
        + '<div class="modal-header"><div class="modal-header-left">'
        + '<button class="logo modal-logo-btn" onclick="tryCloseBrief()">Devorra</button>'
        + '<button class="modal-back" onclick="tryCloseBrief()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>На сайт</button>'
        + '</div><div class="modal-header-right">'
        + '<div class="modal-progress"><div class="modal-progress-fill" id="bProg"></div></div>'
        + '<span class="modal-progress-text" id="bProgTxt">0%</span>'
        + '<button class="modal-close" onclick="tryCloseBrief()" aria-label="Закрыть">&times;</button>'
        + '</div></div>'
        + '<div class="modal-body"><div class="modal-hero"><div class="m-label">Заявка</div>'
        + '<h2>Расскажите о <span>вашем проекте</span></h2>'
        + '<p>Оставьте контакты и опишите задачу — мы свяжемся и обсудим детали.</p>'
        + '<a href="/brief.html" class="b-full-link" style="display:inline-flex;align-items:center;gap:8px;margin-top:20px;padding:12px 24px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);border-radius:12px;color:#a5b4fc;font-size:15px;font-weight:500;text-decoration:none;transition:all 0.3s" onmouseover="this.style.background=\'rgba(99,102,241,0.25)\';this.style.borderColor=\'rgba(129,140,248,0.6)\';this.style.color=\'#c7d2fe\'" onmouseout="this.style.background=\'rgba(99,102,241,0.15)\';this.style.borderColor=\'rgba(99,102,241,0.4)\';this.style.color=\'#a5b4fc\'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Заполнить подробный бриф →</a></div>'
        + '<div class="b-steps" id="bSteps">'
        + '<button class="b-step active" onclick="bGo(0)">1. Контакты</button>'
        + '<button class="b-step" onclick="bGo(1)">2. О проекте</button></div>'
        + '<div class="b-section active" id="bs0">'
        + '<div class="b-head"><div class="b-num">Шаг 1 из 2</div><h3>Контактная информация</h3><p>Как с вами связаться</p></div>'
        + '<div class="b-row">'
        + '<div class="b-field"><label for="b_name">Имя <span class="req">*</span></label><input class="b-input" id="b_name" name="b_name" placeholder="Иван Петров" autocomplete="name" maxlength="100" aria-required="true"><div class="b-err">Укажите ваше имя</div></div>'
        + '<div class="b-field"><label for="b_phone">Телефон <span class="req">*</span></label><input class="b-input" id="b_phone" name="b_phone" type="tel" placeholder="+7 (999) 123-45-67" autocomplete="tel" maxlength="20" aria-required="true"><div class="b-err">Укажите номер телефона</div><div class="b-swarn">Проверьте номер — слишком короткий</div></div>'
        + '</div><div class="b-row">'
        + '<div class="b-field"><label for="b_email">Email <span class="req">*</span></label><input class="b-input" id="b_email" name="b_email" type="email" placeholder="ivan@company.ru" autocomplete="email" maxlength="100" aria-required="true"><div class="b-err">Укажите email</div><div class="b-swarn">Проверьте формат email</div></div>'
        + '<div class="b-field"><label for="b_tg">Telegram <span class="opt">необязательно</span></label><input class="b-input" id="b_tg" name="b_tg" placeholder="@username" maxlength="50"></div>'
        + '</div><div class="b-nav"><div></div><button class="b-btn b-btn-pri" onclick="bNext()">Далее</button></div></div>'
        + '<div class="b-section" id="bs1">'
        + '<div class="b-head"><div class="b-num">Шаг 2 из 2</div><h3>О проекте</h3><p>Расскажите что нужно сделать</p></div>'
        + '<div class="b-field"><label>Тип проекта <span class="req">*</span></label><div class="b-checks" role="radiogroup" aria-label="Тип проекта">'
        + '<div class="b-chk"><input type="radio" id="bst1" name="b_stype" value="Лендинг"><label for="bst1">Лендинг</label></div>'
        + '<div class="b-chk"><input type="radio" id="bst2" name="b_stype" value="Корпоративный сайт"><label for="bst2">Корпоративный сайт</label></div>'
        + '<div class="b-chk"><input type="radio" id="bst3" name="b_stype" value="Интернет-магазин"><label for="bst3">Интернет-магазин</label></div>'
        + '<div class="b-chk"><input type="radio" id="bst4" name="b_stype" value="Мобильное приложение"><label for="bst4">Приложение</label></div>'
        + '<div class="b-chk"><input type="radio" id="bst5" name="b_stype" value="Telegram-бот"><label for="bst5">Telegram-бот</label></div>'
        + '<div class="b-chk"><input type="radio" id="bst6" name="b_stype" value="Другое"><label for="bst6">Другое</label></div>'
        + '</div><div class="b-err">Выберите тип проекта</div></div>'
        + '<div class="b-field"><label for="b_desc">Опишите задачу <span class="req">*</span></label><textarea class="b-textarea" id="b_desc" name="b_desc" placeholder="Что нужно сделать? Какую проблему решить?" maxlength="2000" aria-required="true"></textarea><div class="b-char-count" id="bDescCount">0 / 2000</div><div class="b-err">Опишите вашу задачу</div></div>'
        + '<div class="b-field"><label>Бюджет <span class="req">*</span></label><div class="b-checks" role="radiogroup" aria-label="Бюджет">'
        + '<div class="b-chk"><input type="radio" id="bbu1" name="b_bud" value="до 100K"><label for="bbu1">до 100 тыс. ₽</label></div>'
        + '<div class="b-chk"><input type="radio" id="bbu2" name="b_bud" value="100-300K"><label for="bbu2">100-300 тыс. ₽</label></div>'
        + '<div class="b-chk"><input type="radio" id="bbu3" name="b_bud" value="300K-1M"><label for="bbu3">300K — 1 млн ₽</label></div>'
        + '<div class="b-chk"><input type="radio" id="bbu4" name="b_bud" value="1M+"><label for="bbu4">Более 1 млн ₽</label></div>'
        + '<div class="b-chk"><input type="radio" id="bbu5" name="b_bud" value="Обсудим"><label for="bbu5">Обсудим</label></div>'
        + '</div><div class="b-err">Выберите бюджет</div></div>'
        + '<div class="b-field"><label>Сроки</label><div class="b-checks" role="radiogroup" aria-label="Сроки">'
        + '<div class="b-chk"><input type="radio" id="btm1" name="b_time" value="Срочно"><label for="btm1">Срочно</label></div>'
        + '<div class="b-chk"><input type="radio" id="btm2" name="b_time" value="1 мес"><label for="btm2">1 месяц</label></div>'
        + '<div class="b-chk"><input type="radio" id="btm3" name="b_time" value="2-3 мес"><label for="btm3">2-3 месяца</label></div>'
        + '</div></div>'
        + '<div class="b-field"><label>Комментарии <span class="opt">необязательно</span></label><textarea class="b-textarea" name="b_comments" placeholder="Ссылки на примеры, пожелания, детали..." maxlength="2000"></textarea></div>'
        + '<div class="b-nav"><button class="b-btn b-btn-sec" onclick="bPrev()">Назад</button><button class="b-btn b-btn-ok" onclick="bShowResults()">Проверить и отправить</button></div></div>'
        + '<div class="b-section" id="bResults">'
        + '<div class="b-head"><div class="b-num">Готово</div><h3>Сводка по заявке</h3><p>Проверьте и отправьте</p></div>'
        + '<div id="bResContent"></div>'
        + '<div id="bResWarnings" class="b-warnings"></div>'
        + '<div id="bSendStatus" class="b-send-status"></div>'
        + '<label class="b-consent"><input type="checkbox" id="bConsent"><span>Я соглашаюсь с <a href="/privacy.html" target="_blank">политикой конфиденциальности</a> и даю согласие на обработку персональных данных</span></label>'
        + '<div class="b-nav"><button class="b-btn b-btn-sec" onclick="bGo(0)">Редактировать</button><button class="b-btn b-btn-ok" id="bSendBtn" onclick="bSendTg()">Отправить заявку</button></div>'
        + '</div></div></div>'
        + '<div class="modal-confirm-overlay" id="confirmLeave" role="alertdialog" aria-modal="true" aria-label="Подтверждение выхода">'
        + '<div class="modal-confirm"><h3>Вернуться на сайт?</h3>'
        + '<p>Заполненные данные не сохранены и будут потеряны при закрытии брифа.</p>'
        + '<div class="modal-confirm-btns">'
        + '<button class="btn-confirm-stay" onclick="hideConfirm()">Остаться</button>'
        + '<button class="btn-confirm-leave" onclick="forceCloseBrief()">Вернуться на сайт</button>'
        + '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    // Brief state
    var briefTrigger = null;
    var briefSent = false;

    window.openBrief = function() {
        if (typeof closeMenu === 'function') closeMenu();
        briefTrigger = document.activeElement;
        var modal = document.getElementById('briefModal');
        modal.classList.add('open');
        modal.scrollTo(0, 0);
        document.body.style.overflow = 'hidden';
        setTimeout(function() { var first = document.querySelector('#briefModal .b-input'); if (first) first.focus(); }, 100);
    };
    window.closeBrief = function() {
        document.getElementById('briefModal').classList.remove('open');
        document.body.style.overflow = '';
        if (briefTrigger) { briefTrigger.focus(); briefTrigger = null; }
    };

    function briefHasData() {
        var has = false;
        document.querySelectorAll('#briefModal .b-input, #briefModal .b-textarea').forEach(function(e) { if (e.value && e.value.trim()) has = true; });
        document.querySelectorAll('#briefModal input[type=radio]:checked').forEach(function() { has = true; });
        document.querySelectorAll('#briefModal input[type=checkbox]:checked:not(#bConsent)').forEach(function() { has = true; });
        return has;
    }
    window.tryCloseBrief = function() {
        if (briefSent) { closeBrief(); return; }
        if (briefHasData()) {
            document.getElementById('confirmLeave').classList.add('open');
            setTimeout(function() { var stay = document.querySelector('#confirmLeave .btn-confirm-stay'); if (stay) stay.focus(); }, 50);
        } else {
            closeBrief();
        }
    };
    window.hideConfirm = function() {
        document.getElementById('confirmLeave').classList.remove('open');
        var closeBtn = document.querySelector('#briefModal .modal-close');
        if (closeBtn) closeBtn.focus();
    };
    window.forceCloseBrief = function() { document.getElementById('confirmLeave').classList.remove('open'); closeBrief(); };

    var bReq = {
        0: [
            { name: 'b_name', type: 'input', label: 'Имя' },
            { name: 'b_phone', type: 'input', label: 'Телефон' },
            { name: 'b_email', type: 'input', label: 'Email' }
        ],
        1: [
            { name: 'b_stype', type: 'radio', label: 'Тип проекта' },
            { name: 'b_desc', type: 'input', label: 'Описание задачи' },
            { name: 'b_bud', type: 'radio', label: 'Бюджет' }
        ]
    };

    function bValidateStep(step) {
        var rules = bReq[step] || [];
        var ok = true;
        var sec = document.getElementById('bs' + step);
        sec.querySelectorAll('.b-field').forEach(function(f) { f.classList.remove('has-error', 'soft-warn'); });
        rules.forEach(function(r) {
            var valid = false;
            if (r.type === 'input') { var el = sec.querySelector('[name="' + r.name + '"]'); if (el && el.value.trim()) valid = true; }
            else if (r.type === 'radio') { valid = !!sec.querySelector('[name="' + r.name + '"]:checked'); }
            if (!valid) {
                ok = false;
                var el = sec.querySelector('[name="' + r.name + '"]');
                if (el) { var field = el.closest('.b-field'); if (field) field.classList.add('has-error'); }
            }
        });
        bSoftValidate(sec);
        return ok;
    }

    function bSoftValidate(sec) {
        var email = sec.querySelector('[name="b_email"]');
        if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
            var f = email.closest('.b-field'); f.classList.remove('has-error'); f.classList.add('soft-warn');
        }
        var phone = sec.querySelector('[name="b_phone"]');
        if (phone && phone.value.trim() && phone.value.replace(/\D/g, '').length < 7) {
            var f = phone.closest('.b-field'); f.classList.remove('has-error'); f.classList.add('soft-warn');
        }
    }

    function bValidateAll() {
        var missing = [];
        for (var s = 0; s < 2; s++) {
            var rules = bReq[s] || [];
            var sec = document.getElementById('bs' + s);
            rules.forEach(function(r) {
                var valid = false;
                if (r.type === 'input') { var el = sec.querySelector('[name="' + r.name + '"]'); valid = el && el.value.trim(); }
                else if (r.type === 'radio') { valid = !!sec.querySelector('[name="' + r.name + '"]:checked'); }
                if (!valid) missing.push({ step: s, label: r.label });
            });
        }
        var btns = document.querySelectorAll('.b-step');
        btns.forEach(function(b) { b.classList.remove('has-missing'); });
        var missingSteps = [];
        missing.forEach(function(m) { if (missingSteps.indexOf(m.step) === -1) missingSteps.push(m.step); });
        missingSteps.forEach(function(s) { if (btns[s]) btns[s].classList.add('has-missing'); });
        return missing;
    }

    document.getElementById('briefModal').addEventListener('input', function(e) {
        var field = e.target.closest('.b-field'); if (field) field.classList.remove('has-error', 'soft-warn');
    });
    document.getElementById('briefModal').addEventListener('change', function(e) {
        var field = e.target.closest('.b-field'); if (field) field.classList.remove('has-error', 'soft-warn');
    });

    var bCur = 0;
    window.bGo = function(n) {
        if (n > bCur) { for (var i = bCur; i < n; i++) { if (!bValidateStep(i)) return; bMarkDone(i); } }
        document.querySelectorAll('.b-section').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('bs' + n).classList.add('active');
        bCur = n;
        var btns = document.querySelectorAll('.b-step');
        btns.forEach(function(b, i) { b.classList.remove('active'); if (i === n) b.classList.add('active'); });
        bUpdProg();
        document.getElementById('briefModal').scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.bNext = function() {
        if (bCur < 1) {
            if (bValidateStep(bCur)) { bMarkDone(bCur); bGo(bCur + 1); }
            else { var firstErr = document.querySelector('#bs' + bCur + ' .has-error'); if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }
    };
    window.bPrev = function() { if (bCur > 0) bGo(bCur - 1); };
    function bMarkDone(i) { var b = document.querySelectorAll('.b-step'); if (b[i]) b[i].classList.add('done'); }

    var descArea = document.getElementById('b_desc');
    var descCount = document.getElementById('bDescCount');
    descArea.addEventListener('input', function() {
        var len = descArea.value.length;
        descCount.textContent = len + ' / 2000';
        descCount.className = 'b-char-count' + (len >= 2000 ? ' at-limit' : len >= 1800 ? ' near-limit' : '');
    });

    function bUpdProg() {
        var c = 0, t = 0;
        document.querySelectorAll('#briefModal .b-input, #briefModal .b-textarea').forEach(function(e) { t++; if (e.value && e.value.trim()) c++; });
        var radioGroups = {};
        document.querySelectorAll('#briefModal input[type=radio]').forEach(function(e) { radioGroups[e.name] = true; });
        Object.keys(radioGroups).forEach(function(name) { t++; if (document.querySelector('#briefModal input[name="' + name + '"]:checked')) c++; });
        var p = t ? Math.min(Math.round((c / t) * 100), 100) : 0;
        document.getElementById('bProg').style.width = p + '%';
        document.getElementById('bProgTxt').textContent = p + '%';
    }
    document.getElementById('briefModal').addEventListener('input', bUpdProg);
    document.getElementById('briefModal').addEventListener('change', bUpdProg);

    function bV(n) { var e = document.querySelector('#briefModal [name="' + n + '"]'); if (!e) return '—'; if (e.type === 'radio') { var c = document.querySelector('#briefModal [name="' + n + '"]:checked'); return c ? c.value : '—'; } return e.value || '—'; }
    function bC(n) { var items = document.querySelectorAll('#briefModal [name="' + n + '"]:checked'); return items.length ? Array.from(items).map(function(e) { return e.value; }).join(', ') : '—'; }
    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    window.bShowResults = function() {
        if (!bValidateStep(bCur)) {
            var firstErr = document.querySelector('#bs' + bCur + ' .has-error');
            if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        var missing = bValidateAll();
        if (missing.length > 0) {
            var html = '<div class="b-val-summary"><p>Не заполнены обязательные поля:</p>';
            var grouped = {};
            missing.forEach(function(m) { if (!grouped[m.step]) grouped[m.step] = []; grouped[m.step].push(m.label); });
            var stepNames = ['Контакты','О проекте'];
            Object.keys(grouped).forEach(function(s) {
                html += '<span class="b-val-link" onclick="bGo(' + s + ')">Шаг ' + (+s+1) + '. ' + stepNames[s] + ': ' + grouped[s].join(', ') + '</span>';
            });
            html += '</div>';
            document.getElementById('bResWarnings').innerHTML = html;
            document.querySelectorAll('.b-section').forEach(function(s) { s.classList.remove('active'); });
            document.getElementById('bResults').classList.add('active');
            document.getElementById('bResContent').innerHTML = '';
            document.getElementById('briefModal').scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        document.querySelectorAll('.b-section').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('bResults').classList.add('active');
        bMarkDone(1);
        var secs = [
            { t: 'Контакты', r: [['Имя', bV('b_name')],['Телефон', bV('b_phone')],['Email', bV('b_email')],['Telegram', bV('b_tg')]] },
            { t: 'О проекте', r: [['Тип проекта', bC('b_stype')],['Задача', bV('b_desc')],['Бюджет', bC('b_bud')],['Сроки', bC('b_time')],['Комментарии', bV('b_comments')]] },
        ];
        var h = '';
        secs.forEach(function(s) { h += '<div class="b-result"><h4>' + s.t + '</h4>'; s.r.forEach(function(pair) { h += '<div class="b-rrow"><span class="b-rlbl">' + pair[0] + '</span><span class="b-rval">' + escHtml(pair[1]) + '</span></div>'; }); h += '</div>'; });
        document.getElementById('bResContent').innerHTML = h;
        document.getElementById('bResWarnings').innerHTML = '';
        document.getElementById('briefModal').scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.bSendTg = function() {
        if (!document.getElementById('bConsent').checked) {
            var status = document.getElementById('bSendStatus');
            status.innerHTML = '<div class="b-val-summary"><p>Необходимо согласие на обработку персональных данных</p></div>';
            return;
        }
        var missing = bValidateAll();
        if (missing.length > 0) {
            var status = document.getElementById('bSendStatus');
            var html = '<div class="b-val-summary"><p>Заполните обязательные поля перед отправкой:</p>';
            var grouped = {};
            missing.forEach(function(m) { if (!grouped[m.step]) grouped[m.step] = []; grouped[m.step].push(m.label); });
            var stepNames = ['Контакты','О проекте'];
            Object.keys(grouped).forEach(function(s) {
                html += '<span class="b-val-link" onclick="bGo(' + s + ')">Шаг ' + (+s+1) + '. ' + stepNames[s] + ': ' + grouped[s].join(', ') + '</span>';
            });
            html += '</div>';
            status.innerHTML = html;
            return;
        }
        var btn = document.getElementById('bSendBtn');
        var status = document.getElementById('bSendStatus');
        btn.disabled = true;
        btn.classList.add('loading');
        btn.textContent = 'Отправка';
        status.innerHTML = '';

        var esc = function(s) { return s.replace(/([_*`\[])/g, '\\$1'); };
        var msg = '\u{1F4CB} *Новая заявка с сайта Devorra*\n\n';
        var fields = [
            ['\u{1F464} Имя', bV('b_name')], ['\u{1F4DE} Телефон', bV('b_phone')],
            ['\u{1F4E7} Email', bV('b_email')], ['\u2708\uFE0F Telegram', bV('b_tg')],
            ['\u{1F527} Тип проекта', bC('b_stype')], ['\u{1F4DD} Задача', bV('b_desc')],
            ['\u{1F4B3} Бюджет', bC('b_bud')], ['\u23F0 Сроки', bC('b_time')],
            ['\u{1F4AC} Комментарии', bV('b_comments')]
        ];
        fields.forEach(function(pair) { if (pair[1] && pair[1] !== '—') msg += pair[0] + ': ' + esc(pair[1]) + '\n'; });

        fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: msg,
                fields: {
                    name: bV('b_name'), phone: bV('b_phone'), email: bV('b_email'), tg: bV('b_tg'),
                    type: bC('b_stype'), desc: bV('b_desc'), budget: bC('b_bud'),
                    timeline: bC('b_time'), comments: bV('b_comments')
                }
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.ok) {
                btn.classList.remove('loading');
                status.innerHTML = '<div class="b-tip"><span class="b-tip-i">\u2713</span><span>Бриф отправлен! Мы свяжемся с вами в ближайшее время.</span></div>';
                btn.textContent = 'Отправлено \u2713';
                briefSent = true;
                var editBtn = document.querySelector('#bResults .b-btn-sec');
                if (editBtn) { editBtn.disabled = true; editBtn.style.opacity = '0.4'; editBtn.style.pointerEvents = 'none'; }
                document.querySelector('.b-consent').style.display = 'none';
            } else {
                throw new Error(data.description);
            }
        })
        .catch(function() {
            btn.classList.remove('loading');
            status.innerHTML = '<div class="b-warn"><span class="b-warn-i">!</span><span>Ошибка отправки. Напишите нам напрямую в Telegram: @myway_nikita</span></div>';
            btn.disabled = false;
            btn.textContent = 'Попробовать снова';
        });
    };

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('confirmLeave').classList.contains('open')) { hideConfirm(); }
            else if (document.getElementById('briefModal').classList.contains('open')) { tryCloseBrief(); }
        }
        if (e.key === 'Tab' && document.getElementById('briefModal').classList.contains('open')) {
            var modal = document.getElementById('confirmLeave').classList.contains('open')
                ? document.getElementById('confirmLeave')
                : document.getElementById('briefModal');
            var focusable = modal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            var first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
})();
