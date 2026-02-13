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
    '  border: 2px dashed #7c3aed; border-radius: 8px; background: #faf5ff;',
    '  color: #7c3aed; font-size: 14px; font-weight: 600; cursor: pointer;',
    '  transition: background .2s, border-color .2s;',
    '}',
    '.goal-ai-btn:hover { background: #f3e8ff; border-color: #6d28d9; }',
    '.goal-ai-btn:disabled { opacity: .5; cursor: not-allowed; }',
    '.goal-ai-btn .premium-tag {',
    '  font-size: 11px; background: #7c3aed; color: #fff;',
    '  padding: 1px 6px; border-radius: 4px; margin-left: 6px;',
    '}',

    /* ===== オーバーレイ（背景） ===== */
    '#goalAIChatModal {',
    '  display:none; position:fixed; inset:0; background:rgba(0,0,0,0.45);',
    '  z-index:9999; align-items:flex-end; justify-content:center;',
    '}',
    '#goalAIChatModal.gai-open { display:flex !important; }',

    /* ===== ボトムシート本体 ===== */
    '#goalAIChatModal .gai-sheet {',
    '  width:100%; max-width:480px; max-height:94vh;',
    '  background:#fff; border-radius:20px 20px 0 0;',
    '  box-shadow:0 -4px 24px rgba(0,0,0,0.18);',
    '  display:flex; flex-direction:column; overflow:hidden;',
    '  padding:0;',
    '}',

    /* ドラッグハンドル風 */
    '.gai-handle { width:36px; height:4px; background:#d1d5db; border-radius:2px; margin:10px auto 0; }',

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
    '.gai-char-btn:hover { border-color:#c4b5fd; background:#faf5ff; }',
    '.gai-char-btn.active { border-color:#7c3aed; background:#f5f0ff; box-shadow:0 0 0 2px #7c3aed; }',
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
    '.gai-msg-user { background:#7c3aed; color:#fff; border-bottom-right-radius:4px; }',
    '.gai-msg-loading { background:#f3f4f6; color:#999; border-bottom-left-radius:4px; }',

    /* システムメッセージ */
    '.gai-msg-system {',
    '  background:#f0ebff; color:#6d28d9; font-size:13px; text-align:center;',
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
    '.gai-task-item:hover { border-color:#7c3aed; background:#faf5ff; }',
    '.gai-task-item input[type="checkbox"] { margin-top:3px; width:20px; height:20px; accent-color:#7c3aed; flex-shrink:0; }',
    '.gai-task-text { font-size:14px; line-height:1.5; color:#333; }',
    '.gai-task-actions { display:flex; gap:8px; padding:8px 16px 6px; flex-shrink:0; }',
    '.gai-task-actions button { flex:1; padding:12px; border:none; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; }',
    '.gai-add-btn { background:#7c3aed; color:#fff; }',
    '.gai-add-btn:hover { background:#6d28d9; }',
    '.gai-cancel-btn { background:#f0f0f0; color:#666; }',
    '.gai-cancel-btn:hover { background:#e0e0e0; }',

    /* 「もっと話す」ボタン */
    '.gai-more-btn {',
    '  display:block; width:calc(100% - 32px); margin:4px 16px 8px; padding:10px;',
    '  border:1.5px dashed #7c3aed; border-radius:10px; background:#faf5ff;',
    '  color:#7c3aed; font-size:13px; font-weight:600; cursor:pointer;',
    '  transition:background .2s; flex-shrink:0;',
    '}',
    '.gai-more-btn:hover { background:#f3e8ff; }',

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
    '.gai-input:focus { border-color:#7c3aed; }',
    '.gai-voice {',
    '  padding:10px; background:#fff; border:1.5px solid #d1d5db; border-radius:10px;',
    '  font-size:18px; cursor:pointer; transition:all .2s; line-height:1; flex-shrink:0;',
    '}',
    '.gai-voice:hover { background:#f5f5f5; border-color:#7c3aed; }',
    '.gai-voice.listening { background:#ef4444; border-color:#ef4444; animation:gaiVoicePulse 1.5s infinite; }',
    '@keyframes gaiVoicePulse { 0%,100%{opacity:1;} 50%{opacity:.7;} }',
    '.gai-send {',
    '  padding:10px 16px; background:#7c3aed; color:#fff; border:none;',
    '  border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; white-space:nowrap;',
    '}',
    '.gai-send:hover { background:#6d28d9; }',
    '.gai-send:disabled { opacity:.5; cursor:not-allowed; }',

    /* スピナー */
    '.gai-dots::after { content:""; animation:gaiDots 1.2s steps(4,end) infinite; }',
    '@keyframes gaiDots { 0%{content:"";} 25%{content:".";} 50%{content:"..";} 75%{content:"...";} }',

    /* safe-area対応 */
    '.gai-safe-bottom { padding-bottom:env(safe-area-inset-bottom, 8px); }',

    /* 週別計画UI */
    '.gai-week-header {',
    '  font-size:13px; font-weight:700; color:#7c3aed; padding:10px 0 4px;',
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
    startBtn.style.background = '#7c3aed';
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
    aiBtn.innerHTML = '🤖 AIと目標設定 <span class="premium-tag">👑 有料</span>';
    aiBtn.onclick = function() {
      if (!isPremium()) {
        alert('🔒 有料会員限定\n\n「AIと目標設定」は有料会員向けの機能です。\n\n有料会員になると:\n• AIが対話で目標を具体化\n• CSV データダウンロード\n• その他プレミアム機能');
        return;
      }
      // キャラ選択 + 開始ボタンを表示
      charWrap.style.display = 'flex';
      startBtn.style.display = 'block';
      aiBtn.style.display = 'none';
    };

    addBtn.parentNode.insertBefore(aiBtn, addBtn.nextSibling);
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
    var goalInput = document.getElementById('goalInput');
    var categorySelect = document.getElementById('goalCategory');
    var text = goalInput ? goalInput.value.trim() : '';
    var category = categorySelect ? categorySelect.value : 'その他';

    if (!text) {
      alert('まず目標を入力してください');
      return;
    }

    // 状態リセット（toneは目標追加モーダルで選択済み）
    _state.goalText = text;
    _state.category = category;
    _state.goalId = null;
    _state.chatHistory = [];
    _state.turnCount = 0;
    _state.isWaiting = false;
    // キャラクター選択UIの状態を反映
    var activeCharBtn = document.querySelector('.gai-char-btn.active');
    if (activeCharBtn) _state.tone = activeCharBtn.getAttribute('data-tone') || 'normal';

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
      // AIメッセージ（アイコン＋吹き出し）
      var row = document.createElement('div');
      row.className = 'gai-msg-row';
      var img = document.createElement('img');
      img.className = 'gai-msg-avatar';
      img.src = _getCharImg();
      img.alt = '';
      var bubble = document.createElement('div');
      bubble.className = 'gai-msg gai-msg-ai';
      bubble.textContent = text;
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
      var charPrompt = (typeof window.getCharacterPrompt === 'function') ? window.getCharacterPrompt(tone) : '';

      var prompt = buildPrompt(charPrompt);

      var BACKEND_URL = window.BACKEND_URL || window.__BACKEND_URL__ || 'https://lifelog-ai.little-limit-621c.workers.dev';
      var res = await fetch(BACKEND_URL + '/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt, tone: tone, type: 'consult' })
      });

      if (!res.ok) throw new Error('API error: ' + res.status);

      var data = await res.json();
      var responseText = data.comment || data.feedback || data.analysis || data.result || data.response || '';
      if (!responseText && typeof data === 'string') responseText = data;
      if (!responseText) throw new Error('レスポンスが空でした');

      removeLoadingMessage();

      _state.turnCount++;
      _state.chatHistory.push({ role: 'ai', text: responseText });

      // タスク提案が含まれているかチェック（最低2回は会話してから提案を判定）
      if (_state.turnCount >= 2) {
        // まず4週間計画パーサーを試す
        var weeklyPlan = parseWeeklyPlan(responseText);
        var weeklyPlanTotal = Object.keys(weeklyPlan).reduce(function(sum, k) {
          return sum + weeklyPlan[k].length;
        }, 0);

        if (weeklyPlanTotal >= 3) {
          // 4週間計画あり → チャットに表示 + 週別タスク選択UI
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
              addMessage('ai', 'それでは、4週間の計画を提案しますね...');
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

      var prompt = '【指示】以下の会話を踏まえて、4週間分の行動計画を提案してください。\n' +
        '必ず以下のフォーマットで出力してください：\n' +
        '【1週目】\n1. タスク\n【2週目】\n1. タスク\n【3週目】\n1. タスク\n【4週目】\n1. タスク\n' +
        '- 各週2〜3個、全体で8〜12個\n' +
        '- 1週目は取り組みやすく、後半はステップアップ\n' +
        '- 「週○回〜する」「毎日〜する」のような頻度付き行動\n' +
        '- 準備やTipsではなく行動そのもの\n\n' +
        '【会話履歴】\n' + historyText;

      var BACKEND_URL = window.BACKEND_URL || window.__BACKEND_URL__ || 'https://lifelog-ai.little-limit-621c.workers.dev';
      var res = await fetch(BACKEND_URL + '/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt, tone: tone, type: 'consult' })
      });

      if (!res.ok) throw new Error('API error: ' + res.status);

      var data = await res.json();
      var responseText = data.comment || data.feedback || data.analysis || data.result || data.response || '';
      if (!responseText && typeof data === 'string') responseText = data;

      removeLoadingMessage();

      if (responseText) {
        _state.chatHistory.push({ role: 'ai', text: responseText });
        addMessage('ai', responseText);
        // まず4週間計画パーサーを試す
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
  function buildPrompt(charPrompt) {
    var historyText = _state.chatHistory.map(function(m) {
      return (m.role === 'user' ? 'ユーザー' : 'AI') + ': ' + m.text;
    }).join('\n');

    // キャラクター設定を先頭に配置（全フェーズ共通）
    var noAnalysis = '※絶対に【よかったこと】【改善したいこと】【気づいたこと】【もやっとしたこと】【明日のMUST】などの分析フォーマットは使わないでください。普通の会話として返答してください。\n\n';
    var charHeader = noAnalysis + (charPrompt ? '【キャラクター設定（この口調で話してください）】\n' + charPrompt + '\n\n' : '');

    // 過去データのコンテキスト（初回のみ、トークン節約）
    var userContext = '';
    if (_state.turnCount === 0 && typeof window.buildContextSummary === 'function') {
      userContext = window.buildContextSummary('goals', { goalCategory: _state.category });
    }

    var weeklyPlanRule =
      '【タスク提案のルール】\n' +
      '- 4週間分の段階的な計画を提案してください\n' +
      '- 必ず以下のフォーマットで出力してください：\n' +
      '【1週目】\n' +
      '1. タスクA\n' +
      '2. タスクB\n' +
      '【2週目】\n' +
      '1. タスクC\n' +
      '2. タスクD\n' +
      '【3週目】\n' +
      '1. タスクE\n' +
      '【4週目】\n' +
      '1. タスクF\n' +
      '- 各週2〜3個、全体で8〜12個のタスクにしてください\n' +
      '- 1週目は取り組みやすいタスク、後半の週はステップアップした内容にしてください\n' +
      '- 「週○回〜する」「毎日〜する」のような頻度・回数付きの行動にしてください\n' +
      '- 準備やTips（「バッグを用意する」等）ではなく、目標達成に直結する行動そのものにしてください\n' +
      '- 例: ダイエット → 1週目「週2回ジムに行く」→ 2週目「週3回ジムに行く」→ 3週目「週3回ジム+自宅筋トレ1回」→ 4週目「振り返り+新たな目標設定」\n';

    // 初回: ヒアリング質問
    if (_state.turnCount === 0) {
      return charHeader + userContext +
        '【指示】あなたは目標設定のコーチです。\n' +
        'ユーザーが「' + _state.goalText + '」（カテゴリ: ' + _state.category + '）という目標を立てようとしています。\n' +
        'この目標を4週間の計画に落とし込むために、1つだけ短い質問をしてください。\n' +
        '- ユーザーの過去データがあれば、それを踏まえた質問をしてください\n' +
        '- 具体的な数値、頻度（週何回？毎日？）、4週間後にどうなりたいかを聞く質問が望ましい\n' +
        '- 質問は1〜2文で簡潔に\n' +
        '- キャラクター設定の口調に従って会話してください\n' +
        '- タスクリストや分析結果は出力しないでください\n' +
        '- 普通の会話として質問だけ返してください\n';
    }

    // 2-3往復目: 質問を続ける（最低2回は質問する）
    if (_state.turnCount < 2) {
      return charHeader +
        '【指示】あなたは目標設定のコーチです。\n' +
        '以下の会話を踏まえて、もう1つだけ追加の短い質問をしてください。\n' +
        '- 「最初の1週間はどれくらいやれそう？」「4週間後にはどうなっていたい？」など、4週間の計画を作るための質問をしてください\n' +
        '- 質問は1〜2文で簡潔に\n' +
        '- キャラクター設定の口調に従ってください\n' +
        '- タスクリストはまだ出力しないでください\n\n' +
        '【会話履歴】\n' + historyText;
    }

    // それ以降: 質問 or タスク提案
    if (_state.turnCount < _state.maxTurns - 1) {
      return charHeader +
        '【指示】あなたは目標設定のコーチです。\n' +
        '以下の会話を踏まえて、次のどちらかを行ってください：\n' +
        '- まだ情報が足りなければ、1つだけ追加の短い質問をしてください\n' +
        '- 十分な情報があれば、4週間分の計画を提案してください\n' +
        weeklyPlanRule +
        '- キャラクター設定の口調に従ってください\n\n' +
        '【会話履歴】\n' + historyText;
    }

    // 最終回: 強制タスク提案
    return charHeader +
      '【指示】以下の会話を踏まえて、4週間分の行動計画を提案してください。\n' +
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

  // ========== 4週間計画パーサー ==========
  function parseWeeklyPlan(text) {
    // 戻り値: { 1: ['task1', 'task2'], 2: ['task3'], 3: [...], 4: [...] }
    var result = {};
    var currentWeek = 0;
    var lines = text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      // 週ヘッダー検出: 【1週目】, [1週目], 1週目:, 第1週, Week 1 など
      var weekMatch = line.match(/[【\[]*\s*第?\s*(\d)\s*週目?\s*[】\]:]*/);
      if (weekMatch) {
        currentWeek = parseInt(weekMatch[1]);
        if (!result[currentWeek]) result[currentWeek] = [];
        continue;
      }

      if (currentWeek === 0) continue;

      // 番号付き・箇条書きリストをタスクとして認識
      var isNumbered = /^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]/.test(line);
      var isBulleted = /^[-・●▪▸]\s/.test(line);
      if (!isNumbered && !isBulleted) continue;

      var cleaned = line
        .replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]\s*/, '')
        .replace(/^[-・●▪▸]\s*/, '')
        .trim();
      if (cleaned.length > 2 && cleaned.length < 100) {
        result[currentWeek].push(cleaned);
      }
    }
    return result;
  }

  // ========== 週キーのオフセット計算 ==========
  function getWeekKeyOffset(baseWeekKey, offset) {
    if (offset === 0) return baseWeekKey;
    var parts = baseWeekKey.match(/(\d{4})-W(\d{2})/);
    if (!parts) return baseWeekKey;
    var year = parseInt(parts[1]);
    var week = parseInt(parts[2]);

    // 基準週の月曜日を計算
    var jan4 = new Date(year, 0, 4);
    var jan4Day = (jan4.getDay() + 6) % 7; // Monday=0
    var weekStart = new Date(jan4.getTime());
    weekStart.setDate(jan4.getDate() - jan4Day + (week - 1) * 7);

    // オフセット週を足す
    weekStart.setDate(weekStart.getDate() + offset * 7);

    // getWeekKeyで正しいキーを取得
    if (typeof window.getWeekKey === 'function') {
      return window.getWeekKey(weekStart);
    }
    return baseWeekKey;
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

  // ========== 4週間計画 選択UI表示 ==========
  function showWeeklyPlanSelection(weeklyPlan) {
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');
    if (!tasksEl) return;
    if (inputArea) inputArea.style.display = 'none';

    var canContinue = _state.turnCount < _state.maxTurns;
    var weekLabels = { 1: '1週目（今週）', 2: '2週目', 3: '3週目', 4: '4週目' };
    var html = '';

    for (var week = 1; week <= 4; week++) {
      var tasks = weeklyPlan[week];
      if (!tasks || tasks.length === 0) continue;

      html += '<div class="gai-week-header">📅 ' + weekLabels[week] + '</div>';
      tasks.forEach(function(task, i) {
        html += '<label class="gai-task-item">' +
          '<input type="checkbox" checked data-week="' + week + '" data-task-index="' + i + '" />' +
          '<span class="gai-task-text">' + escapeHTML(task) + '</span>' +
          '</label>';
      });
    }

    tasksEl.innerHTML = html;
    tasksEl.style.display = 'block';

    var sheet = tasksEl.closest('.gai-sheet');
    if (sheet) {
      var oldActions = sheet.querySelector('.gai-task-actions');
      if (oldActions) oldActions.remove();
      var oldMore = sheet.querySelector('.gai-more-btn');
      if (oldMore) oldMore.remove();

      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'gai-task-actions';
      actionsDiv.innerHTML =
        '<button class="gai-add-btn" onclick="window._gaiAddTasks()">✅ 4週間の計画を追加</button>' +
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
    localStorage.setItem('monthlyGoals', JSON.stringify(goals));
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

    var weekKey = (typeof window.currentWeekKey !== 'undefined') ? window.currentWeekKey : '';
    if (!weekKey && typeof window.getWeekKey === 'function') {
      weekKey = window.getWeekKey(new Date());
    }

    var added = 0;

    if (goal) {
      // weeklyTasks に追加
      if (!goal.weeklyTasks) goal.weeklyTasks = [];

      checkboxes.forEach(function(cb) {
        var label = cb.closest('.gai-task-item');
        var textEl = label ? label.querySelector('.gai-task-text') : null;
        var text = textEl ? textEl.textContent.trim() : '';
        if (!text) return;

        // data-week属性で週キーを計算（1=今週, 2=来週, 3=再来週, 4=3週後）
        var weekAttr = cb.getAttribute('data-week');
        var weekOffset = weekAttr ? (parseInt(weekAttr) - 1) : 0;
        var taskWeekKey = weekOffset > 0 ? getWeekKeyOffset(weekKey, weekOffset) : weekKey;

        goal.weeklyTasks.push({
          id: Date.now() + added,
          text: text,
          week: taskWeekKey,
          done: false
        });
        added++;
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

    // 4週間計画かどうかで表示メッセージを変える
    var hasMultiWeek = false;
    checkboxes.forEach(function(cb) {
      var w = cb.getAttribute('data-week');
      if (w && parseInt(w) > 1) hasMultiWeek = true;
    });
    if (typeof window.showStatus === 'function') {
      var msg = hasMultiWeek
        ? '✅ ' + added + '個のタスクを4週間の計画に追加しました'
        : '✅ ' + added + '個のタスクを今週のやることに追加しました';
      window.showStatus('goalStatus', msg);
    }

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
  function continueChat() {
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');
    if (tasksEl) { tasksEl.innerHTML = ''; tasksEl.style.display = 'none'; }
    if (inputArea) inputArea.style.display = 'flex';
    var input = document.getElementById('gaiInput');
    if (input) input.focus();
    // 「もっと詳しく聞きたい」というメッセージを表示
    addMessage('ai', '了解！もう少し詳しく教えてください。何でも聞いてくださいね 😊');
  }

  // ========== グローバル公開 ==========
  window._closeGoalAIChat = closeChat;
  window._gaiSendMessage = gaiSendMessage;
  window._gaiAddTasks = addSelectedTasks;
  window._gaiSelectChar = selectChar;
  window._gaiContinueChat = continueChat;

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
