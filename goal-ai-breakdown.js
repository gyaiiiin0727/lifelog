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

    /* チャットモーダル */
    '#goalAIChatModal .modal-content {',
    '  max-width: 440px; padding: 20px; display: flex; flex-direction: column; max-height: 85vh;',
    '}',
    '.gai-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }',
    '.gai-header h2 { font-size: 17px; margin: 0; }',
    '.gai-close { font-size: 22px; cursor: pointer; color: #666; background: none; border: none; padding: 4px 8px; }',

    /* チャットエリア */
    '.gai-messages {',
    '  flex: 1; overflow-y: auto; padding: 8px 0; min-height: 120px; max-height: 45vh;',
    '}',
    '.gai-msg { margin: 8px 0; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.6; max-width: 85%; word-break: break-word; }',
    '.gai-msg-ai { background: #f3f4f6; color: #333; border-bottom-left-radius: 4px; margin-right: auto; }',
    '.gai-msg-user { background: #7c3aed; color: #fff; border-bottom-right-radius: 4px; margin-left: auto; }',
    '.gai-msg-loading { background: #f3f4f6; color: #999; margin-right: auto; border-bottom-left-radius: 4px; }',

    /* 入力エリア */
    '.gai-input-area { display: flex; gap: 8px; margin-top: 12px; align-items: flex-end; }',
    '.gai-input {',
    '  flex: 1; padding: 10px 12px; border: 1.5px solid #d1d5db; border-radius: 10px;',
    '  font-size: 14px; outline: none; resize: none; min-height: 40px; max-height: 80px;',
    '}',
    '.gai-input:focus { border-color: #7c3aed; }',
    '.gai-voice {',
    '  padding: 10px; background: #fff; border: 1.5px solid #d1d5db; border-radius: 10px;',
    '  font-size: 18px; cursor: pointer; transition: all .2s; line-height: 1; flex-shrink: 0;',
    '}',
    '.gai-voice:hover { background: #f5f5f5; border-color: #7c3aed; }',
    '.gai-voice.listening {',
    '  background: #ef4444; border-color: #ef4444; animation: gaiVoicePulse 1.5s infinite;',
    '}',
    '@keyframes gaiVoicePulse { 0%,100% { opacity:1; } 50% { opacity:.7; } }',
    '.gai-send {',
    '  padding: 10px 16px; background: #7c3aed; color: #fff; border: none;',
    '  border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;',
    '}',
    '.gai-send:hover { background: #6d28d9; }',
    '.gai-send:disabled { opacity: .5; cursor: not-allowed; }',

    /* タスク選択エリア */
    '.gai-tasks { margin-top: 12px; }',
    '.gai-task-item {',
    '  display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;',
    '  margin: 6px 0; background: #fff; border: 1px solid #e0e0e0;',
    '  border-radius: 8px; cursor: pointer; transition: border-color .2s, background .2s;',
    '}',
    '.gai-task-item:hover { border-color: #7c3aed; background: #faf5ff; }',
    '.gai-task-item input[type="checkbox"] { margin-top: 2px; width: 18px; height: 18px; accent-color: #7c3aed; flex-shrink: 0; }',
    '.gai-task-text { font-size: 14px; line-height: 1.5; color: #333; }',
    '.gai-task-actions { display: flex; gap: 8px; margin-top: 12px; }',
    '.gai-task-actions button { flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }',
    '.gai-add-btn { background: #7c3aed; color: #fff; }',
    '.gai-add-btn:hover { background: #6d28d9; }',
    '.gai-cancel-btn { background: #f0f0f0; color: #666; }',
    '.gai-cancel-btn:hover { background: #e0e0e0; }',

    /* スピナー */
    '.gai-dots::after { content: ""; animation: gaiDots 1.2s steps(4,end) infinite; }',
    '@keyframes gaiDots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "..."; } }'
  ].join('\n');
  document.head.appendChild(style);

  // ========== チャットモーダル HTML注入 ==========
  var chatModal = document.createElement('div');
  chatModal.className = 'modal';
  chatModal.id = 'goalAIChatModal';
  chatModal.innerHTML = [
    '<div class="modal-content">',
    '  <div class="gai-header">',
    '    <h2>🤖 AIと目標設定</h2>',
    '    <button class="gai-close" onclick="window._closeGoalAIChat()">&times;</button>',
    '  </div>',
    '  <div class="gai-messages" id="gaiMessages"></div>',
    '  <div class="gai-tasks" id="gaiTasks" style="display:none;"></div>',
    '  <div class="gai-input-area" id="gaiInputArea">',
    '    <input class="gai-input" id="gaiInput" type="text" placeholder="回答を入力..." />',
    '    <button class="gai-voice" id="gaiVoice" type="button" title="音声入力">🎤</button>',
    '    <button class="gai-send" id="gaiSend" onclick="window._gaiSendMessage()">送信</button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(chatModal);

  chatModal.addEventListener('click', function(e) {
    if (e.target === chatModal) closeChat();
  });

  // Enterキーで送信
  setTimeout(function() {
    var input = document.getElementById('gaiInput');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window._gaiSendMessage();
        }
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
    maxTurns: 3,
    isWaiting: false
  };

  // ========== 目標追加モーダルにボタン注入 ==========
  function injectAIButton() {
    var addBtn = document.querySelector('#goalAddModal .add-button');
    if (!addBtn) return;
    if (document.getElementById('goalAIBreakdownBtn')) return;

    var aiBtn = document.createElement('button');
    aiBtn.type = 'button';
    aiBtn.id = 'goalAIBreakdownBtn';
    aiBtn.className = 'goal-ai-btn';
    aiBtn.innerHTML = '🤖 AIと目標設定 <span class="premium-tag">👑 有料</span>';
    aiBtn.onclick = startGoalAIChat;

    addBtn.parentNode.insertBefore(aiBtn, addBtn.nextSibling);
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

    if (!isPremium()) {
      alert('🔒 有料会員限定\n\n「AIと目標設定」は有料会員向けの機能です。\n\n有料会員になると:\n• AIが対話で目標を具体化\n• CSV データダウンロード\n• その他プレミアム機能');
      return;
    }

    // 状態リセット
    _state.goalText = text;
    _state.category = category;
    _state.goalId = null;
    _state.chatHistory = [];
    _state.turnCount = 0;
    _state.isWaiting = false;

    // 目標を先に追加（weeklyTasksにタスクを入れるため）
    var goalId = Date.now();
    var month = window.selectedGoalsMonth || window.goalsCurrentMonth || '';
    var newGoal = {
      id: goalId,
      text: text,
      category: category,
      createdAt: new Date().toISOString(),
      month: month,
      completed: false,
      weeklyTasks: []
    };
    if (window.monthlyGoals && Array.isArray(window.monthlyGoals)) {
      window.monthlyGoals.unshift(newGoal);
      if (window.Storage && window.Storage.set && window.Storage.keys) {
        window.Storage.set(window.Storage.keys.MONTHLY_GOALS, window.monthlyGoals);
      }
    }
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
    if (modal) modal.style.display = 'block';

    // ユーザーの目標を表示
    addMessage('user', '「' + text + '」を達成したい（' + category + '）');
    _state.chatHistory.push({ role: 'user', text: text + '（カテゴリ: ' + category + '）' });

    // AIの最初の質問を取得
    await sendToAI();
  }

  // ========== メッセージ追加 ==========
  function addMessage(role, text) {
    var messagesEl = document.getElementById('gaiMessages');
    if (!messagesEl) return;

    var div = document.createElement('div');
    div.className = 'gai-msg gai-msg-' + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addLoadingMessage() {
    var messagesEl = document.getElementById('gaiMessages');
    if (!messagesEl) return;

    var div = document.createElement('div');
    div.className = 'gai-msg gai-msg-loading';
    div.id = 'gaiLoadingMsg';
    div.innerHTML = '考え中<span class="gai-dots"></span>';
    messagesEl.appendChild(div);
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

    if (input) input.value = '';

    addMessage('user', text);
    _state.chatHistory.push({ role: 'user', text: text });

    await sendToAI();
  }

  // ========== AI呼び出し ==========
  async function sendToAI() {
    _state.isWaiting = true;
    var sendBtn = document.getElementById('gaiSend');
    if (sendBtn) sendBtn.disabled = true;

    addLoadingMessage();

    try {
      var tone = window.aiConsultTone || localStorage.getItem('journalFeedbackTone') || 'normal';
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

      // タスク提案が含まれているかチェック
      var tasks = parseTasks(responseText);

      if (tasks.length >= 2) {
        // タスク提案あり → チャットに表示 + タスク選択UI
        addMessage('ai', responseText);
        showTaskSelection(tasks);
      } else {
        // まだ質問フェーズ
        addMessage('ai', responseText);

        // 最大往復に達したら次は強制タスク提案
        if (_state.turnCount >= _state.maxTurns) {
          // 入力を無効にして自動で最終提案を取得
          var inputArea = document.getElementById('gaiInputArea');
          if (inputArea) inputArea.style.display = 'none';
          addMessage('ai', 'それでは、タスクを提案しますね...');
          await sendFinalProposal();
        }
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
      var tone = window.aiConsultTone || localStorage.getItem('journalFeedbackTone') || 'normal';

      var historyText = _state.chatHistory.map(function(m) {
        return (m.role === 'user' ? 'ユーザー' : 'AI') + ': ' + m.text;
      }).join('\n');

      var prompt = '【指示】以下の会話を踏まえて、3〜5個の具体的で実行可能なタスクを番号付きリスト（1. 2. 3.）で提案してください。\n' +
        '各タスクは簡潔に1文で。タスクの一覧のみ出力してください。\n\n' +
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
        var tasks = parseTasks(responseText);
        if (tasks.length > 0) {
          showTaskSelection(tasks);
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

    // 初回: ヒアリング質問
    if (_state.turnCount === 0) {
      var p = '【指示】あなたは目標設定のコーチです。\n' +
        'ユーザーが「' + _state.goalText + '」（カテゴリ: ' + _state.category + '）という目標を立てようとしています。\n' +
        'この目標を具体的なタスクに落とし込むために、1つだけ短い質問をしてください。\n' +
        '- 具体的な数値や期限、頻度を聞く質問が望ましい\n' +
        '- 質問は1〜2文で簡潔に\n' +
        '- 質問のみ出力。挨拶や説明は不要\n';
      if (charPrompt) p += '\n【キャラクター】\n' + charPrompt + '\n';
      return p;
    }

    // 2往復目: 質問 or タスク提案
    if (_state.turnCount < _state.maxTurns - 1) {
      var p2 = '【指示】あなたは目標設定のコーチです。\n' +
        '以下の会話を踏まえて、次のどちらかを行ってください：\n' +
        '- まだ情報が足りなければ、1つだけ追加の短い質問をしてください\n' +
        '- 十分な情報があれば、3〜5個の具体的タスクを番号付きリスト（1. 2. 3.）で提案してください\n' +
        '- タスクは実行可能で簡潔に（各20文字以内が理想）\n' +
        '- 簡潔に回答してください\n\n' +
        '【会話履歴】\n' + historyText;
      if (charPrompt) p2 = '【キャラクター】\n' + charPrompt + '\n' + p2;
      return p2;
    }

    // 最終回: 強制タスク提案
    var p3 = '【指示】以下の会話を踏まえて、3〜5個の具体的で実行可能なタスクを番号付きリスト（1. 2. 3.）で提案してください。\n' +
      '各タスクは簡潔に1文で。タスクの一覧のみ出力してください。\n\n' +
      '【会話履歴】\n' + historyText;
    return p3;
  }

  // ========== タスクのパース ==========
  function parseTasks(text) {
    var lines = text.split('\n');
    var tasks = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var cleaned = line
        .replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]\s*/, '')
        .replace(/^[-・●▪▸]\s*/, '')
        .trim();
      if (cleaned.length > 0 && cleaned.length < 100 && cleaned !== line.trim().charAt(0)) {
        tasks.push(cleaned);
      }
    }
    if (tasks.length === 0) {
      tasks = lines
        .map(function(l) { return l.trim(); })
        .filter(function(l) { return l.length > 2 && l.length < 100; });
    }
    return tasks.slice(0, 8);
  }

  // ========== タスク選択UI表示 ==========
  function showTaskSelection(tasks) {
    var tasksEl = document.getElementById('gaiTasks');
    var inputArea = document.getElementById('gaiInputArea');
    if (!tasksEl) return;

    if (inputArea) inputArea.style.display = 'none';

    tasksEl.innerHTML = tasks.map(function(task, i) {
      return '<label class="gai-task-item">' +
        '<input type="checkbox" checked data-task-index="' + i + '" />' +
        '<span class="gai-task-text">' + escapeHTML(task) + '</span>' +
        '</label>';
    }).join('') +
    '<div class="gai-task-actions">' +
    '  <button class="gai-add-btn" onclick="window._gaiAddTasks()">✅ 選択したタスクを追加</button>' +
    '  <button class="gai-cancel-btn" onclick="window._closeGoalAIChat()">キャンセル</button>' +
    '</div>';

    tasksEl.style.display = 'block';
  }

  // ========== 選択したタスクを追加（weeklyTasksへ） ==========
  function addSelectedTasks() {
    var checkboxes = document.querySelectorAll('#gaiTasks input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
      alert('追加するタスクを選択してください');
      return;
    }

    // 紐づく目標を見つける
    var goal = null;
    if (_state.goalId && window.monthlyGoals) {
      goal = window.monthlyGoals.find(function(g) { return g.id === _state.goalId; });
    }

    var weekKey = (typeof window.currentWeekKey !== 'undefined') ? window.currentWeekKey : '';
    // weekKeyが取得できなければ計算
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

        goal.weeklyTasks.push({
          id: Date.now() + added,
          text: text,
          week: weekKey,
          done: false
        });
        added++;
      });
    } else {
      // フォールバック: 目標が見つからない場合は従来方式
      var category = _state.category || 'その他';
      var month = window.selectedGoalsMonth || window.goalsCurrentMonth || '';

      checkboxes.forEach(function(cb) {
        var label = cb.closest('.gai-task-item');
        var textEl = label ? label.querySelector('.gai-task-text') : null;
        var text = textEl ? textEl.textContent.trim() : '';
        if (!text) return;

        var newGoal = {
          id: Date.now() + added,
          text: text,
          category: category,
          createdAt: new Date().toISOString(),
          month: month,
          completed: false,
          weeklyTasks: []
        };
        if (window.monthlyGoals && Array.isArray(window.monthlyGoals)) {
          window.monthlyGoals.unshift(newGoal);
        }
        added++;
      });
    }

    if (added > 0 && window.Storage && window.Storage.set && window.Storage.keys) {
      window.Storage.set(window.Storage.keys.MONTHLY_GOALS, window.monthlyGoals);
    } else if (added > 0) {
      try { localStorage.setItem('monthlyGoals', JSON.stringify(window.monthlyGoals)); } catch(e) {}
    }

    if (typeof window.renderGoalsAll === 'function') window.renderGoalsAll();
    else if (typeof window.renderGoals === 'function') window.renderGoals();

    if (typeof window.showStatus === 'function') {
      window.showStatus('goalStatus', '✅ ' + added + '個のタスクを今週のやることに追加しました');
    }

    closeChat();
  }

  // ========== モーダル操作 ==========
  function closeChat() {
    var modal = document.getElementById('goalAIChatModal');
    if (modal) modal.style.display = 'none';
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

  // ========== グローバル公開 ==========
  window._closeGoalAIChat = closeChat;
  window._gaiSendMessage = gaiSendMessage;
  window._gaiAddTasks = addSelectedTasks;

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
