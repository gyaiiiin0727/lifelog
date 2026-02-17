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

### カレンダー連動（完了済み）
- カレンダータブにタスク情報を表示
- タスクがある日に青い左ボーダー + `done/total` 数字表示
- 全完了時は緑色表示
- 日クリック → モーダルにタスク一覧（チェックボックス付き）
- モーダルから完了トグル・タスク追加が可能
- `getTasksForDate(dateStr)` — 指定日のタスク一覧
- `getTaskDatesForMonth(yearMonth)` — 月全体のタスク有無マップ
- `_gv2AddTaskDirect(dateStr, taskText)` — カレンダーから直接タスク追加

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

### 次にやること（セッション6以降）
1. ~~**クラウド同期**（メール+パスワード認証版）~~ ✅ 完了（セッション5）
2. ~~**AIプロンプトのサーバー移行**~~ ✅ 完了（セッション5）
3. **有料プランの内容決め**
4. **コード難読化**
5. **利用規約・プライバシーポリシー**
6. **課金システム**
7. **Resend連携**（パスワードリセットメール送信）← 現在はコード直接通知のフォールバック
8. **GitHub Pagesへのファイルアップロード**（index.html, cloud-sync.js, goal-ai-breakdown.js）

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
| `isPremium` | 有料会員フラグ |
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
