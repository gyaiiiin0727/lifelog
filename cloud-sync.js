// ============================================================
// Dayce Cloud Sync — 認証 + クラウド同期
// window.CloudSync として公開
// ============================================================
(function () {
  'use strict';

  var API_BASE = (window.BACKEND_URL || window.__BACKEND_URL__ || 'https://lifelog-ai.little-limit-621c.workers.dev');

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
    'aiConsultHistory'
  ];

  // --- localStorage キー (認証用) ---
  var LS_TOKEN = 'syncAuthToken';
  var LS_EMAIL = 'syncAuthEmail';
  var LS_LAST_SYNCED = 'syncLastSynced';

  // === ヘルパー ===
  function getToken() { return localStorage.getItem(LS_TOKEN); }
  function getEmail() { return localStorage.getItem(LS_EMAIL); }
  function getLastSynced() { return localStorage.getItem(LS_LAST_SYNCED); }

  function saveAuth(token, email) {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_EMAIL, email);
  }
  function clearAuth() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EMAIL);
  }

  function isLoggedIn() {
    return !!getToken();
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

    var resp = await fetch(API_BASE + path, fetchOpts);
    var data = await resp.json();

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
    saveAuth(res.token, res.email);
    return res;
  }

  async function login(email, password) {
    var res = await apiCall('/api/auth/login', {
      method: 'POST',
      body: { email: email, password: password }
    });
    saveAuth(res.token, res.email);
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
    return data;
  }

  function applySyncData(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (key) {
      if (SYNC_KEYS.indexOf(key) !== -1 && data[key] !== undefined) {
        localStorage.setItem(key, data[key]);
      }
    });
  }

  async function upload() {
    var data = collectSyncData();
    var planLevel = (window.DaycePlan) ? window.DaycePlan.getPlan() : (localStorage.getItem('planLevel') || 'free');
    var res = await apiCall('/api/sync/upload', {
      method: 'POST',
      body: { data: data, planLevel: planLevel }
    });
    localStorage.setItem(LS_LAST_SYNCED, res.syncedAt);
    return res;
  }

  async function download() {
    var res = await apiCall('/api/sync/download');
    if (res.data) {
      applySyncData(res.data);
      if (res.syncedAt) localStorage.setItem(LS_LAST_SYNCED, res.syncedAt);
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
    var lastStr = lastSynced ? new Date(lastSynced).toLocaleString('ja-JP') : '未同期';

    container.innerHTML =
      '<h3 style="font-size:15px;font-weight:700;color:#333;margin:0 0 12px;">☁️ クラウド同期</h3>' +
      '<div class="cs-status">' +
        '<div class="cs-status-row"><span class="cs-label">アカウント</span><span class="cs-value">' + escHTML(email) + '</span></div>' +
        '<div class="cs-status-row"><span class="cs-label">最終同期</span><span class="cs-value" id="csLastSyncedText">' + escHTML(lastStr) + '</span></div>' +
      '</div>' +
      '<div id="csError" class="cs-error" style="display:none;"></div>' +
      '<div id="csSuccess" class="cs-success" style="display:none;"></div>' +
      '<div class="cs-sync-btns">' +
        '<button type="button" id="csUploadBtn" class="cs-btn cs-btn-upload">アップロード</button>' +
        '<button type="button" id="csDownloadBtn" class="cs-btn cs-btn-download">ダウンロード</button>' +
      '</div>' +
      '<button type="button" id="csLogoutBtn" class="cs-btn cs-btn-link cs-logout">ログアウト</button>';

    container.querySelector('#csUploadBtn').addEventListener('click', handleUpload);
    container.querySelector('#csDownloadBtn').addEventListener('click', handleDownload);
    container.querySelector('#csLogoutBtn').addEventListener('click', handleLogout);
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
    if (!confirm('現在のデータをクラウドにアップロードしますか？\nクラウド上のデータは上書きされます。')) return;

    setLoading('csUploadBtn', true);
    try {
      var res = await upload();
      document.getElementById('csLastSyncedText').textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
      showSuccess('アップロード完了');
    } catch (e) {
      showError(e.message);
    }
    setLoading('csUploadBtn', false);
  }

  async function handleDownload() {
    hideError();
    if (!confirm('クラウドのデータをこのデバイスにダウンロードしますか？\nこのデバイスのデータは上書きされます。')) return;

    setLoading('csDownloadBtn', true);
    try {
      var res = await download();
      if (!res.data) {
        showError('クラウドにデータがありません。先にアップロードしてください。');
      } else {
        document.getElementById('csLastSyncedText').textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
        showSuccess('ダウンロード完了 — ページを再読み込みして反映します');
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
  }

  function escHTML(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
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
      '.cs-logout{margin-top:8px;color:#999;font-size:12px;}';
    document.head.appendChild(style);
  }

  // === 初期化 ===
  function init() {
    injectCSS();
    renderUI();
  }

  // DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
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
    renderUI: renderUI,
  };

})();
