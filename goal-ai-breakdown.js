/**
 * goal-ai-breakdown.js
 * AIと目標設定 — 対話形式で目標を具体的なタスクに分解する（有料会員向け）
 */
(function() {
  'use strict';

  // ========== CSS注入 ==========
  var style = document.createElement('style');
  style.textContent = [
    /* ボタン（目標追加モーダル内） */
    '.goal-ai-btn {',
    '  display: block; width: 100%; margin-top: 8px; padding: 12px;',
    '  border: 2px dashed #2196F3; border-radius: 8px; background: #e8f4fd;',
    '  color: #2196F3; font-size: 14px; font-weight: 600; cursor: pointer;',
    '  transition: background .2s, border-color .2s;',
    '}',
    '.goal-ai-btn:hover { background: #e3f2fd; border-color: #1976D2; }',
    '.goal-ai-btn:disabled { opacity: .5; cursor: not-allowed; }',
    '.goal-ai-btn .premium-tag {',
    '  font-size: 11px; background: #2196F3; color: #fff;',
    '  padding: 1px 6px; border-radius: 4px; margin-left: 6px;',
    '}',

    /* ===== オーバーレイ（全画面） ===== */
    '#goalAIChatModal {',
    '  display:none; position:fixed; inset:0; background:#fff;',
    '  z-index:99999;',
    '}',
    '#goalAIChatModal.gai-open { display:flex !important; flex-direction:column; }',

    /* ===== 全画面本体 ===== */
    '#goalAIChatModal .gai-sheet {',
    '  width:100%; height:100%;',
    '  background:#fff;',
    '  display:flex; flex-direction:column; overflow:hidden;',
    '  padding:0; padding-top:env(safe-area-inset-top, 0px);',
    '}',

    /* ドラッグハンドル風（非表示） */
    '.gai-handle { display:none; }',

    /* ヘッダー */
    '.gai-header {',
    '  display:flex; justify-content:space-between; align-items:center;',
    '  padding:12px 16px 8px; flex-shrink:0;',
    '}',
    '.gai-header h2 { font-size:17px; margin:0; font-weight:700; }',
    '.gai-close {',
    '  font-size:22px; cursor:pointer; color:#999; background:none; border:none;',
    '  padding:4px 8px; line-height:1;',
    '}',

    /* キャラクター選択 */
    '.gai-char-selector { display:flex; gap:8px; padding:0 16px 10px; flex-shrink:0; }',
    '.gai-char-btn {',
    '  flex:1; padding:10px 4px 8px; border:2px solid #e5e7eb; border-radius:14px;',
    '  background:#fff; font-size:11px; cursor:pointer; text-align:center;',
    '  transition:all .2s; line-height:1.3;',
    '}',
    '.gai-char-btn:hover { border-color:#90caf9; background:#e8f4fd; }',
    '.gai-char-btn.active { border-color:#2196F3; background:#e8f4fd; box-shadow:0 0 0 2px #2196F3; }',
    '.gai-char-btn .char-img { width:48px; height:48px; border-radius:50%; object-fit:cover; display:block; margin:0 auto 6px; }',
    '.gai-char-btn .char-name { font-weight:600; color:#333; font-size:11px; display:block; margin-bottom:2px; }',
    '.gai-char-btn .char-desc { font-size:10px; color:#888; display:block; }',

    /* ===== チャットエリア（スクロール） ===== */
    '.gai-messages {',
    '  flex:1; overflow-y:auto; padding:12px 16px; min-height:0;',
    '  -webkit-overflow-scrolling:touch;',
    '}',

    /* AIメッセージ行（アイコン＋吹き出し） */
    '.gai-msg-row {',
    '  display:flex; align-items:flex-start; gap:8px; margin:10px 0;',
    '}',
    '.gai-msg-row.row-user { justify-content:flex-end; }',
    '.gai-msg-avatar {',
    '  width:32px; height:32px; border-radius:50%; object-fit:cover;',
    '  flex-shrink:0; margin-top:2px;',
    '}',

    '.gai-msg {',
    '  padding:12px 14px; border-radius:16px;',
    '  font-size:14px; line-height:1.6; max-width:82%; word-break:break-word;',
    '}',
    '.gai-msg-ai { background:#f3f4f6; color:#333; border-bottom-left-radius:4px; }',
    '.gai-msg-user { background:#2196F3; color:#fff; border-bottom-right-radius:4px; }',
    '.gai-msg-loading { background:#f3f4f6; color:#999; border-bottom-left-radius:4px; }',

    /* システムメッセージ */
    '.gai-msg-system {',
    '  background:#e3f2fd; color:#1976D2; font-size:13px; text-align:center;',
    '  padding:8px 14px; margin:10px auto; max-width:100%; border-radius:20px;',
    '  font-weight:600;',
    '}',

    /* ===== タスク選択エリア（スクロール） ===== */
    '.gai-tasks { flex:1; overflow-y:auto; padding:4px 16px 8px; min-height:0; -webkit-overflow-scrolling:touch; }',
    '.gai-task-item {',
    '  display:flex; align-items:flex-start; gap:10px; padding:12px 14px;',
    '  margin:6px 0; background:#fff; border:1.5px solid #e5e7eb;',
    '  border-radius:12px; cursor:pointer; transition:border-color .2s, background .2s;',
    '}',
    '.gai-task-item:hover { border-color:#2196F3; background:#e8f4fd; }',
    '.gai-task-item input[type="checkbox"] { margin-top:3px; width:20px; height:20px; accent-color:#2196F3; flex-shrink:0; }',
    '.gai-task-text { font-size:14px; line-height:1.5; color:#333; }',
    '.gai-task-actions { display:flex; gap:8px; padding:8px 16px 6px; flex-shrink:0; }',
    '.gai-task-actions button { flex:1; padding:12px; border:none; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; }',
    '.gai-add-btn { background:#2196F3; color:#fff; }',
    '.gai-add-btn:hover { background:#1976D2; }',
    '.gai-cancel-btn { background:#f0f0f0; color:#666; }',
    '.gai-cancel-btn:hover { background:#e0e0e0; }',

    /* 「もっと話す」ボタン */
    '.gai-more-btn {',
    '  display:block; width:calc(100% - 32px); margin:4px 16px 8px; padding:10px;',
    '  border:1.5px dashed #2196F3; border-radius:10px; background:#e8f4fd;',
    '  color:#2196F3; font-size:13px; font-weight:600; cursor:pointer;',
    '  transition:background .2s; flex-shrink:0;',
    '}',
    '.gai-more-btn:hover { background:#e3f2fd; }',

    /* ===== 入力エリア ===== */
    '.gai-input-area {',
    '  display:flex; gap:8px; padding:10px 16px; align-items:flex-end;',
    '  flex-shrink:0; border-top:1px solid #f0f0f0; background:#fff;',
    '}',
    '.gai-input {',
    '  flex:1; padding:10px 12px; border:1.5px solid #d1d5db; border-radius:10px;',
    '  font-size:16px; outline:none; resize:none; min-height:48px; max-height:120px;',
    '  line-height:1.4; font-family:inherit; overflow-y:auto;',
    '}',
    '.gai-input:focus { border-color:#2196F3; }',
    '.gai-voice {',
    '  padding:10px; background:#fff; border:1.5px solid #d1d5db; border-radius:10px;',
    '  font-size:18px; cursor:pointer; transition:all .2s; line-height:1; flex-shrink:0;',
    '}',
    '.gai-voice:hover { background:#f5f5f5; border-color:#2196F3; }',
    '.gai-voice.listening { background:#ef4444; border-color:#ef4444; animation:gaiVoicePulse 1.5s infinite; }',
    '@keyframes gaiVoicePulse { 0%,100%{opacity:1;} 50%{opacity:.7;} }',
    '.gai-send {',
    '  padding:10px 16px; background:#2196F3; color:#fff; border:none;',
    '  border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; white-space:nowrap;',
    '}',
    '.gai-send:hover { background:#1976D2; }',
    '.gai-send:disabled { opacity:.5; cursor:not-allowed; }',

    /* スピナー */
    '.gai-dots::after { content:""; animation:gaiDots 1.2s steps(4,end) infinite; }',
    '@keyframes gaiDots { 0%{content:"";} 25%{content:".";} 50%{content:"..";} 75%{content:"...";} }',

    /* safe-area対応 */
    '.gai-safe-bottom { padding-bottom:env(safe-area-inset-bottom, 8px); }',

    /* 週別計画UI */
    '.gai-week-header {',
    '  font-size:13px; font-weight:700; color:#2196F3; padding:10px 0 4px;',
    '  margin-top:10px; border-bottom:1.5px solid #e5e7eb;',
    '}',
    '.gai-week-header:first-child { margin-top:0; }'
  ].join('\n');
  document.head.appendChild(style);

  // ========== チャットモーダル HTML注入 ==========
  var chatModal = document.createElement('div');
  chatModal.id = 'goalAIChatModal';
  chatModal.innerHTML = [
    '<div class="gai-sheet">',
    '  <div class="gai-handle"></div>',
    '  <div class="gai-header">',
    '    <h2>🤖 AIと目標設定</h2>',
    '    <button class="gai-close" onclick="window._closeGoalAIChat()">&times;</button>',
    '  </div>',
    '  <div class="gai-messages" id="gaiMessages"></div>',
    '  <div class="gai-tasks" id="gaiTasks" style="display:none;"></div>',
    '  <div class="gai-input-area gai-safe-bottom" id="gaiInputArea">',
    '    <textarea class="gai-input" id="gaiInput" rows="2" placeholder="回答を入力..."></textarea>',
    '    <button class="gai-voice" id="gaiVoice" type="button" title="音声入力">🎤</button>',
    '    <button class="gai-send" id="gaiSend" onclick="window._gaiSendMessage()">送信</button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(chatModal);

  chatModal.addEventListener('click', function(e) {
    if (e.target === chatModal) closeChat();
  });

  // Enterキーで送信 + テキストエリア自動リサイズ
  setTimeout(function() {
    var input = document.getElementById('gaiInput');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window._gaiSendMessage();
        }
      });
      // テキストエリア自動リサイズ
      input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      });
    }
  }, 200);

  // ========== 状態管理 ==========
  var _state = {
    goalText: '',
    category: '',
    goalId: null,     // 紐づく目標ID
    chatHistory: [],  // [{role:'user'|'ai', text:'...'}]
    turnCount: 0,     // AIの返答回数
    maxTurns: 5,
    tone: 'normal',   // キャラクター選択 (harsh/normal/gentle)
    isWaiting: false
  };

  // ========== キャラクター選択 ==========
  function selectChar(tone) {
    // キャラクター制限チェック（無料プランはタクヤ先輩のみ）
    if (window.DaycePlan) {
      var charCheck = window.DaycePlan.checkCharacter(tone);
      if (!charCheck.allowed) {
        window.DaycePlan.showUpgradeModal({ type: 'goalCoach', plan: window.DaycePlan.getPlan(), current: 0, limit: 0,
          reason: charCheck.reason });
        return;
      }
    }
    _state.tone = tone;
    // ボタンのアクティブ状態を更新
    var btns = document.querySelectorAll('.gai-char-btn');
    btns.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tone') === tone);
    });
  }

  // ========== 目標追加モーダルにボタン＋キャラ選択を注入 ==========
  function injectAIButton() {
    var addBtn = document.querySelector('#goalAddModal .add-button');
    if (!addBtn) return;
    if (document.getElementById('goalAIBreakdownBtn')) return;

    // キャラクター選択UI（目標追加モーダル内）
    var charWrap = document.createElement('div');
    charWrap.id = 'goalAddCharSelector';
    charWrap.className = 'gai-char-selector';
    charWrap.style.display = 'none';
    charWrap.style.padding = '10px 0 8px';
    charWrap.innerHTML = [
      '<button class="gai-char-btn" data-tone="harsh" type="button">',
      '  <img class="char-img" src="drill_instructor.png" alt="マネージャー" />',
      '  <span class="char-name">マネージャー</span>',
      '  <span class="char-desc">厳しめ</span>',
      '</button>',
      '<button class="gai-char-btn active" data-tone="normal" type="button">',
      '  <img class="char-img" src="takumi_senpai.png" alt="タクヤ先輩" />',
      '  <span class="char-name">タクヤ先輩</span>',
      '  <span class="char-desc">フランク</span>',
      '</button>',
      '<button class="gai-char-btn" data-tone="gentle" type="button">',
      '  <img class="char-img" src="hana_san.png" alt="ハナさん" />',
      '  <span class="char-name">ハナさん</span>',
      '  <span class="char-desc">やさしい</span>',
      '</button>'
    ].join('');

    // キャラボタンのクリックイベント
    charWrap.querySelectorAll('.gai-char-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tone = btn.getAttribute('data-tone');
        _state.tone = tone;
        charWrap.querySelectorAll('.gai-char-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-tone') === tone);
        });
      });
    });

    // チャット開始ボタン（キャラ選択の下に表示）
    var startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.id = 'goalAIStartBtn';
    startBtn.className = 'goal-ai-btn';
    startBtn.style.display = 'none';
    startBtn.style.borderStyle = 'solid';
    startBtn.style.background = '#2196F3';
    startBtn.style.color = '#fff';
    startBtn.textContent = '🚀 この相手でチャット開始';
    startBtn.onclick = function() {
      startGoalAIChat();
    };

    // AIと目標設定ボタン
    var aiBtn = document.createElement('button');
    aiBtn.type = 'button';
    aiBtn.id = 'goalAIBreakdownBtn';
    aiBtn.className = 'goal-ai-btn';
    aiBtn.innerHTML = '🤖 AIと目標設定';
    aiBtn.onclick = function() {
      // プラン制限チェック
      if (window.DaycePlan) {
        var limit = window.DaycePlan.checkLimit('goalCoach');
        if (!limit.allowed) {
          window.DaycePlan.showUpgradeModal(limit);
          return;
        }
      }
      // キャラ選択 + 開始ボタンを表示
      charWrap.style.display = 'flex';
      startBtn.style.display = 'block';
      aiBtn.style.display = 'none';
    };

    // "or" 区切り表示
    var orDiv = document.createElement('div');
    orDiv.id = 'goalAddOrDivider';
    orDiv.style.cssText = 'display:flex;align-items:center;gap:12px;margin:12px 0;';
    orDiv.innerHTML = '<div style="flex:1;height:1px;background:#e0e0e0;"></div><span style="font-size:13px;color:#aaa;font-weight:600;">or</span><div style="flex:1;height:1px;background:#e0e0e0;"></div>';

    addBtn.parentNode.insertBefore(orDiv, addBtn.nextSibling);
    orDiv.parentNode.insertBefore(aiBtn, orDiv.nextSibling);
    aiBtn.parentNode.insertBefore(charWrap, aiBtn.nextSibling);
    charWrap.parentNode.insertBefore(startBtn, charWrap.nextSibling);
  }

  // ========== 有料チェック ==========
  function isPremium() {
    try {
      var v = localStorage.getItem('isPremium');
      return v === 'true' || v === '1' || v === 'yes';
    } catch(e) { return false; }
  }

  // ========== チャット開始 ==========
  async function startGoalAIChat() {
    // プラン制限の再チェック（タスク未追加で閉じた場合の回避防止）
    if (window.DaycePlan) {
      var limit = window.DaycePlan.checkLimit('goalCoach');
      if (!limit.allowed) {
        window.DaycePlan.showUpgradeModal(limit);
        return;
      }
    }

    var goalInput = document.getElementById('goalInput');
    var categorySelect = document.getElementById('goalCategory');
    var text = goalInput ? goalInput.value.trim() : '';
    var category = categorySelect ? categorySelect.value : 'その他';

    if (!text) {
      alert('まず目標を入力してください');
      return;
    }

    // 状態を完全リセット
    _state.goalText = text;
    _state.category = category;
    _state.goalId = null;
    _state.chatHistory = [];
    _state.turnCount = 0;
    _state.maxTurns = 5;
    _state.tone = 'normal';
    _state.isWaiting = false;
    _continueCount = 0;
    // キャラクター選択UIの状態を反映
    var activeCharBtn = document.querySelector('.gai-char-btn.active');
    if (activeCharBtn) _state.tone = activeCharBtn.getAttribute('data-tone') || 'normal';

    // チャット開始時に使用回数をカウント（閉じても消費される）
    if (window.DaycePlan) { window.DaycePlan.incrementUsage('goalCoach'); window.DaycePlan.renderPlanBadges(); }

    // 目標を先に追加（weeklyTasksにタスクを入れるため）
    var goalId = Date.now();
    var now = new Date();
    var month = window.selectedGoalsMonth || window.goalsCurrentMonth ||
      (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
    var newGoal = {
      id: goalId,
      text: text,
      category: category,
      createdAt: now.toISOString(),
      month: month,
      completed: false,
      weeklyTasks: []
    };
    // ★ localStorageから最新を読み直して保存（安全方式）
    var existingGoals = _loadGoalsFromStorage();
    existingGoals.unshift(newGoal);
    _saveGoalsToStorage(existingGoals);
    _state.goalId = goalId;

    // 目標追加モーダルを閉じる
    if (typeof window.closeGoalAddModal === 'function') window.closeGoalAddModal();

    // チャットモーダルを開く
    var modal = document.getElementById('goalAIChatModal');
    var messagesEl = document.getElementById('gaiMessages');
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');

    if (messagesEl) messagesEl.innerHTML = '';
    if (tasksEl) { tasksEl.innerHTML = ''; tasksEl.style.display = 'none'; }
    if (inputArea) inputArea.style.display = 'flex';
    if (modal) { modal.style.display = ''; modal.classList.add('gai-open'); }

    // キャラクター名を取得
    var charNames = { harsh: 'マネージャー', normal: 'タクヤ先輩', gentle: 'ハナさん' };
    var charName = charNames[_state.tone] || 'タクヤ先輩';

    // 最初のシステムメッセージ: 「〇〇さんに目標設定の相談をする」
    addMessage('system', charName + 'に目標設定の相談をする');

    // ユーザーの目標を表示
    addMessage('user', '「' + text + '」を達成したい（' + category + '）');
    _state.chatHistory.push({ role: 'user', text: text + '（カテゴリ: ' + category + '）' });

    // AIの最初の質問を取得
    await sendToAI();
  }

  // ========== キャラ画像マッピング ==========
  var _charImages = {
    harsh: 'drill_instructor.png',
    normal: 'takumi_senpai.png',
    gentle: 'hana_san.png'
  };

  function _getCharImg() {
    return _charImages[_state.tone] || _charImages.normal;
  }

  // ========== テキスト→HTML変換（箇条書き・改行対応） ==========
  function formatAIText(text) {
    if (!text) return '';
    if (typeof text !== 'string') text = JSON.stringify(text);
    // HTMLエスケープ
    var escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // 行ごとに処理
    var lines = escaped.split('\n');
    var html = '';
    var inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // 箇条書き: ・, -, *, •, 数字付き (1. 2) ...)
      var bulletMatch = line.match(/^\s*([・\-\*•]|(\d+[\.\)]\s?))\s*/);
      if (bulletMatch) {
        if (!inList) { html += '<ul style="margin:6px 0;padding-left:18px;list-style:none;">'; inList = true; }
        var content = line.replace(/^\s*([・\-\*•]|(\d+[\.\)]\s?))\s*/, '');
        // **太字** 対応
        content = content.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        html += '<li style="margin:4px 0;padding-left:4px;position:relative;line-height:1.5;">';
        // アイコンを付ける: 数字リストは番号、それ以外は▸
        if (line.match(/^\s*\d+[\.\)]/)) {
          html += '<span style="color:#2196F3;font-weight:700;margin-right:4px;">' + line.match(/^\s*(\d+)/)[1] + '.</span> ';
        } else {
          html += '<span style="color:#2196F3;margin-right:4px;">▸</span>';
        }
        html += content + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        // **太字** 対応
        line = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        if (line.trim() === '') {
          html += '<div style="height:8px;"></div>';
        } else {
          html += '<div style="line-height:1.6;margin:2px 0;">' + line + '</div>';
        }
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  // ========== メッセージ追加 ==========
  function addMessage(role, text) {
    var messagesEl = document.getElementById('gaiMessages');
    if (!messagesEl) return;

    if (role === 'system') {
      // システムメッセージ（アイコンなし、中央表示）
      var sysDiv = document.createElement('div');
      sysDiv.className = 'gai-msg gai-msg-system';
      sysDiv.textContent = text;
      messagesEl.appendChild(sysDiv);
    } else if (role === 'ai') {
      // AIメッセージ（アイコン＋吹き出し）— HTML変換で箇条書き対応
      var row = document.createElement('div');
      row.className = 'gai-msg-row';
      var img = document.createElement('img');
      img.className = 'gai-msg-avatar';
      img.src = _getCharImg();
      img.alt = '';
      var bubble = document.createElement('div');
      bubble.className = 'gai-msg gai-msg-ai';
      bubble.innerHTML = formatAIText(text);
      row.appendChild(img);
      row.appendChild(bubble);
      messagesEl.appendChild(row);
    } else {
      // ユーザーメッセージ（右寄せ）
      var uRow = document.createElement('div');
      uRow.className = 'gai-msg-row row-user';
      var uBubble = document.createElement('div');
      uBubble.className = 'gai-msg gai-msg-user';
      uBubble.textContent = text;
      uRow.appendChild(uBubble);
      messagesEl.appendChild(uRow);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addLoadingMessage() {
    var messagesEl = document.getElementById('gaiMessages');
    if (!messagesEl) return;

    var row = document.createElement('div');
    row.className = 'gai-msg-row';
    row.id = 'gaiLoadingMsg';
    var img = document.createElement('img');
    img.className = 'gai-msg-avatar';
    img.src = _getCharImg();
    img.alt = '';
    var bubble = document.createElement('div');
    bubble.className = 'gai-msg gai-msg-loading';
    bubble.innerHTML = '考え中<span class="gai-dots"></span>';
    row.appendChild(img);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeLoadingMessage() {
    var el = document.getElementById('gaiLoadingMsg');
    if (el) el.remove();
  }

  // ========== ユーザーメッセージ送信 ==========
  async function gaiSendMessage() {
    if (_state.isWaiting) return;

    var input = document.getElementById('gaiInput');
    var text = input ? input.value.trim() : '';
    if (!text) return;

    if (input) { input.value = ''; input.style.height = 'auto'; }

    addMessage('user', text);
    _state.chatHistory.push({ role: 'user', text: text });

    await sendToAI();
  }

  // ========== AI呼び出し ==========
  async function sendToAI() {
    _state.isWaiting = true;
    var sendBtn = document.getElementById('gaiSend');
    if (sendBtn) sendBtn.disabled = true;

    // キャラ選択はgaiSendMessage側で隠す（ここでは何もしない）

    addLoadingMessage();

    try {
      var tone = _state.tone || 'normal';
      var prompt = buildPrompt();

      var BACKEND_URL = window.BACKEND_URL || window.__BACKEND_URL__ || 'https://api.dayce.app';
      var _gaiH = (window.DaycePlan && window.DaycePlan.getAIHeaders) ? window.DaycePlan.getAIHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(BACKEND_URL + '/api/analyze', {
        method: 'POST',
        headers: _gaiH,
        body: JSON.stringify({ text: prompt, tone: tone, type: 'goalCoach' })
      });

      if (res.status === 429 || res.status === 401) {
        var errData = await res.json();
        removeLoadingMessage();
        if (window.DaycePlan && window.DaycePlan.showUpgradeModal) {
          window.DaycePlan.showUpgradeModal({ type: errData.aiType || 'goalCoach', plan: errData.plan || 'free', current: errData.current || 0, limit: errData.limit || 0, requireAuth: !!errData.requireAuth });
        } else {
          alert(errData.error || '利用制限に達しました');
        }
        return;
      }
      if (!res.ok) throw new Error('API error: ' + res.status);

      var data = await res.json();
      var responseText = '';
      if (typeof data === 'string') {
        responseText = data;
      } else if (data && typeof data === 'object') {
        responseText = data.comment || data.feedback || data.analysis || data.result || data.response || '';
      }
      if (!responseText) throw new Error('レスポンスが空でした');

      removeLoadingMessage();

      _state.turnCount++;
      _state.chatHistory.push({ role: 'ai', text: responseText });

      // タスク提案が含まれているかチェック（最低2回は会話してから提案を判定）
      if (_state.turnCount >= 2) {
        // まずフェーズ別計画パーサーを試す
        var weeklyPlan = parseWeeklyPlan(responseText);
        var weeklyPlanTotal = Object.keys(weeklyPlan).reduce(function(sum, k) {
          return sum + weeklyPlan[k].length;
        }, 0);

        if (weeklyPlanTotal >= 3) {
          // フェーズ別計画あり → チャットに表示 + フェーズ別タスク選択UI
          addMessage('ai', responseText);
          showWeeklyPlanSelection(weeklyPlan);
        } else {
          // フォールバック: 従来の単一リストパーサー
          var tasks = parseTasks(responseText);
          if (tasks.length >= 3) {
            addMessage('ai', responseText);
            showTaskSelection(tasks);
          } else {
            // まだ質問フェーズ
            addMessage('ai', responseText);
            if (_state.turnCount >= _state.maxTurns) {
              var inputArea = document.getElementById('gaiInputArea');
              if (inputArea) inputArea.style.display = 'none';
              addMessage('ai', 'それでは、' + (new Date().getMonth() + 1) + '月末までの計画を提案しますね...');
              await sendFinalProposal();
            }
          }
        }
      } else {
        // まだ質問フェーズ（2回未満）
        addMessage('ai', responseText);
      }

    } catch(e) {
      removeLoadingMessage();
      addMessage('ai', 'エラーが発生しました: ' + e.message);
      console.error('Goal AI chat error:', e);
    } finally {
      _state.isWaiting = false;
      var sendBtn2 = document.getElementById('gaiSend');
      if (sendBtn2) sendBtn2.disabled = false;
      var input = document.getElementById('gaiInput');
      if (input) input.focus();
    }
  }

  // ========== 最終タスク提案（強制） ==========
  async function sendFinalProposal() {
    _state.isWaiting = true;
    addLoadingMessage();

    try {
      var tone = _state.tone || 'normal';

      var historyText = _state.chatHistory.map(function(m) {
        return (m.role === 'user' ? 'ユーザー' : 'AI') + ': ' + m.text;
      }).join('\n');

      // 月の残り日数に応じてフェーズを決定（buildPromptと同じロジック）
      var _fnow = new Date();
      var _fmonthEnd = new Date(_fnow.getFullYear(), _fnow.getMonth() + 1, 0);
      var _fremainDays = Math.max(1, Math.floor((_fmonthEnd - _fnow) / 86400000) + 1);
      var _fmonthName = (_fnow.getMonth() + 1) + '月';
      var _fphaseLabels;
      if (_fremainDays <= 7) {
        _fphaseLabels = '【今月中】\n1. タスク';
      } else if (_fremainDays <= 14) {
        _fphaseLabels = '【前半】\n1. タスク\n【後半】\n1. タスク';
      } else if (_fremainDays <= 21) {
        _fphaseLabels = '【第1週】\n1. タスク\n【第2週】\n1. タスク\n【第3週】\n1. タスク';
      } else {
        _fphaseLabels = '【第1週】\n1. タスク\n【第2週】\n1. タスク\n【第3週】\n1. タスク\n【第4週】\n1. タスク';
      }

      var prompt = '【指示】以下の会話を踏まえて、' + _fmonthName + '末（残り' + _fremainDays + '日間）の行動計画を提案してください。\n' +
        '必ず以下のフォーマットで出力してください：\n' +
        _fphaseLabels + '\n' +
        '- 各フェーズ2〜3個、全体で6〜12個\n' +
        '- 最初は取り組みやすく、後半はステップアップ\n' +
        '- 「週○回〜する」「毎日〜する」のような頻度付き行動\n' +
        '- 準備やTipsではなく行動そのもの\n\n' +
        '【会話履歴】\n' + historyText;

      var BACKEND_URL = window.BACKEND_URL || window.__BACKEND_URL__ || 'https://api.dayce.app';
      var _gaiH = (window.DaycePlan && window.DaycePlan.getAIHeaders) ? window.DaycePlan.getAIHeaders() : { 'Content-Type': 'application/json' };
      var res = await fetch(BACKEND_URL + '/api/analyze', {
        method: 'POST',
        headers: _gaiH,
        body: JSON.stringify({ text: prompt, tone: tone, type: 'goalCoach' })
      });

      if (res.status === 429 || res.status === 401) {
        var errData = await res.json();
        removeLoadingMessage();
        if (window.DaycePlan && window.DaycePlan.showUpgradeModal) {
          window.DaycePlan.showUpgradeModal({ type: errData.aiType || 'goalCoach', plan: errData.plan || 'free', current: errData.current || 0, limit: errData.limit || 0, requireAuth: !!errData.requireAuth });
        } else {
          alert(errData.error || '利用制限に達しました');
        }
        return;
      }
      if (!res.ok) throw new Error('API error: ' + res.status);

      var data = await res.json();
      var responseText = data.comment || data.feedback || data.analysis || data.result || data.response || '';
      if (!responseText && typeof data === 'string') responseText = data;

      removeLoadingMessage();

      if (responseText) {
        _state.chatHistory.push({ role: 'ai', text: responseText });
        addMessage('ai', responseText);
        // まずフェーズ別計画パーサーを試す
        var weeklyPlan = parseWeeklyPlan(responseText);
        var planTotal = Object.keys(weeklyPlan).reduce(function(sum, k) {
          return sum + weeklyPlan[k].length;
        }, 0);
        if (planTotal >= 3) {
          showWeeklyPlanSelection(weeklyPlan);
        } else {
          var tasks = parseTasks(responseText);
          if (tasks.length > 0) {
            showTaskSelection(tasks);
          }
        }
      }
    } catch(e) {
      removeLoadingMessage();
      addMessage('ai', 'エラーが発生しました: ' + e.message);
    } finally {
      _state.isWaiting = false;
    }
  }

  // ========== プロンプト構築 ==========
  function buildPrompt() {
    var historyText = _state.chatHistory.map(function(m) {
      return (m.role === 'user' ? 'ユーザー' : 'AI') + ': ' + m.text;
    }).join('\n');

    // キャラクター・ルールはWorker側で注入（ソースから隠蔽）
    var charHeader = '';

    // 過去データのコンテキスト（初回と最終回に含める。中間ターンはトークン節約で省略）
    var userContext = '';
    if ((_state.turnCount === 0 || _state.turnCount >= _state.maxTurns - 1) && typeof window.buildContextSummary === 'function') {
      userContext = window.buildContextSummary('goals', { goalCategory: _state.category });
    }

    // 今月の残り期間を計算
    var _now = new Date();
    var _monthEnd = new Date(_now.getFullYear(), _now.getMonth() + 1, 0);
    var _remainDays = Math.max(1, Math.floor((_monthEnd - _now) / 86400000) + 1);
    var _monthLabel = (_now.getMonth() + 1) + '月' + _now.getDate() + '日〜' + (_monthEnd.getMonth() + 1) + '月' + _monthEnd.getDate() + '日';
    var _monthName = (_now.getMonth() + 1) + '月';

    // 残り日数に応じてフェーズ数を決定
    var _phaseCount, _phaseLabels;
    if (_remainDays <= 7) {
      _phaseCount = 1;
      _phaseLabels = '【今月中】';
    } else if (_remainDays <= 14) {
      _phaseCount = 2;
      _phaseLabels = '【前半】\n1. タスクA\n【後半】\n1. タスクB';
    } else if (_remainDays <= 21) {
      _phaseCount = 3;
      _phaseLabels = '【第1週】\n1. タスクA\n【第2週】\n1. タスクB\n【第3週】\n1. タスクC';
    } else {
      _phaseCount = 4;
      _phaseLabels = '【第1週】\n1. タスクA\n【第2週】\n1. タスクB\n【第3週】\n1. タスクC\n【第4週】\n1. タスクD';
    }

    // カテゴリに応じて頻度ルールを切り替え
    var _cat = _state.category || 'その他';
    var _freqRule;
    if (_cat === '健康') {
      _freqRule =
        '- 「週○回〜する」「毎日〜する」のような頻度・回数付きの行動にしてください\n' +
        '- 例: ダイエット → 前半「週2回ジムに行く」→ 後半「週3回ジム+自宅筋トレ1回」\n';
    } else {
      _freqRule =
        '- タスクはシンプルな行動で書いてください（例:「完成したシナリオを見直す」「企画書の骨子を作る」）\n' +
        '- 頻度（週○回等）は、運動や反復練習など回数が重要な場合のみ付けてください\n' +
        '- 創作・学習・計画系のタスクは回数より「何をするか」を明確に書いてください\n';
    }

    var weeklyPlanRule =
      '【タスク提案のルール】\n' +
      '- ' + _monthName + '末（' + _monthLabel + '、残り' + _remainDays + '日間）の計画を提案してください\n' +
      '- 必ず以下のフォーマットで出力してください：\n' +
      _phaseLabels + '\n' +
      '- 各フェーズ2〜3個、全体で6〜12個のタスクにしてください\n' +
      '- 最初は取り組みやすいタスク、後半はステップアップした内容にしてください\n' +
      _freqRule +
      '- 準備やTips（「バッグを用意する」等）ではなく、目標達成に直結する行動そのものにしてください\n';

    // フォーマットルール（全プロンプト共通）
    var formatRule =
      '【返信フォーマットのルール】\n' +
      '- 長い文章は避け、短い段落 + 箇条書き（・や数字リスト）で見やすく整理してください\n' +
      '- 1つの段落は2〜3文以内にしてください\n' +
      '- ポイントを伝えるときは必ず箇条書きを使ってください\n' +
      '- 箇条書きの各項目は1行で簡潔に書いてください\n\n';

    // 初回: ヒアリング質問
    if (_state.turnCount === 0) {
      return charHeader + userContext + formatRule +
        '【指示】あなたは目標設定のコーチです。\n' +
        'ユーザーが「' + _state.goalText + '」（カテゴリ: ' + _state.category + '）という目標を立てようとしています。\n' +
        'この目標を' + _monthName + '末までの計画に落とし込むために、以下の流れで返信してください：\n' +
        '1. まず短い共感コメント（1文）\n' +
        '2. 目標を達成するために大事なポイントを2〜3個、箇条書きで簡潔に示す\n' +
        '3. 最後に、計画を作るための質問を1つだけする\n' +
        '- ユーザーの過去データがあれば、それを踏まえた内容にしてください\n' +
        '- ' + (_cat === '健康' ? '具体的な数値、頻度（週何回？毎日？）、' : '具体的なゴールイメージや現在の状況、') + _monthName + '末にどうなりたいかを聞く質問が望ましい\n' +
        '- キャラクター設定の口調に従って会話してください\n' +
        '- タスクリストや分析結果は出力しないでください\n';
    }

    // 2-3往復目: 質問を続ける（最低2回は質問する）
    if (_state.turnCount < 2) {
      return charHeader + formatRule +
        '【指示】あなたは目標設定のコーチです。\n' +
        '以下の会話を踏まえて、以下の流れで返信してください：\n' +
        '1. ユーザーの回答を踏まえた短いフィードバック（1〜2文）\n' +
        '2. 必要なら補足ポイントを箇条書きで2〜3個\n' +
        '3. 計画を作るための追加質問を1つだけ\n' +
        '- 「最初の1週間はどれくらいやれそう？」「' + _monthName + '末にはどうなっていたい？」など、' + _monthName + '末までの計画を作るための質問をしてください\n' +
        '- キャラクター設定の口調に従ってください\n' +
        '- タスクリストはまだ出力しないでください\n\n' +
        '【会話履歴】\n' + historyText;
    }

    // それ以降: 質問 or タスク提案
    if (_state.turnCount < _state.maxTurns - 1) {
      return charHeader + formatRule +
        '【指示】あなたは目標設定のコーチです。\n' +
        '以下の会話を踏まえて、次のどちらかを行ってください：\n' +
        '- まだ情報が足りなければ、フィードバック＋箇条書きポイント＋質問1つの形式で返信\n' +
        '- 十分な情報があれば、' + _monthName + '末までの計画を提案してください\n' +
        weeklyPlanRule +
        '- キャラクター設定の口調に従ってください\n\n' +
        '【会話履歴】\n' + historyText;
    }

    // 最終回: 強制タスク提案
    return charHeader +
      '【指示】以下の会話を踏まえて、' + _monthName + '末までの行動計画を提案してください。\n' +
      weeklyPlanRule + '\n' +
      '【会話履歴】\n' + historyText;
  }

  // ========== タスクのパース ==========
  function parseTasks(text) {
    var lines = text.split('\n');
    var tasks = [];
    // 番号付きリスト（1. 2. ①②など）のみをタスクとして認識
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      // 番号付きリストにマッチするか判定
      var isNumbered = /^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]/.test(line);
      var isBulleted = /^[-・●▪▸]\s/.test(line);
      if (!isNumbered && !isBulleted) continue;

      var cleaned = line
        .replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]\s*/, '')
        .replace(/^[-・●▪▸]\s*/, '')
        .trim();
      if (cleaned.length > 2 && cleaned.length < 100) {
        tasks.push(cleaned);
      }
    }
    return tasks.slice(0, 8);
  }

  // ========== 月間計画パーサー ==========
  function parseWeeklyPlan(text) {
    // 戻り値: { 1: ['task1', 'task2'], 2: ['task3'], ... }
    // 「第N週」「N週目」「前半」「後半」「今月中」に対応
    var result = {};
    var currentPhase = 0;
    var lines = text.split('\n');
    var phaseMap = { '前半': 1, '後半': 2, '今月中': 1 };

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      // フェーズヘッダー検出: 【第1週】, 【1週目】, 【前半】, 【後半】, 【今月中】
      var weekMatch = line.match(/[【\[]*\s*第?\s*(\d)\s*週目?\s*[】\]:]*/);
      if (weekMatch) {
        currentPhase = parseInt(weekMatch[1]);
        if (!result[currentPhase]) result[currentPhase] = [];
        continue;
      }
      // 前半/後半/今月中
      var phaseMatch = line.match(/[【\[]*\s*(前半|後半|今月中)\s*[】\]:]*/);
      if (phaseMatch) {
        currentPhase = phaseMap[phaseMatch[1]] || 1;
        if (!result[currentPhase]) result[currentPhase] = [];
        continue;
      }

      if (currentPhase === 0) continue;

      // 番号付き・箇条書きリストをタスクとして認識
      var isNumbered = /^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]/.test(line);
      var isBulleted = /^[-・●▪▸]\s/.test(line);
      if (!isNumbered && !isBulleted) continue;

      var cleaned = line
        .replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]\s*/, '')
        .replace(/^[-・●▪▸]\s*/, '')
        .trim();
      if (cleaned.length > 2 && cleaned.length < 100) {
        result[currentPhase].push(cleaned);
      }
    }
    return result;
  }

  // ========== 日付ユーティリティ ==========
  function _toDateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  // 月の残り日数でタスクを均等分散する日付配列を生成
  function distributeDates(taskCount, weekOffset) {
    if (taskCount <= 0) return [];

    var today = new Date();
    today.setHours(0,0,0,0);

    // 基準日 = 今日 + weekOffset週
    var baseDate = new Date(today);
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    // その月の残り日数を計算
    var monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    var remainingDays = Math.max(1, Math.floor((monthEnd - baseDate) / 86400000) + 1);

    // タスクを均等分散
    var dates = [];
    var interval = Math.max(1, Math.floor(remainingDays / taskCount));
    for (var i = 0; i < taskCount; i++) {
      var d = new Date(baseDate);
      d.setDate(d.getDate() + i * interval);
      // 月末を超えないようにクランプ
      if (d > monthEnd) d = new Date(monthEnd);
      dates.push(_toDateStr(d));
    }
    return dates;
  }

  // ========== タスク選択UI表示 ==========
  function showTaskSelection(tasks) {
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');
    if (!tasksEl) return;

    if (inputArea) inputArea.style.display = 'none';

    var canContinue = _state.turnCount < _state.maxTurns;

    // タスクリスト（スクロール領域）
    tasksEl.innerHTML = tasks.map(function(task, i) {
      return '<label class="gai-task-item">' +
        '<input type="checkbox" checked data-task-index="' + i + '" />' +
        '<span class="gai-task-text">' + escapeHTML(task) + '</span>' +
        '</label>';
    }).join('');
    tasksEl.style.display = 'block';

    // アクションボタンを gai-sheet 直下に追加（タスクリストの外 → 固定）
    var sheet = tasksEl.closest('.gai-sheet');
    if (sheet) {
      // 既存のアクションを削除
      var oldActions = sheet.querySelector('.gai-task-actions');
      if (oldActions) oldActions.remove();
      var oldMore = sheet.querySelector('.gai-more-btn');
      if (oldMore) oldMore.remove();

      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'gai-task-actions';
      actionsDiv.innerHTML =
        '<button class="gai-add-btn" onclick="window._gaiAddTasks()">✅ 選択したタスクを追加</button>' +
        '<button class="gai-cancel-btn" onclick="window._closeGoalAIChat()">キャンセル</button>';
      sheet.appendChild(actionsDiv);

      if (canContinue) {
        var moreBtn = document.createElement('button');
        moreBtn.className = 'gai-more-btn';
        moreBtn.onclick = function() { window._gaiContinueChat(); };
        moreBtn.textContent = '💬 もっと話してから決める';
        sheet.appendChild(moreBtn);
      }
    }
  }

  // ========== 月間計画 選択UI表示 ==========
  function showWeeklyPlanSelection(weeklyPlan) {
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');
    if (!tasksEl) return;
    if (inputArea) inputArea.style.display = 'none';

    var canContinue = _state.turnCount < _state.maxTurns;

    // フェーズ数に応じたラベルを動的生成
    var phaseKeys = Object.keys(weeklyPlan).map(Number).sort(function(a,b){return a-b;});
    var phaseCount = phaseKeys.length;
    var phaseLabels = {};
    if (phaseCount <= 1) {
      phaseLabels[phaseKeys[0] || 1] = '今月中';
    } else if (phaseCount === 2) {
      phaseLabels[phaseKeys[0]] = '前半';
      phaseLabels[phaseKeys[1]] = '後半';
    } else {
      phaseKeys.forEach(function(k, i) { phaseLabels[k] = '第' + (i+1) + '週'; });
    }

    var html = '';
    phaseKeys.forEach(function(phase) {
      var tasks = weeklyPlan[phase];
      if (!tasks || tasks.length === 0) return;
      html += '<div class="gai-week-header">📅 ' + (phaseLabels[phase] || ('第' + phase + '週')) + '</div>';
      tasks.forEach(function(task, i) {
        html += '<label class="gai-task-item">' +
          '<input type="checkbox" checked data-week="' + phase + '" data-task-index="' + i + '" />' +
          '<span class="gai-task-text">' + escapeHTML(task) + '</span>' +
          '</label>';
      });
    });

    tasksEl.innerHTML = html;
    tasksEl.style.display = 'block';

    var now = new Date();
    var monthName = (now.getMonth() + 1) + '月';

    var sheet = tasksEl.closest('.gai-sheet');
    if (sheet) {
      var oldActions = sheet.querySelector('.gai-task-actions');
      if (oldActions) oldActions.remove();
      var oldMore = sheet.querySelector('.gai-more-btn');
      if (oldMore) oldMore.remove();

      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'gai-task-actions';
      actionsDiv.innerHTML =
        '<button class="gai-add-btn" onclick="window._gaiAddTasks()">✅ ' + monthName + 'の計画を追加</button>' +
        '<button class="gai-cancel-btn" onclick="window._closeGoalAIChat()">キャンセル</button>';
      sheet.appendChild(actionsDiv);

      if (canContinue) {
        var moreBtn = document.createElement('button');
        moreBtn.className = 'gai-more-btn';
        moreBtn.onclick = function() { window._gaiContinueChat(); };
        moreBtn.textContent = '💬 もっと話してから決める';
        sheet.appendChild(moreBtn);
      }
    }
  }

  // ========== localStorage安全読み書き ==========
  function _loadGoalsFromStorage() {
    try {
      var raw = localStorage.getItem('monthlyGoals');
      var arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch(e) { return []; }
  }
  function _saveGoalsToStorage(goals) {
    try {
      localStorage.setItem('monthlyGoals', JSON.stringify(goals));
    } catch(e) {
      console.error('monthlyGoals保存エラー:', e);
      alert('データの保存に失敗しました。ストレージ容量を確認してください。');
      return;
    }
    window.monthlyGoals = goals;
    try {
      if (window.Storage && window.Storage.set && window.Storage.keys) {
        window.Storage.set(window.Storage.keys.MONTHLY_GOALS, goals);
      }
    } catch(e) {}
  }

  // ========== 選択したタスクを追加（weeklyTasksへ） ==========
  function addSelectedTasks() {
    var checkboxes = document.querySelectorAll('#gaiTasks input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
      alert('追加するタスクを選択してください');
      return;
    }

    // ★ 常にlocalStorageから最新データを読む（window.monthlyGoalsを信用しない）
    var goals = _loadGoalsFromStorage();

    // 紐づく目標を見つける
    var goal = null;
    if (_state.goalId) {
      goal = goals.find(function(g) { return g && g.id === _state.goalId; });
    }

    var todayDate = _toDateStr(new Date());

    var added = 0;

    if (goal) {
      // weeklyTasks に追加（日付ベース）
      if (!goal.weeklyTasks) goal.weeklyTasks = [];

      // data-week ごとにタスクをグルーピングして日付を分散
      var tasksByWeek = {};
      checkboxes.forEach(function(cb) {
        var weekAttr = cb.getAttribute('data-week');
        var weekOffset = weekAttr ? (parseInt(weekAttr) - 1) : 0;
        if (!tasksByWeek[weekOffset]) tasksByWeek[weekOffset] = [];
        tasksByWeek[weekOffset].push(cb);
      });

      Object.keys(tasksByWeek).forEach(function(offsetStr) {
        var offset = parseInt(offsetStr);
        var cbs = tasksByWeek[offset];
        // この週のタスク群に日付を均等分散
        var dates = distributeDates(cbs.length, offset);

        cbs.forEach(function(cb, idx) {
          var label = cb.closest('.gai-task-item');
          var textEl = label ? label.querySelector('.gai-task-text') : null;
          var text = textEl ? textEl.textContent.trim() : '';
          if (!text) return;

          var taskDate = dates[idx] || todayDate;

          goal.weeklyTasks.push({
            id: Date.now() + added,
            text: text,
            date: taskDate,
            done: false
          });
          added++;
        });
      });
    } else {
      // フォールバック: 目標が見つからない場合は新規目標として追加
      var category = _state.category || 'その他';
      var nowFb = new Date();
      var monthFb = window.selectedGoalsMonth || window.goalsCurrentMonth ||
        (nowFb.getFullYear() + '-' + String(nowFb.getMonth()+1).padStart(2,'0'));

      checkboxes.forEach(function(cb) {
        var label = cb.closest('.gai-task-item');
        var textEl = label ? label.querySelector('.gai-task-text') : null;
        var text = textEl ? textEl.textContent.trim() : '';
        if (!text) return;

        goals.unshift({
          id: Date.now() + added,
          text: text,
          category: category,
          createdAt: nowFb.toISOString(),
          month: monthFb,
          completed: false,
          weeklyTasks: []
        });
        added++;
      });
    }

    // ★ localStorageに確実に保存
    if (added > 0) {
      _saveGoalsToStorage(goals);
    }

    if (typeof window.renderGoalsAll === 'function') window.renderGoalsAll();
    else if (typeof window.renderGoals === 'function') window.renderGoals();

    // 表示メッセージ
    if (typeof window.showStatus === 'function') {
      var hasMultiPhase = false;
      checkboxes.forEach(function(cb) {
        var w = cb.getAttribute('data-week');
        if (w && parseInt(w) > 1) hasMultiPhase = true;
      });
      var msg = hasMultiPhase
        ? '✅ ' + added + '個のタスクを今月の計画に追加しました'
        : '✅ ' + added + '個のタスクを今週のやることに追加しました';
      window.showStatus('goalStatus', msg);
    }

    // 使用回数カウントはチャット開始時に移動済み（startGoalAIChat内）

    closeChat();
  }

  // ========== モーダル操作 ==========
  function closeChat() {
    var modal = document.getElementById('goalAIChatModal');
    if (modal) {
      modal.classList.remove('gai-open');
      // タスク選択のアクションボタンをクリーンアップ
      var sheet = modal.querySelector('.gai-sheet');
      if (sheet) {
        var actions = sheet.querySelector('.gai-task-actions');
        if (actions) actions.remove();
        var more = sheet.querySelector('.gai-more-btn');
        if (more) more.remove();
      }
    }
    // キャンセル時：タスクが0件の空目標を削除
    if (_state.goalId) {
      var goals = _loadGoalsFromStorage();
      var idx = goals.findIndex(function(g) { return g && g.id === _state.goalId; });
      if (idx !== -1 && (!goals[idx].weeklyTasks || goals[idx].weeklyTasks.length === 0)) {
        goals.splice(idx, 1);
        _saveGoalsToStorage(goals);
        if (typeof window.renderGoalsV2 === 'function') window.renderGoalsV2();
      }
      _state.goalId = null;
    }
  }

  // ========== ユーティリティ ==========
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== チャット音声入力 ==========
  var _SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var _voiceRec = null;
  var _voiceListening = false;
  var _voiceShouldRestart = false;
  var _voiceFinalText = '';
  var _isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  function toggleVoice() {
    if (_voiceListening) {
      stopVoice();
    } else {
      startVoice();
    }
  }

  function startVoice() {
    if (!_SR) { alert('お使いのブラウザは音声入力に対応していません'); return; }
    var input = document.getElementById('gaiInput');
    var btn = document.getElementById('gaiVoice');
    if (!input || !btn) return;

    _voiceRec = new _SR();
    _voiceRec.lang = 'ja-JP';
    _voiceRec.continuous = !_isMobile;
    _voiceRec.interimResults = true;
    _voiceRec.maxAlternatives = 1;

    _voiceListening = true;
    _voiceShouldRestart = true;
    _voiceFinalText = '';
    var originalText = input.value;

    btn.classList.add('listening');
    btn.textContent = '⏹️';

    _voiceRec.onresult = function(e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          _voiceFinalText += transcript;
        } else {
          interim = transcript;
        }
      }
      input.value = originalText + _voiceFinalText + interim;
    };

    _voiceRec.onerror = function(e) {
      if (e.error === 'no-speech' || e.error === 'network') return;
      stopVoice();
    };

    _voiceRec.onend = function() {
      if (_voiceListening && _voiceShouldRestart) {
        setTimeout(function() {
          if (_voiceListening && _voiceShouldRestart) {
            try { _voiceRec.start(); } catch(e) {}
          }
        }, _isMobile ? 1100 : 500);
      } else {
        cleanupVoice();
      }
    };

    try { _voiceRec.start(); } catch(e) { cleanupVoice(); }
  }

  function stopVoice() {
    _voiceShouldRestart = false;
    _voiceListening = false;
    if (_voiceRec) { try { _voiceRec.stop(); } catch(e) {} }
    cleanupVoice();
  }

  function cleanupVoice() {
    _voiceListening = false;
    _voiceShouldRestart = false;
    var btn = document.getElementById('gaiVoice');
    if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
    var input = document.getElementById('gaiInput');
    if (input && _voiceFinalText) {
      // 最終テキストのみ確定
      var current = input.value;
      // interimが含まれてる可能性があるので、originalText + finalTextに確定
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    _voiceRec = null;
    _voiceFinalText = '';
  }

  // 音声ボタンのクリックイベント
  setTimeout(function() {
    var voiceBtn = document.getElementById('gaiVoice');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', toggleVoice);
    }
  }, 250);

  // チャットモーダルが閉じられたら音声も停止
  var _origClose = closeChat;
  closeChat = function() {
    if (_voiceListening) stopVoice();
    _origClose();
  };
  window._closeGoalAIChat = closeChat;

  // ========== 「もっと話す」で会話を続ける ==========
  var _continueCount = 0;
  // キャラ別の「もっと話す」メッセージ
  var _continueMsgs = {
    harsh: [
      'ふん、まだ情報が足りないか。いいだろう、もっと詳しく話せ。',
      'まだ決められないのか？いい、もう少し聞いてやる。具体的に話せ。',
      'よし、もう少し深掘りするぞ。曖昧なままじゃ計画は立てられん。'
    ],
    normal: [
      'おっけー！もうちょい話そうか。気になることとか何でも聞いてよ！',
      'りょーかい！じゃあもう少し詳しく聞かせて。なんでも言ってくれていいよ！',
      'いいね、もうちょい詰めていこう！何か気になることある？'
    ],
    gentle: [
      'うん、もう少しお話ししようね。気になることがあったら何でも聞いてね😊',
      'わかった、ゆっくり考えていこうね。何でも話してくれて大丈夫だよ😊',
      'もちろん、焦らなくていいからね。もう少し一緒に考えていこう😊'
    ]
  };
  function continueChat() {
    _continueCount++;
    if (_continueCount > 3) {
      var _limitMsgs = {
        harsh: 'これ以上話しても堂々巡りだ。この内容でタスクを決めろ。',
        normal: 'おーし、だいぶ話したね！この内容でタスク決めちゃおう！',
        gentle: 'たくさん話せてよかったね！この内容でタスクを決めていこう😊'
      };
      addMessage('ai', _limitMsgs[_state.tone] || _limitMsgs.normal);
      return;
    }
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');
    if (tasksEl) { tasksEl.innerHTML = ''; tasksEl.style.display = 'none'; }
    if (inputArea) inputArea.style.display = 'flex';
    // タスク選択のアクションボタンもクリーンアップ
    var sheet = document.querySelector('#goalAIChatModal .gai-sheet');
    if (sheet) {
      var oldActions = sheet.querySelector('.gai-task-actions');
      if (oldActions) oldActions.remove();
      var oldMore = sheet.querySelector('.gai-more-btn');
      if (oldMore) oldMore.remove();
    }
    var input = document.getElementById('gaiInput');
    if (input) input.focus();
    // turnCountを1にリセット（0だと初回ヒアリング用プロンプトが使われてしまう）
    _state.turnCount = 1;
    _state.maxTurns = 5;
    // キャラの口調に合ったメッセージを表示
    var msgs = _continueMsgs[_state.tone] || _continueMsgs.normal;
    var msgIdx = Math.min(_continueCount - 1, msgs.length - 1);
    addMessage('ai', msgs[msgIdx]);
  }

  // ========== 直接AIチャットを開く（目標タブから直接） ==========
  function openGoalAIDirect() {
    // プラン制限チェック
    if (window.DaycePlan) {
      var limit = window.DaycePlan.checkLimit('goalCoach');
      if (!limit.allowed) {
        window.DaycePlan.showUpgradeModal(limit);
        return;
      }
    }

    // 全画面ポップアップ: キャラ選択 + 目標入力を表示
    var overlay = document.createElement('div');
    overlay.id = 'goalAISetupOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99998;display:flex;flex-direction:column;overflow-y:auto;';

    var toneData = [
      {id:'harsh', img:'drill_instructor.png', name:'マネージャー', desc:'厳しめに目標を管理', color:'#e74c3c'},
      {id:'normal', img:'takumi_senpai.png', name:'タクヤ先輩', desc:'フランクに相談', color:'#4a90e2'},
      {id:'gentle', img:'hana_san.png', name:'ハナさん', desc:'やさしくサポート', color:'#27ae60'}
    ];

    var html = '<div style="max-width:480px;width:100%;margin:0 auto;padding:20px 16px;padding-top:max(env(safe-area-inset-top,20px),20px);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">';
    html += '<h2 style="font-size:20px;font-weight:700;margin:0;">🤖 AIと目標設定</h2>';
    html += '<button onclick="document.getElementById(\'goalAISetupOverlay\').remove()" style="font-size:24px;background:none;border:none;color:#999;cursor:pointer;padding:4px 8px;">&times;</button>';
    html += '</div>';

    // 説明
    html += '<p style="color:#666;font-size:14px;margin-bottom:20px;line-height:1.6;">AIキャラクターとチャットしながら、あなたに合った目標と行動計画を一緒に作ります。</p>';

    // 目標入力
    html += '<div style="margin-bottom:20px;">';
    html += '<label style="font-size:14px;font-weight:600;color:#333;display:block;margin-bottom:8px;">💡 達成したいことを入力</label>';
    html += '<input id="gaiDirectGoalInput" type="text" placeholder="例: 3ヶ月で5kg痩せたい" style="width:100%;padding:14px;border:1.5px solid #d1d5db;border-radius:12px;font-size:16px;box-sizing:border-box;outline:none;" />';
    html += '</div>';

    // カテゴリ
    html += '<div style="margin-bottom:24px;">';
    html += '<label style="font-size:14px;font-weight:600;color:#333;display:block;margin-bottom:8px;">📂 カテゴリ</label>';
    html += '<select id="gaiDirectCategory" style="width:100%;padding:12px;border:1.5px solid #d1d5db;border-radius:12px;font-size:15px;background:#fff;box-sizing:border-box;">';
    // 行動カテゴリから動的生成
    var aiCats = [];
    try { aiCats = JSON.parse(localStorage.getItem('activityCategories') || '[]'); } catch(e){}
    if (aiCats.length > 0) {
      aiCats.forEach(function(c){ html += '<option value="'+c.name+'">'+c.emoji+' '+c.name+'</option>'; });
    } else {
      html += '<option value="仕事">💼 仕事</option><option value="勉強">📚 勉強</option><option value="運動">🏃 運動</option>';
      html += '<option value="その他">📝 その他</option>';
    }
    html += '</select></div>';

    // キャラクター選択
    html += '<label style="font-size:14px;font-weight:600;color:#333;display:block;margin-bottom:12px;">🤖 相談するキャラクターを選択</label>';
    html += '<div style="display:flex;gap:10px;margin-bottom:28px;">';
    toneData.forEach(function(td) {
      var isDefault = td.id === 'normal';
      html += '<button type="button" onclick="document.querySelectorAll(\'#goalAISetupOverlay .gai-direct-char\').forEach(function(b){b.style.borderColor=\'#e0e0e0\';b.style.background=\'#fff\';});this.style.borderColor=\'' + td.color + '\';this.style.background=\'#f8f9fa\';this.setAttribute(\'data-selected\',\'true\');document.querySelectorAll(\'#goalAISetupOverlay .gai-direct-char\').forEach(function(b){if(b!==event.currentTarget)b.removeAttribute(\'data-selected\');});" class="gai-direct-char" data-tone="' + td.id + '"' + (isDefault ? ' data-selected="true"' : '') + ' style="flex:1;padding:14px 8px;border:2px solid ' + (isDefault ? td.color : '#e0e0e0') + ';border-radius:14px;background:' + (isDefault ? '#f8f9fa' : '#fff') + ';cursor:pointer;text-align:center;">';
      html += '<img src="' + td.img + '" alt="' + td.name + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 8px;">';
      html += '<div style="font-size:13px;font-weight:700;color:#333;">' + td.name + '</div>';
      html += '<div style="font-size:11px;color:#888;margin-top:2px;">' + td.desc + '</div>';
      html += '</button>';
    });
    html += '</div>';

    // 開始ボタン
    html += '<button onclick="window._startGoalAIDirect()" style="width:100%;padding:16px;background:linear-gradient(135deg,#2196F3,#1565C0);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(33,150,243,0.3);">🚀 チャットで目標を設定する</button>';
    html += '</div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // 入力にフォーカス
    setTimeout(function() {
      var inp = document.getElementById('gaiDirectGoalInput');
      if (inp) inp.focus();
    }, 200);
  }

  // AIチャット直接開始（セットアップ画面から）
  async function startGoalAIDirect() {
    var goalInput = document.getElementById('gaiDirectGoalInput');
    var categorySelect = document.getElementById('gaiDirectCategory');
    var text = goalInput ? goalInput.value.trim() : '';
    var category = categorySelect ? categorySelect.value : 'その他';

    if (!text) {
      goalInput.style.borderColor = '#e74c3c';
      goalInput.setAttribute('placeholder', '⚠️ 目標を入力してください');
      goalInput.focus();
      return;
    }

    // 選択されたキャラクターを取得
    var selectedChar = document.querySelector('#goalAISetupOverlay .gai-direct-char[data-selected="true"]');
    var tone = selectedChar ? selectedChar.getAttribute('data-tone') : 'normal';

    // キャラクター制限チェック
    if (window.DaycePlan) {
      var charCheck = window.DaycePlan.checkCharacter(tone);
      if (!charCheck.allowed) {
        window.DaycePlan.showUpgradeModal({ type: 'goalCoach', plan: window.DaycePlan.getPlan(), current: 0, limit: 0, reason: charCheck.reason });
        return;
      }
    }

    // セットアップ画面を閉じる
    var setupOverlay = document.getElementById('goalAISetupOverlay');
    if (setupOverlay) setupOverlay.remove();

    // 状態リセット＆チャット開始（startGoalAIChatのロジックを流用）
    _state.goalText = text;
    _state.category = category;
    _state.goalId = null;
    _state.chatHistory = [];
    _state.turnCount = 0;
    _state.maxTurns = 5;
    _state.tone = tone;
    _state.isWaiting = false;
    _continueCount = 0;

    // 使用回数カウント
    if (window.DaycePlan) { window.DaycePlan.incrementUsage('goalCoach'); window.DaycePlan.renderPlanBadges(); }

    // 目標を先に追加
    var goalId = Date.now();
    var now = new Date();
    var month = window.selectedGoalsMonth || window.goalsCurrentMonth ||
      (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0'));
    var newGoal = {
      id: goalId,
      text: text,
      category: category,
      createdAt: now.toISOString(),
      month: month,
      completed: false,
      weeklyTasks: []
    };
    var existingGoals = _loadGoalsFromStorage();
    existingGoals.unshift(newGoal);
    _saveGoalsToStorage(existingGoals);
    _state.goalId = goalId;

    // チャットモーダルを開く
    var modal = document.getElementById('goalAIChatModal');
    var messagesEl = document.getElementById('gaiMessages');
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');

    if (messagesEl) messagesEl.innerHTML = '';
    if (tasksEl) { tasksEl.innerHTML = ''; tasksEl.style.display = 'none'; }
    if (inputArea) inputArea.style.display = 'flex';
    if (modal) { modal.style.display = ''; modal.classList.add('gai-open'); }

    // キャラクター選択ボタンを更新
    var charBtns = modal.querySelectorAll('.gai-char-btn');
    charBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tone') === tone);
    });

    var charNames = { harsh: 'マネージャー', normal: 'タクヤ先輩', gentle: 'ハナさん' };
    var charName = charNames[tone] || 'タクヤ先輩';

    addMessage('system', charName + 'に目標設定の相談をする');
    addMessage('user', '「' + text + '」を達成したい（' + category + '）');
    _state.chatHistory.push({ role: 'user', text: text + '（カテゴリ: ' + category + '）' });

    await sendToAI();
  }

  // ========== グローバル公開 ==========
  window._closeGoalAIChat = closeChat;
  window._gaiSendMessage = gaiSendMessage;
  window._gaiAddTasks = addSelectedTasks;
  window._gaiSelectChar = selectChar;
  window._gaiContinueChat = continueChat;
  window._openGoalAIDirect = openGoalAIDirect;
  window._startGoalAIDirect = startGoalAIDirect;

  // ========== 初期化 ==========
  function init() {
    injectAIButton();
    var observer = new MutationObserver(function() { injectAIButton(); });
    var goalModal = document.getElementById('goalAddModal');
    if (goalModal) {
      observer.observe(goalModal, { attributes: true, attributeFilter: ['style'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();
