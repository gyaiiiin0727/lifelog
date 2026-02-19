# Dayce PWA セッション引き継ぎ

## プロジェクト
- **アプリ名**: Dayce (Day + Voice) - ライフログPWA
- **場所**: `/Users/shuhei.sugai/Downloads/lifelog_pwa_ai_button_click_fix (1)/`
- **GitHub Pages**: gyaiiiin0727.github.io/lifelog
- **デプロイ方法**: SSH/gh CLI なし。GitHub Web で「Add file → Upload files」で手動アップロード

## 主要ファイル
| ファイル | 役割 |
|---|---|
| `index.html` | メインHTML/CSS/JS全部入り（~20000行, 1.7MB） |
| `goal-ai-breakdown.js` | AI目標設定チャット機能 |
| `goals-v2.js` | 目標ページUI（進捗カード、日付ベースタスク、目標リスト）**← 最終的にwindow関数を支配** |
| `manifest.json` | PWA設定 |
| `icon.jpg` | アプリアイコン |
| `cloud-sync.js` | クラウド同期UI + 認証（`window.CloudSync`） |
| `*.backup` | 各ファイルのバックアップ（最新状態） |

## バックエンドAPI
- **Worker URL**: `https://lifelog-ai.little-limit-621c.workers.dev`
- **Worker名**: `lifelog-ai`（wrangler.tomlの `name`）
- **Worker ソース**: `/Users/shuhei.sugai/Downloads/pwa_with_ai_and_worker_package/worker/src/worker.js`
- **Cloudflare Workers + KV**
- **KV binding**: `SYNC_KV` (id: `2f01eec6f13849b2a0eb4546c2ffc00c`)
- **Secrets**: `OPENAI_API_KEY`, `JWT_SECRET`, `RESEND_API_KEY`(optional), `RESEND_FROM`(optional)

### エンドポイント一覧
| Method | Path | 認証 | 用途 |
|---|---|---|---|
| POST | `/api/analyze` | 不要 | AI分析（journal/consult） |
| POST | `/api/auth/register` | 不要 | ユーザー登録 |
| POST | `/api/auth/login` | 不要 | ログイン |
| POST | `/api/auth/reset-password` | 不要 | パスワードリセット要求 |
| POST | `/api/auth/reset-confirm` | 不要 | パスワードリセット確認 |
| POST | `/api/sync/upload` | JWT必須 | データアップロード |
| GET | `/api/sync/download` | JWT必須 | データダウンロード |
| GET | `/api/sync/status` | JWT必須 | 同期状態確認 |

### AI Analyze API
- Body: `{ text, tone, type:'consult'|'journal' }`
- `type: 'journal'` → JSON構造化応答（`{ events, learnings, feelings, gratitude, must, want, oneLiner }`）
- `type: 'consult'` → テキスト応答（ジャーナル分析フォーマット禁止）
- `tone`: 'harsh'|'normal'|'gentle' — Worker側でキャラクタープロンプト注入
- **AIプロンプトはすべてWorker側に格納**（フロントエンドから完全除去済み）
  - `CHARACTER_PROMPTS` — 3キャラの口調定義
  - `DATA_INTERPRET_RULE` — データ解釈ルール（ジャーナル用）
  - `NO_ANALYSIS_RULE` — 分析フォーマット禁止ルール（相談用）

### 認証の仕組み
- パスワードハッシュ: PBKDF2 (Web Crypto API, 100000 iterations, SHA-256)
- JWT: HMAC-SHA256, 30日有効期限
- KVキー: `user:{email}`, `data:{email}`, `reset:{email}`

## アクセントカラー
- Primary: `#2196F3`（Material Design Blue、ロゴのマイク色と統一）
- Dark/Hover: `#1976D2`
- Light BG: `#e3f2fd`
- Very Light: `#e8f4fd`
- Pressed: `#bbdefb`
- Medium: `#90caf9`
- Muted text: `#78a8d8`

## AIキャラクター
| tone | 名前 | カラー | localStorage |
|---|---|---|---|
| harsh | マネージャー | #e74c3c | `journalFeedbackTone` (ジャーナル用) |
| normal | タクヤ先輩 | #4a90e2 | `aiConsultTone` (AI相談用、独立) |
| gentle | ハナさん | #27ae60 | |

## 目標コードの現状（リファクタリング完了済み）

### 一本化完了
以前は4箇所に分散していた目標コードを **goals-v2.js に一本化済み**。
index.html 内の古い3ブロックは全て削除済み（コメントのみ残存）。

### アーキテクチャ
```
読み込み順: index.html → goal-ai-breakdown.js → goals-v2.js（最終勝者）
```

- goals-v2.js が全ての目標関連 window 関数を上書き
- `App.modules.goals = { onShow: renderAll }` で Level 2 scaffold を上書き
- CSS は goals-v2.js 内で `gv2-*` 名前空間で動的注入（index.html の旧 goal CSS は全削除済み）

### 日付ベース weeklyTasks（完了済み）
- 旧: `weeklyTasks[].week` = `"2026-W07"`（週キー）
- 新: `weeklyTasks[].date` = `"2026-02-16"`（日付ベース）
- `migrateWeeklyTasksToDate()` で既存データの自動移行あり（初回実行時）

### goals-v2.js の主要関数
| window 関数 | 内容 |
|---|---|
| `changeGoalsMonth(dir)` | 月切替 |
| `addGoal()` | 目標追加 |
| `toggleGoalComplete(id)` | 目標の完了/未完了トグル |
| `deleteGoal(id)` | 目標削除 |
| `renderGoals()` | 全体レンダリング（= renderAll） |
| `updateGoalsMonthDisplay()` | 月表示更新 |
| `getTodayTaskStats()` | 今日のタスク達成度（ダッシュボード用） |
| `getWeeklyTaskStats()` | 今週のタスク達成度（後方互換） |

### カレンダー連動（完了済み・セッション6で改修）
- カレンダータブにホーム画面タスク（MUST/WANT）情報を表示
- タスクがある日に青い左ボーダー + `done/total` 数字表示
- 全完了時は緑色表示
- **データソース**: `journalEntriesV3[前日の日付].summary.must/want`（ホーム画面と同じ）
- **チェック状態**: `taskChecks_YYYY-MM-DD` の localStorage から取得
- 日クリック → モーダルにMUST/WANTタスク一覧（閲覧専用、disabled チェックボックス）
- 旧goal連動関数（`getTasksForDate`, `getTaskDatesForMonth`, `_gv2AddTaskDirect`）はカレンダーからは使用しなくなったが、goals-v2.js内に残存（他で使用可能性あり）

### FABドラッグ移動（完了済み）
- FAB（+ボタン）をドラッグで自由に移動可能
- 位置は `localStorage('fabPosition')` に保存・復元
- ドラッグ閾値 8px でタップとドラッグを判別
- `touch-action: none` で意図しないスクロール防止
- 編集モード中はFABを非表示（タップ干渉防止）

### goal-ai-breakdown.js の変更点
- `getWeekKeyOffset` → 削除
- `distributeDates(taskCount, weekOffset)` 追加 — 月の残り日数でタスクを均等分散
- タスク追加時は `.date` フィールドを使用

## ホーム画面ダッシュボード
- 「今週のタスク」カード: `getWeeklyTaskStats()` で今週（月〜日）のタスク達成率を%表示
- ダッシュボード更新関数が **2箇所** ある（ES6版 ~L13900, ES5版 ~L16700）。両方を更新すること
- HTML要素: `#dashGoalProgress`（%表示）, `#dashGoalCount`（n/m 完了）

## AIフィードバック連動の仕組み
- ジャーナルAIは `buildContextSummary('other')` で全データをプロンプトに含める
- AI相談は `buildContextSummary(topic)` でトピック別にデータを絞り込む（ただし目標は全トピックで含む）
- `summarizeGoalVsReality()` が目標テキストからキーワード検出し、お金/行動の実績とクロスチェック
- **AIプロンプト（`dataInterpretRule`, `noAnalysisRule`, `characterPrompt`）はすべてWorker側に移行済み**
  - フロントエンドには一切残っていない（コメントで「Worker側に移行済み」と記載）
  - 変更はWorker（`worker.js`）のみで行う

## 今回のセッション（2回分+α）で完了した修正

### A. 目標コードリファクタリング（4ステップ全完了）
1. index.html 内の古い目標コード3ブロック削除
2. goals-v2.js に `App.modules.goals` 登録
3. weeklyTasks を日付ベースに変更 + データ移行ロジック
4. 日付ごとタスク表示UI（曜日チップ、日付ラベル）

### B. ホーム画面改善
- 「今週のタスク」→「今日のタスク」に変更（`getTodayTaskStats()` 新設）

### C. バグ修正（6件）
1. `setupDOM` 二重実行防止（`goalsV2Container` 存在チェック）
2. `goalStatus` ID重複解消（旧要素を `remove()`）
3. `hasAnyTask` ロジック修正（タスク0でも `true` になっていたバグ）
4. カテゴリ名のXSSエスケープ（`esc()` 追加）
5. `showStatus` null crash防止（`if (!statusEl) return` 追加）
6. `distributeDates` ゼロ除算ガード（`taskCount <= 0` 早期リターン）

### D. 死んだCSS削除（約400行）
- 旧 `.goal-item`, `.goal-header`, `.progress-bar-*`, `.goals-*-section` 等の CSS を全削除
- 他モジュールと混在していたルールから goal セレクタだけ外科的に除去
- v36.8 journal MUST/WANT CSS は保持

### E. カレンダー × タスク連動（全4ステップ完了）
1. goals-v2.js にカレンダー用ヘルパー3関数追加（`getTasksForDate`, `getTaskDatesForMonth`, `_gv2AddTaskDirect`）
2. index.html にカレンダー用CSS追加（`.has-tasks`, `.calendar-day-tasks`, `.all-done`）
3. `renderCalendar()` 修正 — 日セルにタスク数表示（青ボーダー＋done/total）
4. `showCalendarDetailModal()` 修正 — タスク一覧・完了トグル・追加ボタン

### F. タスクボタンのタップ改善（3段階）
1. タスク関連CSS定義追加（`.task-item`, `.task-checkbox` 等、min 44x44px タップターゲット）
2. 編集モード中にFABを非表示（z-index干渉防止）
3. FABドラッグ移動機能追加（位置をlocalStorageに保存）

### G. FABドラッグ修正（!important問題）
- L3578の `right: 12px !important` / `bottom: 24px !important` がインラインstyleを上書きしドラッグ不能だった
- `!important` 付きの位置CSSを削除、ドラッグ計算式のY方向バグも修正

### H. カレンダー右はみ出し修正
- `.tab-content` に `overflow-x: hidden` 追加
- `#goals .simple-month-display` の `min-width:140px` → `min-width:0; flex:1 1 auto`
- `#goals .simple-month-selector` に `max-width:100%; overflow:hidden` 追加

### I. AIフィードバック × 目標・行動・お金の連動強化
- **既存**: ジャーナルAIは既に行動/お金/目標データを `buildContextSummary('other')` でプロンプトに含めていた
- **問題**: 指示が弱くAIが目標と実績のギャップを具体的に指摘しなかった
- **修正1**: `summarizeGoalVsReality()` 新関数追加 — 目標テキストからキーワード検出し支出/行動の実績と比較
  - お金キーワード（食費、節約等）→ 該当カテゴリの月間支出と比較、超過を検出
  - 行動キーワード（運動、勉強等）→ 該当カテゴリの週間実績と比較、記録なしを検出
  - 出力例: `[目標と実績のギャップ] ⬜ 食費を月3万以内に → 食費目標¥30,000 → 実績¥32,000（⚠️超過）`
- **修正2**: `dataInterpretRule` にギャップ指摘指示を追加（ES5版/ES6版の両方）
- **修正3**: `buildContextSummary` の topic='money'/'activity' でも目標データ（`summarizeGoals`）を含めるように変更
- **修正4**: AI相談 `noAnalysisRule` にもギャップ指摘ルール追加

### J. タスク「MUST」「翌週」ボタン追加 + ホーム画面連動
- 各タスク行に [MUST]（ホーム画面のMUSTに追加）と [翌週]（翌週に持ち越し）テキストボタンを追加
- `copyToToday(goalId, taskId)` — confirm確認後、昨日のジャーナル `summary.must` にテキスト追加 → ホーム「今日のタスク」MUSTに表示
- `carryToNextWeek(goalId, taskId)` — confirm確認後、タスクの日付を+7日に移動
- 完了済みタスクにはボタン非表示
- チェック状態のインデックスずれ防止（新規追加時に明示的に `false` 設定）
- window公開: `_gv2CopyToToday`, `_gv2CarryToNextWeek`
- **重要**: ホーム画面の「今日のタスク」は `journalEntriesV3[昨日の日付].summary.must/want` から表示。目標の `weeklyTasks` とは別システム。
- ホーム画面ダッシュボードの「今週のタスク %」は `getWeeklyTaskStats()` で目標の weeklyTasks から計算

### K. その他
- 空 `<script>` タグ修正（L13831、元から存在していた問題）
- 未使用関数 `getDateOffset` 削除（goal-ai-breakdown.js）

## 3つのタスクシステム（重要な設計メモ）

このアプリにはタスクに関する3つの独立システムがある。混同しないこと。

### 1. ホーム「今日のタスク」MUST/WANT
- **データソース**: `journalEntriesV3[昨日の日付].summary.must` / `.want`
- **形式**: 改行区切りのテキスト（`\n`で分割して表示）
- **日付キー**: `getTaskDateKey()` → **昨日の日付**（「明日やること」を昨日のジャーナルに書くため）
- **チェック状態**: `taskChecks_YYYY-MM-DD`（今日の日付）のlocalStorageにインデックスベースで保存
  - ID例: `homeMustTask0`, `homeMustTask1`, `homeWantTask0`
- **表示関数**: `renderHomeTodayTasks()`（index.html L6728-6824付近）

### 2. 目標「今週やること」weeklyTasks
- **データソース**: `monthlyGoals[].weeklyTasks[]`
- **形式**: `{ id: timestamp, text: string, date: "YYYY-MM-DD", done: boolean }`
- **表示関数**: `renderWeekly()`（goals-v2.js内）
- **操作**: MUSTボタン → システム1に追加、翌週ボタン → date+7日

### 3. ダッシュボード「今週のタスク %」
- **データソース**: `monthlyGoals[].weeklyTasks[]`（システム2と同じデータ）
- **計算関数**: `getWeeklyTaskStats()`（goals-v2.js内）
- **範囲**: 今週の月曜〜日曜の weeklyTasks を集計
- **表示**: `#dashGoalProgress`（%）, `#dashGoalCount`（n/m）

### システム間の連携
```
AI目標チャット → distributeDates() → weeklyTasks に追加（システム2）
                                         ↓
                                    ダッシュボード%に反映（システム3）
                                         ↓
                              ユーザーが[MUST]ボタン押す
                                         ↓
                              journalEntriesV3.summary.mustに追加（システム1）
                                         ↓
                              ホーム画面「今日のタスク」に表示
```

## 未解決・今後の課題

### 次にやること（セッション9）
**優先度高（ユーザーから依頼済み）：**
1. ~~**レポートのカテゴリ詳細タップ → 履歴ポップアップ表示**~~ ✅ 完了（セッション9）
2. ~~**無料プランのジャーナル回数変更**~~ ✅ 完了（セッション9）— 月30回 + 1日1回制限
3. ~~**価格を¥390 → ¥500に変更**~~ ✅ 完了（セッション9）— price_id: `price_1T2NU42QTqqbetSWpGPn3xnT`
4. ~~**無料会員は過去30日分のみ閲覧可能**~~ ✅ 完了（セッション9）

**優先度中：**
5. ~~**課金システム**（Stripe連携）~~ ✅ 完了（セッション8）
6. **解約フロー**（Stripe Customer Portal連携）
7. **コード難読化**
8. **利用規約・プライバシーポリシー**
9. **Resend連携**（パスワードリセットメール送信）← 現在はコード直接通知のフォールバック
10. **本番モード切替**（Stripe本番APIキー・価格ID・Webhookに差し替え）

### 有料プラン確定内容（セッション9で更新予定）

**セッション9で変更済み**: ジャーナル無料回数 15回→30回(1日1回)、価格¥390→¥500、過去30日制限追加

| 機能 | 無料 | プロ（月500円） |
|---|---|---|
| 記録（行動/お金/体重/ジャーナル） | ✅ 無制限 | ✅ |
| カレンダー・レポート | ✅ | ✅ |
| 過去データ閲覧 | **30日分** | **無制限** |
| 目標・タスク管理 | ✅ | ✅ |
| JSONバックアップ/復元 | ✅ | ✅ |
| ジャーナルAI「心を整える」 | **1日1回（月30回）** | **無制限** |
| AI相談チャット | ❌ | **無制限** |
| AI目標コーチ | **月1回** | **無制限** |
| キャラクター選択 | タクヤ先輩のみ | ✅ 3種 |
| CSVダウンロード | ❌ | ✅ |
| クラウド同期 | ✅ | ✅ |

#### 実装メモ
- 回数カウントは `localStorage` + Worker側で二重チェック（改ざん防止）
- 月初リセット（`aiUsage_YYYY-MM` キーで管理）
- ジャーナル日次制限（`aiDaily_YYYY-MM-DD` キーで管理、無料プランのみ）
- `planLevel: 'free'|'pro'`（旧 'lite'/'premium' は 'pro' にマッピング）
- キャラクター制限: 無料ユーザーは tone='normal' のみ送信可能
- Stripe商品ID: `prod_U0JNaY75j8VPFM`（サンドボックス）
- Stripe価格ID: `price_1T2NU42QTqqbetSWpGPn3xnT`（¥500/月 recurring）
- Stripe APIキー: テスト用 `pk_test_...` / `sk_test_...` 取得済み
- 過去30日閲覧制限: `DaycePlan.isMonthViewable()` / `isDateViewable()` で判定

### セッション4-5で合意した方針
- **認証方式**: 合言葉版はスキップ。**メール+パスワード認証で実装済み**（セッション5完了）
  - PBKDF2 + JWT で本番品質
  - Google認証は「あると便利」レベル。ユーザーが増えて要望が出たら後から追加
  - PWAではGoogle認証のポップアップが不安定（特にiOS）なのでメルパスが安定
- **AIプロンプトのサーバー移行**: 完了済み（セッション5）。フロントエンドからプロンプト完全除去
- **PWAアイコン更新**: キャッシュが強い。ホーム画面から削除→再追加が確実。manifest.jsonにバージョンパラメータ追加も有効

### 販売準備ロードマップ

ユーザーは**アプリの販売を考えている**。以下の優先順で進める合意あり。

#### ステップ① クラウド同期（メール+パスワード認証版）✅ 完了
- **実装完了**: 認証（register/login/reset）+ 同期（upload/download/status）
- **認証方式**: PBKDF2パスワードハッシュ + JWT (HMAC-SHA256, 30日有効)
- **バックエンド**: Cloudflare Worker (`lifelog-ai`) + KV (`SYNC_KV`)
- **フロントエンド**: `cloud-sync.js` → `window.CloudSync` オブジェクト公開
- **UI配置**: AI相談タブ内、CSVダウンロードの下・データ管理の上
- **同期対象localStorage キー**:
  - 同期する: `activities`, `moneyRecords`, `journalEntriesV3`, `monthlyGoals`, `weightRecords`, `activityCategories`, `expenseCategories`, `incomeCategories`, `journalFeedbackTone`, `aiConsultTone`, `aiConsultHistory`
  - 同期しない（デバイス固有）: `fabPosition`, `lastActiveTab`, `taskChecks_*`, `isPremium`, `journalAiEndpoint`
- **新規localStorageキー**: `syncAuthToken`, `syncAuthEmail`, `syncLastSynced`
- **競合解決**: Last-Write-Wins（タイムスタンプベース）
- **KV制限**: 無料枠（読み取り10万回/日、書き込み1000回/日、値サイズ上限25MB）→ 個人利用で十分
- **パスワードリセット**: Resend未設定時はコンソールにコード出力（フォールバック）

#### ステップ② AIプロンプトのサーバー移行 ✅ 完了
- `CHARACTER_PROMPTS`（harsh/normal/gentle）→ Worker側に移行
- `DATA_INTERPRET_RULE`（データ解釈ルール）→ Worker側に移行
- `NO_ANALYSIS_RULE`（分析フォーマット禁止ルール）→ Worker側に移行
- フロントエンド（index.html, goal-ai-breakdown.js）から完全除去
- `type: 'journal'` → JSON応答 / `type: 'consult'` → テキスト応答 の分岐もWorker側
- `oneLiner`（コメント）を3〜5文に強化

#### ステップ③ Googleログイン追加（オプション、販売後）
- 現在のメール+パスワード認証にGoogle OAuthを追加可能
- Google Cloud Console でOAuthクライアントID作成が必要
- `isPremium` をサーバー側で管理（現在はlocalStorageで改ざん可能）
- メールアドレスでユーザー特定 → 課金連携

#### ステップ④ 課金システム（販売前）
- Stripe/RevenueCat等で月額課金
- 無料版と有料版の機能線引き

#### ステップ⑤ コード難読化（販売前）
- JavaScript難読化ツールで読みにくくする
- 完全防御は不可能だが、カジュアルコピー防止

#### ステップ⑥ 利用規約・プライバシーポリシー（販売前）
- 個人データを扱うので法的に必須

#### ステップ⑦ アナリティクス（販売後）
- Mixpanel等でどの機能が使われているか把握

#### ステップ⑧ App Store対応（販売後）
- TWA/Capacitorでストア公開を検討

### その他の改善候補
- **カテゴリと目標の連動（UI面）**: 目標カテゴリを行動カテゴリと統一する、行動記録時に関連目標を表示する
- **コード分割**: index.htmlが2万行は保守が厳しい。ファイル分割+ビルドツール導入
- **テスト追加**: 課金周りにバグがあると致命的
- **CI/CD導入**: 手動アップロードだとミスが起きやすい
- **オンボーディング**: 初回起動時の使い方ガイド
- **多言語対応**: 海外展開を考えるなら

### 既知の残留（低優先）
- **旧`journals`キー（L6088, L6116, L6999）**: 古い保存機能が残存。メイン機能はjournalEntriesV3なので直接影響なし
- **Level 2 scaffold の App.modules.goals**: index.html ~L11399 に旧定義が残るが goals-v2.js が上書きするので無害
- **旧HTML要素**: `#goalsList`, `#goalsProgress` は orphaned だが `display:none` で非表示のため無害
- **深夜の日跨ぎ**: `currentWeekMonday` がリロードするまで更新されない（軽微）
- **データ移行時**: 旧データの全タスクが月曜日に集中する（新規データには影響なし）

## localStorage キー一覧
| キー | 内容 |
|---|---|
| `activities` | 行動ログ配列 |
| `moneyRecords` | お金の記録配列 |
| `journalEntriesV3` | ジャーナル（日付キーのオブジェクト） |
| `monthlyGoals` | 月間目標配列（weeklyTasks含む、日付ベース） |
| `weightRecords` | 体重記録配列 |
| `activityCategories` | 行動カテゴリ |
| `expenseCategories` | 支出カテゴリ |
| `incomeCategories` | 収入カテゴリ |
| `journalFeedbackTone` | ジャーナルのフィードバック担当 |
| `aiConsultTone` | AI相談のキャラクター選択（独立） |
| `lastActiveTab` | 最後に開いたタブ |
| `isPremium` | 有料会員フラグ（旧。planLevelとの後方互換あり） |
| `planLevel` | プランレベル: 'free'\|'pro'（旧lite/premiumはproにマッピング） |
| `aiUsage_YYYY-MM` | AI月間使用回数 JSON `{journal:n, consult:n, goalCoach:n}`（セッション7で追加） |
| `fabPosition` | FABボタンの位置 `{x, y}` |
| `syncAuthToken` | クラウド同期用JWTトークン |
| `syncAuthEmail` | クラウド同期用メールアドレス |
| `syncLastSynced` | 最終同期日時（ISO文字列） |

## 今回のセッション（セッション3）の議論記録

### 前セッションの修正確認
- MUST表示・confirmポップアップ・チェックボックスの3つの修正は全て goals-v2.js に反映済み
- ユーザーのアップロード後の動作確認待ち → そのままクラウド同期の議論に移行

### クラウド同期の方針決定
1. ユーザーの当初の希望: 「治ったらクラウド同期をしたい」
2. 認証方式の比較検討: Google, 合言葉, メールリンク, デバイスID+QR
3. ユーザーから「販売を見据えている」との情報 → 方針見直し
4. **最終合意**: まず合言葉で実装 → 販売が具体化したらGoogleログインに切り替え
   - 理由: 合言葉ならすぐ動く、データ構造は同じなので切り替え容易

### 販売に向けたロードマップ策定
- 8ステップのロードマップを作成（詳細は「未解決・今後の課題」セクション参照）
- 特に重要: AIプロンプトのサーバー移行（コードから丸見え問題）
- コード難読化、課金システム、利用規約等も必要

### このセッションでのコード変更

#### L. 目標設定AIチャットを「今月中」ベースに変更
**ファイル: `goal-ai-breakdown.js`**
- `weeklyPlanRule`: 「4週間分の計画」→「○月末（残りN日間）の計画」に変更
- 残り日数に応じてフェーズ数を自動調整:
  - 7日以下 → 「今月中」（1フェーズ）
  - 14日以下 → 「前半/後半」（2フェーズ）
  - 21日以下 → 「第1週/第2週/第3週」（3フェーズ）
  - 22日以上 → 「第1週〜第4週」（4フェーズ）
- 全AIプロンプト: 「4週間後」→「○月末」に統一
- `parseWeeklyPlan()`: 「前半」「後半」「今月中」ヘッダーにも対応するよう拡張
- `showWeeklyPlanSelection()`: ラベルを動的生成、ボタン文言を「○月の計画を追加」に変更
- `distributeDates()` は既に月の残り日数ベースなので変更不要

#### M. ジャーナルまとめ「整える一言」→キャラ名コメント
**ファイル: `index.html`**
- HTML初期値 `💬 整える一言` → `💬 コメント` に変更（L5376）
- 動的設定（L11918, L8994, L11965）は既に `💬 キャラ名 の一言` だったので変更不要
- AIの出力パース `【整える一言】` はそのまま維持（AI出力フォーマットに影響させない）

#### N. ステップ入力「今日は何があった？」を削除
**ファイル: `index.html`**
- STEPSから `facts` ステップを削除（7ステップ→6ステップ、L12032）
- フリートークのヒントリストから「今日あったこと」→「よかったこと」に差し替え（L5266）
- まとめ表示から「今日あったこと」行を削除（L5367の `todaySumFacts` 行）
- `renderTodaySummary` から `set('todaySumFacts', ...)` を削除（L11877）

## セッション4の変更記録

### O. AIチャット「4週間」残り漏れ修正（完全除去）
**ファイル: `goal-ai-breakdown.js`**
- セッション3で `weeklyPlanRule` と `buildPrompt` は月ベースに変更済みだったが、3箇所に「4週間」が残留していた
- L544: `4週間の計画を提案しますね` → `○月末までの計画を提案しますね`（動的）
- `sendFinalProposal()` のプロンプト: 「4週間分の行動計画」+「【1週目】〜【4週目】」→ 残り日数に応じた動的フェーズ（buildPromptと同じロジック）
- 追加完了メッセージ: `4週間の計画に追加しました` → `今月の計画に追加しました`
- ファイル内に「4週間」の文字列はゼロ

### P. ジャーナル保存時にホーム「今日のタスク」の達成状況を記録
**ファイル: `index.html`**
- `getHomeTodayTaskRecord()` 関数を新設（L6727付近）
  - `taskChecks_YYYY-MM-DD` からチェック状態を取得
  - 昨日のジャーナルのMUST/WANTタスクを完了/未完了に分類
  - 戻り値: `{ done: ['MUST: タスク名', ...], undone: ['WANT: タスク名', ...] }` or `null`
  - `window.getHomeTodayTaskRecord` として公開
- AI結果保存の**2箇所**（ES5版/ES6版）で `entry.summary.taskRecord` に保存
  - ES5版: L12300付近の `entry.updatedAt` の直前
  - ES6版: L12642付近の `entry.updatedAt` の直前
- まとめ表示HTML（L5371付近）に「完了タスク」(緑背景)「未完了タスク」(オレンジ背景) セクション追加
  - HTML ID: `todaySumTaskRecord`（wrapper）, `todaySumTaskDone`, `todaySumTaskUndone`
  - `taskRecord` がない場合は非表示
- `renderTodaySummary` にタスクレコード表示ロジック追加

### Q. 目標タスクの日付表示を簡略化
**ファイル: `goals-v2.js`**
- 曜日チップ（日付ヘッダー `gv2-day-header`）を非表示（HTML生成を削除）
- 各タスク横の日付ラベル（`2/17(月)` 形式）を非表示
- 関連CSS（`.gv2-day-header`, `.gv2-day-chip` 等）を削除
- **内部の `date` フィールドは保持** → カレンダー連動・翌週持ち越し・統計計算は全て正常動作
- タスク追加は「＋ 追加」ボタンから引き続き可能（`addWeeklyTask` 内で `todayStr()` を自動設定）

### R. スワイプでタブ切替
**ファイル: `index.html`**
- `switchTab` 関数直後にスワイプハンドラを即時実行関数で追加
- タブ順: `['home', 'activity', 'money', 'reportActivity', 'reportMoney', 'journal', 'goals', 'aiConsult']`
- 左スワイプ → 次のタブ、右スワイプ → 前のタブ
- 無効化条件:
  - フォーム入力中（input/textarea/select）
  - モーダル・AIチャットUI・スライダー上（`.modal`, `.gai-container` 等）
- スワイプ判定パラメータ:
  - 最低距離: 50px
  - 最大時間: 400ms
  - 角度制限: 水平方向30度以内
- 端のタブでは先に進まない（ループしない）

### S. タブボタンの `data-tab` 属性追加 + ナビ自動スクロール
**ファイル: `index.html`**
- 全8タブボタンに `data-tab` 属性を追加（元々欠落しており、`switchTab` のアクティブ表示が機能していなかった）
- `switchTab` 内でアクティブボタンをタブナビの中央付近にスクロール
  - `nav.scrollTo({ left: ..., behavior: 'smooth' })` で滑らかにスクロール
  - ボタンの中央がナビの中央に来るよう計算

### T. 目標タスクの下に1週間カレンダー表示を追加
**ファイル: `goals-v2.js`**
- 週ナビの直下にシンプルな1週間カレンダーを追加（表示のみ、タップ不可）
- 各日: 曜日 + 日付 + タスクがある日はドット表示
- 今日の日付は青背景＋白文字
- CSS: `.gv2-week-cal`, `.gv2-cal-day`, `.gv2-cal-dow`, `.gv2-cal-num`, `.gv2-cal-dot`

### U. ジャーナル「AIで整える」→「心を整える」に変更
**ファイル: `index.html`**
- `✨ AIで整える` → `✨ 心を整える` に全箇所一括置換（7箇所）
- コメント内の「AIで整える」は変更なし（コード動作に影響なし）

### V. FABメニューにページ移動ボタンを追加
**ファイル: `index.html`**
- FABメニュー（＋ボタン展開）に5つのサブボタン:
  - 🤖 AI相談, 🎯 目標, 📔 ジャーナル（ページ移動、青枠 `.fab-nav`）
  - ⏱️ 行動記録, 💰 支出記録（記録モーダル、黒枠）
- ページ移動ボタンは `switchTab()` を呼び出し
- 記録ボタンは従来通り `openQuickRecordHome()` を呼び出し
- 旧 `.dashboard-quick`, `.quick-grid`, `.quick-btn` のCSS（dead code）を全削除

### W. FABボタンの形状・幅統一
**ファイル: `index.html`**
- 全FABサブボタンを **140px幅統一 + 軽い角丸（8px）** に統一
- `.fab-sub` ベースCSS: `border-radius: 8px`
- `#fabMenu .fab-sub` オーバーライド: `border-radius: 8px !important; width: 140px !important`
- 旧 `border-radius: 30px`（ピル型）から四角形ベースに変更

### X. FABメニューにホームボタン追加
**ファイル: `index.html`**
- 🏠ホームボタンをジャーナルの下（行動記録の上）に追加
- 青枠 `.fab-nav` クラス（他の移動ボタンと統一）
- クリックで `switchTab('home')` を実行
- FABメニューのボタン順: AI相談 → 目標 → ジャーナル → **ホーム** → 行動記録 → 支出記録

### Y. タブナビのスムーズスクロール改善
**ファイル: `index.html`**
- `.tab-nav` CSSに `scroll-behavior: smooth !important` を追加
- JS `scrollTo({ behavior: 'smooth' })` + CSS両方でスムーズスクロールを保証

## セッション5の変更記録

### Z. クラウド同期（メール+パスワード認証）実装
**ファイル: `worker/src/worker.js`, `cloud-sync.js`, `index.html`**
- Worker を全面書き換え: 認証 + 同期 + AI分析を1ファイルに統合
- 認証エンドポイント: register, login, reset-password, reset-confirm
- 同期エンドポイント: upload, download, status（JWT必須）
- PBKDF2 (100000 iterations, SHA-256) でパスワードハッシュ
- JWT (HMAC-SHA256, 30日有効) で認証
- `cloud-sync.js` 新規作成: ログイン/登録/リセット/同期UI + `window.CloudSync` 公開
- CSS は `cs-*` 名前空間で動的注入
- index.html にセクション追加: CSV → クラウド同期 → データ管理の順

### AA. AIプロンプトのサーバー移行
**ファイル: `worker/src/worker.js`, `index.html`, `goal-ai-breakdown.js`**
- `CHARACTER_PROMPTS` (harsh/normal/gentle) → Worker の定数に移行
- `DATA_INTERPRET_RULE` → Worker の定数に移行
- `NO_ANALYSIS_RULE` → Worker の定数に移行
- index.html から削除: `getCharacterPrompt()` 関数, `dataInterpretRule` (ES5+ES6), `noAnalysisRule`
- goal-ai-breakdown.js から削除: `charPrompt` 変数, `buildPrompt(charPrompt)` の引数
- `buildPrompt()` 内の `charHeader` は空文字列に（Worker側で注入するため）
- フロントエンドに「Worker側に移行済み」コメントを残置

### AB. OpenAI Responses API 対応
**ファイル: `worker/src/worker.js`**
- `response_format: { type: "json_object" }` → `text: { format: { type: "json_object" } }` に修正
- `data.output_text` のフォールバック: `data.output[0].content[0].text` を追加
- journal → JSON パース後に `{ result: parsed }` で返却
- consult → テキストそのまま `{ result: outText }` で返却

### AC. フロントエンドのJSON応答処理修正
**ファイル: `index.html`（ES5版 ~L12226, ES6版 ~L12589）**
- Worker がパース済みJSONオブジェクトを返す場合の処理を追加
- `typeof raw === 'object'` → テキスト形式に変換（`【よかったこと】\n` + raw.events 等）
- summary 保存: `parsed` オブジェクトから直接取得（確実）、フォールバックで正規表現
- `【整える一言】` → `【コメント】` にラベル変更（2箇所）
- 正規表現フォールバック: `【(?:整える一言|コメント)】` で両方にマッチ

### AD. consult / journal 応答の分離
**ファイル: `worker/src/worker.js`**
- `type: 'consult'` → テキスト応答（JSON modeなし）、`NO_ANALYSIS_RULE` 適用
- `type: 'journal'` → JSON構造化応答（`text.format.type: "json_object"`）、`DATA_INTERPRET_RULE` 適用
- AI相談がJSON形式で返ってくる問題を解消

### AE. コメント（oneLiner）の充実化
**ファイル: `worker/src/worker.js`**
- `oneLiner` の指示を「1〜2文」→「3〜5文」に強化
- キャラクターの口調で、行動評価・具体的アドバイス・背中を押す言葉を含む

### AF. FABタップ干渉修正
**ファイル: `index.html`**
- `.fab-container` に `pointer-events: none` を追加（コンテナ自体はタップ透過）
- `.fab-main` に `pointer-events: auto` を追加（ボタンのみタップ可能）
- FABメニュー展開中のオーバーレイにも同様の設定

### AG. セクション配置順の変更
**ファイル: `index.html`**
- AI相談タブ内: CSVダウンロード → **クラウド同期** → データ管理 の順に変更

### summary.taskRecord のデータ構造
```javascript
// journalEntriesV3[dateKey].summary.taskRecord
{
  done: ['MUST: 完了したタスク1', 'WANT: 完了したタスク2'],
  undone: ['MUST: 未完了タスク1']
}
// taskRecord が null の場合はフィールド自体が存在しない
```

## セッション6の変更記録

### AH. AIフィードバックの改行表示修正
**ファイル: `index.html`**
- `renderTodaySummary()` の `set()` ヘルパーが `textContent` を使っていたため `\n` が改行表示されなかった
- `set()` を `innerHTML` に変更し、XSSエスケープ（`&`, `<`, `>`）後に `\n` → `<br>` 変換
- `hitokotoText`（コメント欄）も同様に `innerHTML` + エスケープに変更
- 対象箇所: ~L11857（set関数）, ~L11913（hitokotoText）

### AI. カレンダーモーダルのタスク表示修正
**ファイル: `index.html`**
- **問題**: カレンダーモーダルが目標の `weeklyTasks`（`getTasksForDate()`）を表示していた
- **修正**: ホーム画面と同じ `journalEntriesV3[prevDay].summary.must/want` を表示するように変更
- カレンダーセルのタスクインジケーターも `getTaskDatesForMonth()` → `journalEntriesV3` ベースに変更
- タスクは閲覧専用（disabled チェックボックス）、MUST/WANT バッジ表示
- チェック状態は `taskChecks_YYYY-MM-DD` の localStorage から取得
- 旧イベントハンドラ（`calTaskCb`, `calModalAddTaskBtn`）を削除
- 対象箇所: カレンダーセル ~L8855-8885, モーダル ~L9042-9101

### AJ. 有料プラン内容確定
- 3段階: Free / Lite（¥480/月）/ Premium（¥980/月）
- 詳細は「有料プラン確定内容」セクション参照
- 実装はまだ（次のステップ）

### AK. AIキャラクター差別化強化
**ファイル: `worker/src/worker.js`**
- `CHARACTER_PROMPTS` を大幅に拡充:
  - **マネージャー（harsh）**: 数値目標・期限・KPIで語る。感情論排除、PDCA重視
  - **タクヤ先輩（normal）**: 28歳IT企業勤務。①共感 → ②すぐできる行動1つ → ③ハードル低めの第一歩。「60点でOK、やったもん勝ち」
  - **ハナさん（gentle）**: 26歳心理学バックグラウンド。①気持ちを受け止め言語化 → ②「なぜそう感じたか」を一緒に探る → ③小さな気づきを褒める
- デプロイ済み・動作確認済み（同じプロンプトで3キャラの明確な差を確認）

### AL. AIゴールコーチのタスク頻度改善
**ファイル: `goal-ai-breakdown.js`**
- **問題**: `weeklyPlanRule` が一律「週○回〜する」頻度付きタスクを指示していた
- **修正**: カテゴリ（`_state.category`）に応じて分岐:
  - **健康カテゴリ**: 従来通り頻度・回数付きの行動を指示（例:「週2回ジムに行く」）
  - **それ以外（仕事・学習・家族・趣味・その他）**: シンプルな行動記述を優先。頻度は運動・反復練習など回数が重要な場合のみ
- 初回ヒアリング質問も分岐:
  - 健康: 「具体的な数値、頻度（週何回？毎日？）」を質問
  - それ以外: 「具体的なゴールイメージや現在の状況」を質問
- 対象箇所: `buildPrompt()` 内 ~L680-702（weeklyPlanRule）, ~L711（初回質問）

## セッション7の変更記録

### AM. 有料プラン実装（DaycePlanモジュール）
**ファイル: `index.html`（約280行追加）**
- `window.DaycePlan` グローバルモジュール新設（IIFE）
- プラン定義: `PLANS = { free, lite, premium }` — 各機能の回数上限を定義
- `getPlan()` / `setPlan()` — `planLevel` localStorage管理（旧`isPremium`との後方互換あり）
- `getUsage()` / `incrementUsage(type)` — 月間使用回数管理（`aiUsage_YYYY-MM` localStorage）
- `checkLimit(type)` — journal/consult/goalCoach の回数制限チェック
- `checkCharacter(tone)` — 無料プランはタクヤ先輩（normal）のみ許可
- `showUpgradeModal(info)` — 🔒アップグレード誘導モーダル（次のプランの機能比較表示）
- `showPlanUI()` — 3プラン比較モーダル（無料/ライト/プレミアム、カード型UI）
- `getAIHeaders()` — `syncAuthToken` があればAuthorizationヘッダー付与
- `renderPlanBadges()` — AI相談タブ上部の残回数バッジ自動更新
- **新規localStorage キー**: `planLevel`（'free'|'lite'|'premium'）, `aiUsage_YYYY-MM`（JSON）

### AN. AI回数制限ゲート挿入（4箇所）
**ファイル: `index.html`**
- ジャーナルAI ES5版（`stepAIRefine`）: `checkLimit('journal')` + 成功後 `incrementUsage`
- ジャーナルAI ES6版（`journalAiBigBtn`）: 同上
- AI相談（`sendAIConsult`）: `checkLimit('consult')` + 成功後 `incrementUsage`
- 全fetchに `getAIHeaders()` でAuthorizationヘッダー付与（Worker側二重チェック用）

### AO. キャラクター制限（3箇所）
**ファイル: `index.html`, `goal-ai-breakdown.js`**
- `selectAIConsultTone()` — AI相談のキャラ選択にゲート
- `selectFeedbackTone()` — ジャーナルのキャラ選択にゲート
- `selectChar()` — 目標コーチのキャラ選択にゲート
- 無料プランでマネージャー/ハナさんを選択 → アップグレードモーダル表示

### AP. AI目標コーチの制限ゲート
**ファイル: `goal-ai-breakdown.js`**
- ボタンから「👑 有料」タグ削除 → DaycePlanモーダルで代替
- `checkLimit('goalCoach')` ゲート追加
- タスク追加完了時に `incrementUsage('goalCoach')`
- fetchに `getAIHeaders()` 付与（2箇所）

### AQ. CSV・クラウド同期のDaycePlan統合
**ファイル: `index.html`, `cloud-sync.js`**
- 既存CSVゲート（v40.6 Premium Gate）の `isPremiumUser()` を DaycePlan ベースに書き換え
- `handleCSVDownload()` 内の有料判定も統合
- `showPremiumNotice()` → `showUpgradeModal()` に置き換え
- cloud-sync.js: upload時に `planLevel` をWorkerに送信

### AR. Worker側プラン検証・回数チェック
**ファイル: `worker/src/worker.js`（デプロイ済み）**
- `PLAN_LIMITS` 定数追加（free/lite/premium の回数上限）
- `checkAndIncrementUsage(env, email, aiType)` — KVベースの月間回数管理
  - KVキー: `usage:{email}:YYYY-MM`（TTL 35日）
  - 上限到達時は HTTP 429 + `limitReached: true` を返却
- `/api/analyze` がオプションJWT認証対応 — 認証ユーザーはWorker側でも二重チェック
- `handleSyncUpload` で `planLevel` をユーザーレコード（`user:{email}`）に保存
- **回数制限の二重チェック構造**:
  - フロント（localStorage）← 即座にブロック（UX重視）
  - Worker（KV）← 改ざん防止（セキュリティ重視）

### AS. プランUI配置
**ファイル: `index.html`**
- AI相談タブ上部にプランバッジ・残回数表示を追加
  - プラン名バッジ（`#dayce-plan-badge`）
  - 残回数: AI相談（`#dayce-usage-consult`）、心を整える（`#dayce-usage-journal`）、目標コーチ（`#dayce-usage-goalCoach`）
  - 「📋 プラン変更」ボタン → `showPlanUI()` モーダル

### AT. GitHub Pagesアップロード
- index.html, goal-ai-breakdown.js, cloud-sync.js の3ファイルをアップロード済み

## セッション8の変更記録

### AU. プラン構成を2プラン化（無料 + プロ ¥390/月）
**ファイル: `index.html`, `worker/src/worker.js`**
- **旧**: 無料 / ライト（¥480/月）/ プレミアム（¥980/月）の3プラン
- **新**: 無料 / プロ（¥390/月）の2プランに統合
- `PLANS` 定義: `free` + `pro`（旧 `lite`/`premium` は `pro` 相当で後方互換残存）
- `getPlan()`: `localStorage` の旧 `lite`/`premium` → `pro` にマッピング
- `checkLimit()`: アップグレード文言を「プロプランで利用できます」に統一
- `checkCharacter()`: 文言を「プロプランで利用できます」に変更
- `showUpgradeModal()`: プロプラン（¥390/月）の機能一覧をハードコード表示
- `showPlanUI()`: 2カード（無料/プロ）表示に変更
- Worker `PLAN_LIMITS`: `pro` 追加、旧 `lite`/`premium` はpro相当で後方互換
- Worker `handleSyncUpload`: `planLevel` に `'pro'` を受付可能に

### AV. クラウド同期を無料プランでも利用可能に
**ファイル: `index.html`**
- `PLANS.free.cloudSync` を `false` → `true` に変更
- データ保全はユーザー体験の基本との判断

### AW. 目標進捗パーセンテージの母数変更
**ファイル: `goals-v2.js`**
- **旧**: 完了した目標数 / 月の目標数（例: 1/5 = 20%）
- **新**: 完了した週タスク数 / 月内の全週タスク数（例: 12/20 = 60%）
- `renderSummary()` を修正: `weeklyTasks` の `done` 数でパーセンテージ計算
- 表示ラベル: 「達成」→「タスク達成」

### AX. FABクイックボタンの順番変更
**ファイル: `index.html`**
- **旧順**: AI相談 → 目標 → ジャーナル → ホーム → 行動記録 → 支出記録
- **新順**: AI相談 → **ジャーナル** → **目標** → ホーム → 行動記録 → 支出記録

### AY. ジャーナルAIの箇条書き改行修正
**ファイル: `index.html`, `goals-v2.js`**
- AIが返すテキストで「・」の前に改行がない場合に`\n`を挿入する処理を3箇所に追加
- ES6版: `ensureBulletBreaks()` 関数
- ES5版: `_ensureBullets()` 関数
- 今日のまとめ: `set()` 内で `・` の前に `\n` 挿入

### AZ. Stripe決済連携（完全実装・テスト決済成功）
**ファイル: `worker/src/worker.js`, `index.html`**

#### Stripe設定情報
- Stripeサンドボックスアカウント: lofelog_app
- 公開キー: `pk_test_51T2Igs2QTqqbetSW...`
- シークレットキー: Worker secret `STRIPE_SECRET_KEY` に登録済み
- Webhook署名シークレット: Worker secret `STRIPE_WEBHOOK_SECRET` に登録済み
- 商品ID: `prod_U0JNaY75j8VPFM`
- 価格ID: `price_1T2IkP2QTqqbetSWO52yy7VM`（¥390/月 recurring）
- Webhook URL: `https://lifelog-ai.little-limit-621c.workers.dev/api/stripe/webhook`
- Webhookリッスンイベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

#### Worker側の追加（3エンドポイント）
- **`POST /api/stripe/checkout`**（JWT認証必須）— Stripe Checkout Session 作成。`successUrl` / `cancelUrl` を受け取り、Stripe APIで決済セッション作成 → セッションURLを返却
- **`POST /api/stripe/webhook`**（認証不要）— Stripe からのイベント受信。`checkout.session.completed` でユーザーの `planLevel` を `"pro"` に更新、`customer.subscription.deleted` で `"free"` に戻す。署名検証あり（`verifyStripeSignature()`）
- **`GET /api/plan/status`**（JWT認証必須）— KVからユーザーのプランレベルを返却

#### フロント側の追加
- `startStripeCheckout()` — ログインチェック → Worker `/api/stripe/checkout` → `window.location.href` でStripe決済ページにリダイレクト
- `syncPlanFromServer()` — Worker `/api/plan/status` からプラン状態を取得し `setPlan()` で反映。ページロード時に自動実行
- `checkStripeReturn()` — URL パラメータ `?stripe=success` / `?stripe=cancel` を検出。成功時はプラン同期 + トースト表示「🎉 プロプランへようこそ！」
- プラン選択UIのボタン: 「このプランにする」→「プロプランに申し込む」（`startStripeCheckout()` 呼び出し）
- アップグレードモーダルのボタン: 「プランを見る」→「プロプランに申し込む」（`startStripeCheckout()` 直接呼び出し）
- `BACKEND_URL` 定数を DaycePlan IIFE 内に追加

#### 決済フロー
```
ユーザー「プロプランに申し込む」クリック
  → フロント → Worker /api/stripe/checkout（JWT認証）
  → Worker → Stripe API（Checkout Session作成）
  → ユーザーがStripe決済ページで支払い
  → 成功 → アプリに戻る（?stripe=success）
  → フロント → Worker /api/plan/status でプラン同期
  → 「🎉 プロプランへようこそ！」トースト表示

（裏側）Stripe → Worker /api/stripe/webhook
  → KV user:{email} の planLevel を "pro" に更新
  → stripeCustomerId, stripeSubscriptionId も保存
```

#### テスト結果
- テストカード `4242 4242 4242 4242` で決済成功確認済み
- プランが「プロ」に切り替わることを確認済み

#### 未対応（今後の課題）
- **本番モード切替**: Stripe本番申請後、本番APIキー・価格ID・Webhookに差し替え
- **解約フロー**: アプリ内から解約する手段（Stripe Customer Portal連携）
- **利用規約・プライバシーポリシー**: 課金するなら法的に必須

## 技術的な注意点
- `index.html`は約20000行, 1.7MBあり全体を一度に読めない。Grep/行番号指定で必要箇所を読むこと
- JavaScriptモジュールはIIFE（即時実行関数）パターン。`window.xxx` でグローバル公開
- goals-v2.js のCSSは `gv2-*` 名前空間で動的注入。index.html 内の旧 goal CSS は全削除済み
- 月キー: `"YYYY-MM"` 形式（例: `"2026-02"`）
- 日付キー: `"YYYY-MM-DD"` 形式（例: `"2026-02-16"`）
- **goals-v2.jsが最終的にwindow関数を全て上書きする**（読み込み順: index.html → goal-ai-breakdown.js → goals-v2.js）
- ダッシュボードの updateDashboard が **ES6版とES5版の2つ** あるので変更時は両方更新すること
- AI結果のsummary保存も **ES5版とES6版の2つ** ある。`taskRecord` 等のフィールド追加時は両方更新すること
- タブボタンには `data-tab` 属性が必須（`switchTab` がアクティブ表示に使用）
- スワイプハンドラは `switchTab` 直後のIIFEで定義。タブ順変更時は `TAB_ORDER` 配列を更新すること
- 目標タスクの日付表示は非表示だが、内部の `date` フィールドは保持。カレンダー連動・翌週持ち越し・統計に使用
- cloud-sync.js のCSSは `cs-*` 名前空間で動的注入。`#cloud-sync-css` ID で重複防止
- Worker のデプロイ: `cd /Users/shuhei.sugai/Downloads/pwa_with_ai_and_worker_package/worker && npx wrangler deploy`
- Worker の secrets 設定: `npx wrangler secret put OPENAI_API_KEY` 等
- OpenAI Responses API を使用（`/v1/responses`）。`response_format` は非推奨、`text.format` を使うこと
- AI応答: Worker が `type: 'journal'` ではJSONパースして返す → フロントで `typeof raw === 'object'` チェックが必須
- **DaycePlan**: `window.DaycePlan` でプラン管理。AI呼び出し前に `checkLimit()` ゲート必須
- **回数制限の二重チェック**: フロント（localStorage `aiUsage_YYYY-MM`）+ Worker（KV `usage:{email}:YYYY-MM`）
- **planLevel**: localStorage `planLevel` = 'free'|'pro'。旧 'lite'/'premium' は getPlan() で 'pro' にマッピング
- **キャラ制限**: 無料プランは `tone='normal'`（タクヤ先輩）のみ。Worker側での検証は未実装（将来追加可能）
- **Stripe連携**: テストAPIキー取得済み、商品ID `prod_U0JNaY75j8VPFM`。Checkout Session / Webhook 実装済み（セッション8）
- **プラン構成**: 無料 + プロ（¥500/月）の2プラン。PLANS定義に旧lite/premiumはpro相当として後方互換で残存
- **Stripe価格ID**: `price_1T2NU42QTqqbetSWpGPn3xnT`（¥500/月 recurring、セッション9で更新）
- **ジャーナル日次制限**: 無料プランは1日1回。`aiDaily_YYYY-MM-DD` localStorageで管理。`incrementUsage('journal')` 内で自動インクリメント
- **過去30日閲覧制限**: 無料プランはカレンダー・レポート・ジャーナル履歴が30日前まで。`DaycePlan.isMonthViewable()` / `isDateViewable()` でチェック
- **カテゴリ履歴ポップアップ**: `showCategoryHistory(type, category)` — レポートのバーチャート/凡例タップで月内のカテゴリ履歴をボトムシート表示

## セッション9の変更記録

### BA. レポートカテゴリ詳細タップ → 履歴ポップアップ
**ファイル: `index.html`**
- `showCategoryHistory(type, category)` 関数新設 — カテゴリの月内履歴をボトムシートモーダルで表示
- 行動レポート: 日付・内容・時間を一覧表示
- お金レポート: 日付・内容・金額を一覧表示 + 合計金額
- 棒グラフの `.bar-row` に `onclick` 追加（activity/money両方）
- 円グラフの `.legend-row` に `onclick` 追加（activity pie / money pie / donut chart）
- `window.showCategoryHistory` としてグローバル公開

### BB. 無料プランジャーナル回数変更（月15回 → 月30回/1日1回）
**ファイル: `index.html`, `worker/src/worker.js`**
- `PLANS.free.journal`: 15 → 30 に変更
- `PLANS.free.journalDaily`: 1 を追加（日次制限）
- `getTodayKey()` / `getDailyUsage(type)` / `incrementDailyUsage(type)` 関数追加
- `checkLimit('journal')`: 月間制限に加えて日次制限もチェック
- `incrementUsage('journal')`: 内部で `incrementDailyUsage` も自動呼び出し
- `renderPlanBadges()`: 日次制限プランの場合「今日あと1回」/「今日は使用済み」表示
- Worker `PLAN_LIMITS.free.journal`: 15 → 30 に変更
- **新規localStorageキー**: `aiDaily_YYYY-MM-DD`（日次AI使用回数JSON）

### BC. 価格¥390 → ¥500に変更
**ファイル: `index.html`, `worker/src/worker.js`**
- `PLANS.pro.label` 等: `¥390/月` → `¥500/月` に全箇所変更
- `showUpgradeModal`: `¥390/月` → `¥500/月`
- `showPlanUI`: cards定義の price を `¥500/月` に変更
- Worker `STRIPE_PRICE_ID`: `price_1T2IkP2QTqqbetSWO52yy7VM` → `price_1T2NU42QTqqbetSWpGPn3xnT`

### BD. 無料会員は過去30日分のみ閲覧可能
**ファイル: `index.html`**
- DaycePlan に3関数追加:
  - `getFreeViewCutoff()` — 30日前の日付（YYYY-MM-DD）を返す
  - `isMonthViewable(monthKey)` — その月の最終日が30日前より後か判定
  - `isDateViewable(dateStr)` — その日付が30日以内か判定
  - `showFreeViewLimitMessage()` — 制限トースト表示
- `changeReportMonth()`: 前月ナビゲーション時に `isMonthViewable` チェック
- `changeMonth()` (カレンダー): 前月ナビゲーション時に `isMonthViewable` チェック
- `changeActivityHistoryDate()` / `changeMoneyHistoryDate()`: 前日ナビゲーション時に `isDateViewable` チェック
- `viewJournalByDate()`: 日付クリック時に `isDateViewable` チェック
- `renderCalendar()`: 30日外の日付に `.free-locked` クラス追加（opacity 0.4）
- `renderJournalLogs()`: 30日外のエントリをフィルタ + 制限メッセージ表示
- `showPlanUI` / `showUpgradeModal`: 「過去データ閲覧」行を追加
- CSS `.calendar-day.free-locked { opacity: 0.4; }` 追加

### BE. 目標タスクUI改善 — ポップアップ化 + 音声入力
**ファイル: `goals-v2.js`**
- **タスク追加ポップアップ** (`showTaskAddPopup`): 「＋ 追加」ボタンでポップアップ表示
  - テキスト入力フィールド + 🎤音声入力ボタン
  - Web Speech API (`SpeechRecognition`) で音声→テキスト変換
  - `toggleVoice()`: 音声認識のON/OFF トグル（録音中は赤いパルスアニメーション）
  - `submitAddTask(goalId)`: 入力テキストでタスク追加 → 自動クローズ
  - Enterキーでも送信可能
- **タスク選択ポップアップ** (`showTaskPopup`): タスクラベルタップでポップアップ表示
  - 完了/未完了トグル
  - 📌 今日のMUSTに追加（`copyToTodayAs(goalId, taskId, 'must')`）
  - 💡 今日のWANTに追加（`copyToTodayAs(goalId, taskId, 'want')`）
  - 📅 来週に移動（`carryToNextWeek` — confirm削除、ポップアップから直接実行）
  - ✏️ テキストを編集
  - 🗑️ 削除（`deleteTask` — confirm不要、ポップアップから直接実行）
- **`copyToTodayAs(goalId, taskId, taskType)`**: MUST/WANT両対応の新関数。旧`copyToToday`は後方互換ラッパー
- **`deleteTask(goalId, taskId)`**: 新関数（confirmなし）
- **タスクレンダリング簡略化**: インラインの MUST/翌週/✏️ ボタン削除 → ラベルタップでポップアップ
- **CSS追加**: `.gv2-popup-overlay`, `.gv2-popup`, `.gv2-popup-title`, `.gv2-popup-actions`, `.gv2-popup-btn`（must/want/next/edit/del各バリアント）, `.gv2-add-input-wrap`, `.gv2-add-input`, `.gv2-voice-btn`, `@keyframes gv2-pulse`, `.gv2-add-submit`
- **window exports追加**: `_gv2ShowTaskPopup`, `_gv2ShowAddPopup`, `_gv2CloseTaskPopup`, `_gv2ToggleVoice`, `_gv2SubmitAddTask`, `_gv2DeleteTask`, `_gv2CopyToTodayAs`

### BF. 行動レポートの時間表示を時間+分に変更
**ファイル: `index.html`**
- `formatMinutesToHM(m)` 関数新設: 分→「◯時間◯分」/「◯分」に変換
  - 60分未満: `"45分"`
  - 60分以上で端数あり: `"1時間30分"`
  - 60分以上で端数なし: `"2時間"`
- `renderActivityBars()`: 棒グラフの数値表示を `formatMinutesToHM` 使用に変更
- `renderActivityPie()`: 中央テキスト・凡例の数値表示を `formatMinutesToHM` 使用に変更

### BG. ホーム画面タスク追加のポップアップ化 + 音声入力
**ファイル: `index.html`**
- `addTask(type)` を `showHomeTaskAddPopup(type)` 呼び出しに変更（旧: 「新しいタスク」追加→即編集モード）
- `showHomeTaskAddPopup(defaultType)`: ボトムシートポップアップ表示
  - テキスト入力フィールド + 🎤音声入力ボタン（Web Speech API）
  - MUST/WANT切替ボタン（ポップアップ内で変更可能）
  - Enterキーでも送信可能
- `switchHomeTaskType(type)`: MUST/WANTトグル
- `submitHomeTask()`: タスク追加実行 → journalEntriesV3に保存 → 自動クローズ
- `toggleHomeVoice()` / `stopHomeVoice()`: 音声認識ON/OFFトグル
- window公開: `showHomeTaskAddPopup`, `switchHomeTaskType`, `closeHomeTaskPopup`, `submitHomeTask`, `toggleHomeVoice`, `stopHomeVoice`

### BH. iOS Safari向けPWAインストールガイドバナー
**ファイル: `index.html`**
- `isIOS()` / `isIOSSafari()` ヘルパー関数追加
- `showBannerIfNeeded()` 改修:
  - Android Chrome等: 従来通り `beforeinstallprompt` → インストールボタン付きバナー
  - iOS Safari: 「⬆（共有）→ ホーム画面に追加をタップ」のガイドメッセージ表示、インストールボタンは非表示
- DOMContentLoaded時にiOS Safariなら1.2秒後にバナー表示
- バナーCSS `.row` に `flex-wrap:wrap` 追加（iOS向けメッセージが長いため）

### BI. ジャーナル音声入力の独立ポップアップ化
**ファイル: `index.html`**
- `openJournalVoicePopup()`: フルスクリーンに近いポップアップで音声入力
  - 入力先選択ドロップダウン（出来事/学び/感情/感謝/MUST/WANT/フリートーク）
  - 大きな🎤ボタン（80x80px、青グラデ→録音中赤）
  - リアルタイム文字起こし表示エリア
  - テキスト手動編集モード切替
  - 「入力を反映する」ボタンで対象フィールドに追記
- `journalV2VoiceBtn` に `onclick="openJournalVoicePopup()"` を追加（既存のaddEventListenerより先に発火）
- 関連関数: `toggleJournalVoicePopup`, `jvpStopRec`, `jvpToggleEdit`, `jvpConfirm`, `closeJournalVoicePopup`

### BJ. AI目標コーチの回数制限修正
**ファイル: `goal-ai-breakdown.js`**
- **問題**: チャットだけして計画を追加せず閉じた場合、使用回数が増えず何度でも使えた
- **修正1**: `startGoalAIChat()` 冒頭に `checkLimit('goalCoach')` の再チェック追加
- **修正2**: `incrementUsage('goalCoach')` をタスク追加完了時 → チャット開始時に移動
  - チャットを閉じても消費される（無料ユーザーの無限利用を防止）

### BK. 目標タスクの折りたたみ機能
**ファイル: `goals-v2.js`**
- `_goalCollapsed` オブジェクト: 目標IDごとの折りたたみ状態を管理（localStorage `gv2_collapsed` に永続化）
- `toggleCollapse(goalId)`: 折りたたみトグル → `renderAll()` で再描画
- 目標タイトルに ▶/▼ アイコン + 達成バッジ `(done/total)` 追加
- タイトルクリックでタスク一覧の表示/非表示を切替
- window export: `_gv2ToggleCollapse`

### BL. AI相談の回答量増加
**ファイル: `worker/src/worker.js`（デプロイ済み: f4c04547）**
- **旧**: 「200文字程度で簡潔に回答してください」
- **新**: 400〜600文字を目安に、共感→具体的アドバイス2〜3個→背中を押す一言の構成

### BM. 初回ユーザー向けオンボーディング
**ファイル: `index.html`**
- 7ページのスライド式ウェルカムガイド（カード型ポップアップ）
  1. 👋 ようこそ（概要）
  2. ⏱️ 行動記録
  3. 💰 お金記録
  4. 📔 ジャーナル振り返り
  5. ✨ AIフィードバック
  6. 🎯 目標設定
  7. 🚀 はじめよう
- ドットインジケーター + 戻る/次へボタン + スキップリンク
- `localStorage('dayce_onboarding_done')` で初回のみ表示
- `</body>` 直前にIIFEで配置

### BN. ジャーナルフルスクリーンフロー
**ファイル: `index.html`**
- 「📔 今日のジャーナルを始める」ボタン → `openJournalFlow()` でフルスクリーンポップアップ
- ヘッダー（✕/タイトル/日付ピッカー）+ スクロールコンテンツ（flex layout）
- 気分選択（5つの絵文字）
- 今日のタスク表示（MUST/WANT横並び）
- フリートーク音声入力（大きい🎤ボタン72x72）+ テキスト編集切替
- フィードバック担当選択（3キャラ）
- 「✨ AIで整える」→ journalV3Raw書込み → journalAiBigBtn自動クリック
- 「💾 保存のみ」→ journalV3Raw書込み → journalV2SaveBtnクリック
- ステップ入力は廃止（journalModeTabsは`display:none`）

### BO. ジャーナルフロー表示バグ修正
**ファイル: `index.html`**
- overlay CSS: `right:0;bottom:0` → `width:100%;height:100%` + `display:flex;flex-direction:column`
- ヘッダー: `position:sticky` → `flex-shrink:0`（sticky+overflow問題回避）
- コンテンツ: `flex:1;overflow-y:auto` で独立スクロール
- 8桁hex色 `#e74c3c10` → `rgba(231,76,60,0.06)` に修正（iOS Safari互換）
- `jfSelectTone()`のbackground色も同様にrgba修正
- try-catch追加: タスクデータ読込み・全体関数にエラーハンドリング
- 音声認識の確実なクリーンアップ追加

### BP. ホーム画面タスク追加音声入力ポップアップ
**ファイル: `index.html`**
- `showHomeTaskAddPopup()`: MUST/WANT切替 + 音声入力ポップアップ
- Web Speech API連続録音 + Enterキー対応

### BQ. ジャーナル独立音声ポップアップ
**ファイル: `index.html`**
- `openJournalVoicePopup()`: 大きなマイクボタン付き独立ポップアップ
- ターゲットフィールド選択、編集モード切替、確認ボタン

### BR. iOS Safari PWAインストールガイド
**ファイル: `index.html`**
- `isIOS()`, `isIOSSafari()` ヘルパー追加
- `showBannerIfNeeded()` にiOS用ガイドメッセージ追加
- 「共有→ホーム画面に追加」手順案内バナー

### BS. 旧ジャーナルUI非表示化
**ファイル: `index.html`**
- `journal-v2 card` 全体を `display:none`（日付選択、気分、旧textarea、要約セクション）
- `journal-v2-voice card`（音声入力セクション）を `display:none`
- `journal-simple card` の中身（タイトル、ヒント、journalV3Raw、feedbackToneSelector）を非表示
- `journalAiBigBtn` を `display:none`（DOM内保持、フローが `.click()` で使用）
- `journalAiFeedbackBox` のみ表示を維持（AI結果表示用）
- 削除ボタン行も非表示

### BT. フィードバック担当にキャラクター画像追加
**ファイル: `index.html`**
- `openJournalFlow()` のトーン選択: 絵文字 → キャラ画像に変更
  - `drill_instructor.png`（マネージャー）
  - `takumi_senpai.png`（タクヤ先輩）
  - `hana_san.png`（ハナさん）
- 48x48px丸型 `object-fit:cover` で表示

### BU. AIで整えるボタンの色変更
**ファイル: `index.html`**
- 紫グラデーション `#667eea→#764ba2` → 青グラデーション `#2196F3→#1565C0`

### BV. ジャーナル音声入力の改善
**ファイル: `index.html`**
- **自動再開方式**: `_jfStartRec()` で毎回新SpeechRecognitionインスタンス作成
  - `_jfShouldRestart` フラグで `onend` 時に自動再開
  - モバイル: `continuous=false` + 1.1秒後に新インスタンスで再開
  - デスクトップ: `continuous=true` + 0.5秒後に再開
- **リアルタイム文字起こし**: `jfTextArea`（editable textarea）に直接反映
- **テキスト編集ボタン削除**: マイクボタンのみに統一
- **ボタンデザイン統一**: `border:2px solid #111` フル幅ボタン（voice-input-extra準拠）
- 録音中: 赤背景 `#ef4444` + パルスアニメ + `⏹️ 録音停止`
- `var final` → `var confirmed` に変更（予約語回避）

### BW. カレンダーポップアップ「ジャーナルを書く」→「削除」ボタン
**ファイル: `index.html`**
- ジャーナルなし時: 「📝 この日のジャーナルを書く」ボタン → 削除
- ジャーナルあり時: 「📖 この日のジャーナルを開く」→「🗑️ この日のジャーナルを削除」に変更
  - `confirm()` で確認後 `journalEntriesV3` から該当日を `delete`
  - 削除後 `renderCalendar()` で再描画

### BX. 今日の要約セクション非表示
**ファイル: `index.html`**
- `journalV3TodaySummary` に `display:none !important` を追加
- カレンダーポップアップで過去ジャーナル閲覧できるため不要

## 次セッション（Session 11）での最優先タスク

### バグ確認・修正（大量の変更があったため）
以下の機能が正しく動作するか確認し、バグがあれば修正する：

1. **ジャーナルフルスクリーンフロー** (`openJournalFlow`)
   - ポップアップが正しく全画面表示されるか
   - 気分選択が動作するか
   - 今日のタスクが表示されるか
   - フィードバック担当のキャラ画像が表示されるか
   - AIで整えるボタン（青）が動作するか → journalV3Raw書込み → AI自動実行
   - 保存のみボタンが動作するか

2. **音声入力（自動再開方式）**
   - マイクボタン押下で録音開始、もう一度で停止
   - モバイルで止まらずに自動再開するか
   - リアルタイム文字起こしがtextareaに反映されるか
   - 手動テキスト編集もできるか

3. **旧ジャーナルUI非表示**
   - 旧UIが完全に見えなくなっているか
   - `journalAiFeedbackBox` だけ表示されているか（AI結果用）
   - 隠した要素（journalV2Date, journalV3Raw, journalAiBigBtn）がJS経由で正常動作するか

4. **カレンダーポップアップ**
   - 削除ボタンが表示され、削除が動作するか
   - ジャーナルなし日にはボタンが出ないか
   - 今日の要約セクションが非表示になっているか

5. **ホーム画面タスク追加ポップアップ** (`showHomeTaskAddPopup`)
   - 音声入力が動作するか
   - MUST/WANT切替が動作するか

6. **iOS Safari PWAインストールガイド**
   - iOS Safariで正しくバナーが出るか

### アップロード対象ファイル
- `index.html` ← 大量変更あり（要アップロード）
- `goals-v2.js` ← window exports, collapse追加
- `goal-ai-breakdown.js` ← goalCoach limit修正

### 検討中
- **ChatGPT → Claude API切替**: AI相談はClaude Sonnetの方が自然な会話向き。ジャーナル（JSON構造化）はOpenAIが安定。ハイブリッド構成も可能。Worker側の変更のみで切替可能

### リリースまでの必須タスク
1. **解約フロー**（Stripe Customer Portal連携）
2. **利用規約・プライバシーポリシー**
3. **本番モード切替**（Stripe本番APIキー・価格ID・Webhook）
4. **コード難読化**（推奨）
5. **Resend連携**（パスワードリセットメール、推奨）
