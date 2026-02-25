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
    'aiConsultHistory'
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

  function saveAuth(token, email, createdAt) {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_EMAIL, email);
    if (createdAt) localStorage.setItem('syncAuthRegisteredAt', createdAt);
  }
  function clearAuth() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EMAIL);
    localStorage.removeItem('syncAuthRegisteredAt');
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
      // 登録直後に初回バックアップを実行
      triggerFirstBackup();
      // アンケート表示（少し遅延して自然に）
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
      // ログイン直後に初回バックアップを実行
      triggerFirstBackup();
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
      document.getElementById('csLastSyncedText').textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
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
        document.getElementById('csLastSyncedText').textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
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
      '.cs-survey-footer{margin-top:20px;}';
    document.head.appendChild(style);
  }

  // === 自動バックアップ ===
  var LS_AUTO_BACKUP = 'cloudAutoBackup'; // 'on' or 'off'
  var LS_LAST_SNAPSHOT = 'cloudLastSnapshot'; // 前回バックアップ時のデータハッシュ
  var autoBackupRunning = false;

  function isAutoBackupEnabled() {
    return localStorage.getItem(LS_AUTO_BACKUP) !== 'off'; // デフォルトON
  }

  function setAutoBackup(enabled) {
    localStorage.setItem(LS_AUTO_BACKUP, enabled ? 'on' : 'off');
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
    if (!isLoggedIn() || !isAutoBackupEnabled() || autoBackupRunning) return;
    if (!hasDataChanged()) return;

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
      console.warn('☁️ 自動バックアップ失敗:', e.message);
    }
    autoBackupRunning = false;
  }

  // ログイン/登録直後に初回バックアップを実行
  async function triggerFirstBackup() {
    if (!isLoggedIn() || !isAutoBackupEnabled()) return;
    try {
      var res = await upload();
      updateSnapshot();
      console.log('☁️ 初回自動バックアップ完了:', res.syncedAt);
      var tsEl = document.getElementById('csLastSyncedText');
      if (tsEl && res.syncedAt) {
        tsEl.textContent = new Date(res.syncedAt).toLocaleString('ja-JP');
      }
    } catch(e) {
      console.warn('☁️ 初回自動バックアップ失敗:', e.message);
    }
  }

  // アプリがバックグラウンドに入った時 or ページを離れる時にバックアップ
  var _autoBackupTimer = null;
  var _autoBackupDebounce = null;

  // localStorage.setItem を監視して、データ変更時にバックアップをスケジュール
  function hookLocalStorage() {
    var origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      origSetItem.call(this, key, value);
      // 同期対象キーが変更されたら自動バックアップをスケジュール
      var isSyncKey = SYNC_KEYS.indexOf(key) !== -1;
      if (!isSyncKey) {
        for (var p = 0; p < DYNAMIC_KEY_PREFIXES.length; p++) {
          if (key.indexOf(DYNAMIC_KEY_PREFIXES[p]) === 0) { isSyncKey = true; break; }
        }
      }
      // 内部キー（スナップショットやトグル）は除外
      if (key === LS_LAST_SNAPSHOT || key === LS_AUTO_BACKUP || key === LS_LAST_SYNCED) return;
      if (isSyncKey) {
        console.log('☁️ データ変更検出:', key);
        scheduleAutoBackup();
      }
    };
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
    // 0) localStorage書き込み監視
    hookLocalStorage();
    // 1) バックグラウンド移行時
    document.addEventListener('visibilitychange', function() {
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
    });
    // 2) ページ離脱時（ブラウザ閉じなど）— sendBeacon版でより確実に
    window.addEventListener('pagehide', function() {
      if (isLoggedIn() && isAutoBackupEnabled() && hasDataChanged()) {
        try {
          var data = collectSyncData();
          var token = getToken();
          var planLevel = (window.DaycePlan) ? window.DaycePlan.getPlan() : (localStorage.getItem('planLevel') || 'free');
          var payload = JSON.stringify({ data: data, planLevel: planLevel });
          var blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(API_BASE + '/api/sync/upload?token=' + encodeURIComponent(token), blob);
          console.log('☁️ sendBeaconで自動バックアップ送信');
        } catch(e) {
          console.warn('☁️ sendBeacon失敗:', e.message);
        }
      }
    });
    // 3) 定期チェック（3分ごと）— フォールバック
    _autoBackupTimer = setInterval(function() {
      autoBackupIfNeeded();
    }, 3 * 60 * 1000);
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

  // === 新しいバックアップ通知 ===
  var _notifyCheckDone = false;

  async function checkForNewerBackup() {
    if (!isLoggedIn() || _notifyCheckDone) return;
    _notifyCheckDone = true;

    try {
      var status = await getStatus();
      if (!status.syncedAt) return; // サーバーにバックアップなし

      var serverTime = new Date(status.syncedAt).getTime();
      var localLastSynced = getLastSynced();
      var localTime = localLastSynced ? new Date(localLastSynced).getTime() : 0;

      // サーバーの方が新しい（5秒以上差がある場合のみ — 自分のバックアップ直後を除外）
      if (serverTime > localTime + 5000) {
        showSyncBanner(status.syncedAt);
      }
    } catch (e) {
      console.warn('☁️ バックアップ確認失敗:', e.message);
    }
  }

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
    var banner = document.getElementById('csSyncBanner');
    if (!banner) return;
    banner.classList.remove('cs-sync-banner-show');
    banner.classList.add('cs-sync-banner-hide');
    setTimeout(function() {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 300);
  }

  // === 初期化 ===
  function init() {
    injectCSS();
    renderUI();
    setupAutoBackup();
    // ログイン済みならスナップショット記録 + 未バックアップなら初回実行
    if (isLoggedIn()) {
      updateSnapshot();
      if (!getLastSynced()) {
        // まだ一度もバックアップしていない → 初回バックアップ
        triggerFirstBackup();
      }
      // 少し遅延してサーバーのバックアップ日時をチェック
      setTimeout(checkForNewerBackup, 2000);
    }
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
    isAutoBackupEnabled: isAutoBackupEnabled,
    setAutoBackup: setAutoBackup,
    checkForNewerBackup: checkForNewerBackup,
  };

})();
