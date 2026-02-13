/**
 * goals-v2.js
 * 目標ページ リニューアル — 外部JSで上から被せる方式
 * 削除するだけで完全に元に戻せる
 */
(function(){
  'use strict';

  // ========== CSS注入 ==========
  var style = document.createElement('style');
  style.textContent = [
    /* 進捗サマリーカード */
    '.gv2-summary {',
    '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
    '  border-radius: 16px; padding: 18px 20px; margin-bottom: 14px;',
    '  color: #fff; box-shadow: 0 4px 15px rgba(102,126,234,0.3);',
    '}',
    '.gv2-summary-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
    '.gv2-summary-title { font-size: 14px; font-weight: 600; opacity: 0.9; }',
    '.gv2-summary-num { font-size: 26px; font-weight: 800; }',
    '.gv2-summary-num small { font-size: 13px; font-weight: 500; opacity: 0.8; }',
    '.gv2-summary-bar { width: 100%; height: 7px; background: rgba(255,255,255,0.3); border-radius: 4px; overflow: hidden; }',
    '.gv2-summary-fill { height: 100%; background: #fff; border-radius: 4px; transition: width 0.4s ease; }',
    '.gv2-summary-cats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }',
    '.gv2-summary-cat { background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 12px; font-size: 11px; }',

    /* 今週やること */
    '.gv2-weekly { margin-bottom: 14px; }',

    /* 今月の目標セクション */
    '.gv2-monthly { background: #fff; border-radius: 16px; padding: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 14px; }',
    '.gv2-monthly-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
    '.gv2-monthly-head h3 { margin: 0; font-size: 16px; color: #333; }',
    '.gv2-add-btn-sm {',
    '  padding: 6px 14px; background: #f0f0f0; border: none; border-radius: 8px;',
    '  font-size: 13px; font-weight: 600; color: #555; cursor: pointer; transition: all .2s;',
    '}',
    '.gv2-add-btn-sm:hover { background: #e0e0e0; color: #333; }',

    /* 目標カード */
    '.gv2-goal { display: flex; align-items: center; gap: 10px; padding: 10px; margin-bottom: 6px; background: #f9f9f9; border-radius: 10px; transition: all .2s; }',
    '.gv2-goal:hover { background: #f0f0f0; }',
    '.gv2-goal.done { opacity: 0.55; }',
    '.gv2-goal.done .gv2-goal-text { text-decoration: line-through; color: #999; }',
    '.gv2-goal-cb { width: 20px; height: 20px; min-width: 20px; cursor: pointer; accent-color: #667eea; }',
    '.gv2-goal-body { flex: 1; min-width: 0; }',
    '.gv2-goal-text { font-size: 14px; font-weight: 500; color: #333; line-height: 1.3; }',
    '.gv2-goal-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }',
    '.gv2-goal-cat { font-size: 11px; padding: 2px 8px; background: #e8e8e8; border-radius: 4px; color: #666; }',
    '.gv2-goal-wk { font-size: 11px; color: #667eea; font-weight: 500; }',
    '.gv2-goal-del { background: none; border: none; font-size: 14px; cursor: pointer; opacity: 0.25; padding: 4px; transition: opacity .2s; flex-shrink: 0; }',
    '.gv2-goal:hover .gv2-goal-del { opacity: 0.6; }',
    '.gv2-goal-del:hover { opacity: 1 !important; }',
    '.gv2-empty { text-align: center; color: #999; padding: 20px; font-size: 14px; }'
  ].join('\n');
  document.head.appendChild(style);

  // ========== ユーティリティ ==========
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function catEmoji(c) {
    return {'健康':'💪','仕事':'💼','勉強':'📚','学習':'📚',
            '趣味':'🎨','人間関係':'👥','お金':'💰','家族':'👨‍👩‍👧‍👦','その他':'📌'}[c] || '📌';
  }

  function getWeekKey(date) {
    var d = new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    var week1 = new Date(d.getFullYear(), 0, 4);
    var weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return d.getFullYear() + '-W' + String(weekNum).padStart(2,'0');
  }
  var currentWeekKey = getWeekKey(new Date());
  window.getWeekKey = getWeekKey;
  window.currentWeekKey = currentWeekKey;

  // ========== データアクセス ==========
  function getGoals() {
    // v36.1 の GoalsModule が使っていた loadGoals() と同じ
    try {
      var raw = localStorage.getItem('monthlyGoals');
      var v = JSON.parse(raw || '[]');
      return Array.isArray(v) ? v : [];
    } catch(e) { return []; }
  }
  function saveGoals(goals) {
    localStorage.setItem('monthlyGoals', JSON.stringify(goals));
    // window.monthlyGoals も同期
    window.monthlyGoals = goals;
    // Storage API 使えれば使う
    try {
      if (window.Storage && window.Storage.set && window.Storage.keys) {
        window.Storage.set(window.Storage.keys.MONTHLY_GOALS, goals);
      }
    } catch(e) {}
  }
  function getSelectedMonth() {
    return window.selectedGoalsMonth || window.goalsCurrentMonth || monthKeyNow();
  }
  function monthKeyNow() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }

  // ========== DOM構築 ==========
  function setupDOM() {
    var goalsTab = document.getElementById('goals');
    if (!goalsTab) return;

    // 月セレクターはそのまま残す
    var monthSelector = goalsTab.querySelector('.goals-month-selector');

    // 既存のgoals-section, goals-list-section, goals-progress-sectionを非表示
    var oldSections = goalsTab.querySelectorAll('.goals-section, .goals-list-section, .goals-progress-section');
    for (var i = 0; i < oldSections.length; i++) {
      oldSections[i].style.display = 'none';
    }

    // 新しいコンテナを挿入（月セレクターの後に）
    var container = document.createElement('div');
    container.id = 'goalsV2Container';

    // サマリーカード
    container.innerHTML = '<div id="gv2Summary"></div>' +
      '<div id="gv2Weekly"></div>' +
      '<div id="gv2Monthly"></div>';

    // monthSelectorの後に挿入
    if (monthSelector && monthSelector.nextSibling) {
      monthSelector.parentNode.insertBefore(container, monthSelector.nextSibling);
    } else {
      goalsTab.appendChild(container);
    }
  }

  // ========== レンダリング ==========
  function renderAll() {
    var goals = getGoals();
    var month = getSelectedMonth();
    var current = goals.filter(function(g) { return g && g.month === month; });

    renderSummary(current);
    renderWeekly(current, goals);
    renderMonthlyList(current, goals);
  }

  function renderSummary(current) {
    var el = document.getElementById('gv2Summary');
    if (!el) return;

    if (current.length === 0) {
      el.innerHTML = '';
      return;
    }

    var completed = current.filter(function(g) { return g.completed; }).length;
    var total = current.length;
    var pct = Math.round((completed / total) * 100);

    var cats = {};
    current.forEach(function(g) { cats[g.category] = (cats[g.category]||0) + 1; });
    var catTags = Object.keys(cats).map(function(c) {
      return '<span class="gv2-summary-cat">' + catEmoji(c) + ' ' + c + ' ' + cats[c] + '</span>';
    }).join('');

    el.innerHTML = '<div class="gv2-summary">' +
      '<div class="gv2-summary-top">' +
        '<div><div class="gv2-summary-title">📊 今月の進捗</div></div>' +
        '<div class="gv2-summary-num">' + pct + '% <small>' + completed + '/' + total + ' 達成</small></div>' +
      '</div>' +
      '<div class="gv2-summary-bar"><div class="gv2-summary-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="gv2-summary-cats">' + catTags + '</div>' +
    '</div>';
  }

  function renderWeekly(current, allGoals) {
    var el = document.getElementById('gv2Weekly');
    if (!el) return;

    // 完了していない目標の今週タスクを表示
    var activeGoals = current.filter(function(g) { return !g.completed; });

    if (activeGoals.length === 0) {
      el.innerHTML = '';
      return;
    }

    var html = '<div class="today-tasks-section gv2-weekly">' +
      '<div class="today-tasks-header"><h3>📋 今週やること</h3></div>' +
      '<div class="today-tasks-content">';

    activeGoals.forEach(function(goal) {
      var tasks = (goal.weeklyTasks || []).filter(function(t) { return t.week === currentWeekKey; });
      var emoji = catEmoji(goal.category);

      html += '<div class="task-group">';
      html += '<div class="task-group-title">' + emoji + ' ' + esc(goal.text) + '</div>';

      tasks.forEach(function(task) {
        var checked = task.done ? ' checked' : '';
        var strike = task.done ? ' style="text-decoration:line-through;color:#999;"' : '';
        html += '<div class="task-item" id="wt_' + goal.id + '_' + task.id + '">' +
          '<input type="checkbox" class="task-checkbox"' + checked +
          ' onchange="window._gv2ToggleWT(' + goal.id + ',' + task.id + ')" />' +
          '<label class="task-label"' + strike + '>' + esc(task.text) + '</label>' +
          '<button type="button" class="task-edit-btn" onclick="window._gv2EditWT(' + goal.id + ',' + task.id + ')" title="編集">✏️</button>' +
        '</div>';
      });

      html += '<button type="button" class="task-add-btn" onclick="window._gv2AddWT(' + goal.id + ')">＋ 追加</button>';
      html += '</div>';
    });

    html += '</div></div>';
    el.innerHTML = html;
  }

  function renderMonthlyList(current, allGoals) {
    var el = document.getElementById('gv2Monthly');
    if (!el) return;

    var month = getSelectedMonth();
    var monthNow = monthKeyNow();
    var titleText = (month === monthNow) ? '🎯 今月の目標' : '🎯 ' + month + 'の目標';

    var html = '<div class="gv2-monthly">' +
      '<div class="gv2-monthly-head">' +
        '<h3>' + titleText + '</h3>' +
        '<button class="gv2-add-btn-sm" onclick="window.openGoalAddModal()">➕ 追加</button>' +
      '</div>';

    if (current.length === 0) {
      html += '<div class="gv2-empty">目標を追加して、チャレンジを始めよう！</div>';
    } else {
      current.forEach(function(goal) {
        var wt = (goal.weeklyTasks || []).filter(function(t) { return t.week === currentWeekKey; });
        var wtDone = wt.filter(function(t) { return t.done; }).length;
        var wtInfo = wt.length > 0 ? ('📋 今週 ' + wtDone + '/' + wt.length) : '';

        html += '<div class="gv2-goal ' + (goal.completed ? 'done' : '') + '">' +
          '<input type="checkbox" class="gv2-goal-cb" ' + (goal.completed ? 'checked' : '') +
          ' onchange="window._gv2ToggleGoal(' + goal.id + ')" />' +
          '<div class="gv2-goal-body">' +
            '<div class="gv2-goal-text">' + esc(goal.text) + '</div>' +
            '<div class="gv2-goal-meta">' +
              '<span class="gv2-goal-cat">' + catEmoji(goal.category) + ' ' + esc(goal.category) + '</span>' +
              (wtInfo ? '<span class="gv2-goal-wk">' + wtInfo + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<button class="gv2-goal-del" onclick="window._gv2DeleteGoal(' + goal.id + ')" title="削除">🗑️</button>' +
        '</div>';
      });
    }

    html += '<div class="status-message" id="goalStatus"></div>';
    html += '</div>';
    el.innerHTML = html;
  }

  // ========== CRUD操作 ==========
  function addGoalV2() {
    var input = document.getElementById('goalInput');
    var sel = document.getElementById('goalCategory');
    var text = (input ? input.value : '').trim();
    var cat = sel ? sel.value : 'その他';

    if (!text) {
      if (typeof window.showStatus === 'function') window.showStatus('goalStatus', '❌ 目標を入力してください');
      return;
    }

    var goals = getGoals();
    var goal = {
      id: Date.now(),
      text: text,
      category: cat,
      createdAt: new Date().toISOString(),
      month: getSelectedMonth(),
      completed: false,
      weeklyTasks: []
    };
    goals.unshift(goal);
    saveGoals(goals);

    if (input) input.value = '';
    renderAll();
    if (typeof window.showStatus === 'function') window.showStatus('goalStatus', '✓ 目標を追加しました');
  }

  function toggleGoalV2(id) {
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === id; });
    if (!g) return;
    g.completed = !g.completed;
    saveGoals(goals);
    renderAll();
  }

  function deleteGoalV2(id) {
    if (!confirm('この目標を削除しますか？')) return;
    var goals = getGoals().filter(function(x) { return x && x.id !== id; });
    saveGoals(goals);
    renderAll();
    if (typeof window.showStatus === 'function') window.showStatus('goalStatus', '✓ 目標を削除しました');
  }

  // ===== 週タスク CRUD =====
  function addWeeklyTask(goalId) {
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g) return;
    if (!g.weeklyTasks) g.weeklyTasks = [];

    var newTask = { id: Date.now(), text: '新しいタスク', week: currentWeekKey, done: false };
    g.weeklyTasks.push(newTask);
    saveGoals(goals);
    renderAll();

    setTimeout(function() { editWeeklyTask(goalId, newTask.id); }, 100);
  }

  function toggleWeeklyTask(goalId, taskId) {
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g || !g.weeklyTasks) return;
    var t = g.weeklyTasks.find(function(x) { return x.id === taskId; });
    if (!t) return;
    t.done = !t.done;
    saveGoals(goals);
    renderAll();
  }

  function editWeeklyTask(goalId, taskId) {
    var item = document.getElementById('wt_' + goalId + '_' + taskId);
    if (!item) return;

    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g || !g.weeklyTasks) return;
    var task = g.weeklyTasks.find(function(x) { return x.id === taskId; });
    if (!task) return;

    var origHTML = item.innerHTML;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:6px;align-items:center;flex:1;';
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = task.text;
    inp.style.cssText = 'flex:1;padding:6px 10px;border:2px solid #667eea;border-radius:8px;font-size:14px;outline:none;';
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '✓';
    saveBtn.style.cssText = 'background:#16a34a;color:#fff;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:14px;';
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '🗑️';
    delBtn.style.cssText = 'background:#e74c3c;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:14px;';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '✕';
    cancelBtn.style.cssText = 'background:#999;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:14px;';

    wrap.appendChild(inp);
    wrap.appendChild(saveBtn);
    wrap.appendChild(delBtn);
    wrap.appendChild(cancelBtn);
    item.innerHTML = '';
    item.appendChild(wrap);
    inp.focus();
    inp.select();

    function save() {
      var val = inp.value.trim();
      if (!val) { del(); return; }
      task.text = val;
      // 再取得してマージ
      var gs = getGoals();
      var gg = gs.find(function(x) { return x && x.id === goalId; });
      if (gg && gg.weeklyTasks) {
        var tt = gg.weeklyTasks.find(function(x) { return x.id === taskId; });
        if (tt) tt.text = val;
      }
      saveGoals(gs);
      renderAll();
    }
    function del() {
      var gs = getGoals();
      var gg = gs.find(function(x) { return x && x.id === goalId; });
      if (gg && gg.weeklyTasks) {
        gg.weeklyTasks = gg.weeklyTasks.filter(function(x) { return x.id !== taskId; });
      }
      saveGoals(gs);
      renderAll();
    }
    function cancel() {
      item.innerHTML = origHTML;
    }

    saveBtn.addEventListener('click', save);
    delBtn.addEventListener('click', del);
    cancelBtn.addEventListener('click', cancel);
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') cancel();
    });
  }

  // ===== 月切替のフック =====
  function changeGoalsMonthV2(offset) {
    var month = getSelectedMonth();
    var parts = month.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1 + offset, 1);
    var newMonth = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    window.selectedGoalsMonth = newMonth;

    // 月表示を更新
    if (typeof window.updateGoalsMonthDisplay === 'function') {
      window.updateGoalsMonthDisplay();
    }
    renderAll();
  }

  // ========== グローバル公開（既存の関数を上書き） ==========
  window._gv2ToggleGoal = toggleGoalV2;
  window._gv2DeleteGoal = deleteGoalV2;
  window._gv2AddWT = addWeeklyTask;
  window._gv2ToggleWT = toggleWeeklyTask;
  window._gv2EditWT = editWeeklyTask;

  // 既存の window.* を上書きして全体の整合性を保つ
  window.addGoal = addGoalV2;
  window.changeGoalsMonth = changeGoalsMonthV2;
  window.renderGoals = renderAll;
  window.renderGoalsProgress = function() {}; // 不要化（サマリーに統合）
  window.renderGoalsAll = renderAll;
  window.toggleGoalComplete = toggleGoalV2;
  window.deleteGoal = deleteGoalV2;

  // ========== 初期化 ==========
  function init() {
    setupDOM();
    renderAll();
  }

  // DOMContentLoadedが既に発火していたらすぐ実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // 少し遅延して既存コードの後に実行
    setTimeout(init, 300);
  }
})();
