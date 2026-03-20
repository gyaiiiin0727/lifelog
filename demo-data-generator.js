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

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function isoTime(dateStr, hour, minute = 0) {
  return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`;
}

// ─── 行動記録生成 ─────────────────────────────────────────────
function generateActivities(dateStr, weekend) {
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
  }

  return activities;
}

// ─── 支出記録生成 ─────────────────────────────────────────────
function generateMoneyRecords(dateStr, weekend) {
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

// ─── ジャーナル生成 ───────────────────────────────────────────
function generateJournal(dateStr, weekend, activities, moneyRecords) {
  const totalExpense = moneyRecords.reduce((sum, r) => sum + Math.abs(r.amount), 0);
  const sideActivity = activities.find(a => a.category === '副業');
  const hasSide = !!sideActivity;

  // 気分
  const moods = weekend
    ? ['最高', '良い', '良い', '普通']
    : ['普通', '普通', '悪い', '良い', '普通'];
  const mood = pick(moods);

  // 日記テキスト（平日）
  const weekdayTexts = [
    `今日は${pick(['ミーティングが多めで', 'わりと集中できて', '忙しくてバタバタで', 'ゆっくり進められて'])}、${pick(['気づいたら夕方になってた', '気持ちよく仕事できた', '少し疲れを感じた', 'ランチ後に少し眠くなった'])}。

午前中は${pick(['SNSの数値確認とレポートまとめ', '広告レポートの作成', 'KPIの確認と上長への共有', 'コンテンツカレンダーの調整'])}をやった。${pick(['思ったより時間がかかって', 'わりとスムーズに進んで', '途中でSlackの通知が多くて集中が途切れたけど', 'やりながら改善案がいくつか浮かんで'])}、${pick(['午後にずれ込んだ', '昼前に片付いた', '定時までには終わった', '明日また見直す予定'])}。

昼は${pick(['近くのランチに行った', '社員食堂で済ませた', 'コンビニで買って席で食べた', 'テイクアウトで戻った'])}。${pick(['800円くらい', '1,000円ちょっと', '900円', '1,200円'])}くらい使った。外食が多いのはわかってるんだけど、なかなか自炊できない。

${hasSide
  ? `帰ってから${sideActivity.text}を${sideActivity.durationMinutes}分やった。${pick(['少しずつだけど確実に積み上がってる', '今日はちょっと集中できた', '眠かったけど頑張った', 'ようやくリズムが掴めてきた気がする'])}。副業始めてから、夜の時間の使い方が変わってきた。`
  : `帰ってから副業しようと思ってたけど、${pick(['疲れてソファで寝落ちしてしまった', '気づいたら0時になってた', '気力がわかなかった', 'Netflixを見てたら時間が過ぎた'])}。明日こそちゃんとやる。`}

今日の出費は${totalExpense}円。${totalExpense > 2500 ? 'また使いすぎた。コンビニと外食の合わせ技が痛い。記録してると自分の散財ぶりがよくわかる。' : '今日は比較的抑えられた。コンビニに寄らなかったのが大きい。'}`,

    `${pick(['今日は定例ミーティングが続いた', '今日は自分作業メインの日', '今日は上長との1on1があった', '今日はクライアント対応が多かった'])}。${pick(['消耗する会議だった', '久しぶりにまとまった時間が取れた', 'いろいろフィードバックをもらえた', '課題がクリアになった'])}。

${pick(['マーケの数値を見ていて', 'SNS広告のレポートを作りながら', 'KPIを確認していて', 'チームとの会話の中で'])}、${pick(['自分のスキルが少しずつついてきてる気がした', '課題がはっきり見えた', '面白いデータが取れた', 'もっと勉強しないといけないと感じた'])}。${pick(['成長してるのかどうか正直わからないけど', '日々のやりとりで少しずつ覚えていくしかない', '仕事で得たことが副業にも活かせるかもしれない', '10年後に振り返ったとき何か意味があると思いたい'])}。

夜ごはんは${pick(['コンビニ弁当', 'テイクアウト', '外食', 'スーパーで買ったやつ'])}。${pick(['700円', '950円', '1,100円', '1,400円'])}くらい。一人暮らしだと食費がかかる。自炊すれば安くなるのはわかってるんだけど。

${hasSide
  ? `${sideActivity.text}を${sideActivity.durationMinutes}分。今日は${pick(['案件の応募文を書いた', '記事の構成を組んだ', 'クラウドワークスで案件を探した', 'サンプル記事を一本書いた'])}。副業収入がまだゼロなのがしんどいけど、動いてないと何も始まらない。`
  : `副業は手をつけられなかった。${pick(['なんか気が乗らなかった', '帰ってから体がだるかった', '今日は仕事でエネルギーを使い切った感じがした', 'ちょっと自分に甘えてしまった'])}。毎日できなくてもいい、と思いつつも焦りはある。`}`,

    `朝から${pick(['少しぼんやりした状態で出社した', '比較的頭が冴えていた', 'やる気が出なかった', '気持ちいい天気で少し気分が上がった'])}。

仕事は${pick(['広告のA/Bテスト結果を分析した', 'SNSのエンゲージメントデータをまとめた', 'LP改善の提案資料を作った', '来月の施策を考える時間が取れた'])}。${pick(['数字を見ると課題が見えてくるのが面白い', 'まだ仮説段階で証明できてないことが多い', '思ったより効果が出ていて少し驚いた', 'いい感じのデータが取れて報告がしやすくなった'])}。

昼はいつもの${pick(['定食屋', '牛丼チェーン', 'カレー屋', 'うどん屋'])}。${pick(['早く済ませて午後の作業時間を確保したかった', '同僚と一緒に行った', '一人で静かに食べた', '食べながら今後の施策を考えてた'])}。

帰りに${pick(['コンビニでアイスを買った', 'スーパーに寄ったら買いすぎた', 'ドラッグストアで日用品を買った', '何も寄らずそのまま帰れた'])}。${totalExpense}円。お金の使い方が可視化されるようになって、少し意識が変わってきた気がする。

${hasSide
  ? `夜、${sideActivity.text}を${sideActivity.durationMinutes}分やった。少しずつだけど、副業のことを考える時間が増えてきた。月3万円、まだ先は長いけど諦める気はない。`
  : `今日は副業なし。疲れてるときは無理せず休む、というのも大事だと思いながら、それが言い訳になってないかは不安。`}`,
  ];

  // 日記テキスト（週末）
  const weekendTexts = [
    `今日は休日。${pick(['ゆっくり起きた', '珍しく早起きした', '7時に目が覚めた', '9時まで寝た'])}。

${hasSide
  ? `午前中に${sideActivity.text}を${sideActivity.durationMinutes}分やった。${pick(['集中できた', '最初は乗り気じゃなかったけどやってみたら意外と進んだ', '昨日より手が動いた', '今日はいいものが書けた気がする'])}。平日はなかなか時間が取れないから、週末に集中してやる習慣をつけようとしている。副業で月3万円、まだまだ先は長いけど続けるしかない。`
  : `今日は副業はお休みにした。${pick(['たまには完全に休む日も必要だと思って', 'やろうと思ったけど気乗りしなかった', '先週たくさんやったから今日はゆっくり', '体を休める日にしようと決めた'])}。罪悪感はあるけど、無理して燃え尽きるよりはいい。`}

${pick(['午後はジムに行った', '午後は近くを散歩した', '昼から少し外に出た', '午後はカフェで本を読んだ'])}。${pick(['いい汗かいてスッキリした', '天気がよくて気持ちよかった', 'リフレッシュできた', '久しぶりに外の空気を吸えた'])}。

夜ごはんは${pick(['外食した', 'スーパーで食材を買って自炊した', 'テイクアウトにした', 'デリバリーを頼んだ'])}。今日の出費は${totalExpense}円。${totalExpense > 3000 ? '週末はどうしても使いすぎてしまう。外食もジムの費用もかさむ。' : '今日は意外と抑えられた。'}

一人の時間が続くと、ふと孤独を感じることもあるけど、こうして自分のペースで動けるのはありがたい。副業で何か実績を作れたら、少し自信がつく気がする。`,

    `週末。${pick(['今日は意識的にのんびりした', '久しぶりに予定を入れなかった', '特に用事がない日', '自由な一日'])}。

${hasSide
  ? `${sideActivity.text}を${sideActivity.durationMinutes}分やった。${pick(['ライティングの依頼文を書いたり', 'ポートフォリオのサンプル記事を書いたり', 'クラウドワークスで案件を探したり', '記事の構成を考えたり'])}していた。${pick(['まだ収入には繋がっていないけど', '焦らず続けていこうと思う', '少しずつ形になってきた気がする', '0から1を作るのが一番しんどいと実感している'])}。`
  : `今日は副業はしなかった。完全オフ。${pick(['来週から巻き返す', '今週はよく動いたからいい', '休みながら続けることが大事', '罪悪感はあるけど、長く続けるためには必要だと思いたい'])}。`}

${pick(['昼は外食した', '昼はスーパーで買い物した', '昼はカフェで過ごした', '昼は自炊した'])}。${pick(['いつもより少し贅沢した', '手頃な値段で満足できた', '外食費がかさんでいる', '今日は抑えられた'])}。

夕方、${pick(['近所を散歩した', '少し読書した', 'Netflixを見てのんびり過ごした', '部屋を掃除した'])}。${pick(['気持ちが少し落ち着いた', 'こういう時間も大事だと思う', 'たまにはこういう日も必要', '充電できた感じ'])}。

今日の出費${totalExpense}円。お金の管理、ちゃんとしていかないとな。毎月末に何に使ったかわからなくなるのを繰り返している。Dayceで記録するようになって、少しだけ意識が変わった気がする。`,
  ];

  const text = weekend ? pick(weekendTexts) : pick(weekdayTexts);

  // AI フィードバック（テンプレート）
  const mustOptions = [
    '・クラウドワークスで案件を1件確認する',
    '・副業のライティングを30分以上やる',
    '・今日の支出をDayceに記録する',
    '・記事の下書きを1本進める',
    '・コンビニに寄らずに帰る',
  ];
  const wantOptions = [
    '・副業の収益目標を見直す',
    '・お気に入りのカフェで作業する',
    '・早起きして副業時間を確保する',
    '・読みたかった本を読む',
    '・週末に副業まとめ作業をする',
  ];

  const mustLine = pick([
    'クラウドワークスで案件を1件確認する',
    '副業のライティングを30分以上やる',
    '記事の下書きを1本進める',
    'コンビニに寄らずに帰る',
    '今日の支出を振り返る',
  ]);
  const wantLine = pick([
    '副業の収益目標を見直す',
    '早起きして副業時間を確保する',
    '読みたかった本を読む',
    '週末に副業まとめ作業をする',
    'お気に入りのカフェで作業する',
  ]);

  const oneLiner = pick([
    `お、記録できてるじゃないですか。${hasSide ? '副業も少しずつ進んでますね。その調子です。' : '副業の時間が取れない日もある。でも記録してるだけで全然違いますよ。'}`,
    `今日も一日お疲れ様でした。${totalExpense > 2000 ? 'ちょっと使いすぎかな？でも把握できてるだけマシですよ。' : '出費も悪くないですね。'}続けましょう。`,
    `記録、続いてますね。${hasSide ? '副業も着実に積み上げてる。月3万円、見えてきてますよ。' : '副業できない日があっても自分を責めないように。できる日に集中して。'}`,
  ]);

  // summary の全フィールドを本番仕様に合わせて生成
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
    : pick(['外食ばかりで食費がかさんでいる', '副業収入がまだゼロなのが気になる', '平日の副業時間が取れない']);

  // aiFeedbackStr は本番と同じフォーマット
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
        must: mustLine.replace('・', '').trim(),
        want: wantLine.replace('・', '').trim(),
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

function mergeData(existing, newActivities, newMoney, newJournal) {
  const activities = parseJson(existing.activities, []);
  const moneyRecords = parseJson(existing.moneyRecords, []);
  const journalEntries = parseJson(existing.journalEntriesV3, {});
  const goals = parseJson(existing.monthlyGoals, null);

  const today = Object.keys(newJournal)[0];

  // 今日のデータが既にある場合はスキップ
  const todayActivityExists = activities.some(
    a => a.timestamp && a.timestamp.startsWith(today)
  );
  if (todayActivityExists) {
    console.log(`⚠️ ${today} のデータは既に存在します。スキップします。`);
    return null;
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
  console.log(`\n🚀 Dayceデモデータ生成開始 (${today}${backfill ? ' / 過去30日バックフィル' : ''})\n`);

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

      const merged = mergeData(existing, activities, money, journal);
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
