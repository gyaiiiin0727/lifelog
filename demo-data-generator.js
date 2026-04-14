/**
 * Dayce デモアカウント 自動データ生成スクリプト
 * ペルソナ: 田中健太（34歳・IT系マーケター・副業を始めたい・お金管理が苦手）
 *
 * 使い方:
 *   DEMO_PASSWORD=パスワード node demo-data-generator.js
 *
 * cron設定例（毎日23:00に実行）:
 *   0 23 * * * cd /path/to/dir && DEMO_PASSWORD=xxx node demo-data-generator.js
 */

const API_BASE = 'https://api.dayce.app';
const EMAIL = 'nagiemishu@gmail.com';
const PASSWORD = process.env.DEMO_PASSWORD;

// ─── ペルソナ設定 ────────────────────────────────────────────
const PERSONA = {
  name: '田中健太',
  age: 34,
  job: 'IT系マーケター',
  tone: 'normal', // タクヤ先輩
};

// ─── カテゴリ ─────────────────────────────────────────────────
const ACTIVITY_CATEGORIES = [
  { name: '仕事', emoji: '💼' },
  { name: '副業', emoji: '💻' },
  { name: '英語学習', emoji: '🔤' },
  { name: '勉強', emoji: '📚' },
  { name: '運動', emoji: '🏃' },
  { name: '食事', emoji: '🍽️' },
  { name: '移動', emoji: '🚃' },
  { name: '家事', emoji: '🏠' },
  { name: '趣味', emoji: '🎮' },
  { name: 'その他', emoji: '📝' },
];

const EXPENSE_CATEGORIES = [
  { name: '食事', emoji: '🍔' },
  { name: 'コンビニ', emoji: '🏪' },
  { name: '交通', emoji: '🚃' },
  { name: 'サブスク', emoji: '📱' },
  { name: '趣味', emoji: '🎮' },
  { name: 'その他', emoji: '📝' },
];

// ─── ユーティリティ ───────────────────────────────────────────
function todayStr() {
  // JST (UTC+9)
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00+09:00');
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

// 日付シードベースの疑似乱数（同じ日=同じ結果、日違い=必ず違う結果）
let _seed = 0;
function setSeed(dateStr) {
  // FNV-1a ハッシュ（連続した日付でも散らばる）
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  _seed = (h >>> 0) || 1;
}
function seededRandom() {
  _seed ^= _seed << 13; _seed ^= _seed >> 17; _seed ^= _seed << 5;
  return ((_seed >>> 0) / 4294967296);
}

function rand(min, max) {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}

// 直近N日と被らないpick（N=配列の長さ）
function fnvHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}
function firstRandIdx(seed, len) {
  let s = seed;
  s ^= s << 13; s ^= s >> 17; s ^= s << 5;
  return (s >>> 0) % len;
}
// arr.length 日サイクルでFisher-Yatesシャッフル→サイクル内は絶対被りなし
function pickNoRepeat(arr, dateStr, suffix = '') {
  const epoch = Date.UTC(2026, 0, 1);
  const dayNum = Math.floor((new Date(dateStr + 'T00:00:00Z') - epoch) / 86400000);
  const cycleIdx = Math.floor(dayNum / arr.length);
  const posInCycle = dayNum % arr.length;

  // そのサイクルのシャッフル順を決定
  const order = arr.map((_, i) => i);
  let seed = fnvHash(suffix + String(cycleIdx));
  for (let i = order.length - 1; i > 0; i--) {
    seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
    const j = (seed >>> 0) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return arr[order[posInCycle]];
}

function makeId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function isoTime(dateStr, hour, minute = 0) {
  return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`;
}

// ─── 行動記録生成 ─────────────────────────────────────────────
function generateActivities(dateStr, weekend) {
  setSeed(dateStr + 'A');
  const activities = [];
  let idOffset = 0;
  const nextId = () => makeId() + (idOffset++);

  if (!weekend) {
    // ── 通勤（8:00〜9:00） ──
    activities.push({
      id: nextId(),
      text: pick(['電車通勤', '通勤']),
      category: '移動',
      categoryEmoji: '🚃',
      startTime: isoTime(dateStr, 8),
      endTime: isoTime(dateStr, 9),
      durationMinutes: 60,
      timestamp: isoTime(dateStr, 8),
    });

    // ── 午前の仕事ブロック（9:00〜12:00） ──
    const morningTasks = [
      { text: pick(['メール・Slack確認', 'メールチェックとSlack返信', '朝のメール処理']), min: rand(20, 40) },
      { text: pick(['朝会（10分）', '朝のスタンドアップMTG', 'チームデイリー確認']), min: rand(10, 20) },
      { text: pick([
        '先週のSNS広告レポート作成',
        'Google Analytics数値確認・レポート',
        'MAU/DAUデータの集計と分析',
        'LP改善のためのヒートマップ確認',
        '競合他社のSNS調査まとめ',
        'メルマガの件名A/Bテスト結果分析',
        'Instagram広告のCTR分析',
        'Google広告のキーワード見直し',
        'BtoBコンテンツのSEO記事調査',
      ]), min: rand(60, 90) },
    ];
    let cursor = 9 * 60; // 分単位
    for (const task of morningTasks) {
      const startH = Math.floor(cursor / 60);
      const startM = cursor % 60;
      activities.push({
        id: nextId(),
        text: task.text,
        category: '仕事',
        categoryEmoji: '💼',
        startTime: isoTime(dateStr, startH, startM),
        endTime: isoTime(dateStr, Math.floor((cursor + task.min) / 60), (cursor + task.min) % 60),
        durationMinutes: task.min,
        timestamp: isoTime(dateStr, startH, startM),
      });
      cursor += task.min;
    }

    // ── 昼食（12:00〜13:00） ──
    activities.push({
      id: nextId(),
      text: pick(['ランチ', '社員食堂', 'コンビニ飯', '近くのランチ', '弁当']),
      category: '食事',
      categoryEmoji: '🍽️',
      startTime: isoTime(dateStr, 12),
      endTime: isoTime(dateStr, 13),
      durationMinutes: 60,
      timestamp: isoTime(dateStr, 12),
    });

    // ── 午後の仕事ブロック（13:00〜18:00） ──
    const afternoonTasks = [
      { text: pick([
        '来月のコンテンツカレンダー作成',
        'SNSキャンペーン企画書のレビュー依頼',
        '新規LP案のワイヤー確認・フィードバック',
        'デザイナーとバナー素材の方向性確認',
        'エンジニアにGA4タグの実装依頼',
        'インフルエンサー候補リストのリサーチ',
        'ユーザーインタビュー結果の整理',
      ]), min: rand(45, 75) },
      { text: pick([
        '来週の広告運用方針の社内プレゼン準備',
        '上長への施策提案資料（パワポ）作成',
        'KPIダッシュボードの数値更新と共有',
        '月次マーケレポートのドラフト作成',
        'マーケ施策の費用対効果まとめ',
      ]), min: rand(60, 90) },
      { text: pick([
        'PM・デザイナーとの週次定例MTG',
        '営業チームへの施策共有MTG',
        '代理店との広告運用レビューMTG',
        '上長との1on1（進捗・相談）',
        'プロダクトチームとのロードマップ確認',
      ]), min: rand(30, 60) },
      { text: pick(['明日のタスク整理', 'Notionのタスクボード更新', '今日の作業ログ記録', 'Slack通知の処理']), min: rand(15, 25) },
    ];
    cursor = 13 * 60;
    for (const task of afternoonTasks) {
      if (cursor >= 18 * 60) break;
      const startH = Math.floor(cursor / 60);
      const startM = cursor % 60;
      activities.push({
        id: nextId(),
        text: task.text,
        category: '仕事',
        categoryEmoji: '💼',
        startTime: isoTime(dateStr, startH, startM),
        endTime: isoTime(dateStr, Math.floor((cursor + task.min) / 60), (cursor + task.min) % 60),
        durationMinutes: task.min,
        timestamp: isoTime(dateStr, startH, startM),
      });
      cursor += task.min;
    }

    // ── 通勤中の英語学習（確率60%・8:00〜9:00に記録） ──
    if (Math.random() < 0.6) {
      const engMin = rand(20, 40);
      activities.push({
        id: nextId(),
        text: pick(['通勤中にシャドーイング', '電車でリスニング練習', '通勤中に単語アプリ', 'Podcastで英語リスニング', '通勤中にDMM英会話予習']),
        category: '英語学習',
        categoryEmoji: '🔤',
        startTime: isoTime(dateStr, 8, 10),
        endTime: isoTime(dateStr, 8, 10 + engMin),
        durationMinutes: engMin,
        timestamp: isoTime(dateStr, 8, 10),
      });
    }

    // ── 帰宅（18:00〜19:00） ──
    activities.push({
      id: nextId(),
      text: '帰宅',
      category: '移動',
      categoryEmoji: '🚃',
      startTime: isoTime(dateStr, 18),
      endTime: isoTime(dateStr, 19),
      durationMinutes: 60,
      timestamp: isoTime(dateStr, 18),
    });

    // ── 夕食（19:00〜20:00） ──
    activities.push({
      id: nextId(),
      text: pick(['夕食', '自炊', 'コンビニ', 'テイクアウト', '外食']),
      category: '食事',
      categoryEmoji: '🍽️',
      startTime: isoTime(dateStr, 19),
      endTime: isoTime(dateStr, 20),
      durationMinutes: 60,
      timestamp: isoTime(dateStr, 19),
    });

    // ── 英語学習（確率50%・20:00〜） ──
    if (Math.random() < 0.5) {
      const engMin = rand(30, 60);
      activities.push({
        id: nextId(),
        text: pick(['シャドーイング', '英会話アプリ（Duolingo）', 'TOEIC問題集', '英語リスニング', 'オンライン英会話（DMM）', '英語の動画視聴', 'NHKラジオ英会話']),
        category: '英語学習',
        categoryEmoji: '🔤',
        startTime: isoTime(dateStr, 20),
        endTime: isoTime(dateStr, 20, engMin),
        durationMinutes: engMin,
        timestamp: isoTime(dateStr, 20),
      });
    }

    // ── 副業（確率70%・21:00〜） ──
    if (Math.random() < 0.7) {
      const sideMin = rand(30, 90);
      activities.push({
        id: nextId(),
        text: pick(['記事執筆', 'クラウドワークス確認', 'ライティング', '案件リサーチ', 'ポートフォリオ作成']),
        category: '副業',
        categoryEmoji: '💻',
        startTime: isoTime(dateStr, 21),
        endTime: isoTime(dateStr, 21, sideMin),
        durationMinutes: sideMin,
        timestamp: isoTime(dateStr, 21),
      });
    }

  } else {
    // 週末パターン
    // 副業メイン
    const sideHours = rand(2, 4);
    activities.push({
      id: nextId(),
      text: pick(['記事執筆', 'ライティング勉強', 'クラウドワークス案件対応', 'ポートフォリオ整備']),
      category: '副業',
      categoryEmoji: '💻',
      startTime: isoTime(dateStr, 10),
      endTime: isoTime(dateStr, 10 + sideHours),
      durationMinutes: sideHours * 60,
      timestamp: isoTime(dateStr, 10),
    });

    // 運動（確率70%・週末はジムか朝ラン）
    if (Math.random() < 0.7) {
      const isGym = Math.random() < 0.6;
      const gymMin = isGym ? rand(60, 90) : rand(30, 60);
      activities.push({
        id: nextId(),
        text: isGym ? pick(['ジム', '筋トレ（ジム）', 'ジムトレーニング']) : pick(['朝ラン', 'ジョギング', 'ウォーキング']),
        category: '運動',
        categoryEmoji: '🏃',
        startTime: isoTime(dateStr, 8),
        endTime: isoTime(dateStr, 8, gymMin),
        durationMinutes: gymMin,
        timestamp: isoTime(dateStr, 8),
      });
    }

    // 家事
    activities.push({
      id: nextId(),
      text: pick(['掃除', '洗濯', '料理', '部屋の整理']),
      category: '家事',
      categoryEmoji: '🏠',
      startTime: isoTime(dateStr, 14),
      endTime: isoTime(dateStr, 15),
      durationMinutes: 60,
      timestamp: isoTime(dateStr, 14),
    });

    // 週末英語学習（確率65%）
    if (Math.random() < 0.65) {
      const engMin = rand(45, 90);
      activities.push({
        id: nextId(),
        text: pick(['TOEIC模擬試験', 'オンライン英会話（DMM）', '英語の映画・海外ドラマ', 'シャドーイング練習', '英語ライティング練習', 'Duolingo']),
        category: '英語学習',
        categoryEmoji: '🔤',
        startTime: isoTime(dateStr, 16),
        endTime: isoTime(dateStr, 16, engMin),
        durationMinutes: engMin,
        timestamp: isoTime(dateStr, 16),
      });
    }
  }

  return activities;
}

// ─── 支出記録生成 ─────────────────────────────────────────────
function generateMoneyRecords(dateStr, weekend) {
  setSeed(dateStr + 'M');
  const records = [];
  const ts = isoTime(dateStr, 12);

  let mid = 0;
  const nextMid = () => makeId() + (mid++);

  if (!weekend) {
    // ── 平日 ──
    // 朝コンビニ（確率75%）
    if (Math.random() < 0.75) {
      records.push({
        id: nextMid(),
        text: pick(['缶コーヒー', 'コーヒー＋おにぎり', '朝食パン', 'サンドイッチ']),
        amount: -rand(200, 550),
        category: 'コンビニ',
        type: 'expense',
        timestamp: isoTime(dateStr, 8, 30),
      });
    }

    // 昼食（ほぼ毎日 確率90%）
    records.push({
      id: nextMid(),
      text: pick(['ランチ', '定食', 'ラーメン', 'うどん', '牛丼', 'カレー', '丼もの', '中華ランチ']),
      amount: -rand(850, 1400),
      category: '食事',
      type: 'expense',
      timestamp: isoTime(dateStr, 12, 30),
    });

    // 夕食（外食・テイクアウト 確率60%）
    if (Math.random() < 0.6) {
      records.push({
        id: nextMid(),
        text: pick(['夕食（外食）', 'テイクアウト', 'コンビニ弁当', '近くの定食屋', '居酒屋']),
        amount: -rand(700, 1800),
        category: '食事',
        type: 'expense',
        timestamp: isoTime(dateStr, 19, 30),
      });
    }

    // 交通費
    records.push({
      id: nextMid(),
      text: '電車代',
      amount: -rand(300, 600),
      category: '交通',
      type: 'expense',
      timestamp: isoTime(dateStr, 8, 30),
    });

    // コンビニ（帰り 確率50%）
    if (Math.random() < 0.5) {
      records.push({
        id: nextMid(),
        text: pick(['スイーツ', 'お菓子', 'ビール', 'アイス', '飲み物']),
        amount: -rand(150, 500),
        category: 'コンビニ',
        type: 'expense',
        timestamp: isoTime(dateStr, 19),
      });
    }

  } else {
    // ── 週末 ──
    // 朝食（確率60%、カフェかコンビニ）
    if (Math.random() < 0.6) {
      records.push({
        id: nextMid(),
        text: pick(['カフェ朝食', 'モーニング', 'コンビニ朝食']),
        amount: -rand(400, 900),
        category: '食事',
        type: 'expense',
        timestamp: isoTime(dateStr, 9),
      });
    }

    // 昼食（外食 確率85%）
    if (Math.random() < 0.85) {
      records.push({
        id: nextMid(),
        text: pick(['ランチ', '外食', 'ファミレス', 'カフェランチ', 'ラーメン', 'パスタ', '焼肉']),
        amount: -rand(1000, 2200),
        category: '食事',
        type: 'expense',
        timestamp: isoTime(dateStr, 12),
      });
    }

    // 夕食（確率70%）
    if (Math.random() < 0.7) {
      records.push({
        id: nextMid(),
        text: pick(['夕食', '外食', 'スーパーで食材', '居酒屋', 'テイクアウト']),
        amount: -rand(800, 2500),
        category: '食事',
        type: 'expense',
        timestamp: isoTime(dateStr, 18, 30),
      });
    }

    // サブスク（月1日〜5日の間に各種発生）
    const day = parseInt(dateStr.split('-')[2]);
    const subscriptions = [
      { day: 1, text: 'Netflix', amount: -1490 },
      { day: 2, text: 'Spotify', amount: -980 },
      { day: 3, text: 'Amazon Prime', amount: -600 },
      { day: 5, text: 'ChatGPT Plus', amount: -3000 },
    ];
    const sub = subscriptions.find(s => s.day === day);
    if (sub) {
      records.push({
        id: nextMid(),
        text: sub.text,
        amount: sub.amount,
        category: 'サブスク',
        type: 'expense',
        timestamp: isoTime(dateStr, 9),
      });
    }

    // ジム月会費（月1日に発生）
    if (dateStr.endsWith('-01')) {
      records.push({
        id: nextMid(),
        text: 'ジム月会費',
        amount: -7700,
        category: 'その他',
        type: 'expense',
        timestamp: isoTime(dateStr, 10),
      });
    }

    // 趣味（確率35%）
    if (Math.random() < 0.35) {
      records.push({
        id: nextMid(),
        text: pick(['本', 'Amazon', 'ゲーム課金', '雑貨', 'ガジェット']),
        amount: -rand(500, 3500),
        category: '趣味',
        type: 'expense',
        timestamp: isoTime(dateStr, 15),
      });
    }
  }

  return records;
}

// ─── 月別ストーリー定義 ──────────────────────────────────────
// 新しい月を追加するときは MONTHLY_STORIES にエントリを足すだけでOK
const MONTHLY_STORIES = {
  // ── 4月: はじまり ─────────────────────────────────────────
  '2026-04': {
    phase: 'はじまり',
    moods: { weekday: ['普通','普通','悪い','良い','普通'], weekend: ['良い','良い','普通','最高'] },
    mustLines: ['クラウドワークスで案件を1件確認する','副業のライティングを30分以上やる','記事の下書きを1本進める','コンビニに寄らずに帰る','今日の支出を振り返る','応募文のテンプレを作る','自己紹介ページを完成させる'],
    wantLines: ['副業の収益目標を見直す','早起きして副業時間を確保する','読みたかった本を読む','週末に副業まとめ作業をする','お気に入りのカフェで作業する','副業用のTwitterアカウントを作る','クラウドワークスのプロフィールを改善する'],
    oneLiners: (hasSide, totalExpense) => [
      `お、記録できてるじゃないですか。${hasSide ? '副業も動き始めてますね。0→1が一番しんどいので、続けるのが大事ですよ。' : '副業の時間が取れない日もある。でも記録してるだけで全然違いますよ。'}`,
      `今日も一日お疲れ様でした。${totalExpense > 2000 ? 'ちょっと使いすぎかな？でも把握できてるだけマシですよ。' : '出費も悪くないですね。'}副業、焦らずいきましょう。`,
      `記録、続いてますね。${hasSide ? 'クラウドワークス登録したばかりでまだゼロでも、動いてる自分を褒めていい。' : '副業できない日があっても自分を責めないように。まず記録の習慣からですよ。'}`,
      `最初の月って一番しんどいんですよ。${hasSide ? 'それでも手を動かしてるのがいい。最初の収入が全部変えますから。' : 'まず記録を習慣にして、次のステップを考えましょう。'}`,
    ],
    weekdayTexts: (hasSide, hasEng, sideActivity, engActivity, totalExpense) => [
      `今日もいつも通りの一日。午前中は${pick(['SNSのレポートまとめ', '広告効果の分析', 'KPIの確認と共有', 'コンテンツカレンダーの調整'])}をやった。${pick(['わりとスムーズに進んで', '思ったより時間がかかって', '集中できて捗った', 'Slackの通知で何度も中断しながら'])}、${pick(['昼前に一区切りついた', '午後にずれ込んだ', '定時前に片付いた', '夕方ギリギリになった'])}。

昼は${pick(['近くの定食屋', 'コンビニで買って席で', 'テイクアウトで戻って', '社員食堂で'])}済ませた。${pick(['900円', '800円くらい', '1,100円', '1,000円ちょっと'])}。外食続きで食費がかかってる自覚はある。

帰ってから${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分やった。クラウドワークスに登録してまだ日が浅い。案件の文字単価の低さに少し驚いたけど、最初はしょうがない。まず1本納品することを目標にしてる。` : `副業しようと思ってたけど、${pick(['疲れてソファで寝落ちした', '気づいたら0時になってた', 'Netflixを見てたら時間が過ぎた', '気力がわかなかった'])}。明日こそやる。`}

今日の出費${totalExpense}円。${totalExpense > 2500 ? 'また使いすぎた。コンビニ寄らないだけで全然違うのはわかってるんだけど。' : '今日は抑えられた方。意識すれば変わるものだな。'}`,

      `${pick(['今日は1on1があった', '今日は定例ミーティングが続いた', '今日は自分作業メイン', '今日はクライアント対応が多かった'])}。${pick(['いろいろフィードバックをもらえた', '消耗する会議だった', '久しぶりに集中できる時間があった', '課題がクリアになった'])}。

${pick(['SNS広告のレポートを作りながら', 'KPIを確認していて', 'チームと話していて'])}、${pick(['仕事で学んでることって副業にも使えそうだなと思った', '自分のスキルが少しずつついてきてる気がした', 'まだまだ学ぶことが多いと感じた'])}。

夜ごはんは${pick(['コンビニ弁当', 'スーパーのお惣菜', 'テイクアウト', '外食'])}。${pick(['700円', '950円', '1,200円', '1,400円'])}くらい。一人暮らしの食費は本当にかかる。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。今日は${pick(['クラウドワークスで案件を10件確認した', '応募文のテンプレを作り始めた', '自己紹介文の草案を書いた', 'サンプル記事を1本書いた'])}。副業収入がまだゼロなのがしんどいけど、まず動いてないと何も始まらない。` : `副業は手をつけられなかった。${pick(['帰ってから体がだるかった', '仕事でエネルギーを使い切った', '気が乗らなかった', '自分に甘えた'])}。毎日できなくてもいい、と思いつつも焦りはある。`}`,

      `朝から${pick(['少しぼんやりした状態で出社した', '気持ちいい天気で気分が上がった', 'やる気が出なかった', '比較的頭が冴えていた'])}。

仕事は${pick(['広告のABテスト結果を分析した', 'SNSのエンゲージメントデータをまとめた', 'LP改善の提案資料を作った', '来月の施策を考えた'])}。${pick(['数字を見ると課題が見えてくるのが面白い', '思ったより効果が出ていて少し驚いた', 'まだ仮説段階で証明できてないことが多い', 'いい感じのデータが取れた'])}。

今日Dayceを使い始めて、支出が可視化されて少し意識が変わってきた。${totalExpense}円。${totalExpense > 2500 ? '改めて見ると使いすぎてる。コンビニと外食の組み合わせが痛い。' : '今日はまあまあ抑えられた。'}

${hasSide ? `夜、${sideActivity.text}を${sideActivity.durationMinutes}分やった。副業始めて最初の月、まだゼロだけど続けてる自分を少し褒めたい。` : `今日は副業なし。疲れてるときは無理せず休む、というのも大事だと思いながら、言い訳になってないか不安。`}

${hasEng ? `通勤中に${engActivity.text}を${engActivity.durationMinutes}分やった。少しずつ耳が慣れてきた気がする。` : ''}`,

      `今日は${pick(['ミーティングが多めで', 'わりと集中できて', '忙しくてバタバタで', 'ゆっくり進められて'])}、${pick(['気づいたら夕方になってた', '少し疲れを感じた', '気持ちよく仕事できた', 'ランチ後に少し眠くなった'])}。

午後から${pick(['広告数値の確認と来月の計画を立てた', 'チームで施策のアイデア出しをした', 'SNS用のコンテンツを考えた', '分析レポートをまとめた'])}。${pick(['少しずつではあるけど、仕事のやり方がわかってきた', 'チームとの連携もだいぶ慣れてきた', 'まだ知らないことも多くて勉強が必要', 'もっと提案力をつけたいと感じた'])}。

${hasSide ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分。今日は${pick(['クラウドワークスでいくつか案件を見た', '応募文の改善を考えた', 'ライティングのサンプルを1本書いた', '単価の高そうなカテゴリを調べた'])}。副業ってこんなに大変なんだなとわかってきた。` : `副業しようと思ってたけど、${pick(['疲れてしまった', '気が乗らなかった', '別のことをしていたら時間が経ってた'])}。明日は必ずやる。`}

今日の出費${totalExpense}円。記録するようになってから、自分の消費パターンが見えてきた。`,

      `今日は${pick(['少し余裕のある一日だった', '慌ただしかった', '想定外のことがいくつかあった', '淡々と仕事を進めた'])}。

${pick(['上長との会話の中で', 'ランチ中に同僚と話していて', '仕事の資料を作りながら'])}、${pick(['副業で得たスキルを本業にも活かせそうだと気づいた', '今の会社でもっと成長できるか考えた', '将来のキャリアについて少し考えた', '自分の強みって何だろうと思った'])}。まだ副業は始めたばかりで答えは出ないけど、動いてることで少し視野が広がった気がする。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。今月はまだ収入ゼロだけど、ゼロから動き出せてる自分を信じたい。` : `今日は副業なし。明日から本気でやる、と何度言ってるかわからないけど、また明日やる。`}

出費${totalExpense}円。${totalExpense > 2000 ? 'また使いすぎた。週末に振り返りたい。' : '今日は節約できた。こういう日が積み重なれば変わる。'}`,

      `朝、${pick(['通勤電車の中でボーッとしてた', '少し早起きできた', 'いつもより10分早く家を出た', '乗り換えを間違えた'])}。小さいことだけど、${pick(['朝の時間の使い方を変えたいと思った', '副業の時間を朝に取れたらと思った', 'こういう積み重ねで変わるんだろうなと思った'])}。

仕事では${pick(['新しい施策を提案する機会があった', 'データの見方を同僚に教えてもらった', 'ミーティングで自分の意見が採用された', 'いつも通りにこなした'])}。${pick(['少しだけ自信がついた', '課題もあるけどやりがいを感じた', 'まだまだだけど続けるしかない', '小さな達成感があった'])}。

${hasSide ? `夜、${sideActivity.text}を${sideActivity.durationMinutes}分。クラウドワークスで初めて応募した案件の返信がまだ来ない。待ちながらも次を探してる。` : `副業、今日もできなかった。でもDayceで記録は続いてる。まずここから。`}

出費${totalExpense}円。Dayceで記録するようになって1週間近く経つ。`,

      `${pick(['今日はわりと落ち着いた一日だった', '今日は色々あって疲れた', '今日は気持ちが乗らなかった', '今日は珍しく仕事がサクサク進んだ'])}。

${pick(['帰り道に', '昼休みに', '仕事の合間に'])}ふと思ったこと。副業を始めようと思ったのは${pick(['このまま給料だけで生きていくのが怖くなったから', 'お金の不安をなくしたかったから', '自分にできることを試してみたかったから', '何か変えなきゃという焦りがあったから'])}。まだ収入はゼロだけど、動き始めた自分は正直少しだけ誇らしい。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。毎日少しずつでも積み上げることが大事、と信じてる。` : `今日は副業の時間が取れなかった。でも明日がある。`}

出費${totalExpense}円。記録、続いてる。`,
    ],
    weekendTexts: (hasSide, sideActivity, totalExpense) => [
      `今日は休日。${pick(['ゆっくり起きた', '9時まで寝た', '7時に自然と目が覚めた', '珍しく早起きした'])}。

${hasSide ? `午前中に${sideActivity.text}を${sideActivity.durationMinutes}分やった。${pick(['集中できた', '最初は乗り気じゃなかったけどやってみたら意外と進んだ', '今日は手が動いた'])}。クラウドワークスに登録してまだ数週間。まだ収入ゼロだけど、週末に時間を使えてる。` : `今日は副業はお休みにした。${pick(['たまには完全に休む日も必要', 'やろうと思ったけど気乗りしなかった', '体を休める日にした'])}。罪悪感はあるけど、無理して燃え尽きるよりはいい。`}

${pick(['午後はジムに行った', '近くを散歩した', 'カフェで本を読んだ', '部屋の掃除をした'])}。${pick(['スッキリした', 'リフレッシュできた', '気持ちが落ち着いた', 'いい気分転換になった'])}。

出費${totalExpense}円。${totalExpense > 3000 ? '週末はどうしても使いすぎる。外食も重なると結構な額になる。' : '今日は意外と抑えられた。'}

副業で何か実績が作れたら、少し自信がつく気がする。まずは最初の1円を目指してる。`,

      `週末。${pick(['予定を入れなかった', '自由な一日', '特に用事がない日'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。${pick(['ポートフォリオのサンプル記事を書いた', 'クラウドワークスで案件を10件確認した', '応募文を3パターン作った', '記事の構成を2本分考えた'])}。まだ収入には繋がってないけど、0から1を作るのが一番しんどいと実感してる。` : `今日は副業しなかった。完全オフ。${pick(['来週から巻き返す', '今週はよく動いたからいい', '休みながら続けることが大事'])}。`}

${pick(['昼は外食した', '昼はスーパーで食材を買って自炊した', '昼はカフェで過ごした'])}。${pick(['たまにはいいかな', '自炊すると落ち着く', '外食費がかさんでる'])}。

夕方、${pick(['近所を散歩した', '読書した', 'Netflixを見てのんびりした', '部屋を片付けた'])}。${pick(['充電できた', 'こういう時間も大事', 'たまにはこういう日も必要'])}。

出費${totalExpense}円。お金の管理、Dayceで記録するようになってから少しずつ意識が変わってきた。`,

      `休日。朝${pick(['ゆっくりコーヒーを飲んだ', '公園を少し散歩した', '部屋でボーッとしてた', '早起きして読書した'])}。平日の疲れを抜く感じ。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。副業を始めてから、休日の時間の使い方が変わってきた気がする。以前はただダラダラしてたけど、今は少しだけ意味のある時間にしようとしてる。` : `今日は副業なし。休むことも仕事だ、と思いながら少し罪悪感がある。来週からまた頑張る。`}

${pick(['ランチは外に出た', 'ランチは自炊した', 'ランチはコンビニで買ってきた'])}。出費${totalExpense}円。記録してると週末に使いすぎてることがよくわかる。

一人暮らしで休日は孤独を感じることもあるけど、こうして自分のペースで動けるのはありがたい。副業でちょっとでも収入が生まれたら、生活に余裕ができる気がする。`,

      `今日は${pick(['友人と会う予定があった', '久しぶりに外に出た', '一人でのんびりした', '特に何もしない日にした'])}。

${pick(['外に出ると', '人と話すと', '一人でぼんやりしてると'])}、${pick(['副業のこと、うまくいくのかなと少し不安になった', '自分のペースで進めばいいと思えた', '今の自分の選択は間違ってないと思えた', '焦る気持ちと、焦らなくていいという気持ちが交互に来る'])}。

${hasSide ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分。今月はまだゼロだけど、種まきの月だと思って続ける。` : `今日は副業お休み。充電日。`}

出費${totalExpense}円。Dayceに記録する習慣が少しずつついてきた。`,
    ],
  },

  // ── 5月: 初収入 ───────────────────────────────────────────
  '2026-05': {
    phase: '初収入',
    moods: { weekday: ['良い','普通','普通','良い','悪い','普通','良い'], weekend: ['良い','最高','普通','良い'] },
    mustLines: ['今日の案件に応募する','記事を1本仕上げる','クライアントの修正依頼に対応する','次の案件を3件ピックアップする','今月の収支をDayceで確認する','納品した記事のフィードバックを整理する','次の単価帯の案件を探す'],
    wantLines: ['副業の月次目標を設定する','ライティングのスキルを学ぶ','カフェで集中して副業作業する','副業仲間を見つける','投資について調べ始める','自炊の頻度を上げる','英語の勉強を再開する'],
    oneLiners: (hasSide, totalExpense) => [
      `初収入おめでとうございます。${hasSide ? '¥5,000でも、0から1になったのは大きい。次は1から10ですよ。' : '今月も記録続いてますね。副業、じわじわ進んでます。'}`,
      `今日も一日お疲れ様でした。${totalExpense > 2000 ? '出費が気になるけど、副業収入でカバーできるようになるといいですね。' : '出費の管理もできてきてますね。'}副業、この調子で。`,
      `${hasSide ? '初案件を納品した月って、一生覚えてると思いますよ。その感覚を大事にして。' : '副業できない日があっても焦らなくていい。続けることが全てです。'}`,
      `記録が続いてる。${hasSide ? '収入が生まれ始めてる。この2つが揃えばどんどん変わりますよ。' : 'まず記録の習慣がある。次は行動の習慣をつけていきましょう。'}`,
    ],
    weekdayTexts: (hasSide, hasEng, sideActivity, engActivity, totalExpense) => [
      `今日も仕事。${pick(['ミーティングが続いた', 'わりと集中できた', '忙しかった', 'ゆっくり進めた'])}一日。

午前中は${pick(['SNS広告のレポートを作成した', '来月のKPIを考えた', 'ABテストの設計をした', 'コンテンツの効果を分析した'])}。${pick(['思ったより手応えがあった', '課題が見えた', 'スムーズに進んだ', 'もっとうまくやれたかなという反省もある'])}。

${hasSide ? `夜、${sideActivity.text}を${sideActivity.durationMinutes}分。今月初めて案件を受注できた。単価は低いけど、初めての報酬が発生した事実が嬉しい。¥5,000だけど、ゼロじゃなくなった。` : `副業、今日は手をつけられなかった。${pick(['仕事で疲れた', '気力がわかなかった', '気づいたら遅い時間になってた'])}。`}

出費${totalExpense}円。${totalExpense > 2500 ? 'また外食が続いた。副業収入で食費を補えるくらいになりたい。' : '今日は節約できた。意識が変わってきてる気がする。'}`,

      `${pick(['今日は早めに仕事が片付いた', '今日はミーティングが少なかった', '今日は珍しく定時で帰れた', '今日は残業したけどスッキリした'])}。

${pick(['帰り道に', '仕事の休憩中に'])}、副業のことを考えた。${pick(['初収入が生まれたことで、次のステップが見えてきた', '単価を上げるにはどうすればいいか調べた', '継続して案件を取り続けることの難しさを感じてる', 'もっといい文章を書けるようになりたい'])}。

${hasSide ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分。${pick(['2本目の記事を書き始めた', 'クライアントからのフィードバックに対応した', '次の案件を探した', '単価の高い案件に挑戦するための準備をした'])}。少しずつ形になってきてる気がする。` : `今日は副業お休み。${pick(['疲れてる', '休む日も必要', '明日しっかりやる'])}。`}

出費${totalExpense}円。`,

      `朝から${pick(['少し憂鬱だった', '気分は普通', '何となく体が重かった', 'わりと元気だった'])}。

仕事は${pick(['淡々とこなした', 'いくつか成果が出た', '壁にぶつかることがあった', '同僚と有意義な話ができた'])}。${pick(['成長してるのかどうか正直わからないけど', '仕事の中で面白さを見つけようとしている', '副業と本業、両立って難しいな', '続けることに意味があると信じてる'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。初収入から少し経って、気持ちが落ち着いてきた。${pick(['次のステップとして単価アップを目指してる', '継続して案件を取る方が大事だと気づいた', '文章の質を上げるための勉強も始めた', '月¥10,000を次の目標にした'])}。` : `副業はできなかった。${pick(['体が疲れてた', '気持ちが乗らなかった', '今日は休む日と決めた'])}。`}

出費${totalExpense}円。`,

      `今日は${pick(['定例ミーティングがいくつかあった', '自分の作業に集中できた', 'チームで議論する時間があった', '上長との話し合いがあった'])}。

仕事で${pick(['新しい施策の提案ができた', 'データ分析で面白い発見があった', 'チームの課題が少し解決した', '地味な作業が続いた'])}。${pick(['やりがいを感じた', '消耗した', 'まあいつも通り', '少し達成感があった'])}。

${hasSide ? `夜、${sideActivity.text}を${sideActivity.durationMinutes}分。今月の副業収入が少しずつ増えてきた。${pick(['まだ目標の月3万円にはほど遠いけど', '毎月積み上げていけば見えてくる気がする', '質を上げながら量も増やしたい'])}。` : `今日は副業の時間が取れなかった。でも記録は続いてる。`}

出費${totalExpense}円。${totalExpense > 2000 ? '今月の支出、副業収入と比べると全然足りてないな。' : '今日は節約できた。'}`,

      `今日は何となく気持ちが重かった。${pick(['疲れがたまってる', '仕事でミスをした', '副業の進捗が思ったより遅い', '将来のことを考えすぎた'])}。

それでも仕事はちゃんとこなした。${pick(['プロとしてやるべきことはやった', '気分が乗らなくてもできることはある', '体を動かすと気持ちが少し楽になった'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。気が重い日でも手だけは動かした。${pick(['こういう日こそ続けることに意味がある', 'やった自分を褒めたい', '副業って精神力も鍛えられる気がする'])}。` : `今日は副業なし。無理しない。`}

出費${totalExpense}円。気分が悪い日は出費も増えがち。`,

      `今日の仕事は${pick(['順調だった', '大変だったけど手応えがあった', 'いつも通りの一日', '少し面白い発見があった'])}。

${pick(['ランチ中に', '帰り道に', '仕事の合間に'])}副業のことを考えた。${pick(['初収入が出たことで少し自信がついた', 'このペースで続ければ月¥10,000は見えてくる', 'スキルアップも並行してやらないと', '副業が本業のスキルにも繋がってる気がする'])}。

${hasSide ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分。${pick(['今日は質のいい記事が書けた気がする', '少しずつスピードが上がってきた', 'クライアントから良い評価をもらえた', '次の案件の応募文を準備した'])}。` : `副業お休みの日。疲れてる時は休む。`}

出費${totalExpense}円。`,

      `今日で${pick(['今月も半分が過ぎた', '副業を始めて2ヶ月が経った', 'Dayceを使い始めて2ヶ月近く経った'])}。

振り返ると、${pick(['初収入が出たのが一番の変化', '記録する習慣がついたのが意外と大きい', '副業に向き合う時間が増えた', '仕事の見方が少し変わった気がする'])}。まだまだ目標には遠いけど、4月の自分よりは確実に前に進んでる。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。今月の副業収入、${pick(['¥5,000を超えた', '¥8,000に近づいてきた', 'まだ少ないけど積み上がってる'])}。` : `今日は副業なし。でも記録は続いてる。それだけで今日はよしとする。`}

出費${totalExpense}円。記録継続中。`,
    ],
    weekendTexts: (hasSide, sideActivity, totalExpense) => [
      `今日は休日。${pick(['ゆっくり起きた', '8時に起きた', '9時まで寝た'])}。

${hasSide ? `午前中に${sideActivity.text}を${sideActivity.durationMinutes}分やった。初収入が出てから、副業への向き合い方が少し変わった。${pick(['もっと質を上げたいと思うようになった', '単価アップを本気で考え始めた', '毎週末まとまった時間を使うようにしてる'])}。` : `今日は副業はお休みにした。週1回くらいは完全に休む日も必要だと思ってる。`}

${pick(['午後はジムに行った', '近くを散歩した', 'カフェで過ごした'])}。${pick(['いい気分転換になった', 'スッキリした', 'リフレッシュできた'])}。

出費${totalExpense}円。${totalExpense > 3000 ? '週末は使いすぎる。でも副業収入が出始めてるから、少しは気が楽。' : '今週末は抑えられた。'}

初収入が出たこの月、少し自分が変わった気がする。`,

      `休日。${pick(['今日は思い切って1日副業に集中した', '今日はのんびりしながらも副業を少し進めた', '今日は完全オフにした'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。週末にまとめて進めることで、ペースが安定してきた。${pick(['今月の副業収入、¥10,000に近づいてきた', '今月で¥5,000の初収入が出た記念の週末', '次の単価帯の案件に挑戦してみた'])}。` : `今日は副業なし。休みの日くらいは完全に頭を空にしたい。`}

${pick(['昼は外食した', '昼は自炊した', 'カフェで作業してランチも済ませた'])}。出費${totalExpense}円。

副業が少し動き始めて、週末の過ごし方が変わってきた。以前よりダラダラしなくなった。`,

      `今日はのんびりした休日。${pick(['朝寝坊した', '近所を散歩した', '読書した', 'カフェでぼんやりした'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。初収入が出た今月、モチベーションが上がってる。でも焦りすぎず、質を上げることを意識したい。` : `今日は副業お休み。充電日。来週また頑張る。`}

出費${totalExpense}円。副業収入が出始めて、支出に対する感覚が少し変わってきた。稼いだお金を記録するのが楽しくなってきた。`,

      `休日。${pick(['友人に久しぶりに連絡した', '一人でゆっくり過ごした', '出かけてリフレッシュした'])}。

副業を始めて2ヶ月弱。${pick(['思ったより大変だったけど、続けてよかった', '初収入が出たことで少し自信になった', 'まだまだだけど、動き続けることが大事だとわかった'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。今日も少し積み上げた。` : `今日は副業お休み。`}

出費${totalExpense}円。Dayceに記録を続けてる。自分の変化が見えてきた気がする。`,
    ],
  },

  // ── 6月: 習慣化 ───────────────────────────────────────────
  '2026-06': {
    phase: '習慣化',
    moods: { weekday: ['良い','良い','普通','最高','普通','良い','普通'], weekend: ['最高','良い','良い','普通'] },
    mustLines: ['副業の月¥20,000達成を目指して記事を1本仕上げる','ジムに行く','週次の副業収益を確認する','単価の高い案件に1件応募する','今月の支出を前月比で振り返る','新しいカテゴリの案件を試す','転職サイトを少し見てみる'],
    wantLines: ['投資の勉強を始める','ジムでのトレーニングメニューを見直す','副業の時間帯を最適化する','読書習慣を再開する','週1回自炊する','副業仲間とつながる','転職エージェントに登録してみる'],
    oneLiners: (hasSide, totalExpense) => [
      `月¥20,000が見えてきましたね。${hasSide ? '副業が軌道に乗り始めてる。ジムとの両立もできてる。自分の管理力が上がってる証拠ですよ。' : '記録が習慣になってる。次のステップを考える時期ですよ。'}`,
      `今日も一日お疲れ様でした。${totalExpense > 2000 ? '出費は把握できてる。副業収入と合わせて管理できてるのがいい。' : '支出の管理もできてきてますね。'}この調子で。`,
      `${hasSide ? '副業が生活の一部になってきてる。ジムもそう。習慣化できた人って本当に強い。' : '記録を続けることで、自分の行動パターンが見えてくる。それが変化の始まりです。'}`,
      `転職のことも少し考え始めてる。${hasSide ? '副業で実績が積み上がると、選択肢が広がりますよ。' : '今の仕事のスキルをどう活かすか、整理してみるといいかも。'}`,
    ],
    weekdayTexts: (hasSide, hasEng, sideActivity, engActivity, totalExpense) => [
      `今日も仕事。${pick(['集中できた', 'ミーティングが多かった', 'いつも通り', '少し忙しかった'])}。

仕事では${pick(['新しい施策の手応えが出てきた', 'データ分析が面白くなってきた', 'チームとの連携がうまくいった', '課題はあるが着実に進んでる'])}。副業を始めてから、仕事への向き合い方も少し変わった気がする。${pick(['自分のスキルを意識するようになった', 'アウトプットの質を上げたいと思うようになった', 'お金の稼ぎ方について考えるようになった', '将来のキャリアを少し意識するようになった'])}。

${hasSide ? `夜、${sideActivity.text}を${sideActivity.durationMinutes}分。今月の副業収入、月¥20,000が見えてきた。ジムも週3で行けてる。両方続けてるのが素直に嬉しい。` : `今日は副業お休み。疲れてるとき無理しない。`}

出費${totalExpense}円。${totalExpense > 2500 ? '出費はまだ多めだけど、副業収入でカバーできるようになってきた。' : '節約できてる日が増えた。'}`,

      `今日は${pick(['気持ちよく仕事できた', '充実した一日だった', '少し疲れたけど達成感があった', '淡々とこなした'])}。

${pick(['ランチ中に', '帰り道に', '仕事の合間に'])}、${pick(['転職のことが頭をよぎった', 'このまま今の会社で頑張るか少し考えた', '副業が安定したら選択肢が増えると思った', '今の自分のスキルを棚卸しした'])}。まだ答えは出ないけど、副業で稼げるようになってきたことで、少し余裕が出てきた気がする。

${hasSide ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分。${pick(['今月は質も上がってきた', '新しいカテゴリの案件にも挑戦できてる', 'クライアントからリピートが来た', '単価の高い案件を取れた'])}。副業が生活の一部になってきた。` : `今日は副業なし。ジムには行った。体を整えることも大事。`}

出費${totalExpense}円。`,

      `朝から${pick(['調子がよかった', '少し体が重かった', 'スッキリした気分で出社した', 'いつも通りの朝だった'])}。

仕事では${pick(['プロジェクトが良い方向に進んでる', 'チームの雰囲気がいい', '課題を乗り越えられた', '小さな成果が積み重なってる'])}感覚がある。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。副業3ヶ月目。月¥20,000ペースで進んでる。最初の頃と比べると、文章を書くスピードが上がった。` : `副業お休みの日。ジムに行った。体を動かすとメンタルも安定する。`}

出費${totalExpense}円。支出と収入の両方を記録してると、生活全体が見えてくる。`,

      `今日は気持ちよく仕事ができた。${pick(['提案が通った', 'データが面白い結果を出した', 'チームからいい反応があった', '自分でも手応えを感じた'])}。

副業も、ジムも、仕事も。三つを両立するのは大変だけど、${pick(['習慣になったらそんなに苦じゃなくなった', '慣れてくると時間の使い方がうまくなった', 'やらないことへの罪悪感が逆にモチベになってる', '生活全体のクオリティが上がってきた気がする'])}。

${hasSide ? `夜、${sideActivity.text}を${sideActivity.durationMinutes}分。今月の副業収入、累計で${pick(['¥18,000を超えた', '¥20,000に乗った', '¥22,000になった'])}。目標の月3万円、見えてきた。` : `今日はのんびり過ごした。副業の代わりに本を読んだ。`}

出費${totalExpense}円。最高な一日。`,

      `今日は${pick(['少し疲れ気味だった', 'モチベが上がらなかった', '体調が万全じゃなかった', '気が重い日だった'])}。

それでも${pick(['仕事はちゃんとやり切った', 'やるべきことはこなした', 'ジムだけは行った', '副業の作業だけは続けた'])}。${pick(['習慣の力ってすごいな', 'こういう日でも動ける自分は少し成長したかもしれない', '気分に左右されず動けるようになってきた'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。調子悪い日でも少しでもやれた。それでいい。` : `今日は副業なし。でも記録は続いてる。`}

出費${totalExpense}円。`,

      `今日は${pick(['久しぶりに同僚とランチした', '新しいプロジェクトの話が出た', '上長に評価されることがあった', 'チームで雑談が弾んだ'])}。

職場の人間関係って、${pick(['割と悪くないなと思う', '気を使うこともあるけど居心地はいい', 'ここだけじゃない選択肢も考えてる', 'このまま続けるのか転職するのか、少し考え始めてる'])}。副業で収入が安定してくると、仕事に対する姿勢も変わってきた気がする。

${hasSide ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分。副業が生活の中心になってきた。いい意味で。` : `今日は副業なし。ジムに行って汗をかいた。`}

出費${totalExpense}円。`,

      `今月も終わりに近い。振り返ると、${pick(['副業が軌道に乗り始めた', 'ジムの習慣がついた', '支出管理が身についた', '生活全体のリズムが整ってきた'])}月だった。

4月から副業を始めて、今月は月¥20,000ペース。まだ月3万円には届いてないけど、${pick(['確実に近づいてる', 'あと少しで見えてくる', 'この調子で続ければ来月には届く'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。習慣って本当に強い。` : `今日は副業なし。でもジムに行った。体も整えてる。`}

出費${totalExpense}円。記録し続けて3ヶ月。自分の変化が見えるようになってきた。`,
    ],
    weekendTexts: (hasSide, sideActivity, totalExpense) => [
      `今日は休日。${pick(['朝から気分がいい', '天気もよくてテンションが上がった', '珍しく早起きした', 'ゆっくり起きた'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。週末の副業時間、すっかり習慣になった。今月は月¥20,000のペースで来てる。3ヶ月前に副業ゼロだった自分から考えると、かなり変わった。` : `今日は副業お休み。完全にリフレッシュする日。`}

午後はジムに行った。${pick(['最近フォームが安定してきた', '重量が少しずつ上がってる', '体が変わってきてる気がする', '汗をかいてスッキリした'])}。ジムも副業も習慣になってきた。

出費${totalExpense}円。${totalExpense > 3500 ? '週末は使いすぎるけど、副業収入が増えてきたから少し気が楽になった。' : '今週末は抑えられた。'}

副業・ジム・記録。三つが回り始めてる。`,

      `休日。${pick(['朝から充実してた', '今日はのんびりした', 'いい一日だった'])}。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。今月の副業収入が累計で${pick(['¥20,000を超えた', '¥18,000になった', '¥22,000に達した'])}。${pick(['目標の月3万円、もう少し', '来月は絶対達成する', 'この調子で続けていく'])}。` : `今日は副業お休み。自分を甘やかす日も大事。`}

${pick(['ジムに行った', 'カフェで本を読んだ', '近所を散歩した', '部屋の片付けをした'])}。最近の休日の過ごし方が、4月の頃と全然違う。以前はただダラダラしてたけど、今は何かしら動いてる。

出費${totalExpense}円。`,

      `休日。${pick(['朝ゆっくり起きた', '少し早起きした'])}。副業を始めて3ヶ月経った。

振り返ると、${pick(['最初の収入ゼロの月が一番しんどかった', '初収入の¥5,000が全部変えた', '習慣の力ってすごいと実感してる'])}。今の自分を4月の自分が見たら、びっくりするかもしれない。

${hasSide ? `${sideActivity.text}を${sideActivity.durationMinutes}分。ジムも副業も、習慣になったら意外と苦じゃない。` : `今日は副業お休み。ジムに行った。`}

出費${totalExpense}円。Dayceの記録も3ヶ月近く続いてる。`,

      `今日は友人に久しぶりに会った。${pick(['副業の話をしたら驚かれた', '近況を話したらいい反応があった', '久しぶりに人と話してリフレッシュした'])}。

${pick(['副業で月¥20,000いきそうと言ったら', '記録習慣がついたと言ったら', 'ジムに通ってると言ったら'])}、「変わったね」と言われた。${pick(['嬉しかった', '自分ではあまり気づかなかったけど、変わってたんだな', '外から見るとわかるものがあるんだな'])}。

${hasSide ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分。今日もちゃんとやれた。` : `今日は副業なし。充実した休日だった。`}

出費${totalExpense}円。いい一日。`,
    ],
  },
};

// ─── ジャーナル生成 ───────────────────────────────────────────
function generateJournal(dateStr, weekend, activities, moneyRecords) {
  setSeed(dateStr);
  const month = dateStr.slice(0, 7);
  const story = MONTHLY_STORIES[month] || MONTHLY_STORIES['2026-06']; // 未定義月は最新を使う

  const totalExpense = moneyRecords.reduce((sum, r) => sum + Math.abs(r.amount), 0);
  const sideActivity = activities.find(a => a.category === '副業');
  const hasSide = !!sideActivity;
  const engActivity = activities.find(a => a.category === '英語学習');
  const hasEng = !!engActivity;

  // 気分（月別）
  const moodPool = weekend ? story.moods.weekend : story.moods.weekday;
  const mood = pickNoRepeat(moodPool, dateStr, 'mood');

  // 日記テキスト（被り防止pick）
  const texts = weekend
    ? story.weekendTexts(hasSide, sideActivity || { text: '', durationMinutes: 0 }, totalExpense)
    : story.weekdayTexts(hasSide, hasEng, sideActivity || { text: '', durationMinutes: 0 }, engActivity || { text: '', durationMinutes: 0 }, totalExpense);
  const text = pickNoRepeat(texts, dateStr, 'text');

  // MUST / WANT（被り防止pick）
  const mustLine = pickNoRepeat(story.mustLines, dateStr, 'must');
  const wantLine = pickNoRepeat(story.wantLines, dateStr, 'want');

  // ひとこと
  const oneLiner = pickNoRepeat(story.oneLiners(hasSide, totalExpense), dateStr, 'one');

  // summary
  const summaryEvents = hasSide
    ? `副業（${sideActivity.text}）を${sideActivity.durationMinutes}分できた`
    : pick(['仕事を最後までこなせた', '一日の記録をDayceに残せた', '今日も無事に終えられた']);

  const summaryLearnings = totalExpense > 2000
    ? `コンビニ・外食で${totalExpense}円使った。積み重ねが大きい`
    : pick(['今日は出費を抑えられた', '意識するだけで支出が変わる', '副業時間の確保をもっとうまくやりたい']);

  const summaryFeelings = hasSide
    ? `${sideActivity.durationMinutes}分でも続けることが月3万円につながると実感`
    : pick(['記録するだけでも自分の行動が見えてくる', '小さな積み重ねを信じたい', 'できない日があっても続けることが大事']);

  const summaryGratitude = mood === '悪い'
    ? pick(['疲れがたまっている。週末にしっかり休みたい', '副業が進まない焦りがある', 'ミーティングが多くて自分の作業時間が削られた'])
    : pick(['外食ばかりで食費がかさんでいる', story.phase === 'はじまり' ? '副業収入がまだゼロなのが気になる' : '副業の質をもっと上げたい', '平日の副業時間が取れない']);

  const aiFeedbackStr = [
    `【よかったこと】\n・${summaryEvents}`,
    `【改善したいこと】\n・${summaryLearnings}`,
    `【気づいたこと】\n・${summaryFeelings}`,
    `【もやっとしたこと】\n・${summaryGratitude}`,
    `【明日のMUST】\n・${mustLine}`,
    `【明日のWANT】\n・${wantLine}`,
  ].join('\n\n');

  return {
    [dateStr]: {
      date: dateStr,
      raw: text,
      mood,
      aiFeedbackTone: PERSONA.tone,
      aiFeedback: aiFeedbackStr,
      hitokoto: oneLiner,
      summary: {
        events: summaryEvents,
        learnings: summaryLearnings,
        feelings: summaryFeelings,
        gratitude: summaryGratitude,
        must: mustLine,
        want: wantLine,
        taskCategories: {
          must_0: { name: '副業', emoji: '💻' },
          want_0: { name: '仕事', emoji: '💼' },
        },
      },
      createdAt: isoTime(dateStr, 22),
    },
  };
}

// ─── 月間目標生成（初回のみ） ──────────────────────────────────
function generateInitialGoals() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const month = jst.toISOString().slice(0, 7); // YYYY-MM

  // 今月の月曜日を列挙
  const mondays = [];
  const d = new Date(month + '-01T00:00:00+09:00');
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  while (d.toISOString().slice(0, 7) === month) {
    mondays.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 7);
  }

  const weeklyTasks = [];
  const taskTemplates = [
    'クラウドワークスに登録して案件を3件確認する',
    '自己紹介文とポートフォリオを作成する',
    '初案件に応募して1本納品する',
    '2本目の記事を執筆して納品する',
    '月末に収益を振り返り、来月の戦略を立てる',
  ];

  mondays.forEach((mon, i) => {
    weeklyTasks.push({
      date: mon,
      text: taskTemplates[i] || `第${i + 1}週の副業タスクを進める`,
      done: false,
      completedAt: null,
    });
  });

  return [
    {
      id: `goal_demo_${Date.now()}`,
      month,
      title: 'ライティング副業で月3万円稼ぐ',
      description: 'クラウドワークスでWebライティングの案件を受注し、副業収入を作る',
      category: '副業',
      weeklyTasks,
      createdAt: `${month}-01T00:00:00+09:00`,
    },
  ];
}

// ─── API関数 ──────────────────────────────────────────────────
async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function login() {
  console.log('🔐 ログイン中...');
  const data = await apiPost('/api/auth/login', { email: EMAIL, password: PASSWORD });
  if (!data.token) throw new Error('トークン取得失敗');
  console.log('✅ ログイン成功');
  return data.token;
}

async function downloadData(token) {
  console.log('📥 既存データをダウンロード中...');
  try {
    const data = await apiGet('/api/sync/download', token);
    console.log('✅ ダウンロード完了');
    return data.data || {};
  } catch (e) {
    console.log('⚠️ 既存データなし（初回実行）');
    return {};
  }
}

async function uploadData(token, data) {
  console.log('📤 データをアップロード中...');
  await apiPost('/api/sync/upload', { data, planLevel: 'free' }, token);
  console.log('✅ アップロード完了');
}

// ─── データのマージ ────────────────────────────────────────────
function parseJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function mergeData(existing, newActivities, newMoney, newJournal, force = false) {
  const activities = parseJson(existing.activities, []);
  const moneyRecords = parseJson(existing.moneyRecords, []);
  const journalEntries = parseJson(existing.journalEntriesV3, {});
  const goals = parseJson(existing.monthlyGoals, null);

  const today = Object.keys(newJournal)[0];

  // 今日のデータが既にある場合はスキップ（--force時は上書き）
  const todayActivityExists = activities.some(
    a => a.timestamp && a.timestamp.startsWith(today)
  );
  if (todayActivityExists && !force) {
    console.log(`⚠️ ${today} のデータは既に存在します。スキップします。`);
    return null;
  }
  if (todayActivityExists && force) {
    // 同日のデータを削除してから新データを追加
    const filteredActivities = activities.filter(a => !a.timestamp || !a.timestamp.startsWith(today));
    const filteredMoney = moneyRecords.filter(r => !r.timestamp || !r.timestamp.startsWith(today));
    delete journalEntries[today];
    activities.length = 0; activities.push(...filteredActivities);
    moneyRecords.length = 0; moneyRecords.push(...filteredMoney);
  }

  const mergedActivities = [...activities, ...newActivities];
  const mergedMoney = [...moneyRecords, ...newMoney];
  const mergedJournal = { ...journalEntries, ...newJournal };
  const mergedGoals = goals || generateInitialGoals();

  return {
    ...existing,
    activities: JSON.stringify(mergedActivities),
    moneyRecords: JSON.stringify(mergedMoney),
    journalEntriesV3: JSON.stringify(mergedJournal),
    monthlyGoals: JSON.stringify(mergedGoals),
    activityCategories: JSON.stringify(ACTIVITY_CATEGORIES),
    expenseCategories: JSON.stringify(EXPENSE_CATEGORIES),
    journalFeedbackTone: PERSONA.tone,
    aiConsultTone: PERSONA.tone,
    planLevel: 'free',
  };
}

// ─── 日付ユーティリティ ───────────────────────────────────────
function daysAgo(n) {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jst.setDate(jst.getDate() - n);
  return jst.toISOString().split('T')[0];
}

// ─── メイン ───────────────────────────────────────────────────
async function main() {
  if (!PASSWORD) {
    console.error('❌ DEMO_PASSWORD 環境変数が設定されていません');
    console.error('例: DEMO_PASSWORD=yourpassword node demo-data-generator.js');
    process.exit(1);
  }

  const today = todayStr();
  const backfill = process.argv.includes('--backfill');
  const force = process.argv.includes('--force');
  console.log(`\n🚀 Dayceデモデータ生成開始 (${today}${backfill ? ' / 過去30日バックフィル' : ''}${force ? ' / 強制上書き' : ''})\n`);

  try {
    const token = await login();
    let existing = await downloadData(token);

    // バックフィルモード: 過去30日分を一括生成
    const dates = backfill
      ? Array.from({ length: 30 }, (_, i) => daysAgo(30 - i)) // 30日前〜昨日
      : [today];

    let totalActivities = 0, totalMoney = 0, totalJournal = 0;

    for (const dateStr of dates) {
      const weekend = isWeekend(dateStr);
      const activities = generateActivities(dateStr, weekend);
      const money = generateMoneyRecords(dateStr, weekend);
      const journal = generateJournal(dateStr, weekend, activities, money);

      const merged = mergeData(existing, activities, money, journal, force);
      if (!merged) continue; // 既存データあればスキップ

      existing = merged; // 次のループに引き継ぐ
      totalActivities += activities.length;
      totalMoney += money.length;
      totalJournal += 1;
    }

    if (totalJournal === 0) {
      console.log('✅ 今日はすでにデータが入っています。終了。');
      return;
    }

    console.log(`📊 生成データ: 行動${totalActivities}件 / 支出${totalMoney}件 / ジャーナル${totalJournal}件`);
    await uploadData(token, existing);
    console.log('\n🎉 完了！Dayceデモアカウントにデータを追加しました。');
    console.log(`📱 https://dayce.app でログインして確認できます。`);
  } catch (err) {
    console.error('❌ エラー:', err.message);
    process.exit(1);
  }
}

main();
