// ============================================================
// Dayce Cloud Sync — 認証 + クラウド同期
// window.CloudSync として公開
// ============================================================
(function () {
  'use strict';

  var API_BASE = (window.BACKEND_URL || window.__BACKEND_URL__ || 'https://api.dayce.app');

  // --- 同期対象の localStorage キー ---
  var SYNC_KEYS = [
    'activities',
    'moneyRecords',
    'journalEntriesV3',
    'monthlyGoals',
    'weightRecords',
    'activityCategories',
    'expenseCategories',
    'incomeCategories',
    'journalFeedbackTone',
    'aiConsultTone',
    'aiConsultHistory',
    'planLevel',
    'isPremium'
  ];

  // --- 動的キーのプレフィックス（日付ごとに生成されるキー） ---
  var DYNAMIC_KEY_PREFIXES = ['taskChecks_'];

  // --- localStorage キー (認証用) ---
  var LS_TOKEN = 'syncAuthToken';
  var LS_EMAIL = 'syncAuthEmail';
  var LS_LAST_SYNCED = 'syncLastSynced';

  // === ヘルパー ===
  function getToken() { return localStorage.getItem(LS_TOKEN); }
  function getEmail() { return localStorage.getItem(LS_EMAIL); }
  function getLastSynced() { return localStorage.getItem(LS_LAST_SYNCED); }

  function clearAppData() {
    // SYNC_KEYSのデータを全削除
    SYNC_KEYS.forEach(function(k) { localStorage.removeItem(k); });
    // 動的キー（taskChecks_xxxx など）を全削除
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && DYNAMIC_KEY_PREFIXES.some(function(p){ return k.indexOf(p) === 0; })) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(function(k){ localStorage.removeItem(k); });
    // その他アプリ固有キー
    ['journalV2MigratedToV3','journals','gv2_collapsed','aiUsage_' + (function(){
      var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    })()].forEach(function(k){ localStorage.removeItem(k); });
  }

  function saveAuth(token, email, createdAt) {
    // メールアドレスが変わった場合（アカウント切り替え）はアプリデータをクリア
    var prevEmail = localStorage.getItem(LS_EMAIL);
    if (prevEmail && prevEmail !== email) {
      clearAppData();
    }
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_EMAIL, email);
    if (createdAt) localStorage.setItem('syncAuthRegisteredAt', createdAt);
    // ログイン時はプランをリセット（サーバーから正確な値を再取得するまでfreeにする）
    localStorage.removeItem('planLevel');
    localStorage.removeItem('isPremium');
  }
  function clearAuth() {
    clearAppData();
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EMAIL);
    localStorage.removeItem('syncAuthRegisteredAt');
  }

  function isLoggedIn() {
    return !!getToken();
  }

  // タイムスタンプ安全パース（NaN防止）
  function parseTime(str) {
    if (!str) return 0;
    var t = new Date(str).getTime();
    return isNaN(t) ? 0 : t;
  }

  // --- API call helper ---
  async function apiCall(path, options) {
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var fetchOpts = {
      method: options.method || 'GET',
      headers: headers,
    };
    if (options.body) fetchOpts.body = JSON.stringify(options.body);

    var resp;
    try {
      resp = await fetch(API_BASE + path, fetchOpts);
    } catch(networkErr) {
      throw new Error('ネットワークに接続できません');
    }
    var data;
    try {
      data = await resp.json();
    } catch(parseErr) {
      throw new Error('サーバーエラー（応答解析失敗）');
    }

    if (!resp.ok) {
      // Handle expired token
      if (resp.status === 401 && path.startsWith('/api/sync/')) {
        clearAuth();
        CloudSync.renderUI();
      }
      throw new Error(data.error || 'API error');
    }
    return data;
  }

  // === 認証 ===
  async function register(email, password) {
    var res = await apiCall('/api/auth/register', {
      method: 'POST',
      body: { email: email, password: password }
    });
    saveAuth(res.token, res.email, res.createdAt);
    return res;
  }

  async function login(email, password) {
    var res = await apiCall('/api/auth/login', {
      method: 'POST',
      body: { email: email, password: password }
    });
    saveAuth(res.token, res.email, res.createdAt);
    return res;
  }

  function logout() {
    clearAuth();
    localStorage.removeItem(LS_LAST_SYNCED);
  }

  async function resetPassword(email) {
    return apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: { email: email }
    });
  }

  async function resetConfirm(email, code, newPassword) {
    var res = await apiCall('/api/auth/reset-confirm', {
      method: 'POST',
      body: { email: email, code: code, newPassword: newPassword }
    });
    saveAuth(res.token, res.email);
    return res;
  }

  // === 同期 ===
  function collectSyncData() {
    var data = {};
    SYNC_KEYS.forEach(function (key) {
      var val = localStorage.getItem(key);
      if (val !== null) data[key] = val;
    });
    // 動的キー（taskChecks_YYYY-MM-DD 等）をスキャンして追加
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      for (var p = 0; p < DYNAMIC_KEY_PREFIXES.length; p++) {
        if (key.indexOf(DYNAMIC_KEY_PREFIXES[p]) === 0) {
          data[key] = localStorage.getItem(key);
          break;
        }
      }
    }
    return data;
  }

  function applySyncData(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (key) {
      if (data[key] === undefined) return;
      // 固定キーの場合
      if (SYNC_KEYS.indexOf(key) !== -1) {
        localStorage.setItem(key, data[key]);
        return;
      }
      // 動的キーの場合（taskChecks_* 等）
      for (var p = 0; p < DYNAMIC_KEY_PREFIXES.length; p++) {
        if (key.indexOf(DYNAMIC_KEY_PREFIXES[p]) === 0) {
          localStorage.setItem(key, data[key]);
          return;
        }
      }
    });
  }

  async function upload() {
    var data = collectSyncData();
    var planLevel = (window.DaycePlan) ? window.DaycePlan.getPlan() : (localStorage.getItem('planLevel') || 'free');
    var res;
    try {
      res = await apiCall('/api/sync/upload', {
        method: 'POST',
        body: { data: data, planLevel: planLevel }
      });
    } catch(e) {
      // 空データ上書き防止エラーは握りつぶさず呼び出し元に伝える
      if (e.message && e.message.indexOf('empty_override') !== -1) {
        throw new Error('empty_override');
      }
      throw e;
    }
    localStorage.setItem(LS_LAST_SYNCED, res.syncedAt);
    return res;
  }

  async function getHistory() {
    return apiCall('/api/sync/history');
  }

  async function restoreVersion(key) {
    var res = await apiCall('/api/sync/restore-version', {
      method: 'POST',
      body: { key: key }
    });
    if (res.data) {
      applySyncData(res.data);
      if (res.syncedAt) localStorage.setItem(LS_LAST_SYNCED, res.syncedAt);
    }
    return res;
  }

  async function download() {
    var res = await apiCall('/api/sync/download');
    if (res.data) {
      applySyncData(res.data);
      if (res.syncedAt) localStorage.setItem(LS_LAST_SYNCED, res.syncedAt);
    }
    // サーバー側のplanLevelも反映
    if (res.planLevel) {
      localStorage.setItem('planLevel', res.planLevel);
      if (res.planLevel === 'pro' || res.planLevel === 'premium') {
        localStorage.setItem('isPremium', 'true');
      } else {
        localStorage.removeItem('isPremium');
      }
    }
    return res;
  }

  async function getStatus() {
    return apiCall('/api/sync/status');
  }

  // === UI レンダリング ===
  function renderUI() {
    var container = document.getElementById('cloudSyncSection');
    if (!container) return;

    if (!isLoggedIn()) {
      renderLoginUI(container);
    } else {
      renderSyncUI(container);
    }
  }

  function renderLoginUI(container) {
    var mode = container.getAttribute('data-mode') || 'login';

    if (mode === 'register') {
      container.innerHTML =
        '<h3 style="font-size:15px;font-weight:700;color:#333;margin:0 0 12px;">☁️ クラウド同期</h3>' +
        '<p class="cs-desc">アカウントを作成してデータをクラウドに保存</p>' +
        '<div class="cs-form">' +
          '<input type="email" id="csEmail" class="cs-input" placeholder="メールアドレス" autocomplete="email">' +
          '<input type="password" id="csPassword" class="cs-input" placeholder="パスワード（6文字以上）" autocomplete="new-password">' +
          '<input type="password" id="csPasswordConfirm" class="cs-input" placeholder="パスワード（確認）" autocomplete="new-password">' +
          '<div id="csError" class="cs-error" style="display:none;"></div>' +
          '<div style="font-size:11px;color:#888;line-height:1.5;margin:8px 0 4px;text-align:center;">アカウント作成により<a href="javascript:void(0)" onclick="showLegalModal(\'terms\')" style="color:#4A90D9;text-decoration:underline;">利用規約</a>と<a href="javascript:void(0)" onclick="showLegalModal(\'privacy\')" style="color:#4A90D9;text-decoration:underline;">プライバシーポリシー</a>に同意します</div>' +
          '<button type="button" id="csRegisterBtn" class="cs-btn cs-btn-primary">アカウント作成</button>' +
          '<button type="button" id="csToLogin" class="cs-btn cs-btn-link">ログインはこちら</button>' +
        '</div>';

      container.querySelector('#csRegisterBtn').addEventListener('click', handleRegister);
      container.querySelector('#csToLogin').addEventListener('click', function () {
        container.setAttribute('data-mode', 'login');
        renderUI();
      });

    } else if (mode === 'reset') {
      var step = container.getAttribute('data-reset-step') || '1';
      if (step === '1') {
        container.innerHTML =
          '<h3 style="font-size:15px;font-weight:700;color:#333;margin:0 0 12px;">☁️ パスワードリセット</h3>' +
          '<p class="cs-desc">登録メールアドレスにリセットコードを送信します</p>' +
          '<div class="cs-form">' +
            '<input type="email" id="csResetEmail" class="cs-input" placeholder="メールアドレス" autocomplete="email">' +
            '<div id="csError" class="cs-error" style="display:none;"></div>' +
            '<button type="button" id="csSendResetBtn" class="cs-btn cs-btn-primary">リセットコードを送信</button>' +
            '<button type="button" id="csBackToLogin" class="cs-btn cs-btn-link">ログインに戻る</button>' +
          '</div>';

        container.querySelector('#csSendResetBtn').addEventListener('click', handleSendReset);
        container.querySelector('#csBackToLogin').addEventListener('click', function () {
          container.setAttribute('data-mode', 'login');
          container.removeAttribute('data-reset-step');
          container.removeAttribute('data-reset-email');
          renderUI();
        });
      } else {
        container.innerHTML =
          '<h3 style="font-size:15px;font-weight:700;color:#333;margin:0 0 12px;">☁️ パスワードリセット</h3>' +
          '<p class="cs-desc">メールに届いた6桁のコードを入力してください</p>' +
          '<div class="cs-form">' +
            '<input type="text" id="csResetCode" class="cs-input" placeholder="6桁のコード" maxlength="6" inputmode="numeric">' +
            '<input type="password" id="csNewPassword" class="cs-input" placeholder="新しいパスワード（6文字以上）" autocomplete="new-password">' +
            '<div id="csError" class="cs-error" style="display:none;"></div>' +
            '<button type="button" id="csConfirmResetBtn" class="cs-btn cs-btn-primary">パスワードを変更</button>' +
            '<button type="button" id="csBackToLogin2" class="cs-btn cs-btn-link">ログインに戻る</button>' +
          '</div>';

        container.querySelector('#csConfirmResetBtn').addEventListener('click', handleConfirmReset);
        container.querySelector('#csBackToLogin2').addEventListener('click', function () {
          container.setAttribute('data-mode', 'login');
          container.removeAttribute('data-reset-step');
          container.removeAttribute('data-reset-email');
          renderUI();
        });
      }

    } else {
      // login mode
      container.innerHTML =
        '<h3 style="font-size:15px;font-weight:700;color:#333;margin:0 0 12px;">☁️ クラウド同期</h3>' +
        '<p class="cs-desc">ログインしてデータをクラウドに同期</p>' +
        '<div class="cs-form">' +
          '<input type="email" id="csEmail" class="cs-input" placeholder="メールアドレス" autocomplete="email">' +
          '<input type="password" id="csPassword" class="cs-input" placeholder="パスワード" autocomplete="current-password">' +
          '<div id="csError" class="cs-error" style="display:none;"></div>' +
          '<button type="button" id="csLoginBtn" class="cs-btn cs-btn-primary">ログイン</button>' +
          '<div class="cs-links">' +
            '<button type="button" id="csToRegister" class="cs-btn cs-btn-link">新規登録</button>' +
            '<button type="button" id="csToReset" class="cs-btn cs-btn-link">パスワードを忘れた</button>' +
          '</div>' +
        '</div>';

      container.querySelector('#csLoginBtn').addEventListener('click', handleLogin);
      container.querySelector('#csToRegister').addEventListener('click', function () {
        container.setAttribute('data-mode', 'register');
        renderUI();
      });
      container.querySelector('#csToReset').addEventListener('click', function () {
        container.setAttribute('data-mode', 'reset');
        container.setAttribute('data-reset-step', '1');
        renderUI();
      });
    }
  }

  function renderSyncUI(container) {
    var email = getEmail() || '';
    var lastSynced = getLastSynced();
    var lastStr = lastSynced ? new Date(lastSynced).toLocaleString('ja-JP') : 'まだバックアップしていません';

    container.innerHTML =
      '<h3 style="font-size:15px;font-weight:700;color:#333;margin:0 0 12px;">☁️ クラウド同期</h3>' +
      '<div class="cs-status">' +
        '<div class="cs-status-row"><span class="cs-label">アカウント</span><span class="cs-value">' + escHTML(email) + '</span></div>' +
        '<div class="cs-status-row"><span class="cs-label">最終バックアップ</span><span class="cs-value" id="csLastSyncedText">' + escHTML(lastStr) + '</span></div>' +
      '</div>' +
      '<div id="csError" class="cs-error" style="display:none;"></div>' +
      '<div id="csSuccess" class="cs-success" style="display:none;"></div>' +
      '<div class="cs-sync-btns">' +
        '<button type="button" id="csUploadBtn" class="cs-btn cs-btn-upload">☁️ バックアップ</button>' +
        '<button type="button" id="csDownloadBtn" class="cs-btn cs-btn-download">📲 復元</button>' +
      '</div>' +
      '<p style="font-size:11px;color:#999;margin:6px 0 0;text-align:center;line-height:1.5;">バックアップ = このスマホのデータをクラウドに保存<br>復元 = クラウドのデータをこのスマホに戻す</p>' +
      '<div style="margin-top:12px;border-top:1px solid #eee;padding-top:12px;">' +
        '<button type="button" id="csHistoryBtn" class="cs-btn cs-btn-link" style="font-size:12px;color:#888;">🕐 過去のバックアップ履歴</button>' +
        '<div id="csHistoryList" style="display:none;margin-top:8px;"></div>' +
      '</div>' +
      '<button type="button" id="csLogoutBtn" class="cs-btn cs-btn-link cs-logout">ログアウト</button>';

    container.querySelector('#csUploadBtn').addEventListener('click', handleUpload);
    container.querySelector('#csDownloadBtn').addEventListener('click', handleDownload);
    container.querySelector('#csLogoutBtn').addEventListener('click', handleLogout);
    container.querySelector('#csHistoryBtn').addEventListener('click', handleShowHistory);
  }

  async function handleShowHistory() {
    var listEl = document.getElementById('csHistoryList');
    if (!listEl) return;
    if (listEl.style.display !== 'none') { listEl.style.display = 'none'; return; }

    listEl.style.display = 'block';
    listEl.innerHTML = '<p style="font-size:12px;color:#999;text-align:center;">読み込み中...</p>';

    try {
      var res = await getHistory();
      var versions = res.versions || [];
      if (versions.length === 0) {
        listEl.innerHTML = '<p style="font-size:12px;color:#999;text-align:center;">履歴がありません</p>';
        return;
      }
      var html = '<p style="font-size:11px;color:#999;margin:0 0 6px;">過去のバックアップから復元できます（最大7件）</p>';
      versions.forEach(function(v) {
        var dt = v.syncedAt ? new Date(v.syncedAt).toLocaleString('ja-JP') : '不明';
        var summary = '行動' + v.actCount + '件 / 日記' + v.journalCount + '日分 / お金' + v.moneyCount + '件';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:#f8f9fa;border-radius:8px;margin-bottom:6px;">' +
          '<div style="flex:1;">' +
            '<div style="font-size:12px;font-weight:600;color:#333;">' + escHTML(dt) + '</div>' +
            '<div style="font-size:11px;color:#888;margin-top:2px;">' + escHTML(summary) + '</div>' +
          '</div>' +
          '<button type="button" class="cs-restore-version-btn cs-btn" style="font-size:11px;padding:4px 10px;margin-left:8px;background:#f0f0f0;color:#333;" data-key="' + escHTML(v.key) + '" data-dt="' + escHTML(dt) + '">この時点に戻す</button>' +
        '</div>';
      });
      listEl.innerHTML = html;
      listEl.querySelectorAll('.cs-restore-version-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var key = this.getAttribute('data-key');
          var dt = this.getAttribute('data-dt');
          if (!confirm(dt + ' のデータに戻しますか？\n現在のデータは上書きされます。')) return;
          this.disabled = true;
          this.textContent = '復元中...';
          try {
            await restoreVersion(key);
            alert('復元完了！ページを再読み込みします。');
            location.reload();
          } catch(e) {
            alert('復元に失敗しました: ' + e.message);
            this.disabled = false;
            this.textContent = 'この時点に戻す';
          }
        });
      });
    } catch(e) {
      listEl.innerHTML = '<p style="font-size:12px;color:#e53e3e;">履歴の取得に失敗しました: ' + escHTML(e.message) + '</p>';
    }
  }

  // === イベントハンドラ ===
  function showError(msg) {
    var el = document.getElementById('csError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  function hideError() {
    var el = document.getElementById('csError');
    if (el) el.style.display = 'none';
  }
  function showSuccess(msg) {
    var el = document.getElementById('csSuccess');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function setLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.setAttribute('data-orig', btn.textContent);
      btn.textContent = '処理中...';
    } else {
      btn.textContent = btn.getAttribute('data-orig') || btn.textContent;
    }
  }

  async function handleRegister() {
    hideError();
    var email = (document.getElementById('csEmail').value || '').trim();
    var pw = document.getElementById('csPassword').value || '';
    var pw2 = document.getElementById('csPasswordConfirm').value || '';

    if (!email || !pw) { showError('メールアドレスとパスワードを入力してください'); return; }
    if (pw !== pw2) { showError('パスワードが一致しません'); return; }
    if (pw.length < 6) { showError('パスワードは6文字以上で設定してください'); return; }

    setLoading('csRegisterBtn', true);
    try {
      await register(email, pw);
      renderUI();
      // サーバー確認→復元 or バックアップ
      afterLogin();
      // アンケート表示（少し遅延して自然に）→完了/スキップ後にウェルカムモーダル→ジャーナルへ
      setTimeout(function() { showSurveyModal(); }, 800);
    } catch (e) {
      showError(e.message);
    }
    setLoading('csRegisterBtn', false);
  }

  async function handleLogin() {
    hideError();
    var email = (document.getElementById('csEmail').value || '').trim();
    var pw = document.getElementById('csPassword').value || '';

    if (!email || !pw) { showError('メールアドレスとパスワードを入力してください'); return; }

    setLoading('csLoginBtn', true);
    try {
      await login(email, pw);
      renderUI();
      // サーバー確認→復元 or バックアップ
      afterLogin();
    } catch (e) {
      showError(e.message);
    }
    setLoading('csLoginBtn', false);
  }

  async function handleSendReset() {
    hideError();
    var container = document.getElementById('cloudSyncSection');
    var email = (document.getElementById('csResetEmail').value || '').trim();
    if (!email) { showError('メールアドレスを入力してください'); return; }

    setLoading('csSendResetBtn', true);
    try {
      await resetPassword(email);
      container.setAttribute('data-reset-step', '2');
      container.setAttribute('data-reset-email', email);
      renderUI();
    } catch (e) {
      showError(e.message);
    }
    setLoading('csSendResetBtn', false);
  }

  async function handleConfirmReset() {
    hideError();
    var container = document.getElementById('cloudSyncSection');
    var email = container.getAttribute('data-reset-email') || '';
    var code = (document.getElementById('csResetCode').value || '').trim();
    var newPw = document.getElementById('csNewPassword').value || '';

    if (!code || !newPw) { showError('コードと新しいパスワードを入力してください'); return; }

    setLoading('csConfirmResetBtn', true);
    try {
      await resetConfirm(email, code, newPw);
      container.setAttribute('data-mode', 'login');
      container.removeAttribute('data-reset-step');
      container.removeAttribute('data-reset-email');
      renderUI();
    } catch (e) {
      showError(e.message);
    }
    setLoading('csConfirmResetBtn', false);
  }

  async function handleUpload() {
    hideError();
    if (!confirm('このスマホのデータをクラウドにバックアップしますか？\n※クラウド上の古いバックアップは上書きされます')) return;

    setLoading('csUploadBtn', true);
    try {
      var res = await upload();
      updateSnapshot();
      var tsEl = document.getElementById('csLastSyncedText');
      if (tsEl && res.syncedAt) tsEl.textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
      showSuccess('バックアップ完了');
    } catch (e) {
      showError(e.message);
    }
    setLoading('csUploadBtn', false);
  }

  async function handleDownload() {
    hideError();
    if (!confirm('クラウドのバックアップからデータを復元しますか？\n※このスマホのデータは上書きされます')) return;

    setLoading('csDownloadBtn', true);
    try {
      var res = await download();
      if (!res.data) {
        showError('クラウドにバックアップがありません。先にバックアップしてください。');
      } else {
        var tsEl = document.getElementById('csLastSyncedText');
        if (tsEl && res.syncedAt) tsEl.textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
        showSuccess('復元完了 — ページを再読み込みして反映します');
        setTimeout(function () { location.reload(); }, 1500);
      }
    } catch (e) {
      showError(e.message);
    }
    setLoading('csDownloadBtn', false);
  }

  function handleLogout() {
    if (!confirm('ログアウトしますか？')) return;
    logout();
    renderUI();
    showAuthWall();
  }

  function escHTML(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // === アンケート ===
  var LS_SURVEY_DONE = 'surveyDone';

  function isSurveyDone() {
    return localStorage.getItem(LS_SURVEY_DONE) === '1';
  }

  function showSurveyModal() {
    if (isSurveyDone()) return;
    // 既にモーダルが存在する場合は重複表示しない
    if (document.getElementById('csSurveyOverlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'csSurveyOverlay';
    overlay.className = 'cs-survey-overlay';
    overlay.innerHTML =
      '<div class="cs-survey-modal">' +
        '<div class="cs-survey-header">' +
          '<div style="font-size:28px;margin-bottom:8px;">📋</div>' +
          '<h3>アカウント登録ありがとうございます！</h3>' +
          '<p>より良いサービスにするため、簡単なアンケートにご協力ください（30秒）</p>' +
        '</div>' +
        '<div class="cs-survey-body">' +
          '<div class="cs-survey-q">' +
            '<label class="cs-survey-label">年代 <span class="cs-survey-req">必須</span></label>' +
            '<div class="cs-survey-options" id="csqAge">' +
              '<button type="button" class="cs-survey-opt" data-q="age" data-v="10s">10代</button>' +
              '<button type="button" class="cs-survey-opt" data-q="age" data-v="20s">20代</button>' +
              '<button type="button" class="cs-survey-opt" data-q="age" data-v="30s">30代</button>' +
              '<button type="button" class="cs-survey-opt" data-q="age" data-v="40s">40代</button>' +
              '<button type="button" class="cs-survey-opt" data-q="age" data-v="50s+">50代〜</button>' +
            '</div>' +
          '</div>' +
          '<div class="cs-survey-q">' +
            '<label class="cs-survey-label">職業 <span class="cs-survey-req">必須</span></label>' +
            '<div class="cs-survey-options" id="csqJob">' +
              '<button type="button" class="cs-survey-opt" data-q="job" data-v="office">会社員</button>' +
              '<button type="button" class="cs-survey-opt" data-q="job" data-v="student">学生</button>' +
              '<button type="button" class="cs-survey-opt" data-q="job" data-v="self">自営業</button>' +
              '<button type="button" class="cs-survey-opt" data-q="job" data-v="homemaker">主婦/主夫</button>' +
              '<button type="button" class="cs-survey-opt" data-q="job" data-v="other">その他</button>' +
            '</div>' +
          '</div>' +
          '<div class="cs-survey-q">' +
            '<label class="cs-survey-label">Dayceを知ったきっかけ <span class="cs-survey-opt-label">任意</span></label>' +
            '<div class="cs-survey-options" id="csqSource">' +
              '<button type="button" class="cs-survey-opt" data-q="source" data-v="sns">SNS</button>' +
              '<button type="button" class="cs-survey-opt" data-q="source" data-v="friend">友人の紹介</button>' +
              '<button type="button" class="cs-survey-opt" data-q="source" data-v="search">Web検索</button>' +
              '<button type="button" class="cs-survey-opt" data-q="source" data-v="article">記事/ブログ</button>' +
              '<button type="button" class="cs-survey-opt" data-q="source" data-v="other">その他</button>' +
            '</div>' +
          '</div>' +
          '<div class="cs-survey-q">' +
            '<label class="cs-survey-label">一番期待する機能 <span class="cs-survey-opt-label">任意</span></label>' +
            '<div class="cs-survey-options" id="csqExpect">' +
              '<button type="button" class="cs-survey-opt" data-q="expect" data-v="journal">声の日記</button>' +
              '<button type="button" class="cs-survey-opt" data-q="expect" data-v="money">お金管理</button>' +
              '<button type="button" class="cs-survey-opt" data-q="expect" data-v="activity">行動記録</button>' +
              '<button type="button" class="cs-survey-opt" data-q="expect" data-v="goal">目標管理</button>' +
              '<button type="button" class="cs-survey-opt" data-q="expect" data-v="ai">AI相談</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cs-survey-footer">' +
          '<div id="csSurveyError" style="color:#e74c3c;font-size:12px;text-align:center;display:none;margin-bottom:8px;"></div>' +
          '<button type="button" id="csSurveySubmit" class="cs-btn cs-btn-primary" style="width:100%;">送信する</button>' +
          '<button type="button" id="csSurveySkip" class="cs-btn cs-btn-link" style="width:100%;margin-top:4px;color:#999;font-size:12px;">スキップ</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // 選択肢のトグル
    var surveyAnswers = {};
    overlay.addEventListener('click', function(e) {
      var btn = e.target.closest('.cs-survey-opt');
      if (!btn) return;
      var q = btn.getAttribute('data-q');
      var v = btn.getAttribute('data-v');
      // 同グループの選択を解除
      var siblings = btn.parentNode.querySelectorAll('.cs-survey-opt');
      for (var i = 0; i < siblings.length; i++) {
        siblings[i].classList.remove('cs-survey-opt-selected');
      }
      btn.classList.add('cs-survey-opt-selected');
      surveyAnswers[q] = v;
    });

    // 送信
    document.getElementById('csSurveySubmit').addEventListener('click', function() {
      var errEl = document.getElementById('csSurveyError');
      // 必須チェック
      if (!surveyAnswers.age || !surveyAnswers.job) {
        errEl.textContent = '年代と職業を選択してください';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      submitSurvey(surveyAnswers);
    });

    // スキップ
    document.getElementById('csSurveySkip').addEventListener('click', function() {
      localStorage.setItem(LS_SURVEY_DONE, '1');
      closeSurveyModal();
      setTimeout(showWelcomeModal, 400);
    });

    // アニメーション
    requestAnimationFrame(function() {
      overlay.classList.add('cs-survey-overlay-show');
    });
  }

  function closeSurveyModal() {
    var overlay = document.getElementById('csSurveyOverlay');
    if (!overlay) return;
    overlay.classList.remove('cs-survey-overlay-show');
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }

  async function submitSurvey(answers) {
    var btn = document.getElementById('csSurveySubmit');
    if (btn) { btn.disabled = true; btn.textContent = '送信中...'; }
    try {
      await apiCall('/api/survey', {
        method: 'POST',
        body: { answers: answers }
      });
    } catch(e) {
      console.warn('アンケート送信失敗:', e.message);
    }
    localStorage.setItem(LS_SURVEY_DONE, '1');
    closeSurveyModal();
    setTimeout(showWelcomeModal, 400);
  }

  function showWelcomeModal() {
    if (document.getElementById('csWelcomeOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'csWelcomeOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

    var canAskPush = ('Notification' in window) && Notification.permission === 'default';
    var pushHtml = canAskPush
      ? '<div style="background:#f0f7ff;border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:left;">' +
          '<div style="font-size:14px;font-weight:700;color:#333;margin-bottom:4px;">🔔 毎晩リマインダーを受け取る</div>' +
          '<div style="font-size:12px;color:#666;line-height:1.5;margin-bottom:10px;">夜の振り返りタイムにお知らせします。</div>' +
          '<button id="csWelcomePushBtn" type="button" style="width:100%;padding:10px;background:#2196F3;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:4px;">🔔 受け取る</button>' +
          '<button id="csWelcomePushSkipBtn" type="button" style="width:100%;padding:6px;background:none;color:#aaa;border:none;font-size:12px;cursor:pointer;">あとで</button>' +
        '</div>'
      : '';

    overlay.innerHTML =
      '<div style="background:#fff;border-radius:20px;padding:32px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);">' +
        '<div style="font-size:48px;margin-bottom:12px;">🎉</div>' +
        '<h2 style="font-size:20px;font-weight:700;color:#333;margin:0 0 10px;">Dayceへようこそ！</h2>' +
        '<p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 20px;">まず今日あったことを<strong>声で記録</strong>してみましょう。<br>話すだけでAIが自動で要約してくれます。</p>' +
        pushHtml +
        '<button id="csWelcomeGoBtn" type="button" style="width:100%;padding:14px;background:#2196F3;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">🎤 さっそく記録する</button>' +
      '</div>';

    document.body.appendChild(overlay);

    function goToJournal() {
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
      if (typeof switchTab === 'function') switchTab('journal');
    }

    document.getElementById('csWelcomeGoBtn').addEventListener('click', goToJournal);

    if (canAskPush) {
      document.getElementById('csWelcomePushBtn').addEventListener('click', function() {
        Notification.requestPermission().then(function() { goToJournal(); }).catch(function() { goToJournal(); });
      });
      document.getElementById('csWelcomePushSkipBtn').addEventListener('click', goToJournal);
    }
  }

  // === CSS 注入 ===
  function injectCSS() {
    if (document.getElementById('cloud-sync-css')) return;
    var style = document.createElement('style');
    style.id = 'cloud-sync-css';
    style.textContent =
      '.cs-desc{font-size:13px;color:#666;margin:0 0 12px;}' +
      '.cs-form{display:flex;flex-direction:column;gap:8px;}' +
      '.cs-input{width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;transition:border .2s;}' +
      '.cs-input:focus{border-color:#2196F3;}' +
      '.cs-error{color:#e74c3c;font-size:12px;padding:6px 8px;background:#ffeaea;border-radius:6px;}' +
      '.cs-success{color:#27ae60;font-size:12px;padding:6px 8px;background:#eafaf1;border-radius:6px;}' +
      '.cs-btn{padding:10px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s,opacity .2s;}' +
      '.cs-btn:disabled{opacity:.5;cursor:default;}' +
      '.cs-btn-primary{background:#2196F3;color:#fff;}' +
      '.cs-btn-primary:active{background:#1976D2;}' +
      '.cs-btn-link{background:none;color:#2196F3;font-size:13px;padding:4px 0;text-align:center;}' +
      '.cs-links{display:flex;justify-content:space-between;margin-top:4px;}' +
      '.cs-status{background:#f8f9fa;border-radius:8px;padding:10px 12px;margin-bottom:10px;}' +
      '.cs-status-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;}' +
      '.cs-label{font-size:12px;color:#888;}' +
      '.cs-value{font-size:13px;color:#333;font-weight:600;}' +
      '.cs-sync-btns{display:flex;gap:8px;}' +
      '.cs-btn-upload{flex:1;background:#2196F3;color:#fff;}' +
      '.cs-btn-upload:active{background:#1976D2;}' +
      '.cs-btn-download{flex:1;background:#fff;color:#2196F3;border:1.5px solid #2196F3;}' +
      '.cs-btn-download:active{background:#e3f2fd;}' +
      '.cs-logout{margin-top:8px;color:#999;font-size:12px;}' +
      /* 新しいバックアップ通知バナー */
      '.cs-sync-banner{position:fixed;top:0;left:0;right:0;z-index:10000;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.15);padding:16px 16px 14px;transform:translateY(-100%);transition:transform .3s ease;border-bottom:2px solid #2196F3;}' +
      '.cs-sync-banner-show{transform:translateY(0);}' +
      '.cs-sync-banner-hide{transform:translateY(-100%);}' +
      '.cs-sync-banner-content{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;}' +
      '.cs-sync-banner-icon{font-size:28px;line-height:1;}' +
      '.cs-sync-banner-text{flex:1;}' +
      '.cs-sync-banner-title{font-size:14px;font-weight:700;color:#333;}' +
      '.cs-sync-banner-time{font-size:12px;color:#888;margin-top:2px;}' +
      '.cs-sync-banner-actions{display:flex;gap:8px;}' +
      '.cs-sync-banner-btn{flex:1;padding:10px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s,opacity .2s;}' +
      '.cs-sync-banner-btn:disabled{opacity:.5;cursor:default;}' +
      '.cs-sync-banner-btn-primary{background:#2196F3;color:#fff;}' +
      '.cs-sync-banner-btn-primary:active{background:#1976D2;}' +
      '.cs-sync-banner-btn-secondary{background:#f0f0f0;color:#666;}' +
      '.cs-sync-banner-btn-secondary:active{background:#e0e0e0;}' +
      /* アンケートモーダル */
      '.cs-survey-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:10001;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .3s;}' +
      '.cs-survey-overlay-show{opacity:1;}' +
      '.cs-survey-modal{background:#fff;border-radius:16px;max-width:400px;width:100%;max-height:85vh;overflow-y:auto;padding:24px 20px;}' +
      '.cs-survey-header{text-align:center;margin-bottom:16px;}' +
      '.cs-survey-header h3{font-size:16px;font-weight:800;color:#333;margin:0 0 6px;}' +
      '.cs-survey-header p{font-size:12px;color:#888;margin:0;line-height:1.5;}' +
      '.cs-survey-body{display:flex;flex-direction:column;gap:16px;}' +
      '.cs-survey-q{display:flex;flex-direction:column;gap:6px;}' +
      '.cs-survey-label{font-size:13px;font-weight:700;color:#333;}' +
      '.cs-survey-req{font-size:10px;color:#e74c3c;font-weight:600;margin-left:4px;}' +
      '.cs-survey-opt-label{font-size:10px;color:#999;font-weight:400;margin-left:4px;}' +
      '.cs-survey-options{display:flex;flex-wrap:wrap;gap:6px;}' +
      '.cs-survey-opt{padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:20px;background:#fff;font-size:13px;color:#555;cursor:pointer;transition:all .2s;}' +
      '.cs-survey-opt:active{transform:scale(.95);}' +
      '.cs-survey-opt-selected{border-color:#2196F3;background:#e3f2fd;color:#1976D2;font-weight:600;}' +
      '.cs-survey-footer{margin-top:20px;}' +
      /* 認証ウォール */
      '.cs-auth-wall{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#fff;display:flex;align-items:center;justify-content:center;padding:24px;opacity:1;transition:opacity .3s;}' +
      '.cs-aw-container{width:100%;max-width:360px;}' +
      '.cs-aw-logo{text-align:center;margin-bottom:12px;}' +
      '.cs-aw-title{text-align:center;font-size:28px;font-weight:900;color:#333;margin:0 0 4px;letter-spacing:-.5px;}' +
      '.cs-aw-subtitle{text-align:center;font-size:13px;color:#999;margin:0 0 28px;}' +
      '.cs-aw-tabs{display:flex;background:#f0f0f0;border-radius:10px;padding:3px;margin-bottom:20px;}' +
      '.cs-aw-tab{flex:1;padding:9px;border:none;background:none;border-radius:8px;font-size:14px;font-weight:600;color:#888;cursor:pointer;transition:all .2s;}' +
      '.cs-aw-tab-active{background:#fff;color:#333;box-shadow:0 1px 4px rgba(0,0,0,.1);}' +
      '.cs-aw-form{display:flex;flex-direction:column;gap:10px;}' +
      '.cs-aw-input{width:100%;padding:12px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:15px;box-sizing:border-box;outline:none;transition:border .2s;}' +
      '.cs-aw-input:focus{border-color:#2196F3;}' +
      '.cs-aw-error{color:#e74c3c;font-size:12px;padding:8px 10px;background:#ffeaea;border-radius:8px;text-align:center;}' +
      '.cs-aw-btn{width:100%;padding:13px;border:none;border-radius:10px;background:#2196F3;color:#fff;font-size:15px;font-weight:700;cursor:pointer;transition:background .2s;}' +
      '.cs-aw-btn:active{background:#1976D2;}' +
      '.cs-aw-btn:disabled{opacity:.5;cursor:default;}' +
      '.cs-aw-link{background:none;border:none;color:#2196F3;font-size:13px;cursor:pointer;padding:4px 0;text-align:center;}' +
      '.cs-aw-terms{font-size:11px;color:#aaa;text-align:center;line-height:1.5;margin-top:4px;}';
    document.head.appendChild(style);
  }

  // === 自動バックアップ ===
  var LS_AUTO_BACKUP = 'cloudAutoBackup'; // 'on' or 'off'
  var LS_LAST_SNAPSHOT = 'cloudLastSnapshot'; // 前回バックアップ時のデータハッシュ
  var autoBackupRunning = false;
  var _restorePending = false; // 復元バナー表示中は自動バックアップ抑制

  function isAutoBackupEnabled() {
    return localStorage.getItem(LS_AUTO_BACKUP) !== 'off'; // デフォルトON
  }

  function setAutoBackup(enabled) {
    localStorage.setItem(LS_AUTO_BACKUP, enabled ? 'on' : 'off');
    if (enabled) {
      // OFFからONに戻す場合、再セットアップ
      if (!_autoBackupSetup && isLoggedIn()) {
        setupAutoBackup();
      }
    } else {
      // OFFにする場合、全タイマー・リスナーを停止
      stopAutoBackup();
    }
  }

  // 簡易ハッシュ（データが変わったか検出するだけなのでシンプルに）
  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  function hasDataChanged() {
    var data = collectSyncData();
    var currentHash = simpleHash(JSON.stringify(data));
    var lastHash = localStorage.getItem(LS_LAST_SNAPSHOT) || '';
    return currentHash !== lastHash;
  }

  function updateSnapshot() {
    var data = collectSyncData();
    localStorage.setItem(LS_LAST_SNAPSHOT, simpleHash(JSON.stringify(data)));
  }

  async function autoBackupIfNeeded() {
    if (!isLoggedIn()) { console.log('☁️ [skip] 未ログイン'); return; }
    if (!isAutoBackupEnabled()) { console.log('☁️ [skip] 自動バックアップOFF'); return; }
    if (autoBackupRunning) { console.log('☁️ [skip] バックアップ実行中'); return; }
    // _restorePending安全弁: バナーが消えてもフラグが残っている場合リセット
    if (_restorePending) {
      if (!document.getElementById('csSyncBanner')) {
        console.warn('☁️ _restorePendingリセット（バナー消失）');
        _restorePending = false;
      } else {
        console.log('☁️ [skip] 復元バナー表示中');
        return;
      }
    }
    if (!hasDataChanged()) { return; }

    console.log('☁️ 自動バックアップ開始...');
    autoBackupRunning = true;
    try {
      var res = await upload();
      updateSnapshot();
      console.log('☁️ 自動バックアップ完了:', res.syncedAt);
      var tsEl = document.getElementById('csLastSyncedText');
      if (tsEl && res.syncedAt) {
        tsEl.textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
      }
    } catch(e) {
      if (e.message === 'empty_override') {
        // 空データ上書き防止: スナップショットだけ更新して次回も同じ判定を避ける
        console.warn('☁️ 空データ上書き防止: バックアップをスキップしました');
      } else {
        console.error('☁️ 自動バックアップ失敗:', e.message, e);
      }
    } finally {
      autoBackupRunning = false;
    }
  }

  // ログイン/登録直後に初回バックアップを実行
  async function triggerFirstBackup() {
    if (!isLoggedIn() || !isAutoBackupEnabled()) return;
    if (autoBackupRunning) return; // 並行実行防止
    autoBackupRunning = true;
    try {
      var res = await upload();
      updateSnapshot();
      console.log('☁️ 初回自動バックアップ完了:', res.syncedAt);
      var tsEl = document.getElementById('csLastSyncedText');
      if (tsEl && res.syncedAt) {
        tsEl.textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
      }
    } catch(e) {
      if (e.message === 'empty_override') {
        console.warn('☁️ 空データ上書き防止（初回バックアップスキップ）');
      } else {
        console.warn('☁️ 初回自動バックアップ失敗:', e.message);
      }
    } finally {
      autoBackupRunning = false;
    }
  }

  // アプリがバックグラウンドに入った時 or ページを離れる時にバックアップ
  var _autoBackupTimer = null;
  var _autoBackupDebounce = null;
  var _hookInstalled = false; // localStorage hookが成功したかどうか
  var _pollingTimer = null; // 5秒ポーリング用
  var _visibilityHandler = null; // visibilitychange用
  var _pagehideHandler = null; // pagehide用
  var _interactionHandler = null; // click/touchend用
  var _autoBackupSetup = false; // setupAutoBackup実行済みフラグ

  // 全タイマー・リスナーを停止する
  function stopAutoBackup() {
    // デバウンスタイマー
    if (_autoBackupDebounce) { clearTimeout(_autoBackupDebounce); _autoBackupDebounce = null; }
    // 定期バックアップ
    if (_autoBackupTimer) { clearInterval(_autoBackupTimer); _autoBackupTimer = null; }
    // 5秒ポーリング
    if (_pollingTimer) { clearInterval(_pollingTimer); _pollingTimer = null; }
    // イベントリスナー
    if (_visibilityHandler) { document.removeEventListener('visibilitychange', _visibilityHandler); _visibilityHandler = null; }
    if (_pagehideHandler) { window.removeEventListener('pagehide', _pagehideHandler); _pagehideHandler = null; }
    if (_interactionHandler) {
      document.removeEventListener('touchend', _interactionHandler);
      document.removeEventListener('click', _interactionHandler);
      _interactionHandler = null;
    }
    _autoBackupSetup = false;
    console.log('☁️ 自動バックアップ停止完了');
  }

  // localStorage.setItem を監視して、データ変更時にバックアップをスケジュール
  function hookLocalStorage() {
    if (_hookInstalled) return; // 二重フック防止
    // フック処理: setItem呼び出し後にバックアップをスケジュール
    function createHookedSetItem(origFn, context) {
      return function(key, value) {
        origFn.call(context || this, key, value); // 元のsetItemを実行（prototype用はthis、instance用はcontext）
        try {
          var isSyncKey = SYNC_KEYS.indexOf(key) !== -1;
          if (!isSyncKey) {
            for (var p = 0; p < DYNAMIC_KEY_PREFIXES.length; p++) {
              if (key.indexOf(DYNAMIC_KEY_PREFIXES[p]) === 0) { isSyncKey = true; break; }
            }
          }
          if (key === LS_LAST_SNAPSHOT || key === LS_AUTO_BACKUP || key === LS_LAST_SYNCED) return;
          if (isSyncKey) {
            scheduleAutoBackup();
          }
        } catch(hookErr) {
          // hook処理エラーはsetItem自体を壊さない
        }
      };
    }

    // 方法1: Storage.prototype.setItem をフック（標準的な方法）
    try {
      var protoSetItem = Storage.prototype.setItem;
      if (typeof protoSetItem === 'function') {
        Storage.prototype.setItem = createHookedSetItem(protoSetItem, null);
        _hookInstalled = true;
        console.log('☁️ localStorage hook設定完了（prototype）');
        return;
      }
    } catch(e) {
      console.warn('☁️ prototype hook失敗:', e.message);
    }

    // 方法2: localStorage.setItem を直接フック（prototypeが使えない環境用）
    try {
      var instanceSetItem = localStorage.setItem;
      if (typeof instanceSetItem === 'function') {
        localStorage.setItem = createHookedSetItem(instanceSetItem, localStorage);
        _hookInstalled = true;
        console.log('☁️ localStorage hook設定完了（instance）');
        return;
      }
    } catch(e2) {
      console.warn('☁️ instance hook失敗:', e2.message);
    }

    console.warn('☁️ localStorage hook利用不可（ポーリングフォールバック使用）');
    _hookInstalled = false;
  }

  // デバウンス付き自動バックアップ（10秒後に実行、連続変更は1回にまとめる）
  function scheduleAutoBackup() {
    if (!isLoggedIn() || !isAutoBackupEnabled()) return;
    if (_autoBackupDebounce) clearTimeout(_autoBackupDebounce);
    _autoBackupDebounce = setTimeout(function() {
      _autoBackupDebounce = null;
      autoBackupIfNeeded();
    }, 10 * 1000);
  }

  function setupAutoBackup() {
    if (_autoBackupSetup) return; // 二重セットアップ防止
    _autoBackupSetup = true;

    // 0) localStorage書き込み監視（失敗しても他の機能は続行）
    try { hookLocalStorage(); } catch(e) { console.warn('☁️ hook設定エラー:', e.message); }

    // 1) バックグラウンド移行時（名前付き関数で参照保持）
    _visibilityHandler = function() {
      if (document.visibilityState === 'hidden') {
        // デバウンス待ちがあれば即実行
        if (_autoBackupDebounce) {
          clearTimeout(_autoBackupDebounce);
          _autoBackupDebounce = null;
        }
        autoBackupIfNeeded();
      } else if (document.visibilityState === 'visible') {
        // フォアグラウンドに戻った時もチェック（バックグラウンドでタイマーが止まった場合の救済）
        setTimeout(function() { autoBackupIfNeeded(); }, 2000);
      }
    };
    document.addEventListener('visibilitychange', _visibilityHandler);

    // 2) ページ離脱時（ブラウザ閉じなど）— sendBeacon版でより確実に
    _pagehideHandler = function() {
      if (isLoggedIn() && isAutoBackupEnabled() && !_restorePending && hasDataChanged()) {
        try {
          var data = collectSyncData();
          var token = getToken();
          var planLevel = (window.DaycePlan) ? window.DaycePlan.getPlan() : (localStorage.getItem('planLevel') || 'free');
          var payload = JSON.stringify({ data: data, planLevel: planLevel });
          var blob = new Blob([payload], { type: 'text/plain' });
          navigator.sendBeacon(API_BASE + '/api/sync/upload?token=' + encodeURIComponent(token), blob);
          console.log('☁️ sendBeaconで自動バックアップ送信');
        } catch(e) {
          console.warn('☁️ sendBeacon失敗:', e.message);
        }
      }
    };
    window.addEventListener('pagehide', _pagehideHandler);

    // 3) 定期バックアップ実行（フォールバック: hook有無に関わらず）
    _autoBackupTimer = setInterval(function() {
      autoBackupIfNeeded();
    }, _hookInstalled ? (3 * 60 * 1000) : (60 * 1000));
    console.log('☁️ 定期バックアップ:', _hookInstalled ? '3分間隔（hook有効）' : '1分間隔（hookなし）');

    // 4) 高速変更検知ポーリング（hookの代替: 5秒ごとにデータ変更を検出→10秒デバウンスで自動バックアップ）
    if (!_hookInstalled) {
      var _lastDetectHash = localStorage.getItem(LS_LAST_SNAPSHOT) || '';
      _pollingTimer = setInterval(function() {
        if (!isLoggedIn() || !isAutoBackupEnabled()) return;
        try {
          var data = collectSyncData();
          var hash = simpleHash(JSON.stringify(data));
          if (_lastDetectHash && hash !== _lastDetectHash) {
            console.log('☁️ データ変更検知（5秒ポーリング）');
            scheduleAutoBackup(); // 10秒デバウンス後にバックアップ
          }
          _lastDetectHash = hash;
        } catch(e) { /* silent */ }
      }, 5000);
      console.log('☁️ 高速変更検知ポーリング開始（5秒間隔）');
    }

    // 5) ユーザー操作トリガー（hookなし時の追加検知）
    if (!_hookInstalled) {
      var _interactionDebounce = null;
      _interactionHandler = function() {
        if (!isLoggedIn() || !isAutoBackupEnabled()) return;
        if (_interactionDebounce) clearTimeout(_interactionDebounce);
        _interactionDebounce = setTimeout(function() {
          _interactionDebounce = null;
          autoBackupIfNeeded();
        }, 5000);
      };
      document.addEventListener('touchend', _interactionHandler, { passive: true });
      document.addEventListener('click', _interactionHandler, { passive: true });
      console.log('☁️ ユーザー操作トリガー設定');
    }

    console.log('☁️ 自動バックアップセットアップ完了');
  }

  // renderSyncUI に自動バックアップトグルを追加
  var _origRenderSyncUI = renderSyncUI;
  renderSyncUI = function(container) {
    _origRenderSyncUI(container);
    // トグルを追加
    var logoutBtn = container.querySelector('#csLogoutBtn');
    if (logoutBtn) {
      var autoOn = isAutoBackupEnabled();
      var toggleDiv = document.createElement('div');
      toggleDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding:10px 12px;background:#f8f9fa;border-radius:8px;';
      toggleDiv.innerHTML =
        '<div>' +
          '<div style="font-size:13px;font-weight:600;color:#333;">🔄 自動バックアップ</div>' +
          '<div style="font-size:11px;color:#999;margin-top:2px;">データ変更時に自動で保存</div>' +
        '</div>' +
        '<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;">' +
          '<input type="checkbox" id="csAutoBackupToggle" ' + (autoOn ? 'checked' : '') + ' style="opacity:0;width:0;height:0;">' +
          '<span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (autoOn ? '#4CAF50' : '#ccc') + ';border-radius:24px;transition:.3s;"></span>' +
          '<span style="position:absolute;top:2px;left:' + (autoOn ? '22px' : '2px') + ';width:20px;height:20px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2);"></span>' +
        '</label>';
      logoutBtn.parentNode.insertBefore(toggleDiv, logoutBtn);

      var toggle = document.getElementById('csAutoBackupToggle');
      if (toggle) {
        toggle.addEventListener('change', function() {
          setAutoBackup(this.checked);
          renderUI();
        });
      }
    }
  };

  // === 新しいバックアップ検出 & 自動復元 ===
  var _syncCheckRunning = false;

  async function checkForNewerBackup() {
    if (!isLoggedIn() || _syncCheckRunning) return;
    _syncCheckRunning = true;

    try {
      var status = await getStatus();
      console.log('☁️ サーバーステータス:', status.syncedAt, 'ローカル:', getLastSynced());
      if (!status.syncedAt) { _syncCheckRunning = false; return; }

      var serverTime = parseTime(status.syncedAt);
      var localLastSynced = getLastSynced();
      var localTime = parseTime(localLastSynced);

      // サーバーの方が新しい（5秒以上差がある場合のみ — 自分のバックアップ直後を除外）
      if (serverTime > localTime + 5000) {
        console.log('☁️ サーバーの方が新しい! 差分:', Math.round((serverTime - localTime) / 1000), '秒');
        // バナーが未表示なら表示
        if (!document.getElementById('csSyncBanner')) {
          showSyncBanner(status.syncedAt);
        }
      }
    } catch (e) {
      console.warn('☁️ バックアップ確認失敗:', e.message);
    }
    _syncCheckRunning = false;
  }

  // === 定期同期チェック開始 ===
  var _syncChecksStarted = false;

  function startSyncChecks() {
    if (_syncChecksStarted) return;
    _syncChecksStarted = true;

    // 定期的にサーバーの新しいバックアップをチェック（2分ごと）
    setInterval(checkForNewerBackup, 2 * 60 * 1000);
    // フォアグラウンド復帰時にもチェック
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && isLoggedIn()) {
        setTimeout(checkForNewerBackup, 1000);
      }
    });
    console.log('☁️ 定期同期チェック開始');
  }

  // === ログイン/登録後の初回同期処理 ===
  var _afterLoginRunning = false;
  async function afterLogin() {
    if (_afterLoginRunning) { console.log('☁️ afterLogin既に実行中、スキップ'); return; }
    _afterLoginRunning = true;
    console.log('☁️ afterLogin開始 token:', !!getToken(), 'email:', getEmail());
    updateSnapshot();
    startSyncChecks();

    try {
      // まずサーバーの状態を確認
      var status = await getStatus();
      console.log('☁️ afterLogin: サーバー状態 syncedAt:', status.syncedAt, 'planLevel:', status.planLevel);

      // サーバー側のplanLevelをローカルに反映（復元しなくてもプランは常に同期）
      if (status.planLevel) {
        var localPlan = localStorage.getItem('planLevel');
        if (localPlan !== status.planLevel) {
          console.log('☁️ プランを同期:', localPlan, '→', status.planLevel);
          localStorage.setItem('planLevel', status.planLevel);
          if (status.planLevel === 'pro' || status.planLevel === 'premium') {
            localStorage.setItem('isPremium', 'true');
          } else {
            // ダウングレード: isPremiumをクリア
            localStorage.removeItem('isPremium');
          }
          // DaycePlanが利用可能なら再描画
          if (window.DaycePlan && window.DaycePlan.renderPlanBadges) {
            window.DaycePlan.renderPlanBadges();
          }
        }
      }

      if (status.syncedAt) {
        var localLastSynced = getLastSynced();
        console.log('☁️ afterLogin: ローカル最終同期:', localLastSynced);

        if (!localLastSynced) {
          // このデバイスで初めてログイン＆サーバーにデータあり → 復元を提案（アップロードしない！）
          console.log('☁️ サーバーにバックアップあり、このデバイス初回。復元バナーを表示');
          _restorePending = true;
          showSyncBanner(status.syncedAt);
          return;
        }

        var serverTime = parseTime(status.syncedAt);
        var localTime = parseTime(localLastSynced);
        console.log('☁️ afterLogin: サーバー時刻差:', Math.round((serverTime - localTime) / 1000), '秒');

        if (serverTime > localTime + 5000) {
          // サーバーの方が新しい → 復元を提案（アップロードしない！）
          console.log('☁️ サーバーの方が新しいバックアップ。復元バナーを表示');
          _restorePending = true;
          showSyncBanner(status.syncedAt);
          return;
        }
      } else {
        console.log('☁️ afterLogin: サーバーにバックアップなし');
      }

      // サーバーにデータなし or ローカルの方が新しい → バックアップ
      console.log('☁️ バックアップを実行');
      triggerFirstBackup();
    } catch(e) {
      console.warn('☁️ afterLogin失敗:', e.message, e);
      // エラー時はバックアップを試みる（ただしログインが有効な場合のみ）
      if (isLoggedIn()) {
        triggerFirstBackup();
      }
    } finally {
      _afterLoginRunning = false;
    }
    // ログイン後にプッシュ通知を設定（既に許可済みなら即サブスク、未設定なら数秒後にプロンプト）
    setTimeout(function() { setupPushNotifications(false); }, 3000);
  }

  // ===== Push Notifications =====
  var VAPID_PUBLIC_KEY = 'BBIJCmdw_b6KV_TULUY5LKckBJjqBWZrTR_ohiR8spxpYIbPEX0uy4shwBTjG7hCq1G2MZoo1Vx2NrebxHatrzI';

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    return Uint8Array.from(rawData, function(c) { return c.charCodeAt(0); });
  }

  async function subscribePush() {
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      var token = getToken();
      if (!token) return;
      await fetch(API_BASE + '/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      console.log('🔔 プッシュ通知を登録しました');
    } catch(e) {
      console.warn('🔔 プッシュ通知の登録失敗:', e.message);
    }
  }

  async function setupPushNotifications(forcePrompt) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!isLoggedIn()) return;
    var perm = Notification.permission;
    if (perm === 'granted') {
      await subscribePush();
    } else if (perm === 'default' && forcePrompt) {
      var granted = await Notification.requestPermission();
      if (granted === 'granted') await subscribePush();
    } else if (perm === 'default' && !forcePrompt) {
      showPushPrompt();
    }
  }

  function showPushPrompt() {
    if (document.getElementById('csPushPrompt')) return;
    if (localStorage.getItem('pushPromptDismissed')) return;
    var el = document.createElement('div');
    el.id = 'csPushPrompt';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:9999;max-width:340px;width:calc(100% - 40px);font-size:14px;';
    el.innerHTML = '<span style="font-size:20px">🔔</span><div style="flex:1"><div style="font-weight:600;margin-bottom:2px">毎晩リマインドしますか？</div><div style="font-size:12px;opacity:.7">毎晩20時に記録を促す通知を送ります</div></div><button id="csPushYes" style="background:#6c63ff;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;white-space:nowrap">はい</button><button id="csPushNo" style="background:transparent;color:#aaa;border:none;cursor:pointer;font-size:20px;line-height:1;padding:0 4px">×</button>';
    document.body.appendChild(el);
    document.getElementById('csPushYes').onclick = async function() {
      el.remove();
      await setupPushNotifications(true);
    };
    document.getElementById('csPushNo').onclick = function() {
      el.remove();
      localStorage.setItem('pushPromptDismissed', '1');
    };
    setTimeout(function() { if (el.parentNode) el.remove(); }, 15000);
  }

  // pushプロンプトをリセットして再表示するAPI（設定画面から呼べる）
  window.DayceNotification = {
    enable: function() { localStorage.removeItem('pushPromptDismissed'); setupPushNotifications(true); },
    disable: async function() {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      console.log('🔔 プッシュ通知を解除しました');
    },
    getPermission: function() { return Notification.permission; },
  };

  function showSyncBanner(serverSyncedAt) {
    // 既にバナーが存在する場合は重複表示しない
    if (document.getElementById('csSyncBanner')) return;

    var timeStr = new Date(serverSyncedAt).toLocaleString('ja-JP');

    var banner = document.createElement('div');
    banner.id = 'csSyncBanner';
    banner.className = 'cs-sync-banner';
    banner.innerHTML =
      '<div class="cs-sync-banner-content">' +
        '<div class="cs-sync-banner-icon">☁️</div>' +
        '<div class="cs-sync-banner-text">' +
          '<div class="cs-sync-banner-title">新しいバックアップがあります</div>' +
          '<div class="cs-sync-banner-time">別の端末で ' + escHTML(timeStr) + ' に保存</div>' +
        '</div>' +
      '</div>' +
      '<div class="cs-sync-banner-actions">' +
        '<button type="button" id="csBannerRestore" class="cs-sync-banner-btn cs-sync-banner-btn-primary">復元する</button>' +
        '<button type="button" id="csBannerDismiss" class="cs-sync-banner-btn cs-sync-banner-btn-secondary">あとで</button>' +
      '</div>';

    // ページ上部に挿入
    document.body.insertBefore(banner, document.body.firstChild);

    // アニメーション: スライドイン
    requestAnimationFrame(function() {
      banner.classList.add('cs-sync-banner-show');
    });

    // 復元ボタン
    document.getElementById('csBannerRestore').addEventListener('click', async function() {
      var btn = this;
      btn.disabled = true;
      btn.textContent = '復元中...';
      try {
        var res = await download();
        if (res.data) {
          dismissSyncBanner();
          // 復元完了 → リロード
          location.reload();
        } else {
          btn.textContent = '復元する';
          btn.disabled = false;
          alert('バックアップデータが見つかりませんでした');
        }
      } catch(e) {
        _restorePending = false; // 復元失敗時は自動バックアップを再開
        btn.textContent = '復元する';
        btn.disabled = false;
        alert('復元に失敗しました: ' + e.message);
      }
    });

    // あとでボタン
    document.getElementById('csBannerDismiss').addEventListener('click', function() {
      dismissSyncBanner();
    });
  }

  function dismissSyncBanner() {
    _restorePending = false; // 自動バックアップを再開
    var banner = document.getElementById('csSyncBanner');
    if (!banner) return;
    banner.classList.remove('cs-sync-banner-show');
    banner.classList.add('cs-sync-banner-hide');
    setTimeout(function() {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 300);
  }

  // === 認証ウォール（登録必須） ===
  function showAuthWall() {
    if (isLoggedIn()) return;
    if (document.getElementById('csAuthWall')) return;

    var wall = document.createElement('div');
    wall.id = 'csAuthWall';
    wall.className = 'cs-auth-wall';
    wall.innerHTML =
      '<div class="cs-aw-container">' +
        '<div class="cs-aw-logo">' +
          '<img src="./icon.jpg" alt="Dayce" style="width:64px;height:64px;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.1);">' +
        '</div>' +
        '<h1 class="cs-aw-title">Dayce</h1>' +
        '<p class="cs-aw-subtitle">声で記録するライフログ</p>' +
        '<div class="cs-aw-tabs">' +
          '<button type="button" class="cs-aw-tab cs-aw-tab-active" id="csAwTabRegister">新規登録</button>' +
          '<button type="button" class="cs-aw-tab" id="csAwTabLogin">ログイン</button>' +
        '</div>' +
        '<div class="cs-aw-form" id="csAwFormArea">' +
        '</div>' +
      '</div>';

    document.body.appendChild(wall);

    // タブ切り替え
    document.getElementById('csAwTabRegister').addEventListener('click', function() {
      setAwTab('register');
    });
    document.getElementById('csAwTabLogin').addEventListener('click', function() {
      setAwTab('login');
    });

    // 初期表示: 新規登録
    setAwTab('register');
  }

  function setAwTab(mode) {
    var regTab = document.getElementById('csAwTabRegister');
    var loginTab = document.getElementById('csAwTabLogin');
    var formArea = document.getElementById('csAwFormArea');
    if (!formArea) return;

    if (mode === 'register') {
      regTab.classList.add('cs-aw-tab-active');
      loginTab.classList.remove('cs-aw-tab-active');
      formArea.innerHTML =
        '<input type="email" id="csAwEmail" class="cs-aw-input" placeholder="メールアドレス" autocomplete="email">' +
        '<input type="password" id="csAwPw" class="cs-aw-input" placeholder="パスワード（6文字以上）" autocomplete="new-password">' +
        '<input type="password" id="csAwPw2" class="cs-aw-input" placeholder="パスワード（確認）" autocomplete="new-password">' +
        '<div id="csAwError" class="cs-aw-error" style="display:none;"></div>' +
        '<button type="button" id="csAwSubmit" class="cs-aw-btn">アカウント作成</button>' +
        '<div class="cs-aw-terms">アカウント作成により<a href="javascript:void(0)" onclick="showLegalModal(\'terms\')" style="color:#4A90D9;">利用規約</a>と<a href="javascript:void(0)" onclick="showLegalModal(\'privacy\')" style="color:#4A90D9;">プライバシーポリシー</a>に同意します</div>';
      document.getElementById('csAwSubmit').addEventListener('click', handleAwRegister);
    } else {
      loginTab.classList.add('cs-aw-tab-active');
      regTab.classList.remove('cs-aw-tab-active');
      formArea.innerHTML =
        '<input type="email" id="csAwEmail" class="cs-aw-input" placeholder="メールアドレス" autocomplete="email">' +
        '<input type="password" id="csAwPw" class="cs-aw-input" placeholder="パスワード" autocomplete="current-password">' +
        '<div id="csAwError" class="cs-aw-error" style="display:none;"></div>' +
        '<button type="button" id="csAwSubmit" class="cs-aw-btn">ログイン</button>' +
        '<button type="button" id="csAwForgot" class="cs-aw-link">パスワードを忘れた方</button>';
      document.getElementById('csAwSubmit').addEventListener('click', handleAwLogin);
      document.getElementById('csAwForgot').addEventListener('click', function() {
        setAwTab('reset');
      });
    }

    if (mode === 'reset') {
      loginTab.classList.add('cs-aw-tab-active');
      regTab.classList.remove('cs-aw-tab-active');
      formArea.innerHTML =
        '<p style="font-size:13px;color:#666;margin:0 0 12px;text-align:center;">登録メールアドレスにリセットコードを送信します</p>' +
        '<input type="email" id="csAwEmail" class="cs-aw-input" placeholder="メールアドレス" autocomplete="email">' +
        '<div id="csAwError" class="cs-aw-error" style="display:none;"></div>' +
        '<button type="button" id="csAwSubmit" class="cs-aw-btn">リセットコードを送信</button>' +
        '<button type="button" id="csAwBack" class="cs-aw-link">ログインに戻る</button>';
      document.getElementById('csAwSubmit').addEventListener('click', handleAwSendReset);
      document.getElementById('csAwBack').addEventListener('click', function() {
        setAwTab('login');
      });
    }

    if (mode === 'reset-confirm') {
      loginTab.classList.add('cs-aw-tab-active');
      regTab.classList.remove('cs-aw-tab-active');
      formArea.innerHTML =
        '<p style="font-size:13px;color:#666;margin:0 0 12px;text-align:center;">メールに届いた6桁のコードを入力してください</p>' +
        '<input type="text" id="csAwCode" class="cs-aw-input" placeholder="6桁のコード" maxlength="6" inputmode="numeric">' +
        '<input type="password" id="csAwNewPw" class="cs-aw-input" placeholder="新しいパスワード（6文字以上）" autocomplete="new-password">' +
        '<div id="csAwError" class="cs-aw-error" style="display:none;"></div>' +
        '<button type="button" id="csAwSubmit" class="cs-aw-btn">パスワードを変更</button>' +
        '<button type="button" id="csAwBack" class="cs-aw-link">ログインに戻る</button>';
      document.getElementById('csAwSubmit').addEventListener('click', handleAwConfirmReset);
      document.getElementById('csAwBack').addEventListener('click', function() {
        setAwTab('login');
      });
    }
  }

  function showAwError(msg) {
    var el = document.getElementById('csAwError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function hideAuthWall() {
    var wall = document.getElementById('csAuthWall');
    if (!wall) return;
    wall.style.opacity = '0';
    setTimeout(function() {
      if (wall.parentNode) wall.parentNode.removeChild(wall);
    }, 300);
  }

  var _awResetEmail = '';

  async function handleAwRegister() {
    var email = (document.getElementById('csAwEmail').value || '').trim();
    var pw = document.getElementById('csAwPw').value || '';
    var pw2 = document.getElementById('csAwPw2').value || '';
    if (!email || !pw) { showAwError('メールアドレスとパスワードを入力してください'); return; }
    if (pw !== pw2) { showAwError('パスワードが一致しません'); return; }
    if (pw.length < 6) { showAwError('パスワードは6文字以上で設定してください'); return; }

    var btn = document.getElementById('csAwSubmit');
    btn.disabled = true; btn.textContent = '登録中...';
    try {
      await register(email, pw);
      hideAuthWall();
      renderUI();
      afterLogin();
      setTimeout(function() { showSurveyModal(); }, 800);
    } catch(e) {
      showAwError(e.message);
      btn.disabled = false; btn.textContent = 'アカウント作成';
    }
  }

  async function handleAwLogin() {
    var email = (document.getElementById('csAwEmail').value || '').trim();
    var pw = document.getElementById('csAwPw').value || '';
    if (!email || !pw) { showAwError('メールアドレスとパスワードを入力してください'); return; }

    var btn = document.getElementById('csAwSubmit');
    btn.disabled = true; btn.textContent = 'ログイン中...';
    try {
      await login(email, pw);
      hideAuthWall();
      renderUI();
      afterLogin();
    } catch(e) {
      showAwError(e.message);
      btn.disabled = false; btn.textContent = 'ログイン';
    }
  }

  async function handleAwSendReset() {
    var email = (document.getElementById('csAwEmail').value || '').trim();
    if (!email) { showAwError('メールアドレスを入力してください'); return; }

    var btn = document.getElementById('csAwSubmit');
    btn.disabled = true; btn.textContent = '送信中...';
    try {
      await resetPassword(email);
      _awResetEmail = email;
      setAwTab('reset-confirm');
    } catch(e) {
      showAwError(e.message);
      btn.disabled = false; btn.textContent = 'リセットコードを送信';
    }
  }

  async function handleAwConfirmReset() {
    var code = (document.getElementById('csAwCode').value || '').trim();
    var newPw = document.getElementById('csAwNewPw').value || '';
    if (!code || !newPw) { showAwError('コードと新しいパスワードを入力してください'); return; }
    if (newPw.length < 6) { showAwError('パスワードは6文字以上で設定してください'); return; }

    var btn = document.getElementById('csAwSubmit');
    btn.disabled = true; btn.textContent = '変更中...';
    try {
      await resetConfirm(_awResetEmail, code, newPw);
      hideAuthWall();
      renderUI();
      afterLogin();
    } catch(e) {
      showAwError(e.message);
      btn.disabled = false; btn.textContent = 'パスワードを変更';
    }
  }

  // === 初期化 ===
  function init() {
    console.log('☁️ CloudSync init開始 loggedIn:', isLoggedIn());
    injectCSS();
    // 未ログインなら認証ウォール表示
    if (!isLoggedIn()) {
      showAuthWall();
    }
    renderUI();
    // setupAutoBackup は失敗してもafterLoginは実行する
    try {
      setupAutoBackup();
      console.log('☁️ setupAutoBackup完了');
    } catch(e) {
      console.warn('☁️ setupAutoBackupエラー（続行）:', e.message);
    }
    // ログイン済みならサーバー確認 → 復元 or バックアップ
    if (isLoggedIn()) {
      // 少し遅延して初回同期処理（サーバー確認→復元提案 or バックアップ）
      console.log('☁️ 1.5秒後にafterLogin実行予定');
      setTimeout(afterLogin, 1500);
    }
  }

  // DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // === データ変更通知（外部から呼び出し用） ===
  // hookLocalStorageが動かない環境で、index.html等のデータ保存箇所から直接呼ぶ
  function notifyChange() {
    if (_hookInstalled) return; // hookが動いていれば二重通知不要
    if (!isLoggedIn() || !isAutoBackupEnabled()) return;
    scheduleAutoBackup();
  }

  // === Public API ===
  window.CloudSync = {
    isLoggedIn: isLoggedIn,
    getEmail: getEmail,
    getLastSynced: getLastSynced,
    register: register,
    login: login,
    logout: logout,
    upload: upload,
    download: download,
    getStatus: getStatus,
    getHistory: getHistory,
    restoreVersion: restoreVersion,
    renderUI: renderUI,
    isAutoBackupEnabled: isAutoBackupEnabled,
    setAutoBackup: setAutoBackup,
    checkForNewerBackup: checkForNewerBackup,
    showAuthWall: showAuthWall,
    notifyChange: notifyChange,
  };

})();
