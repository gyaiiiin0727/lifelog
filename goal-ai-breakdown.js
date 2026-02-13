/**
 * goal-ai-breakdown.js
 * 目標AIタスク分解機能（有料会員向け）
 * 大雑把な目標をAIが具体的なタスクに分解して提案する
 */
(function() {
  'use strict';

  // ========== CSS注入 ==========
  var style = document.createElement('style');
  style.textContent = [
    '#goalAIResultModal .modal-content { max-width: 440px; }',

    '.goal-ai-btn {',
    '  display: block;',
    '  width: 100%;',
    '  margin-top: 8px;',
    '  padding: 12px;',
    '  border: 2px dashed #7c3aed;',
    '  border-radius: 8px;',
    '  background: #faf5ff;',
    '  color: #7c3aed;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: background .2s, border-color .2s;',
    '}',
    '.goal-ai-btn:hover { background: #f3e8ff; border-color: #6d28d9; }',
    '.goal-ai-btn:disabled { opacity: .5; cursor: not-allowed; }',
    '.goal-ai-btn .premium-tag {',
    '  font-size: 11px;',
    '  background: #7c3aed;',
    '  color: #fff;',
    '  padding: 1px 6px;',
    '  border-radius: 4px;',
    '  margin-left: 6px;',
    '}',

    '.goal-ai-loading {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 8px;',
    '  padding: 24px;',
    '  color: #666;',
    '  font-size: 14px;',
    '}',
    '.goal-ai-spinner {',
    '  width: 20px; height: 20px;',
    '  border: 3px solid #e0e0e0;',
    '  border-top-color: #7c3aed;',
    '  border-radius: 50%;',
    '  animation: goalAISpin .8s linear infinite;',
    '}',
    '@keyframes goalAISpin { to { transform: rotate(360deg); } }',

    '.goal-ai-original {',
    '  font-size: 13px;',
    '  color: #666;',
    '  margin: 0 0 16px;',
    '  padding: 10px 12px;',
    '  background: #f9f9f9;',
    '  border-radius: 8px;',
    '  border-left: 3px solid #7c3aed;',
    '}',

    '.goal-ai-task-item {',
    '  display: flex;',
    '  align-items: flex-start;',
    '  gap: 10px;',
    '  padding: 10px 12px;',
    '  margin: 6px 0;',
    '  background: #fff;',
    '  border: 1px solid #e0e0e0;',
    '  border-radius: 8px;',
    '  cursor: pointer;',
    '  transition: border-color .2s, background .2s;',
    '}',
    '.goal-ai-task-item:hover { border-color: #7c3aed; background: #faf5ff; }',
    '.goal-ai-task-item input[type="checkbox"] {',
    '  margin-top: 2px;',
    '  width: 18px; height: 18px;',
    '  accent-color: #7c3aed;',
    '  flex-shrink: 0;',
    '}',
    '.goal-ai-task-text { font-size: 14px; line-height: 1.5; color: #333; }',

    '.goal-ai-actions {',
    '  display: flex;',
    '  gap: 8px;',
    '  margin-top: 16px;',
    '}',
    '.goal-ai-actions button {',
    '  flex: 1;',
    '  padding: 12px;',
    '  border: none;',
    '  border-radius: 8px;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '}',
    '.goal-ai-add-btn {',
    '  background: #7c3aed;',
    '  color: #fff;',
    '}',
    '.goal-ai-add-btn:hover { background: #6d28d9; }',
    '.goal-ai-add-btn:disabled { opacity: .5; cursor: not-allowed; }',
    '.goal-ai-cancel-btn {',
    '  background: #f0f0f0;',
    '  color: #666;',
    '}',
    '.goal-ai-cancel-btn:hover { background: #e0e0e0; }',

    '.goal-ai-error {',
    '  text-align: center;',
    '  padding: 20px;',
    '  color: #c00;',
    '  font-size: 14px;',
    '}',
    '.goal-ai-empty {',
    '  text-align: center;',
    '  padding: 20px;',
    '  color: #888;',
    '  font-size: 14px;',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ========== 結果モーダル HTML注入 ==========
  var resultModal = document.createElement('div');
  resultModal.className = 'modal';
  resultModal.id = 'goalAIResultModal';
  resultModal.innerHTML = [
    '<div class="modal-content">',
    '  <span class="modal-close" onclick="window._closeGoalAIResult()">&times;</span>',
    '  <h2 class="modal-title">🤖 AIが提案するタスク</h2>',
    '  <div id="goalAIOriginal" class="goal-ai-original"></div>',
    '  <div id="goalAITaskList"></div>',
    '  <div id="goalAIActions" class="goal-ai-actions" style="display:none;">',
    '    <button class="goal-ai-add-btn" onclick="window._addSelectedTasks()">✅ 選択したタスクを追加</button>',
    '    <button class="goal-ai-cancel-btn" onclick="window._closeGoalAIResult()">キャンセル</button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(resultModal);

  // モーダル外クリックで閉じる
  resultModal.addEventListener('click', function(e) {
    if (e.target === resultModal) closeGoalAIResult();
  });

  // ========== 目標追加モーダルにボタン注入 ==========
  function injectAIButton() {
    var addBtn = document.querySelector('#goalAddModal .add-button');
    if (!addBtn) return;
    if (document.getElementById('goalAIBreakdownBtn')) return; // 既に注入済み

    var aiBtn = document.createElement('button');
    aiBtn.type = 'button';
    aiBtn.id = 'goalAIBreakdownBtn';
    aiBtn.className = 'goal-ai-btn';
    aiBtn.innerHTML = '🤖 AIと目標設定 <span class="premium-tag">👑 有料</span>';
    aiBtn.onclick = goalAIBreakdown;

    addBtn.parentNode.insertBefore(aiBtn, addBtn.nextSibling);
  }

  // ========== 有料チェック ==========
  function isPremium() {
    try {
      var v = localStorage.getItem('isPremium');
      return v === 'true' || v === '1' || v === 'yes';
    } catch(e) { return false; }
  }

  // ========== メイン: AIタスク分解 ==========
  var _savedCategory = '';

  async function goalAIBreakdown() {
    var goalInput = document.getElementById('goalInput');
    var categorySelect = document.getElementById('goalCategory');
    var text = goalInput ? goalInput.value.trim() : '';
    var category = categorySelect ? categorySelect.value : 'その他';

    if (!text) {
      alert('まず目標を入力してください');
      return;
    }

    if (!isPremium()) {
      alert('🔒 有料会員限定\n\n「AIと目標設定」は有料会員向けの機能です。\n\n有料会員になると:\n• AIが目標を具体的なタスクに分解\n• CSV データダウンロード\n• その他プレミアム機能');
      return;
    }

    _savedCategory = category;

    // 目標追加モーダルを閉じる
    if (typeof window.closeGoalAddModal === 'function') {
      window.closeGoalAddModal();
    }

    // 結果モーダルを開く（ローディング状態）
    var modal = document.getElementById('goalAIResultModal');
    var originalEl = document.getElementById('goalAIOriginal');
    var taskListEl = document.getElementById('goalAITaskList');
    var actionsEl = document.getElementById('goalAIActions');

    var catEmojis = {
      '健康': '💪', '仕事': '💼', '学習': '📚',
      '家族': '👨‍👩‍👧‍👦', '趣味': '🎨', 'その他': '📝'
    };
    var catEmoji = catEmojis[category] || '📝';

    if (originalEl) originalEl.textContent = catEmoji + ' ' + category + ' ▸ 「' + text + '」';
    if (taskListEl) taskListEl.innerHTML = '<div class="goal-ai-loading"><div class="goal-ai-spinner"></div><span>AIが考え中...</span></div>';
    if (actionsEl) actionsEl.style.display = 'none';
    if (modal) modal.style.display = 'block';

    try {
      var tone = window.aiConsultTone || localStorage.getItem('journalFeedbackTone') || 'normal';
      var charPrompt = (typeof window.getCharacterPrompt === 'function') ? window.getCharacterPrompt(tone) : '';

      var prompt = '【指示】ユーザーの目標を具体的なタスクに分解してください。\n' +
        '以下のルールに従ってください：\n' +
        '- 3〜5個の具体的で実行可能なタスクに分解\n' +
        '- 各タスクは1文で簡潔に（20文字以内が理想）\n' +
        '- タスクは番号付きリスト（1. 2. 3. ...）で出力\n' +
        '- 余計な説明や挨拶は不要。タスクの一覧のみ出力\n';

      if (charPrompt) {
        prompt += '\n【キャラクター】\n' + charPrompt + '\n';
      }

      prompt += '\n【カテゴリ】' + category +
        '\n【ユーザーの目標】' + text;

      var BACKEND_URL = window.BACKEND_URL || window.__BACKEND_URL__ || 'https://lifelog-ai.little-limit-621c.workers.dev';
      var endpoint = BACKEND_URL + '/api/analyze';

      var res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt, tone: tone, type: 'consult' })
      });

      if (!res.ok) throw new Error('API error: ' + res.status);

      var data = await res.json();
      var responseText = data.comment || data.feedback || data.analysis || data.result || data.response || '';
      if (!responseText && typeof data === 'string') responseText = data;
      if (!responseText) throw new Error('レスポンスが空でした');

      // レスポンスからタスク一覧をパース
      var tasks = parseTasks(responseText);

      if (tasks.length === 0) {
        if (taskListEl) taskListEl.innerHTML = '<div class="goal-ai-empty">タスクを抽出できませんでした。もう少し具体的な目標を入力してみてください。</div>';
        return;
      }

      // タスク一覧を表示
      if (taskListEl) {
        taskListEl.innerHTML = tasks.map(function(task, i) {
          return '<label class="goal-ai-task-item">' +
            '<input type="checkbox" checked data-task-index="' + i + '" />' +
            '<span class="goal-ai-task-text">' + escapeHTML(task) + '</span>' +
            '</label>';
        }).join('');
      }
      if (actionsEl) actionsEl.style.display = 'flex';

    } catch(e) {
      console.error('Goal AI breakdown error:', e);
      if (taskListEl) taskListEl.innerHTML = '<div class="goal-ai-error">エラーが発生しました: ' + escapeHTML(e.message) + '</div>';
    }
  }

  // ========== タスクのパース ==========
  function parseTasks(text) {
    var lines = text.split('\n');
    var tasks = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      // 番号付きリスト (1. / 1) / ①) や - / ・ で始まる行を抽出
      var cleaned = line
        .replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)）]\s*/, '')
        .replace(/^[-・●▪▸]\s*/, '')
        .trim();
      if (cleaned.length > 0 && cleaned.length < 100 && cleaned !== line.trim().charAt(0)) {
        tasks.push(cleaned);
      }
    }
    // フォールバック: パースできなかった場合は全行をタスクとして扱う
    if (tasks.length === 0) {
      tasks = lines
        .map(function(l) { return l.trim(); })
        .filter(function(l) { return l.length > 2 && l.length < 100; });
    }
    return tasks.slice(0, 8); // 最大8個
  }

  // ========== 選択したタスクを追加 ==========
  function addSelectedTasks() {
    var checkboxes = document.querySelectorAll('#goalAITaskList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
      alert('追加するタスクを選択してください');
      return;
    }

    var category = _savedCategory || 'その他';
    var month = window.selectedGoalsMonth || window.goalsCurrentMonth || '';
    var added = 0;

    checkboxes.forEach(function(cb) {
      var label = cb.closest('.goal-ai-task-item');
      var textEl = label ? label.querySelector('.goal-ai-task-text') : null;
      var text = textEl ? textEl.textContent.trim() : '';
      if (!text) return;

      var goal = {
        id: Date.now() + added, // ユニークIDを保証
        text: text,
        category: category,
        createdAt: new Date().toISOString(),
        month: month,
        completed: false
      };

      if (window.monthlyGoals && Array.isArray(window.monthlyGoals)) {
        window.monthlyGoals.unshift(goal);
      }
      added++;
    });

    // 保存
    if (added > 0 && window.Storage && window.Storage.set && window.Storage.keys) {
      window.Storage.set(window.Storage.keys.MONTHLY_GOALS, window.monthlyGoals);
    } else if (added > 0) {
      try { localStorage.setItem('monthlyGoals', JSON.stringify(window.monthlyGoals)); } catch(e) {}
    }

    // 再描画
    if (typeof window.renderGoals === 'function') window.renderGoals();

    // ステータス表示
    if (typeof window.showStatus === 'function') {
      window.showStatus('goalStatus', '✅ ' + added + '個のタスクを追加しました');
    }

    closeGoalAIResult();
  }

  // ========== モーダル操作 ==========
  function closeGoalAIResult() {
    var modal = document.getElementById('goalAIResultModal');
    if (modal) modal.style.display = 'none';
  }

  // ========== ユーティリティ ==========
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== グローバル公開 ==========
  window._goalAIBreakdown = goalAIBreakdown;
  window._addSelectedTasks = addSelectedTasks;
  window._closeGoalAIResult = closeGoalAIResult;

  // ========== 初期化 ==========
  function init() {
    injectAIButton();

    // goalAddModal が動的に開かれるたびにボタンを確認
    var observer = new MutationObserver(function() {
      injectAIButton();
    });
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
