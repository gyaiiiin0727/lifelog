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
| `*.backup` | 各ファイルのバックアップ（最新状態） |

## バックエンドAPI
- URL: `https://lifelog-ai.little-limit-621c.workers.dev/api/analyze`
- Method: POST
- Body: `{ text, tone, type:'consult'|'journal', characterPrompt }`
- Cloudflare Workers

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
- `dataInterpretRule` にギャップ指摘の明示的指示あり
- **変更時の注意**: `dataInterpretRule` はES5版(~L12222)とES6版(~L12555)の2箇所ある。両方更新すること

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

### 最優先：クラウド同期 → 販売準備ロードマップ

ユーザーは**アプリの販売を考えている**。以下の優先順で進める合意あり。

#### ステップ① クラウド同期（合言葉版） ← 次にやること
- **認証方式**: 合言葉（パスフレーズ）方式でまず実装
  - ユーザーが自分で決めた合言葉を入力 → SHA-256ハッシュ → KVのキーに
  - アカウント不要、外部サービス依存ゼロ
  - 販売時にGoogleログインに切り替え可能（データ構造は同じ、認証部分のみ差し替え）
- **バックエンド**: 既存Cloudflare Worker拡張 + KV
  - KV名前空間: `DAYCE_SYNC`（Worker設定でバインド名 `SYNC_KV`）
  - 新規エンドポイント3つ:
    - `POST /api/sync/upload` — データアップロード（passphrase + data + syncedAt）
    - `GET /api/sync/download?p=xxx` — データダウンロード
    - `GET /api/sync/status?p=xxx` — 同期状態確認
  - `hashPassphrase()` — Web Crypto API SHA-256（Worker内で実行）
  - CORS対応済み（既存のOPTIONSハンドラ拡張）
- **フロントエンド**:
  - 新規ファイル `cloud-sync.js` — `window.CloudSync` オブジェクト公開
  - index.html に同期UIセクション追加（AI相談タブのデータ管理セクション付近）
  - 合言葉入力 → リンク → アップロード/ダウンロードボタン
- **同期対象localStorage キー**:
  - 同期する: `activities`, `moneyRecords`, `journalEntriesV3`, `monthlyGoals`, `weightRecords`, `activityCategories`, `expenseCategories`, `incomeCategories`, `journalFeedbackTone`, `aiConsultTone`, `aiConsultHistory`
  - 同期しない（デバイス固有）: `fabPosition`, `lastActiveTab`, `taskChecks_*`, `isPremium`, `journalAiEndpoint`
- **競合解決**: Last-Write-Wins（タイムスタンプベース）。個人利用なのでシンプルに
- **新規localStorageキー**: `syncPassphrase`（合言葉保存）, `syncLastSynced`（最終同期日時）
- **KV制限**: 無料枠（読み取り10万回/日、書き込み1000回/日、値サイズ上限25MB）→ 個人利用で十分

#### ステップ② AIプロンプトのサーバー移行
- 現状: index.html内の `dataInterpretRule`, `noAnalysisRule` 等が**ソースコードから丸見え**
- これがアプリの価値の核なので、Workerに移してフロントからは見えないようにする
- クラウド同期と同時にWorkerを触るので一緒にやると効率的

#### ステップ③ Googleログインに切り替え（販売前）
- 合言葉 → Google OAuth に認証部分のみ差し替え
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

## 技術的な注意点
- `index.html`は約20000行, 1.7MBあり全体を一度に読めない。Grep/行番号指定で必要箇所を読むこと
- JavaScriptモジュールはIIFE（即時実行関数）パターン。`window.xxx` でグローバル公開
- goals-v2.js のCSSは `gv2-*` 名前空間で動的注入。index.html 内の旧 goal CSS は全削除済み
- 月キー: `"YYYY-MM"` 形式（例: `"2026-02"`）
- 日付キー: `"YYYY-MM-DD"` 形式（例: `"2026-02-16"`）
- **goals-v2.jsが最終的にwindow関数を全て上書きする**（読み込み順: index.html → goal-ai-breakdown.js → goals-v2.js）
- ダッシュボードの updateDashboard が **ES6版とES5版の2つ** あるので変更時は両方更新すること
