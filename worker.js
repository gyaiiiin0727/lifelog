// ============================================================
// Dayce Worker — AI分析 + 認証 + クラウド同期
// ============================================================

// --- CORS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// --- Password hashing (PBKDF2, Web Crypto) ---
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function verifyPassword(password, salt, storedHash) {
  const h = await hashPassword(password, salt);
  return h === storedHash;
}

// --- JWT (HMAC-SHA256, Web Crypto) ---
function base64url(buf) {
  const str = typeof buf === "string" ? buf : btoa(String.fromCharCode(...new Uint8Array(buf)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJWT(payload, secret) {
  const enc = new TextEncoder();
  const header = base64url(btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(btoa(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(sig)}`;
}

async function verifyJWT(token, secret) {
  const enc = new TextEncoder();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  // Decode signature
  const sigStr = parts[2].replace(/-/g, "+").replace(/_/g, "/");
  const padded = sigStr + "=".repeat((4 - sigStr.length % 4) % 4);
  const sigBuf = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, sigBuf, enc.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) return null;
  const payloadStr = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const payloadPadded = payloadStr + "=".repeat((4 - payloadStr.length % 4) % 4);
  const payload = JSON.parse(atob(payloadPadded));
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

// --- Auth middleware ---
async function getAuthUser(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return verifyJWT(token, env.JWT_SECRET || "dayce-default-secret");
}

// --- Route handlers ---

// POST /api/auth/register
async function handleRegister(body, env) {
  const { email, password } = body;
  if (!email || !password) return json({ error: "メールアドレスとパスワードを入力してください" }, 400);

  const emailLower = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return json({ error: "メールアドレスの形式が正しくありません" }, 400);
  }
  if (password.length < 6) {
    return json({ error: "パスワードは6文字以上で設定してください" }, 400);
  }

  // Check if user exists
  const existing = await env.SYNC_KV.get(`user:${emailLower}`);
  if (existing) return json({ error: "このメールアドレスは既に登録されています" }, 409);

  // Create user
  const salt = emailLower; // Use email as salt (deterministic, unique per user)
  const passwordHash = await hashPassword(password, salt);
  await env.SYNC_KV.put(`user:${emailLower}`, JSON.stringify({
    passwordHash,
    createdAt: new Date().toISOString(),
  }));

  // Issue JWT (30 days)
  const token = await signJWT(
    { sub: emailLower, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 86400 },
    env.JWT_SECRET || "dayce-default-secret"
  );

  return json({ ok: true, token, email: emailLower, createdAt: new Date().toISOString() });
}

// POST /api/auth/login
async function handleLogin(body, env) {
  const { email, password } = body;
  if (!email || !password) return json({ error: "メールアドレスとパスワードを入力してください" }, 400);

  const emailLower = email.toLowerCase().trim();
  const userData = await env.SYNC_KV.get(`user:${emailLower}`);
  if (!userData) return json({ error: "メールアドレスまたはパスワードが正しくありません" }, 401);

  const user = JSON.parse(userData);
  const valid = await verifyPassword(password, emailLower, user.passwordHash);
  if (!valid) return json({ error: "メールアドレスまたはパスワードが正しくありません" }, 401);

  const token = await signJWT(
    { sub: emailLower, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 86400 },
    env.JWT_SECRET || "dayce-default-secret"
  );

  return json({ ok: true, token, email: emailLower, createdAt: user.createdAt || null });
}

// POST /api/auth/reset-password  (send reset email)
async function handleResetPassword(body, env) {
  const { email } = body;
  if (!email) return json({ error: "メールアドレスを入力してください" }, 400);

  const emailLower = email.toLowerCase().trim();
  const userData = await env.SYNC_KV.get(`user:${emailLower}`);

  // Always return success to prevent email enumeration
  if (!userData) return json({ ok: true, message: "リセットメールを送信しました" });

  // Generate reset token (6-digit code for simplicity)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await env.SYNC_KV.put(`reset:${emailLower}`, JSON.stringify({
    code,
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
  }), { expirationTtl: 1800 });

  // Send email via Resend
  if (env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_FROM || "Dayce <noreply@resend.dev>",
          to: [emailLower],
          subject: "Dayce パスワードリセット",
          html: `<p>パスワードリセットコード: <strong>${code}</strong></p><p>このコードは30分間有効です。</p><p>心当たりがない場合はこのメールを無視してください。</p>`,
        }),
      });
    } catch (e) {
      console.error("Resend error:", e);
    }
  }

  return json({ ok: true, message: "リセットメールを送信しました" });
}

// POST /api/auth/reset-confirm
async function handleResetConfirm(body, env) {
  const { email, code, newPassword } = body;
  if (!email || !code || !newPassword) return json({ error: "全ての項目を入力してください" }, 400);
  if (newPassword.length < 6) return json({ error: "パスワードは6文字以上で設定してください" }, 400);

  const emailLower = email.toLowerCase().trim();
  const resetData = await env.SYNC_KV.get(`reset:${emailLower}`);
  if (!resetData) return json({ error: "リセットコードが無効または期限切れです" }, 400);

  const reset = JSON.parse(resetData);
  if (reset.code !== code || Date.now() > reset.expiresAt) {
    return json({ error: "リセットコードが無効または期限切れです" }, 400);
  }

  // Update password
  const userData = await env.SYNC_KV.get(`user:${emailLower}`);
  if (!userData) return json({ error: "ユーザーが見つかりません" }, 404);

  const user = JSON.parse(userData);
  user.passwordHash = await hashPassword(newPassword, emailLower);
  await env.SYNC_KV.put(`user:${emailLower}`, JSON.stringify(user));
  await env.SYNC_KV.delete(`reset:${emailLower}`);

  // Issue new JWT
  const token = await signJWT(
    { sub: emailLower, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 86400 },
    env.JWT_SECRET || "dayce-default-secret"
  );

  return json({ ok: true, token, email: emailLower });
}

// POST /api/sync/upload
async function handleSyncUpload(body, env, user) {
  const { data, planLevel } = body;
  if (!data || typeof data !== "object") return json({ error: "データが不正です" }, 400);

  // プランレベルをユーザーレコードに保存（フロント→Worker同期）
  if (planLevel && ["free", "pro", "lite", "premium"].includes(planLevel)) {
    const userRaw = await env.SYNC_KV.get(`user:${user.sub}`);
    if (userRaw) {
      const userData = JSON.parse(userRaw);
      userData.planLevel = planLevel;
      await env.SYNC_KV.put(`user:${user.sub}`, JSON.stringify(userData));
    }
  }

  const syncedAt = new Date().toISOString();
  await env.SYNC_KV.put(`data:${user.sub}`, JSON.stringify({
    data,
    syncedAt,
  }));

  return json({ ok: true, syncedAt });
}

// GET /api/sync/download
async function handleSyncDownload(env, user) {
  const stored = await env.SYNC_KV.get(`data:${user.sub}`);
  if (!stored) return json({ data: null, syncedAt: null });

  const parsed = JSON.parse(stored);
  return json({ data: parsed.data, syncedAt: parsed.syncedAt });
}

// GET /api/sync/status
async function handleSyncStatus(env, user) {
  const stored = await env.SYNC_KV.get(`data:${user.sub}`);
  if (!stored) return json({ syncedAt: null });

  const parsed = JSON.parse(stored);
  return json({ syncedAt: parsed.syncedAt });
}

// --- キャラクタープロンプト（フロントから隠蔽） ---
const CHARACTER_PROMPTS = {
  harsh: `あなたは「マネージャー」というキャラクターです。元コンサルで、ロジカル思考・成果主義の鬼。一切の甘えを許さない。曖昧な振り返りには容赦なく詰める。数字と具体性を常に要求し、抽象的な表現は全て却下する。

口調バリエーション（毎回異なる表現を使い、同じフレーズの繰り返しを避けること）：
- 断定系：「〜しろ」「〜だろ」「〜だな」「当然だ」「言い訳は不要だ」
- 詰め系：「甘えるな」「論外だ」「で？再現性は？」「具体性がゼロだな」「それのどこが成果なんだ？」
- 要求系：「数字で示せ」「期限を切れ」「何を何回やるんだ」「KPIは？」「定量化しろ」
- 突き放し系：「俺が褒めるとでも思ったか？」「まだ道半ばだ」「次に繋げろ」「過程じゃなく結果で語れ」
- 煽り系：「この程度で満足か？」「もう一段上を目指せ」「本気はそんなもんじゃないだろ」「悔しくないのか？」

慰めや励ましは絶対にしない。相手が傷つくかどうかは一切考えず、事実と改善点だけを突きつける。アドバイスは常に「数値目標・期限・KPI」で語る。感情論は一切排除し、PDCAで回せ。`,

  normal: `あなたは「タクヤ先輩」というキャラクターです。28歳、IT企業勤務の頼れる兄貴肌。自分も失敗や挫折を経験してきたから、上から目線じゃなく実体験ベースで話す。

口調バリエーション（毎回異なる表現を使い、同じフレーズの繰り返しを避けること）：
- 共感系：「俺もそうだったけどさ」「あー、わかるわかる」「それめっちゃあるよな」「俺も前に同じことあってさ」「それキツいよな、マジで」
- カジュアル系：「〜じゃん」「〜っしょ」「〜だよな」「マジで」「ぶっちゃけ」「ってか」「なんだかんだ」
- 提案系：「やってみ？」「とりあえず5分だけやってみ」「まず○○からでいいっしょ」「騙されたと思ってやってみ」「小さくていいから一歩踏み出してみ？」
- 応援系：「いい感じじゃん！」「お、やるね〜」「それ結構すごいことだぞ？」「地味にそれ大事だよ」「ナイス判断」
- 背中押し系：「完璧じゃなくてOK、やったもん勝ち」「60点で十分」「考えすぎるより動いた方が早いって」「失敗してもまたやり直せばいいっしょ」「走りながら考えよう」

アドバイスの特徴：①まず共感する ②すぐできる具体的な行動を1つ提案する ③ハードル低めの第一歩を示す。考えさせるより「まず動こう」派。理由より行動。完璧を求めず「やったもん勝ち」のスタンス。`,

  gentle: `あなたは「ハナさん」というキャラクターです。26歳、心理学を学んだ穏やかな女性。傾聴と内省を大切にする。口調は柔らかく丁寧だけど距離は近い。

口調バリエーション（毎回異なる表現を使い、同じフレーズの繰り返しを避けること）：
- 受容系：「〜だよね」「そう感じるの、自然なことだよ」「うんうん、わかるよ」「その気持ち、大事にしていいと思う」「ちゃんと向き合えてるね」
- 気づき系：「〜かもね」「もしかして○○って感じてる？」「ふと思ったんだけど」「ここに書いてること、すごくいいヒントだと思う」「自分では気づいてないかもだけど」
- 提案系：「〜してみない？」「よかったら試してみて」「こういう考え方もあるかも」「焦らなくていいから、ちょっとずつね」「自分のペースでいいんだよ」
- 肯定系：「それに気づけてるだけですごいことだよ」「ちゃんと記録してるの偉いよ」「今日も自分と向き合えたね」「小さな一歩だけど、確実に進んでるよ」「自分を褒めてあげてね」
- 寄り添い系：「大丈夫だよ」「一人で抱え込まなくていいからね」「完璧じゃなくていい、そのままでいいんだよ」「疲れたら休んでいいんだよ」「あなたのペースで大丈夫」
- 内省促し系：「何がそう感じさせたんだろうね」「心が軽くなることって何かある？」「自分にとって一番大切なことって何だろう」「今の気持ち、もう少し言葉にしてみて」

アドバイスの特徴：①まず気持ちを受け止めて言語化する ②行動を急がせず「なぜそう感じたか」を一緒に探る ③小さな気づきや変化を見逃さず褒める ④自分を責めている相手には肯定の言葉を伝える。解決策を押しつけず、本人が自分で気づくのを待つ。心のケアが最優先。`,
};

// --- データ解釈ルール（フロントから隠蔽） ---
const DATA_INTERPRET_RULE = `※データ解釈ルール：行動ログは記録した事実です。通勤・移動・残業などはルーティンや義務であり、褒めるのは不自然です。運動・自炊・勉強・趣味など自発的な行動のみ前向きに評価してください。データが少ない場合は無理にデータに言及せず、ジャーナル内容に集中してください。
※目標と実績のギャップ：「目標と実績のギャップ」データがある場合、超過や未達成を具体的な数字で指摘してください。例: 食費目標3万円→実績3.2万円なら「食費が目標を2千円超えてる」等。行動目標に対し記録が少ない場合も「今週まだ1回しかやってない」等と言及してください。`;

const NO_ANALYSIS_RULE = `※重要ルール：
1. 絶対に【よかったこと】【改善したいこと】【気づいたこと】【もやっとしたこと】【明日のMUST】などのジャーナル分析フォーマットは使わないでください。普通の会話として、相談に対する回答だけを返してください。箇条書きや見出しのフォーマットも不要です。友達に相談されたときのように自然に回答してください。
2. ★最重要★ 記録データ優先の原則：ユーザーの実際の記録データ（行動ログ・支出記録など）が提供されている場合、そのデータに基づいた具体的なフィードバックを最優先してください。「食費が先週¥12,000かかっている」「運動が今週2回しかできていない」など、実際の数字を引用して話してください。一般論や抽象的なアドバイスではなく、ユーザー自身のデータから見える傾向・パターン・改善点を指摘してください。
3. データの解釈ルール：行動ログは「ユーザーが記録した事実」であり、すべてが良いこととは限りません。通勤・移動・残業などはルーティンや義務であり褒めるのは不自然です。運動・自炊・勉強・趣味など自発的な行動のみ前向きに評価してください。
4. テーマとデータの優先度：相談テーマが「行動・習慣」の場合は行動記録データをメインに分析し、目標は補助的に触れる程度にしてください。「お金・家計」の場合は支出・収入の具体的な数字と傾向をメインに分析してください。目標の内容ばかり話すのではなく、実際の記録データからわかることを中心にアドバイスしてください。
5. 目標と実績のギャップ：「目標と実績のギャップ」データがある場合、超過や未達成があれば具体的な数字で指摘してアドバイスしてください。`;

// --- Plan limits ---
const PLAN_LIMITS = {
  free:    { journal: 10, consult: 0, goalCoach: 1 },
  pro:     { journal: 9999, consult: 9999, goalCoach: 9999 },
  // 後方互換: 旧プラン
  lite:    { journal: 9999, consult: 9999, goalCoach: 9999 },
  premium: { journal: 9999, consult: 9999, goalCoach: 9999 },
};

// 初月特典: consult無制限、goalCoach 3回制限
const FIRST_MONTH_LIMITS = { journal: 9999, consult: 9999, goalCoach: 3 };

// 初月（登録から30日以内）かどうか判定
function isFirstMonth(createdAt) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - created) < 30 * 24 * 60 * 60 * 1000; // 30日
}

// AI使用回数チェック（認証ユーザーのみ）
async function checkAndIncrementUsage(env, email, aiType) {
  if (!email) return { allowed: true }; // 未認証 = フロントエンド側でのみ制限

  const userRaw = await env.SYNC_KV.get(`user:${email}`);
  if (!userRaw) return { allowed: true };

  const user = JSON.parse(userRaw);
  const plan = user.planLevel || "free";

  // 初月特典: 無料プランでも登録30日以内はFIRST_MONTH_LIMITS適用
  const firstMonth = (plan === "free") && isFirstMonth(user.createdAt);
  const limits = firstMonth ? FIRST_MONTH_LIMITS : (PLAN_LIMITS[plan] || PLAN_LIMITS.free);
  const limit = limits[aiType];
  if (limit === undefined) return { allowed: true };

  // 月間使用回数 KVキー
  const now = new Date();
  const monthKey = `usage:${email}:${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const usageRaw = await env.SYNC_KV.get(monthKey);
  const usage = usageRaw ? JSON.parse(usageRaw) : { journal: 0, consult: 0, goalCoach: 0 };

  const current = usage[aiType] || 0;
  if (limit !== 9999 && current >= limit) {
    return { allowed: false, current, limit, plan, firstMonth: false };
  }

  // フリープラン（初月除く）のjournal: 1日1回制限
  if (plan === "free" && !firstMonth && aiType === "journal") {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const dailyKey = `daily:${email}:${dateStr}:journal`;
    const dailyUsed = await env.SYNC_KV.get(dailyKey);
    if (dailyUsed) {
      return { allowed: false, current, limit, plan, firstMonth: false, dailyLimit: true };
    }
    await env.SYNC_KV.put(dailyKey, "1", { expirationTtl: 86400 });
  }

  // インクリメント
  usage[aiType] = current + 1;
  await env.SYNC_KV.put(monthKey, JSON.stringify(usage), { expirationTtl: 60 * 60 * 24 * 35 }); // 35日TTL
  return { allowed: true, current: current + 1, limit, firstMonth };
}

// --- AI Analyze ---
async function handleAnalyze(body, env, userEmail) {
  const { text, tone, type } = body;

  if (!text || typeof text !== "string") {
    return json({ error: "text is required" }, 400);
  }

  // AI種別マッピング
  const aiTypeMap = { journal: "journal", consult: "consult", goalCoach: "goalCoach" };
  const aiType = aiTypeMap[type] || "consult";

  // 認証ユーザーの回数制限チェック
  if (userEmail) {
    const usageCheck = await checkAndIncrementUsage(env, userEmail, aiType);
    if (!usageCheck.allowed) {
      const errMsg = usageCheck.dailyLimit ? "本日の利用回数に達しました（1日1回まで）" : "利用制限に達しました";
      return json({ error: errMsg, limitReached: true, dailyLimit: !!usageCheck.dailyLimit, current: usageCheck.current, limit: usageCheck.limit, plan: usageCheck.plan, aiType }, 429);
    }
  }

  const charPrompt = CHARACTER_PROMPTS[tone] || CHARACTER_PROMPTS.normal;
  const isConsult = (type === "consult");

  let system;
  if (isConsult) {
    // AI相談: テキスト応答、ジャーナル分析フォーマット禁止
    system = `${charPrompt}

${NO_ANALYSIS_RULE}

ユーザーの相談に対して、上記キャラクターになりきり、その口調で具体的・実用的にアドバイスしてください。

回答の分量ガイド:
- 400〜600文字を目安に、しっかり答えてください
- ★ユーザーの記録データが提供されている場合、必ずそのデータの具体的な数字や傾向に言及してアドバイスしてください（例: 「今月の食費¥15,000のうち外食が60%占めてるね」「今週運動が3回できてるのはいいペース」）
- 一般論ではなく、ユーザーの実際のデータに基づいたパーソナルなアドバイスを心がけてください
- まず記録データから見える事実・傾向を指摘する
- 次にそれに基づいた具体的なアドバイスを2〜3個挙げる
- 最後に背中を押す一言で締めくくる
- ただし冗長にならず、読みやすく段落分けする`;
  } else {
    // ジャーナル: JSON構造化応答
    system = `${charPrompt}

${DATA_INTERPRET_RULE}

ユーザーのジャーナル（日記テキスト）を読み、上記キャラクターになりきって深くフィードバックしてください。
ユーザーが送るテキストにデータ（行動記録・支出記録・目標）が含まれている場合、データ解釈ルールに従って評価してください。

出力は必ずJSONのみ（コードブロック禁止）。形式:
{
  "events": "よかったこと・ポジティブな出来事（箇条書き）",
  "learnings": "改善したいこと・学び（箇条書き）",
  "feelings": "気づいたこと・感情の整理（箇条書き）",
  "gratitude": "もやっとしたこと・気がかり（箇条書き）",
  "must": "明日の必須タスク（箇条書き）",
  "want": "明日できたらやりたいこと（箇条書き）",
  "oneLiner": "キャラクターとしての総評コメント（3〜5文）"
}
各フィールドは日本語。箇条書きは「・」で始め、各項目を1〜2文で具体的に書いてください。
該当がなければ空文字。
oneLinerは最も重要なフィールドです。今日の振り返りを踏まえて、キャラクターの口調で、ユーザーの行動への評価・明日に向けた具体的なアドバイス・背中を押す言葉を3〜5文で書いてください。`;
  }

  const requestBody = {
    model: env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: text },
    ],
    temperature: 0.6,
  };
  // journalのみJSON出力モード
  if (!isConsult) {
    requestBody.text = { format: { type: "json_object" } };
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return json({ error: data?.error?.message || "upstream error" }, 500);
  }

  // Responses API: output_text or output[].content[].text
  const outText = data.output_text
    || (data.output && data.output[0] && data.output[0].content && data.output[0].content[0] && data.output[0].content[0].text)
    || "";

  // consult: テキストそのまま返す / journal: JSONパースして返す
  if (isConsult) {
    return json({ result: outText });
  }

  let parsed = null;
  try {
    parsed = outText ? JSON.parse(outText) : null;
  } catch (e) {
    return json({ result: outText });
  }

  return json({ result: parsed });
}

// ============================================================
// Main router
// ============================================================
// --- Stripe Checkout Session 作成 ---
const STRIPE_PRICE_ID = "price_1T2q1bCfVwTOOprV3gZAmbPC";

async function handleStripeCheckout(body, env, user) {
  const { successUrl, cancelUrl } = body;
  if (!successUrl || !cancelUrl) {
    return json({ error: "successUrl と cancelUrl が必要です" }, 400);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "mode": "subscription",
      "line_items[0][price]": STRIPE_PRICE_ID,
      "line_items[0][quantity]": "1",
      "success_url": successUrl,
      "cancel_url": cancelUrl,
      "customer_email": user.sub,
      "metadata[email]": user.sub,
      "subscription_data[metadata][email]": user.sub,
    }).toString(),
  });

  const session = await res.json();
  if (session.error) {
    return json({ error: session.error.message }, 400);
  }
  return json({ url: session.url });
}

// --- Stripe Customer Portal Session 作成 ---
async function handleStripePortal(body, env, user) {
  const { returnUrl } = body;
  if (!returnUrl) {
    return json({ error: "returnUrl が必要です" }, 400);
  }

  // KVからstripeCustomerIdを取得
  const userRaw = await env.SYNC_KV.get(`user:${user.sub}`);
  if (!userRaw) {
    return json({ error: "ユーザーが見つかりません" }, 404);
  }

  const userData = JSON.parse(userRaw);
  if (!userData.stripeCustomerId) {
    return json({ error: "サブスクリプション情報が見つかりません。Stripeで決済した履歴がない可能性があります。" }, 400);
  }

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "customer": userData.stripeCustomerId,
      "return_url": returnUrl,
    }).toString(),
  });

  const session = await res.json();
  if (session.error) {
    return json({ error: session.error.message }, 400);
  }
  return json({ url: session.url });
}

// --- Stripe Webhook 受信 ---
async function handleStripeWebhook(request, env) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  // Webhook署名検証（STRIPE_WEBHOOK_SECRETが設定されている場合）
  if (env.STRIPE_WEBHOOK_SECRET && sig) {
    const verified = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
    if (!verified) {
      return new Response("Invalid signature", { status: 400 });
    }
  }

  const event = JSON.parse(body);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_email || (session.metadata && session.metadata.email);
    if (email) {
      const userRaw = await env.SYNC_KV.get(`user:${email}`);
      if (userRaw) {
        const userData = JSON.parse(userRaw);
        userData.planLevel = "pro";
        userData.stripeCustomerId = session.customer;
        userData.stripeSubscriptionId = session.subscription;
        await env.SYNC_KV.put(`user:${email}`, JSON.stringify(userData));
      }
    }
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    // メールアドレスで検索（metadataまたはcustomer_emailから）
    const email = subscription.metadata && subscription.metadata.email;
    if (email) {
      const userRaw = await env.SYNC_KV.get(`user:${email}`);
      if (userRaw) {
        const userData = JSON.parse(userRaw);
        if (event.type === "customer.subscription.deleted" || subscription.status === "canceled" || subscription.status === "unpaid") {
          userData.planLevel = "free";
        }
        await env.SYNC_KV.put(`user:${email}`, JSON.stringify(userData));
      }
    }
  }

  return new Response("ok", { status: 200 });
}

// Stripe Webhook 署名検証
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = {};
    sigHeader.split(",").forEach(item => {
      const [k, v] = item.split("=");
      parts[k.trim()] = v.trim();
    });
    const timestamp = parts["t"];
    const v1 = parts["v1"];
    if (!timestamp || !v1) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return expected === v1;
  } catch (e) {
    return false;
  }
}

// --- プラン状態取得 ---
async function handlePlanStatus(env, user) {
  const userRaw = await env.SYNC_KV.get(`user:${user.sub}`);
  if (!userRaw) return json({ plan: "free" });
  const userData = JSON.parse(userRaw);
  const plan = userData.planLevel || "free";
  const firstMonth = (plan === "free") && isFirstMonth(userData.createdAt);
  const limits = firstMonth ? FIRST_MONTH_LIMITS : (PLAN_LIMITS[plan] || PLAN_LIMITS.free);

  // 今月の使用回数を取得
  const now = new Date();
  const monthKey = `usage:${user.sub}:${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const usageRaw = await env.SYNC_KV.get(monthKey);
  const usage = usageRaw ? JSON.parse(usageRaw) : { journal: 0, consult: 0, goalCoach: 0 };

  return json({
    plan,
    firstMonth,
    limits,
    usage: { journal: usage.journal || 0, consult: usage.consult || 0, goalCoach: usage.goalCoach || 0 },
  });
}

// ============================================================
// Community Hub (記事 + カテゴリ交流)
// ============================================================

const ADMIN_EMAILS = ["sugaishu1412@gmail.com"];
function isAdmin(email) { return ADMIN_EMAILS.includes(email); }

const VALID_CATEGORIES = ["health","work","study","hobby","question","chat","result","tips"];

function randomId(prefix) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}_${Date.now()}_${r}`;
}

function reversedTimestamp() {
  return String(9999999999999 - Date.now()).padStart(13, "0");
}

async function communityRateLimit(env, email, action) {
  const limits = { post: 5, comment: 10, nickname: 3, article: 2 };
  const max = limits[action] || 5;
  const key = `ratelimit:${action}:${email}`;
  const raw = await env.SYNC_KV.get(key);
  if (raw) {
    const count = parseInt(raw);
    if (count >= max) return false;
    await env.SYNC_KV.put(key, String(count + 1), { expirationTtl: 60 });
  } else {
    await env.SYNC_KV.put(key, "1", { expirationTtl: 60 });
  }
  return true;
}

// --- Community: Me ---
async function handleCommunityGetMe(env, user) {
  const raw = await env.SYNC_KV.get(`user:${user.sub}`);
  if (!raw) return json({ nickname: null, email: user.sub, isAdmin: isAdmin(user.sub) });
  const data = JSON.parse(raw);
  return json({ nickname: data.nickname || null, email: user.sub, isAdmin: isAdmin(user.sub) });
}

async function handleCommunitySetMe(body, env, user) {
  const nickname = (body.nickname || "").trim();
  if (!nickname || nickname.length > 20) {
    return json({ error: "ニックネームは1〜20文字で入力してください" }, 400);
  }
  const ok = await communityRateLimit(env, user.sub, "nickname");
  if (!ok) return json({ error: "しばらく待ってからやり直してください" }, 429);
  const raw = await env.SYNC_KV.get(`user:${user.sub}`);
  const data = raw ? JSON.parse(raw) : {};
  data.nickname = nickname;
  await env.SYNC_KV.put(`user:${user.sub}`, JSON.stringify(data));
  return json({ ok: true, nickname });
}

// --- Community: Posts (Forum Threads) ---
async function handleCommunityGetPosts(url, env) {
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const category = url.searchParams.get("category") || null;

  const prefix = category && VALID_CATEGORIES.includes(category)
    ? `catindex:${category}:`
    : "postindex:";

  const listResult = await env.SYNC_KV.list({ prefix, limit, cursor: cursor || undefined });
  const posts = [];
  for (const k of listResult.keys) {
    const postId = await env.SYNC_KV.get(k.name);
    if (!postId) continue;
    const postRaw = await env.SYNC_KV.get(`post:${postId}`);
    if (postRaw) posts.push(JSON.parse(postRaw));
  }
  return json({
    posts,
    nextCursor: listResult.list_complete ? null : listResult.cursor,
    hasMore: !listResult.list_complete,
  });
}

async function handleCommunityCreatePost(body, env, user) {
  const title = (body.title || "").trim();
  const text = (body.body || "").trim();
  const category = body.category || "chat";

  if (!title || title.length > 100) return json({ error: "タイトルは1〜100文字で入力してください" }, 400);
  if (!text || text.length > 2000) return json({ error: "本文は1〜2000文字で入力してください" }, 400);
  if (!VALID_CATEGORIES.includes(category)) return json({ error: "無効なカテゴリです" }, 400);

  const ok = await communityRateLimit(env, user.sub, "post");
  if (!ok) return json({ error: "投稿の間隔を空けてください" }, 429);

  const userRaw = await env.SYNC_KV.get(`user:${user.sub}`);
  const userData = userRaw ? JSON.parse(userRaw) : {};
  const nickname = userData.nickname || "名無し";
  const now = new Date().toISOString();

  const postId = randomId("p");
  const post = {
    id: postId, author: user.sub, nickname, title, body: text,
    category, createdAt: now, lastActivity: now, commentCount: 0,
  };

  const ts = reversedTimestamp();
  await env.SYNC_KV.put(`post:${postId}`, JSON.stringify(post));
  await env.SYNC_KV.put(`postindex:${ts}`, postId);
  await env.SYNC_KV.put(`catindex:${category}:${ts}`, postId);

  return json({ ok: true, post });
}

async function handleCommunityDeletePost(body, env, user) {
  const { postId } = body;
  if (!postId) return json({ error: "postId が必要です" }, 400);
  const postRaw = await env.SYNC_KV.get(`post:${postId}`);
  if (!postRaw) return json({ error: "投稿が見つかりません" }, 404);
  const post = JSON.parse(postRaw);
  if (post.author !== user.sub && !isAdmin(user.sub)) return json({ error: "削除権限がありません" }, 403);

  await env.SYNC_KV.delete(`post:${postId}`);
  await env.SYNC_KV.delete(`comments:${postId}`);

  // Delete postindex
  const listResult = await env.SYNC_KV.list({ prefix: "postindex:" });
  for (const k of listResult.keys) {
    const val = await env.SYNC_KV.get(k.name);
    if (val === postId) { await env.SYNC_KV.delete(k.name); break; }
  }
  // Delete catindex
  if (post.category) {
    const catList = await env.SYNC_KV.list({ prefix: `catindex:${post.category}:` });
    for (const k of catList.keys) {
      const val = await env.SYNC_KV.get(k.name);
      if (val === postId) { await env.SYNC_KV.delete(k.name); break; }
    }
  }
  return json({ ok: true });
}

// --- Community: Comments (shared for posts & articles) ---
async function handleCommunityGetComments(targetId, env) {
  const raw = await env.SYNC_KV.get(`comments:${targetId}`);
  return json({ comments: raw ? JSON.parse(raw) : [] });
}

async function handleCommunityCreateComment(targetId, body, env, user) {
  const text = (body.body || "").trim();
  if (!text || text.length > 300) return json({ error: "コメントは1〜300文字で入力してください" }, 400);
  const ok = await communityRateLimit(env, user.sub, "comment");
  if (!ok) return json({ error: "コメントの間隔を空けてください" }, 429);

  // Verify target exists (post or article)
  const isArticle = targetId.startsWith("a_");
  const kvKey = isArticle ? `article:${targetId}` : `post:${targetId}`;
  const targetRaw = await env.SYNC_KV.get(kvKey);
  if (!targetRaw) return json({ error: "対象が見つかりません" }, 404);

  const userRaw = await env.SYNC_KV.get(`user:${user.sub}`);
  const userData = userRaw ? JSON.parse(userRaw) : {};
  const nickname = userData.nickname || "名無し";

  const comment = { id: randomId("c"), author: user.sub, nickname, body: text, createdAt: new Date().toISOString() };
  const commentsRaw = await env.SYNC_KV.get(`comments:${targetId}`);
  const comments = commentsRaw ? JSON.parse(commentsRaw) : [];
  comments.push(comment);
  await env.SYNC_KV.put(`comments:${targetId}`, JSON.stringify(comments));

  // Update commentCount + lastActivity
  const target = JSON.parse(targetRaw);
  target.commentCount = comments.length;
  if (!isArticle) target.lastActivity = new Date().toISOString();
  await env.SYNC_KV.put(kvKey, JSON.stringify(target));

  return json({ ok: true, comment });
}

async function handleCommunityDeleteComment(body, env, user) {
  const { targetId, commentId } = body;
  // 後方互換: postId もサポート
  const tId = targetId || body.postId;
  if (!tId || !commentId) return json({ error: "targetId と commentId が必要です" }, 400);

  const commentsRaw = await env.SYNC_KV.get(`comments:${tId}`);
  if (!commentsRaw) return json({ error: "コメントが見つかりません" }, 404);
  const comments = JSON.parse(commentsRaw);
  const target = comments.find(c => c.id === commentId);
  if (!target) return json({ error: "コメントが見つかりません" }, 404);
  if (target.author !== user.sub && !isAdmin(user.sub)) return json({ error: "削除権限がありません" }, 403);

  const filtered = comments.filter(c => c.id !== commentId);
  await env.SYNC_KV.put(`comments:${tId}`, JSON.stringify(filtered));

  // Update count
  const isArticle = tId.startsWith("a_");
  const kvKey = isArticle ? `article:${tId}` : `post:${tId}`;
  const parentRaw = await env.SYNC_KV.get(kvKey);
  if (parentRaw) {
    const parent = JSON.parse(parentRaw);
    parent.commentCount = filtered.length;
    await env.SYNC_KV.put(kvKey, JSON.stringify(parent));
  }
  return json({ ok: true });
}

// --- Community: Articles ---
async function handleCommunityGetArticles(url, env) {
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const filter = url.searchParams.get("filter") || "all";

  const listResult = await env.SYNC_KV.list({ prefix: "articleindex:", limit: limit + 10, cursor: cursor || undefined });
  const articles = [];
  for (const k of listResult.keys) {
    if (articles.length >= limit) break;
    const articleId = await env.SYNC_KV.get(k.name);
    if (!articleId) continue;
    const raw = await env.SYNC_KV.get(`article:${articleId}`);
    if (!raw) continue;
    const article = JSON.parse(raw);
    if (filter !== "all" && article.type !== filter) continue;
    articles.push(article);
  }
  return json({
    articles,
    nextCursor: listResult.list_complete ? null : listResult.cursor,
    hasMore: !listResult.list_complete,
  });
}

async function handleCommunityGetArticle(articleId, env) {
  const raw = await env.SYNC_KV.get(`article:${articleId}`);
  if (!raw) return json({ error: "記事が見つかりません" }, 404);
  return json({ article: JSON.parse(raw) });
}

async function handleCommunityCreateArticle(body, env, user) {
  const title = (body.title || "").trim();
  const text = (body.body || "").trim();
  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 5).map(t => String(t).trim().slice(0, 20)) : [];

  if (!title || title.length > 100) return json({ error: "タイトルは1〜100文字で入力してください" }, 400);
  if (!text || text.length > 5000) return json({ error: "本文は1〜5000文字で入力してください" }, 400);

  const ok = await communityRateLimit(env, user.sub, "article");
  if (!ok) return json({ error: "記事の投稿間隔を空けてください" }, 429);

  const userRaw = await env.SYNC_KV.get(`user:${user.sub}`);
  const userData = userRaw ? JSON.parse(userRaw) : {};
  const nickname = userData.nickname || "名無し";

  const articleId = randomId("a");
  const article = {
    id: articleId, author: user.sub, nickname, title, body: text,
    tags, type: isAdmin(user.sub) ? "admin" : "user",
    createdAt: new Date().toISOString(), commentCount: 0,
  };

  await env.SYNC_KV.put(`article:${articleId}`, JSON.stringify(article));
  await env.SYNC_KV.put(`articleindex:${reversedTimestamp()}`, articleId);

  return json({ ok: true, article });
}

async function handleCommunityDeleteArticle(body, env, user) {
  const { articleId } = body;
  if (!articleId) return json({ error: "articleId が必要です" }, 400);
  const raw = await env.SYNC_KV.get(`article:${articleId}`);
  if (!raw) return json({ error: "記事が見つかりません" }, 404);
  const article = JSON.parse(raw);
  if (article.author !== user.sub && !isAdmin(user.sub)) return json({ error: "削除権限がありません" }, 403);

  await env.SYNC_KV.delete(`article:${articleId}`);
  await env.SYNC_KV.delete(`comments:${articleId}`);
  const listResult = await env.SYNC_KV.list({ prefix: "articleindex:" });
  for (const k of listResult.keys) {
    const val = await env.SYNC_KV.get(k.name);
    if (val === articleId) { await env.SYNC_KV.delete(k.name); break; }
  }
  return json({ ok: true });
}

// ============================================================

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // --- Auth routes (POST, no JWT required) ---
      if (path === "/api/auth/register" && request.method === "POST") {
        const body = await request.json();
        return handleRegister(body, env);
      }
      if (path === "/api/auth/login" && request.method === "POST") {
        const body = await request.json();
        return handleLogin(body, env);
      }
      if (path === "/api/auth/reset-password" && request.method === "POST") {
        const body = await request.json();
        return handleResetPassword(body, env);
      }
      if (path === "/api/auth/reset-confirm" && request.method === "POST") {
        const body = await request.json();
        return handleResetConfirm(body, env);
      }

      // --- Stripe routes ---
      if (path === "/api/stripe/checkout" && request.method === "POST") {
        const user = await getAuthUser(request, env);
        if (!user) return json({ error: "ログインが必要です" }, 401);
        const body = await request.json();
        return handleStripeCheckout(body, env, user);
      }
      if (path === "/api/stripe/portal" && request.method === "POST") {
        const user = await getAuthUser(request, env);
        if (!user) return json({ error: "ログインが必要です" }, 401);
        const body = await request.json();
        return handleStripePortal(body, env, user);
      }
      if (path === "/api/stripe/webhook" && request.method === "POST") {
        return handleStripeWebhook(request, env);
      }
      if (path === "/api/plan/status" && request.method === "GET") {
        const user = await getAuthUser(request, env);
        if (!user) return json({ error: "ログインが必要です" }, 401);
        return handlePlanStatus(env, user);
      }

      // --- Community routes ---
      if (path.startsWith("/api/community/")) {
        // Public routes (no auth)
        if (path === "/api/community/posts" && request.method === "GET") {
          return handleCommunityGetPosts(url, env);
        }
        if (path === "/api/community/articles" && request.method === "GET") {
          return handleCommunityGetArticles(url, env);
        }
        const postCommentMatch = path.match(/^\/api\/community\/posts\/([^/]+)\/comments$/);
        if (postCommentMatch && request.method === "GET") {
          return handleCommunityGetComments(postCommentMatch[1], env);
        }
        const articleDetailMatch = path.match(/^\/api\/community\/articles\/([^/]+)$/);
        if (articleDetailMatch && request.method === "GET" && !articleDetailMatch[1].includes("/")) {
          return handleCommunityGetArticle(articleDetailMatch[1], env);
        }
        const articleCommentMatch = path.match(/^\/api\/community\/articles\/([^/]+)\/comments$/);
        if (articleCommentMatch && request.method === "GET") {
          return handleCommunityGetComments(articleCommentMatch[1], env);
        }

        // Auth-required routes
        const user = await getAuthUser(request, env);
        if (!user) return json({ error: "ログインが必要です" }, 401);

        if (path === "/api/community/me" && request.method === "GET") {
          return handleCommunityGetMe(env, user);
        }
        if (path === "/api/community/me" && request.method === "POST") {
          const body = await request.json();
          return handleCommunitySetMe(body, env, user);
        }
        if (path === "/api/community/posts" && request.method === "POST") {
          const body = await request.json();
          return handleCommunityCreatePost(body, env, user);
        }
        if (path === "/api/community/posts/delete" && request.method === "POST") {
          const body = await request.json();
          return handleCommunityDeletePost(body, env, user);
        }
        if (postCommentMatch && request.method === "POST") {
          const body = await request.json();
          return handleCommunityCreateComment(postCommentMatch[1], body, env, user);
        }
        if (path === "/api/community/articles" && request.method === "POST") {
          const body = await request.json();
          return handleCommunityCreateArticle(body, env, user);
        }
        if (path === "/api/community/articles/delete" && request.method === "POST") {
          const body = await request.json();
          return handleCommunityDeleteArticle(body, env, user);
        }
        if (articleCommentMatch && request.method === "POST") {
          const body = await request.json();
          return handleCommunityCreateComment(articleCommentMatch[1], body, env, user);
        }
        if (path === "/api/community/comments/delete" && request.method === "POST") {
          const body = await request.json();
          return handleCommunityDeleteComment(body, env, user);
        }
        return json({ error: "Not found" }, 404);
      }

      // --- Sync routes (JWT required) ---
      if (path.startsWith("/api/sync/")) {
        const user = await getAuthUser(request, env);
        if (!user) return json({ error: "ログインが必要です" }, 401);

        if (path === "/api/sync/upload" && request.method === "POST") {
          const body = await request.json();
          return handleSyncUpload(body, env, user);
        }
        if (path === "/api/sync/download" && request.method === "GET") {
          return handleSyncDownload(env, user);
        }
        if (path === "/api/sync/status" && request.method === "GET") {
          return handleSyncStatus(env, user);
        }
        return json({ error: "Not found" }, 404);
      }

      // --- AI analyze (existing, POST only) ---
      if (path === "/api/analyze" && request.method === "POST") {
        // オプションでJWT認証（認証ユーザーは回数制限をWorker側でも管理）
        const authUser = await getAuthUser(request, env);
        const userEmail = authUser ? authUser.sub : null;
        const body = await request.json();
        return handleAnalyze(body, env, userEmail);
      }

      // Fallback for legacy root POST (backward compat)
      if (request.method === "POST" && (path === "/" || path === "")) {
        const body = await request.json();
        return handleAnalyze(body, env, null);
      }

      // Default
      return new Response("Dayce API", { headers: corsHeaders });

    } catch (e) {
      return json({ error: String(e?.message || e) }, 500);
    }
  },
};
