/* SiteGuard TB 커스터마이징 — index.html 주입 스크립트
 * 타깃: tb-entity-details-panel > tb-details-panel > div.mat-content > mat-tab-group
 * 전략: mat-tab-group 숨김 + camera-detail.html iframe 삽입
 * 기기명: span.tb-details-title-text → /api/tenant/device?deviceName= */
(function () {
  'use strict';

  var DETAIL_PAGE = '/camera-detail.html';
  var UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function getToken() {
    return localStorage.getItem('jwt_token') ||
           localStorage.getItem('TB-jwt_token') ||
           localStorage.getItem('tb_ui_token');
  }

  /* 기기명 → UUID (textSearch로 검색 후 정확한 이름 매칭) */
  function fetchIdByName(name) {
    var token = getToken();
    if (!token || !name) return Promise.resolve(null);
    var url = '/api/tenant/devices?pageSize=20&page=0&textSearch=' + encodeURIComponent(name);
    return fetch(url, {
      headers: { 'X-Authorization': 'Bearer ' + token }
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.data) return null;
        var exact = d.data.find(function (dev) {
          return dev.name === name && dev.id && UUID_RE.test(dev.id.id);
        });
        return exact ? exact.id.id : null;
      })
      .catch(function () { return null; });
  }

  /* ── 핵심: 패널 감지 및 교체 ── */
  var _lastName   = null;
  var _timer      = null;

  function applyPanel() {
    /* tb-entity-details-panel 존재 여부 */
    var entityPanel = document.querySelector('tb-entity-details-panel');

    if (!entityPanel) {
      /* 패널이 닫힘 — 초기화 */
      _lastName = null;
      return;
    }

    /* tb-details-panel > div.mat-content > mat-tab-group */
    var detailsPanel = entityPanel.querySelector('tb-details-panel');
    if (!detailsPanel) return;

    var tabGroup = detailsPanel.querySelector('mat-tab-group');
    var content  = detailsPanel.querySelector('div.mat-content');
    if (!tabGroup || !content) return;

    /* 기기명 추출 */
    var nameEl = detailsPanel.querySelector('span.tb-details-title-text');
    var name   = nameEl ? nameEl.textContent.trim() : null;
    if (!name) return;

    /* 탭 즉시 숨김 */
    tabGroup.style.cssText = 'display:none!important;';

    /* 이미 같은 기기 iframe이 있으면 종료 */
    var existing = content.querySelector('iframe.sg-cam-frame');
    if (existing && name === _lastName) return;

    /* 이름이 바뀌면 기존 iframe 제거 */
    if (existing && name !== _lastName) {
      existing.remove();
    }

    /* 새 기기 — API로 UUID 조회 후 iframe 삽입 */
    if (name !== _lastName) {
      _lastName = name;
      fetchIdByName(name).then(function (deviceId) {
        /* 콜백 도착 전 패널이 바뀌었을 수 있으므로 재확인 */
        var panel2  = document.querySelector('tb-entity-details-panel');
        if (!panel2) return;
        var nameEl2 = panel2.querySelector('span.tb-details-title-text');
        if (!nameEl2 || nameEl2.textContent.trim() !== name) return;

        var content2 = panel2.querySelector('div.mat-content');
        if (!content2) return;

        /* 이미 iframe 있으면 스킵 */
        if (content2.querySelector('iframe.sg-cam-frame')) return;

        if (!deviceId) {
          /* UUID 조회 실패 → 이름 파라미터로 fallback */
          deviceId = null;
        }

        var iframe = document.createElement('iframe');
        iframe.className = 'sg-cam-frame';
        iframe.style.cssText =
          'width:100%;height:100%;border:none;display:block;' +
          'background:#0f1117;flex:1;min-height:400px;';

        var src = deviceId
          ? DETAIL_PAGE + '?id=' + deviceId
          : DETAIL_PAGE + '?name=' + encodeURIComponent(name);
        iframe.src = src;

        /* content 영역을 flex column으로 */
        content2.style.cssText =
          'display:flex;flex-direction:column;overflow:hidden;height:100%;';

        content2.appendChild(iframe);
      });
    }
  }

  function schedule() {
    clearTimeout(_timer);
    _timer = setTimeout(applyPanel, 200);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true, childList: true
  });

  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      orig.apply(this, arguments);
      _lastName = null;
      schedule();
    };
  });
  window.addEventListener('popstate', function () {
    _lastName = null;
    schedule();
  });
})();
