/**
 * goals-v2.js
 * 目標ページ リニューアル — 外部JSで上から被せる方式
 * v2.1: weeklyTasks を日付ベース (date: "YYYY-MM-DD") に変更
 */
(function(){
  'use strict';

  // ========== CSS注入 ==========
  var style = document.createElement('style');
  style.textContent = [
    /* 進捗サマリーカード */
    '.gv2-summary {',
    '  background: #fff;',
    '  border: 1.5px solid #e5e7eb; border-radius: 16px; padding: 18px 20px; margin-bottom: 14px;',
    '  color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.06);',
    '}',
    '.gv2-summary-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
    '.gv2-summary-title { font-size: 14px; font-weight: 600; color: #555; }',
    '.gv2-summary-num { font-size: 26px; font-weight: 800; color: #333; }',
    '.gv2-summary-num small { font-size: 13px; font-weight: 500; color: #888; }',
    '.gv2-summary-bar { width: 100%; height: 7px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }',
    '.gv2-summary-fill { height: 100%; background: #333; border-radius: 4px; transition: width 0.4s ease; }',
    '.gv2-summary-cats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }',
    '.gv2-summary-cat { background: #f3f4f6; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: #555; }',

    /* 今週やること（一番下なのでFAB用の余白） */
    '.gv2-weekly { margin-bottom: 100px; }',

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
    '.gv2-goal-cb { width: 20px; height: 20px; min-width: 20px; cursor: pointer; accent-color: #2196F3; }',
    '.gv2-goal-body { flex: 1; min-width: 0; }',
    '.gv2-goal-text { font-size: 14px; font-weight: 500; color: #333; line-height: 1.3; }',
    '.gv2-goal-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }',
    '.gv2-goal-cat { font-size: 11px; padding: 2px 8px; background: #e8e8e8; border-radius: 4px; color: #666; }',
    '.gv2-goal-wk { font-size: 11px; color: #2196F3; font-weight: 500; }',
    '.gv2-goal-del { background: none; border: none; font-size: 14px; cursor: pointer; opacity: 0.25; padding: 4px; transition: opacity .2s; flex-shrink: 0; }',
    '.gv2-goal:hover .gv2-goal-del { opacity: 0.6; }',
    '.gv2-goal-del:hover { opacity: 1 !important; }',
    '.gv2-empty { text-align: center; color: #999; padding: 20px; font-size: 14px; }',

    /* 週ナビゲーション */
    '.gv2-week-nav { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }',
    '.gv2-week-nav-btn {',
    '  padding:6px 12px; background:#000; color:#fff; border:none;',
    '  border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s;',
    '}',
    '.gv2-week-nav-btn:hover { background:#333; }',
    '.gv2-week-display { flex:1; text-align:center; font-size:14px; font-weight:600; color:#333; }',
    '.gv2-week-today-btn {',
    '  font-size:11px; color:#2196F3; background:none; border:1px solid #2196F3;',
    '  border-radius:6px; padding:2px 8px; cursor:pointer; margin-left:6px;',
    '}',

    /* 週カレンダー（表示のみ） */
    '.gv2-week-cal { display:flex; gap:2px; margin-bottom:10px; }',
    '.gv2-cal-day {',
    '  flex:1; text-align:center; padding:6px 0; border-radius:10px;',
    '  background:#f8f8f8; position:relative;',
    '}',
    '.gv2-cal-day.today { background:#2196F3; }',
    '.gv2-cal-day.today .gv2-cal-dow, .gv2-cal-day.today .gv2-cal-num { color:#fff; }',
    '.gv2-cal-dow { display:block; font-size:10px; color:#999; line-height:1.3; }',
    '.gv2-cal-num { display:block; font-size:14px; font-weight:700; color:#333; line-height:1.3; }',

    /* タスクアイテム */
    '.task-item { display:flex; align-items:center; gap:8px; padding:10px 4px; border-bottom:1px solid #f0f0f0; min-height:44px; }',
    '.task-checkbox { width:22px; height:22px; min-width:22px; cursor:pointer; accent-color:#2196F3; }',
    '.task-label { flex:1; min-width:0; font-size:14px; line-height:1.4; color:#333; word-break:break-word; }',
    '.task-edit-btn { background:none; border:none; font-size:18px; cursor:pointer; padding:8px; min-width:36px; min-height:36px; display:flex; align-items:center; justify-content:center; opacity:0.4; transition:opacity .2s; }',
    '.task-edit-btn:hover, .task-edit-btn:active { opacity:1; }',
    '.task-actions { display:flex; gap:4px; flex-shrink:0; align-items:center; }',
    '.task-action-btn { border:none; border-radius:6px; cursor:pointer; padding:4px 8px; font-size:11px; font-weight:600; min-height:28px; min-width:36px; display:flex; align-items:center; justify-content:center; transition:all .2s; }',
    '.task-copy-btn { background:#e3f2fd; color:#1976D2; }',
    '.task-copy-btn:active { background:#bbdefb; }',
    '.task-carry-btn { background:#f3f4f6; color:#666; }',
    '.task-carry-btn:active { background:#e5e7eb; }',

    /* タスク追加ボタン */
    '.task-add-btn {',
    '  display:block; width:100%; padding:12px; margin-top:6px;',
    '  background:#f5f5f5; border:1px dashed #ccc; border-radius:10px;',
    '  font-size:14px; font-weight:500; color:#888; cursor:pointer;',
    '  text-align:center; transition:all .2s;',
    '  min-height:44px;',
    '}',
    '.task-add-btn:hover, .task-add-btn:active { background:#eee; color:#555; border-color:#aaa; }',

    /* タスク保存・削除ボタン（インライン編集時） */
    '.task-save-btn, .task-del-btn {',
    '  border:none; border-radius:8px; cursor:pointer;',
    '  min-width:40px; min-height:40px; font-size:16px;',
    '  display:flex; align-items:center; justify-content:center;',
    '  transition:all .2s;',
    '}',
    '.task-save-btn { background:#2196F3; color:#fff; }',
    '.task-save-btn:active { background:#1976D2; }',
    '.task-del-btn { background:#f5f5f5; color:#e53e3e; }',
    '.task-del-btn:active { background:#fee; }',

    /* タスク入力フィールド */
    '.task-input {',
    '  flex:1; min-width:0; padding:10px 12px; border:1.5px solid #ddd;',
    '  border-radius:10px; font-size:14px; outline:none;',
    '  transition:border-color .2s;',
    '}',
    '.task-input:focus { border-color:#2196F3; }',

    /* タスクポップアップ */
    '.gv2-popup-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.5); z-index:99999; display:flex; align-items:flex-end; justify-content:center; }',
    '.gv2-popup { background:#fff; border-radius:16px 16px 0 0; max-width:480px; width:100%; padding:20px 16px 28px; max-height:80vh; overflow-y:auto; }',
    '.gv2-popup-title { font-size:16px; font-weight:700; color:#333; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }',
    '.gv2-popup-close { background:none; border:none; font-size:22px; color:#999; cursor:pointer; padding:4px 8px; }',
    '.gv2-popup-task-text { font-size:15px; color:#333; padding:12px; background:#f8f8f8; border-radius:10px; margin-bottom:16px; line-height:1.5; word-break:break-word; }',
    '.gv2-popup-actions { display:flex; flex-direction:column; gap:8px; }',
    '.gv2-popup-btn { display:flex; align-items:center; gap:10px; padding:14px 16px; border:none; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; transition:all .2s; width:100%; text-align:left; }',
    '.gv2-popup-btn:active { transform:scale(0.98); }',
    '.gv2-popup-btn-must { background:#e3f2fd; color:#1565c0; }',
    '.gv2-popup-btn-want { background:#e8f5e9; color:#2e7d32; }',
    '.gv2-popup-btn-next { background:#f3f4f6; color:#555; }',
    '.gv2-popup-btn-edit { background:#fff3e0; color:#e65100; }',
    '.gv2-popup-btn-del { background:#fce4ec; color:#c62828; }',
    '.gv2-popup-btn-icon { font-size:18px; width:28px; text-align:center; }',
    /* タスク追加ポップアップ */
    '.gv2-add-input-wrap { display:flex; gap:8px; align-items:center; margin-bottom:12px; }',
    '.gv2-add-input { flex:1; padding:12px 14px; border:1.5px solid #ddd; border-radius:10px; font-size:15px; outline:none; }',
    '.gv2-add-input:focus { border-color:#2196F3; }',
    '.gv2-voice-btn { width:48px; height:48px; min-width:48px; border:none; border-radius:50%; background:#f0f0f0; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }',
    '.gv2-voice-btn.recording { background:#ef4444; animation:gv2-pulse 1s infinite; }',
    '@keyframes gv2-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }',
    '.gv2-add-submit { width:100%; padding:14px; background:#2196F3; color:#fff; border:none; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; }',
    '.gv2-add-submit:active { background:#1976D2; }'
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

  // ========== 日付ユーティリティ ==========
  function toDateStr(d) {
    // Date → "YYYY-MM-DD"
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function todayStr() {
    return toDateStr(new Date());
  }

  function getMonday(d) {
    // 指定日を含む週の月曜日を返す
    var date = new Date(d);
    date.setHours(0,0,0,0);
    var day = date.getDay();
    var diff = (day === 0 ? -6 : 1 - day); // 日曜=0 → -6, 月曜=1 → 0, ...
    date.setDate(date.getDate() + diff);
    return date;
  }

  function getSunday(monday) {
    var d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d;
  }

  function getWeekRange(baseDate) {
    // baseDate を含む週の月曜〜日曜を返す
    var mon = getMonday(baseDate);
    var sun = getSunday(mon);
    return { start: toDateStr(mon), end: toDateStr(sun), monday: mon, sunday: sun };
  }

  function getWeekDates(baseDate) {
    // baseDate を含む週の7日間の Date 配列を返す
    var mon = getMonday(baseDate);
    var dates = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(mon);
      d.setDate(mon.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  function isDateInRange(dateStr, start, end) {
    return dateStr >= start && dateStr <= end;
  }

  // ISO week key (互換用)
  function getWeekKey(date) {
    var d = new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    var week1 = new Date(d.getFullYear(), 0, 4);
    var weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return d.getFullYear() + '-W' + String(weekNum).padStart(2,'0');
  }

  // 週キー → 月曜日の日付に変換（データ移行用）
  function weekKeyToMonday(weekKey) {
    var parts = weekKey.match(/(\d{4})-W(\d{2})/);
    if (!parts) return null;
    var year = parseInt(parts[1]);
    var week = parseInt(parts[2]);
    var jan4 = new Date(year, 0, 4);
    var jan4Day = (jan4.getDay() + 6) % 7;
    var d = new Date(jan4.getTime());
    d.setDate(jan4.getDate() - jan4Day + (week - 1) * 7);
    return d;
  }

  // 表示中の週の月曜日（Date）
  var currentWeekMonday = getMonday(new Date());
  var viewingWeekMonday = new Date(currentWeekMonday);

  // 目標ごとの折りたたみ状態
  var _goalCollapsed = {};
  try {
    var saved = localStorage.getItem('gv2_collapsed');
    if (saved) _goalCollapsed = JSON.parse(saved);
  } catch(e) {}

  // 互換用: window.currentWeekKey を維持（ダッシュボードが参照）
  var currentWeekKey = getWeekKey(new Date());
  window.getWeekKey = getWeekKey;
  window.currentWeekKey = currentWeekKey;

  // 日付ベースのヘルパーもグローバル公開
  window.getWeekRange = getWeekRange;
  window.toDateStr = toDateStr;

  var DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

  // ========== データアクセス ==========
  function getGoals() {
    try {
      var raw = localStorage.getItem('monthlyGoals');
      var v = JSON.parse(raw || '[]');
      return Array.isArray(v) ? v : [];
    } catch(e) { return []; }
  }
  function saveGoals(goals) {
    localStorage.setItem('monthlyGoals', JSON.stringify(goals));
    window.monthlyGoals = goals;
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

  // ========== データ移行: week → date ==========
  function migrateWeeklyTasksToDate() {
    var goals = getGoals();
    var migrated = false;

    goals.forEach(function(goal) {
      if (!goal || !goal.weeklyTasks) return;
      goal.weeklyTasks.forEach(function(task) {
        if (task.week && !task.date) {
          // week "YYYY-W##" → その週の月曜日の日付に変換
          var monday = weekKeyToMonday(task.week);
          if (monday) {
            task.date = toDateStr(monday);
          } else {
            task.date = todayStr(); // フォールバック
          }
          migrated = true;
        }
      });
    });

    if (migrated) {
      saveGoals(goals);
      console.log('[goals-v2] weeklyTasks migrated: week → date');
    }
  }

  // ========== DOM構築 ==========
  function setupDOM() {
    var goalsTab = document.getElementById('goals');
    if (!goalsTab) return;

    // 二重呼び出し防止
    if (document.getElementById('goalsV2Container')) return;

    var monthSelector = goalsTab.querySelector('.goals-month-selector');

    // 既存のgoals-section, goals-list-section, goals-progress-sectionを非表示
    var oldSections = goalsTab.querySelectorAll('.goals-section, .goals-list-section, .goals-progress-section');
    for (var i = 0; i < oldSections.length; i++) {
      oldSections[i].style.display = 'none';
    }

    // 旧 goalStatus 要素を削除して ID 重複を防ぐ
    var oldGoalStatus = document.getElementById('goalStatus');
    if (oldGoalStatus) oldGoalStatus.remove();

    var container = document.createElement('div');
    container.id = 'goalsV2Container';
    container.innerHTML = '<div id="gv2Summary"></div>' +
      '<div id="gv2Monthly"></div>' +
      '<div id="gv2Weekly"></div>';

    if (monthSelector && monthSelector.nextSibling) {
      monthSelector.parentNode.insertBefore(container, monthSelector.nextSibling);
    } else {
      goalsTab.appendChild(container);
    }
  }

  // ========== レンダリング ==========
  function updateMonthDisplayV2() {
    var month = getSelectedMonth();
    var parts = month.split('-').map(Number);
    var display = document.getElementById('currentGoalsMonth');
    if (display) {
      display.textContent = parts[0] + '年' + parts[1] + '月';
    }
    var title = document.getElementById('goalsListTitle');
    if (title) {
      title.textContent = (month === monthKeyNow()) ? '今月の目標リスト' : parts[0] + '年' + parts[1] + '月の目標リスト';
    }
  }

  function renderAll() {
    var goals = getGoals();
    var month = getSelectedMonth();
    var current = goals.filter(function(g) { return g && g.month === month; });

    updateMonthDisplayV2();
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

    // 週タスクの完了数/総数を母数にする（進捗が実感しやすい）
    var month = getSelectedMonth();
    var totalTasks = 0, doneTasks = 0;
    current.forEach(function(g) {
      (g.weeklyTasks || []).forEach(function(t) {
        if (t.date && t.date.substring(0, 7) === month) {
          totalTasks++;
          if (t.done) doneTasks++;
        }
      });
    });
    var pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    var cats = {};
    current.forEach(function(g) { cats[g.category] = (cats[g.category]||0) + 1; });
    var catTags = Object.keys(cats).map(function(c) {
      return '<span class="gv2-summary-cat">' + catEmoji(c) + ' ' + esc(c) + ' ' + cats[c] + '</span>';
    }).join('');

    el.innerHTML = '<div class="gv2-summary">' +
      '<div class="gv2-summary-top">' +
        '<div><div class="gv2-summary-title">📊 今月の進捗</div></div>' +
        '<div class="gv2-summary-num">' + pct + '% <small>' + doneTasks + '/' + totalTasks + ' タスク達成</small></div>' +
      '</div>' +
      '<div class="gv2-summary-bar"><div class="gv2-summary-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="gv2-summary-cats">' + catTags + '</div>' +
    '</div>';
  }

  function renderWeekly(current, allGoals) {
    var el = document.getElementById('gv2Weekly');
    if (!el) return;

    var activeGoals = current.filter(function(g) { return !g.completed; });

    if (activeGoals.length === 0) {
      el.innerHTML = '';
      return;
    }

    // 表示中の週の範囲
    var range = getWeekRange(viewingWeekMonday);
    var weekDates = getWeekDates(viewingWeekMonday);
    var today = todayStr();
    var isCurrentWeek = (range.start === toDateStr(currentWeekMonday));

    // 全タスクを日付ごとに集計（日付ヘッダー用）
    var tasksByDate = {};
    weekDates.forEach(function(d) { tasksByDate[toDateStr(d)] = 0; });
    activeGoals.forEach(function(goal) {
      (goal.weeklyTasks || []).forEach(function(t) {
        if (t.date && isDateInRange(t.date, range.start, range.end)) {
          tasksByDate[t.date] = (tasksByDate[t.date] || 0) + 1;
        }
      });
    });

    // 週ラベル
    var weekLabel = formatWeekLabel();

    var html = '<div class="today-tasks-section gv2-weekly">';

    // 週ナビゲーション
    html += '<div class="gv2-week-nav">' +
      '<button class="gv2-week-nav-btn" onclick="window._gv2ChangeWeek(-1)">◀ 前週</button>' +
      '<div class="gv2-week-display">📋 ' + weekLabel +
      (!isCurrentWeek ? ' <button class="gv2-week-today-btn" onclick="window._gv2GoToCurrentWeek()">今週へ</button>' : '') +
      '</div>' +
      '<button class="gv2-week-nav-btn" onclick="window._gv2ChangeWeek(1)">次週 ▶</button>' +
    '</div>';

    // 1週間カレンダー（表示のみ）
    html += '<div class="gv2-week-cal">';
    weekDates.forEach(function(d) {
      var ds = toDateStr(d);
      var isToday = (ds === today);
      var taskCount = tasksByDate[ds] || 0;
      var cls = 'gv2-cal-day' + (isToday ? ' today' : '');
      html += '<div class="' + cls + '">' +
        '<span class="gv2-cal-dow">' + DOW_NAMES[d.getDay()] + '</span>' +
        '<span class="gv2-cal-num">' + d.getDate() + '</span>' +
      '</div>';
    });
    html += '</div>';

    html += '<div class="today-tasks-content">';

    var hasAnyTask = false;
    activeGoals.forEach(function(goal) {
      var tasks = (goal.weeklyTasks || []).filter(function(t) {
        return t.date && isDateInRange(t.date, range.start, range.end);
      });
      if (tasks.length > 0) hasAnyTask = true;
      var emoji = catEmoji(goal.category);

      var collapsed = _goalCollapsed[goal.id] ? true : false;
      var doneCount = tasks.filter(function(t){return t.done;}).length;
      var badge = tasks.length > 0 ? ' <span style="font-size:12px;color:#888;font-weight:400;">(' + doneCount + '/' + tasks.length + ')</span>' : '';
      var arrow = collapsed ? '▶' : '▼';

      html += '<div class="task-group">';
      html += '<div class="task-group-title" style="cursor:pointer;display:flex;align-items:center;gap:6px;" onclick="window._gv2ToggleCollapse(' + goal.id + ')">' +
        '<span style="font-size:11px;color:#aaa;transition:transform 0.2s;">' + arrow + '</span> ' + emoji + ' ' + esc(goal.text) + badge + '</div>';

      html += '<div class="gv2-task-body" style="' + (collapsed ? 'display:none;' : '') + '">';

      if (tasks.length === 0) {
        html += '<div style="color:#999;font-size:13px;padding:4px 0 8px;">この週のタスクはまだありません</div>';
      } else {
        // 日付順にソート
        tasks.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        tasks.forEach(function(task) {
          var checked = task.done ? ' checked' : '';
          var strike = task.done ? ' style="text-decoration:line-through;color:#999;"' : '';

          html += '<div class="task-item" id="wt_' + goal.id + '_' + task.id + '">' +
            '<input type="checkbox" class="task-checkbox"' + checked +
            ' onchange="window._gv2ToggleWT(' + goal.id + ',' + task.id + ')" />' +
            '<label class="task-label" onclick="window._gv2ShowTaskPopup(' + goal.id + ',' + task.id + ')"' + strike + ' style="cursor:pointer;' + (task.done ? 'text-decoration:line-through;color:#999;' : '') + '">' + esc(task.text) + '</label>' +
          '</div>';
        });
      }

      html += '<button type="button" class="task-add-btn" onclick="window._gv2ShowAddPopup(' + goal.id + ')">＋ 追加</button>';
      html += '</div>'; // gv2-task-body
      html += '</div>'; // task-group
    });

    if (!hasAnyTask) {
      html += '<div style="text-align:center;color:#999;padding:16px;font-size:13px;">目標がまだありません</div>';
    }

    html += '</div></div>';
    el.innerHTML = html;
  }

  function renderMonthlyList(current, allGoals) {
    var el = document.getElementById('gv2Monthly');
    if (!el) return;

    var month = getSelectedMonth();
    var monthNow = monthKeyNow();
    var titleText = (month === monthNow) ? '🎯 今月の目標' : '🎯 ' + month + 'の目標';

    // 今週の範囲
    var currentRange = getWeekRange(currentWeekMonday);

    var html = '<div class="gv2-monthly">' +
      '<div class="gv2-monthly-head">' +
        '<h3>' + titleText + '</h3>' +
        '<button class="gv2-add-btn-sm" onclick="window.openGoalAddModal()">➕ 追加</button>' +
      '</div>';

    if (current.length === 0) {
      html += '<div class="gv2-empty">目標を追加して、チャレンジを始めよう！</div>';
    } else {
      current.forEach(function(goal) {
        var allWt = goal.weeklyTasks || [];
        var wtThisWeek = allWt.filter(function(t) {
          return t.date && isDateInRange(t.date, currentRange.start, currentRange.end);
        });
        var wtDone = wtThisWeek.filter(function(t) { return t.done; }).length;
        var wtInfo = allWt.length > 0 ? ('📋 今週 ' + wtDone + '/' + wtThisWeek.length + (allWt.length > wtThisWeek.length ? ' (全' + allWt.length + ')' : '')) : '';

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
  function addWeeklyTask(goalId, targetDate) {
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g) return;
    if (!g.weeklyTasks) g.weeklyTasks = [];

    // targetDate が指定されなければ今日（ただし表示中の週内に収まるよう調整）
    var date = targetDate || todayStr();
    var range = getWeekRange(viewingWeekMonday);
    if (!isDateInRange(date, range.start, range.end)) {
      date = range.start; // 表示中の週の月曜日
    }

    var newTask = { id: Date.now(), text: '新しいタスク', date: date, done: false };
    g.weeklyTasks.push(newTask);
    saveGoals(goals);
    renderAll();

    setTimeout(function() { editWeeklyTask(goalId, newTask.id); }, 100);
  }

  function addWeeklyTaskForDate(dateStr) {
    // 日付チップクリック時: アクティブ目標が1つなら直接追加、複数なら最初の目標に
    var goals = getGoals();
    var month = getSelectedMonth();
    var active = goals.filter(function(g) { return g && g.month === month && !g.completed; });
    if (active.length === 0) return;
    addWeeklyTask(active[0].id, dateStr);
  }

  // ===== 今日のMUST/WANTに追加（ホーム画面の今日のタスクへコピー） =====
  function copyToTodayAs(goalId, taskId, taskType) {
    // taskType: 'must' or 'want'
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g || !g.weeklyTasks) return;
    var task = g.weeklyTasks.find(function(x) { return x.id === taskId; });
    if (!task) return;

    try {
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      var yKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth()+1).padStart(2,'0') + '-' + String(yesterday.getDate()).padStart(2,'0');
      var entries = JSON.parse(localStorage.getItem('journalEntriesV3') || '{}');
      var entry = entries[yKey] || { date: yKey, summary: {} };
      if (!entry.summary) entry.summary = {};

      var fieldKey = taskType === 'want' ? 'want' : 'must';
      var existingText = entry.summary[fieldKey] || '';
      var existingTasks = String(existingText).split(/[\n・]/).map(function(s) { return s.trim(); }).filter(function(s) { return s && s !== '—'; });
      existingTasks.push(task.text);
      entry.summary[fieldKey] = existingTasks.join('\n');
      entries[yKey] = entry;
      localStorage.setItem('journalEntriesV3', JSON.stringify(entries));

      // 新タスクのチェック状態をリセット
      var now = new Date();
      var todayKey = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
      var checkKey = 'taskChecks_' + todayKey;
      var checks = JSON.parse(localStorage.getItem(checkKey) || '{}');
      var prefix = taskType === 'want' ? 'homeWantTask' : 'homeMustTask';
      var newIdx = existingTasks.length - 1;
      checks[prefix + newIdx] = false;
      localStorage.setItem(checkKey, JSON.stringify(checks));

      if (typeof window.renderHomeTodayTasks === 'function') window.renderHomeTodayTasks();
    } catch(e) {}

    var label = taskType === 'want' ? 'WANT' : 'MUST';
    if (typeof window.showStatus === 'function') window.showStatus('goalStatus', '✓ 今日の' + label + 'に追加しました');
  }

  // 後方互換
  function copyToToday(goalId, taskId) {
    copyToTodayAs(goalId, taskId, 'must');
  }

  // ===== 翌週に持ち越し =====
  function carryToNextWeek(goalId, taskId) {
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g || !g.weeklyTasks) return;
    var task = g.weeklyTasks.find(function(x) { return x.id === taskId; });
    if (!task) return;

    // 元タスクの日付から翌週の同じ曜日を計算
    var origDate = new Date(task.date + 'T00:00:00');
    var nextWeekDate = new Date(origDate);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    var newDateStr = toDateStr(nextWeekDate);

    // 元タスクを未完了のまま移動（コピーではなく移動）
    task.date = newDateStr;
    saveGoals(goals);
    renderAll();
    var td = new Date(newDateStr + 'T00:00:00');
    if (typeof window.showStatus === 'function') window.showStatus('goalStatus', '✓ ' + (td.getMonth()+1) + '/' + td.getDate() + 'へ移動しました');
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
    inp.className = 'task-input';
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '✓';
    saveBtn.className = 'task-save-btn';
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '🗑️';
    delBtn.className = 'task-del-btn';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '✕';
    cancelBtn.className = 'task-del-btn';
    cancelBtn.style.color = '#999';

    wrap.appendChild(inp);
    wrap.appendChild(saveBtn);
    wrap.appendChild(delBtn);
    wrap.appendChild(cancelBtn);
    item.innerHTML = '';
    item.appendChild(wrap);
    inp.focus();
    inp.select();

    // 編集中はFABを隠す（タップ干渉防止）
    var fab = document.getElementById('fabContainer');
    if (fab) fab.style.display = 'none';

    function showFab() {
      if (fab) fab.style.display = '';
    }
    function save() {
      var val = inp.value.trim();
      if (!val) { del(); return; }
      var gs = getGoals();
      var gg = gs.find(function(x) { return x && x.id === goalId; });
      if (gg && gg.weeklyTasks) {
        var tt = gg.weeklyTasks.find(function(x) { return x.id === taskId; });
        if (tt) tt.text = val;
      }
      saveGoals(gs);
      showFab();
      renderAll();
    }
    function del() {
      var gs = getGoals();
      var gg = gs.find(function(x) { return x && x.id === goalId; });
      if (gg && gg.weeklyTasks) {
        gg.weeklyTasks = gg.weeklyTasks.filter(function(x) { return x.id !== taskId; });
      }
      saveGoals(gs);
      showFab();
      renderAll();
    }
    function cancel() {
      item.innerHTML = origHTML;
      showFab();
    }

    saveBtn.addEventListener('click', save);
    delBtn.addEventListener('click', del);
    cancelBtn.addEventListener('click', cancel);
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') cancel();
    });
  }

  // ===== 目標折りたたみ =====
  function toggleCollapse(goalId) {
    _goalCollapsed[goalId] = !_goalCollapsed[goalId];
    try { localStorage.setItem('gv2_collapsed', JSON.stringify(_goalCollapsed)); } catch(e) {}
    renderAll();
  }

  // ===== タスク詳細ポップアップ =====
  function closeTaskPopup() {
    var old = document.getElementById('gv2-task-popup');
    if (old) old.remove();
  }

  function showTaskPopup(goalId, taskId) {
    closeTaskPopup();
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g || !g.weeklyTasks) return;
    var task = g.weeklyTasks.find(function(x) { return x.id === taskId; });
    if (!task) return;

    var overlay = document.createElement('div');
    overlay.id = 'gv2-task-popup';
    overlay.className = 'gv2-popup-overlay';

    var doneLabel = task.done ? '未完了に戻す' : '完了にする';
    var doneIcon = task.done ? '⬜' : '✅';

    var html = '<div class="gv2-popup">';
    html += '<div class="gv2-popup-title"><span>タスク</span><button class="gv2-popup-close" onclick="window._gv2CloseTaskPopup()">✕</button></div>';
    html += '<div class="gv2-popup-task-text">' + esc(task.text) + '</div>';
    html += '<div class="gv2-popup-actions">';

    // 完了/未完了トグル
    html += '<button class="gv2-popup-btn gv2-popup-btn-next" onclick="window._gv2ToggleWT(' + goalId + ',' + taskId + ');window._gv2CloseTaskPopup();"><span class="gv2-popup-btn-icon">' + doneIcon + '</span>' + doneLabel + '</button>';

    if (!task.done) {
      // MUST
      html += '<button class="gv2-popup-btn gv2-popup-btn-must" onclick="window._gv2CopyToTodayAs(' + goalId + ',' + taskId + ',\'must\');window._gv2CloseTaskPopup();"><span class="gv2-popup-btn-icon">📌</span>今日のMUSTに追加</button>';
      // WANT
      html += '<button class="gv2-popup-btn gv2-popup-btn-want" onclick="window._gv2CopyToTodayAs(' + goalId + ',' + taskId + ',\'want\');window._gv2CloseTaskPopup();"><span class="gv2-popup-btn-icon">💡</span>今日のWANTに追加</button>';
      // 翌週
      html += '<button class="gv2-popup-btn gv2-popup-btn-next" onclick="window._gv2CarryToNextWeek(' + goalId + ',' + taskId + ');window._gv2CloseTaskPopup();"><span class="gv2-popup-btn-icon">📅</span>来週に移動</button>';
    }

    // 編集
    html += '<button class="gv2-popup-btn gv2-popup-btn-edit" onclick="window._gv2CloseTaskPopup();setTimeout(function(){window._gv2EditWT(' + goalId + ',' + taskId + ');},100);"><span class="gv2-popup-btn-icon">✏️</span>テキストを編集</button>';
    // 削除
    html += '<button class="gv2-popup-btn gv2-popup-btn-del" onclick="window._gv2DeleteTask(' + goalId + ',' + taskId + ');window._gv2CloseTaskPopup();"><span class="gv2-popup-btn-icon">🗑️</span>削除</button>';

    html += '</div></div>';
    overlay.innerHTML = html;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeTaskPopup();
    });
    document.body.appendChild(overlay);
  }

  function deleteTask(goalId, taskId) {
    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g || !g.weeklyTasks) return;
    g.weeklyTasks = g.weeklyTasks.filter(function(x) { return x.id !== taskId; });
    saveGoals(goals);
    renderAll();
    if (typeof window.showStatus === 'function') window.showStatus('goalStatus', '✓ タスクを削除しました');
  }

  // ===== タスク追加ポップアップ（音声入力対応） =====
  function showTaskAddPopup(goalId) {
    closeTaskPopup();
    var overlay = document.createElement('div');
    overlay.id = 'gv2-task-popup';
    overlay.className = 'gv2-popup-overlay';

    var html = '<div class="gv2-popup">';
    html += '<div class="gv2-popup-title"><span>タスクを追加</span><button class="gv2-popup-close" onclick="window._gv2CloseTaskPopup()">✕</button></div>';
    html += '<div class="gv2-add-input-wrap">';
    html += '<input type="text" class="gv2-add-input" id="gv2AddTaskInput" placeholder="タスクを入力..." onkeydown="if(event.key===\'Enter\'){event.preventDefault();window._gv2SubmitAddTask(' + goalId + ');}">';
    html += '<button type="button" class="gv2-voice-btn" id="gv2VoiceBtn" onclick="window._gv2ToggleVoice()">🎤</button>';
    html += '</div>';
    html += '<div id="gv2VoiceStatus" style="font-size:12px;color:#999;margin-bottom:12px;display:none;"></div>';
    html += '<button type="button" class="gv2-add-submit" onclick="window._gv2SubmitAddTask(' + goalId + ')">追加する</button>';
    html += '</div>';

    overlay.innerHTML = html;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { _stopVoice(); closeTaskPopup(); }
    });
    document.body.appendChild(overlay);
    setTimeout(function() {
      var inp = document.getElementById('gv2AddTaskInput');
      if (inp) inp.focus();
    }, 100);
  }

  // 音声入力
  var _voiceRecognition = null;
  function _stopVoice() {
    if (_voiceRecognition) {
      try { _voiceRecognition.stop(); } catch(e) {}
      _voiceRecognition = null;
    }
    var btn = document.getElementById('gv2VoiceBtn');
    if (btn) btn.classList.remove('recording');
    var status = document.getElementById('gv2VoiceStatus');
    if (status) status.style.display = 'none';
  }

  function toggleVoice() {
    if (_voiceRecognition) {
      _stopVoice();
      return;
    }
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('お使いのブラウザは音声入力に対応していません');
      return;
    }
    var recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = true;
    _voiceRecognition = recognition;

    var btn = document.getElementById('gv2VoiceBtn');
    var status = document.getElementById('gv2VoiceStatus');
    var input = document.getElementById('gv2AddTaskInput');
    if (btn) btn.classList.add('recording');
    if (status) { status.style.display = 'block'; status.textContent = '🎙️ 聞いています...'; }

    recognition.onresult = function(event) {
      var transcript = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (input) input.value = transcript;
      if (status) status.textContent = '🎙️ ' + transcript;
    };
    recognition.onend = function() {
      _stopVoice();
    };
    recognition.onerror = function(e) {
      if (status) status.textContent = '⚠️ ' + (e.error === 'no-speech' ? '音声が検出されませんでした' : 'エラー: ' + e.error);
      setTimeout(_stopVoice, 1500);
    };
    recognition.start();
  }

  function submitAddTask(goalId) {
    var input = document.getElementById('gv2AddTaskInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    _stopVoice();

    var goals = getGoals();
    var g = goals.find(function(x) { return x && x.id === goalId; });
    if (!g) { closeTaskPopup(); return; }
    if (!g.weeklyTasks) g.weeklyTasks = [];

    var date = todayStr();
    var range = getWeekRange(viewingWeekMonday);
    if (!isDateInRange(date, range.start, range.end)) {
      date = range.start;
    }

    g.weeklyTasks.push({ id: Date.now(), text: text, date: date, done: false });
    saveGoals(goals);
    closeTaskPopup();
    renderAll();
    if (typeof window.showStatus === 'function') window.showStatus('goalStatus', '✓ タスクを追加しました');
  }

  // ===== 月切替のフック =====
  function changeGoalsMonthV2(offset) {
    var month = getSelectedMonth();
    var parts = month.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1 + offset, 1);
    var newMonth = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    window.selectedGoalsMonth = newMonth;

    if (window.App && window.App.state && window.App.state.goals) {
      window.App.state.goals.selectedMonth = newMonth;
    }

    var display = document.getElementById('currentGoalsMonth');
    if (display) {
      display.textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
    }
    renderAll();
  }

  // ========== 週ナビゲーション ==========
  function changeViewingWeek(offset) {
    viewingWeekMonday.setDate(viewingWeekMonday.getDate() + offset * 7);
    renderAll();
  }

  function goToCurrentWeek() {
    viewingWeekMonday = new Date(currentWeekMonday);
    renderAll();
  }

  function formatWeekLabel() {
    var diffMs = viewingWeekMonday.getTime() - currentWeekMonday.getTime();
    var diffWeeks = Math.round(diffMs / (7 * 86400000));
    if (diffWeeks === 0) return '今週やること';
    if (diffWeeks === 1) return '来週やること';
    if (diffWeeks === -1) return '先週のタスク';
    if (diffWeeks > 0) return diffWeeks + '週後のタスク';
    return Math.abs(diffWeeks) + '週前のタスク';
  }

  // ========== グローバル公開（既存の関数を上書き） ==========
  window._gv2ToggleGoal = toggleGoalV2;
  window._gv2DeleteGoal = deleteGoalV2;
  window._gv2AddWT = function(goalId) { addWeeklyTask(goalId); };
  window._gv2AddWTForDate = addWeeklyTaskForDate;
  window._gv2ToggleWT = toggleWeeklyTask;
  window._gv2EditWT = editWeeklyTask;
  window._gv2CopyToToday = copyToToday;
  window._gv2CopyToTodayAs = copyToTodayAs;
  window._gv2CarryToNextWeek = carryToNextWeek;
  window._gv2ChangeWeek = changeViewingWeek;
  window._gv2GoToCurrentWeek = goToCurrentWeek;
  window._gv2ShowTaskPopup = showTaskPopup;
  window._gv2ShowAddPopup = showTaskAddPopup;
  window._gv2CloseTaskPopup = closeTaskPopup;
  window._gv2ToggleVoice = toggleVoice;
  window._gv2SubmitAddTask = submitAddTask;
  window._gv2DeleteTask = deleteTask;
  window._gv2ToggleCollapse = toggleCollapse;

  // 既存の window.* を上書きして全体の整合性を保つ
  window.addGoal = addGoalV2;
  window.changeGoalsMonth = changeGoalsMonthV2;
  window.updateGoalsMonthDisplay = updateMonthDisplayV2;
  window.renderGoals = renderAll;
  window.renderGoalsProgress = function() {}; // 不要化（サマリーに統合）
  window.renderGoalsAll = renderAll;
  window.toggleGoalComplete = toggleGoalV2;
  window.deleteGoal = deleteGoalV2;

  // ダッシュボード用: 今日のタスク達成度を取得するヘルパー
  window.getTodayTaskStats = function() {
    var today = todayStr();
    var goals = getGoals();
    var month = monthKeyNow();
    var monthGoals = goals.filter(function(g) { return g && g.month === month; });
    var total = 0, done = 0;
    monthGoals.forEach(function(g) {
      var wt = (g.weeklyTasks || []).filter(function(t) {
        return t.date === today;
      });
      total += wt.length;
      done += wt.filter(function(t) { return t.done; }).length;
    });
    return { total: total, done: done };
  };

  // 後方互換: getWeeklyTaskStats も残す
  window.getWeeklyTaskStats = function() {
    var range = getWeekRange(currentWeekMonday);
    var goals = getGoals();
    var month = monthKeyNow();
    var monthGoals = goals.filter(function(g) { return g && g.month === month; });
    var total = 0, done = 0;
    monthGoals.forEach(function(g) {
      var wt = (g.weeklyTasks || []).filter(function(t) {
        return t.date && isDateInRange(t.date, range.start, range.end);
      });
      total += wt.length;
      done += wt.filter(function(t) { return t.done; }).length;
    });
    return { total: total, done: done };
  };

  // ========== カレンダー連動用ヘルパー ==========

  // カレンダー用: 指定日のタスク一覧を取得
  window.getTasksForDate = function(dateStr) {
    var goals = getGoals();
    var result = [];
    goals.forEach(function(g) {
      if (!g || !g.weeklyTasks) return;
      g.weeklyTasks.forEach(function(t) {
        if (t.date === dateStr) {
          result.push({
            goalId: g.id,
            goalText: g.text,
            goalCategory: g.category,
            taskId: t.id,
            text: t.text,
            date: t.date,
            done: t.done
          });
        }
      });
    });
    return result;
  };

  // カレンダー用: 指定月の全タスク日付セットを取得（高速描画用）
  window.getTaskDatesForMonth = function(yearMonth) {
    var goals = getGoals();
    var dates = {};
    goals.forEach(function(g) {
      if (!g || !g.weeklyTasks) return;
      g.weeklyTasks.forEach(function(t) {
        if (t.date && t.date.substring(0, 7) === yearMonth) {
          if (!dates[t.date]) dates[t.date] = { total: 0, done: 0 };
          dates[t.date].total++;
          if (t.done) dates[t.date].done++;
        }
      });
    });
    return dates;
  };

  // カレンダー用: 指定日にタスクを直接追加
  window._gv2AddTaskDirect = function(dateStr, taskText) {
    var goals = getGoals();
    var month = dateStr.substring(0, 7);
    var active = goals.filter(function(g) { return g && g.month === month && !g.completed; });
    if (active.length === 0) return false;
    var goal = active[0];
    if (!goal.weeklyTasks) goal.weeklyTasks = [];
    goal.weeklyTasks.push({ id: Date.now(), text: taskText, date: dateStr, done: false });
    saveGoals(goals);
    return true;
  };

  // ========== 初期化 ==========
  function init() {
    // データ移行（week → date）
    migrateWeeklyTasksToDate();

    setupDOM();
    renderAll();

    // App.modules.goals に onShow を登録（Level 2 scaffold が switchTab 時に呼ぶ）
    var App = window.App = window.App || {};
    App.modules = App.modules || {};
    App.modules.goals = { onShow: renderAll };
  }

  // DOMContentLoadedが既に発火していたらすぐ実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();
