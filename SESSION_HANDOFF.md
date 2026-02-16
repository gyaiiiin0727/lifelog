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

### goal-ai-breakdown.js の変更点
- `getWeekKeyOffset` → 削除
- `distributeDates(taskCount, weekOffset)` 追加 — 月の残り日数でタスクを均等分散
- タスク追加時は `.date` フィールドを使用

## ホーム画面ダッシュボード
- 「今日のタスク」カード: `getTodayTaskStats()` で今日の日付に割り当てられたタスクのみ集計、%表示
- ダッシュボード更新関数が **2箇所** ある（ES6版 ~L13900, ES5版 ~L16700）。両方を更新すること
- HTML要素: `#dashGoalProgress`（%表示）, `#dashGoalCount`（n/m 完了）

## 今回のセッション（2回分）で完了した修正

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

### E. その他
- 空 `<script>` タグ修正（L13831、元から存在していた問題）
- 未使用関数 `getDateOffset` 削除（goal-ai-breakdown.js）

## 未解決・今後の課題

### 最優先（次回セッション）
- **カレンダー連動**: カレンダーUIにタスクを表示、カレンダーからタスク追加/管理
- **カテゴリと目標の連動**: 行動カテゴリと目標をリンク

### 優先度中
- **クラウド同期**: デバイス間データ同期（バックエンド変更必要、別セッション推奨）

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

## 技術的な注意点
- `index.html`は約20000行, 1.7MBあり全体を一度に読めない。Grep/行番号指定で必要箇所を読むこと
- JavaScriptモジュールはIIFE（即時実行関数）パターン。`window.xxx` でグローバル公開
- goals-v2.js のCSSは `gv2-*` 名前空間で動的注入。index.html 内の旧 goal CSS は全削除済み
- 月キー: `"YYYY-MM"` 形式（例: `"2026-02"`）
- 日付キー: `"YYYY-MM-DD"` 形式（例: `"2026-02-16"`）
- **goals-v2.jsが最終的にwindow関数を全て上書きする**（読み込み順: index.html → goal-ai-breakdown.js → goals-v2.js）
- ダッシュボードの updateDashboard が **ES6版とES5版の2つ** あるので変更時は両方更新すること
