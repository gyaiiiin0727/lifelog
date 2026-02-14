# Dayce PWA セッション引き継ぎ

## プロジェクト
- **アプリ名**: Dayce (Day + Voice) - ライフログPWA （※旧名Daice、i→yに変更済み）
- **場所**: `/Users/shuhei.sugai/Downloads/lifelog_pwa_ai_button_click_fix (1)/`
- **GitHub Pages**: gyaiiiin0727.github.io/lifelog
- **デプロイ方法**: SSH/gh CLI なし。GitHub Web で「Add file → Upload files」で手動アップロード

## 主要ファイル
| ファイル | 役割 |
|---|---|
| `index.html` | メインHTML/CSS/JS全部入り（~20000行） |
| `goal-ai-breakdown.js` | AI目標設定チャット機能 |
| `goals-v2.js` | 目標ページUI（進捗カード、週タスク、目標リスト） |
| `voice-input-extra.js` | 音声入力機能 |
| `manifest.json` | PWA設定 |
| `icon.jpg` | アプリアイコン（1280x1280px） |
| `drill_instructor.png` / `takumi_senpai.png` / `hana_san.png` | AIキャラクター画像 |

## バックエンドAPI
- URL: `https://lifelog-ai.little-limit-621c.workers.dev/api/analyze`
- Method: POST
- Body: `{ text, tone, type:'consult' }` または `{ text, tone, type:'journal', characterPrompt }`
- Cloudflare Workers

## 全セッションで完了した修正一覧

### 1. タスク保存で目標が消えるバグ（根本修正）
- `goal-ai-breakdown.js`: `_loadGoalsFromStorage()` / `_saveGoalsToStorage()` ヘルパー追加
- 常にlocalStorageから読み直してから保存する方式に統一

### 2. チャット入力欄の拡大
- `goal-ai-breakdown.js`: `input` → `textarea` に変更、フォントサイズ16px、自動リサイズ対応

### 3. 4週間計画機能（新機能）
- `goal-ai-breakdown.js`:
  - AIプロンプトを4週間計画形式に変更（【1週目】【2週目】...）
  - `parseWeeklyPlan()` 新規追加（週ヘッダーパーサー）
  - `getWeekKeyOffset()` 新規追加（週キーオフセット計算）
  - `showWeeklyPlanSelection()` 新規追加（週別タスク選択UI）
  - `addSelectedTasks()` に `data-week` 属性読み取り追加
- `goals-v2.js`:
  - `viewingWeekKey` 状態変数追加
  - 週ナビゲーション（◀ 前週 | 今週やること | 次週 ▶）
  - `formatWeekLabel()` / `changeViewingWeek()` / `goToCurrentWeek()`
  - 手動タスク追加も閲覧中の週に紐付け

### 4. レイアウト順序変更
- `goals-v2.js`: 表示順を「進捗→今月の目標→今週やること」に変更（FABボタン干渉回避）

### 5. ロゴ変更
- `index.html`: アイコン画像を「D」として使い「ayce」テキストを横に配置、中央寄せ、32px太字

### 6. AI相談に過去データ連動（新機能）
- `index.html`:
  - `buildContextSummary(topic)` + 5つのヘルパー関数を新規追加
  - `summarizeActivities()` - 今週の行動データ
  - `summarizeMoney()` - 今月の収支データ
  - `summarizeGoals()` - 今月の目標進捗
  - `summarizeJournal()` - 直近の振り返り・気分
  - `summarizeWeight()` - 体重推移
  - `sendAIConsult()` にデータコンテキスト注入
  - ジャーナルAIフィードバック（`journalAiBigBtn`）にも過去データコンテキスト注入
- `goal-ai-breakdown.js`:
  - `buildPrompt()` 初回ターンに過去データ注入

### 7. AI相談フォーマットバグ修正
- `index.html` `sendAIConsult()`: ジャーナル分析フォーマット（【よかったこと】【改善したいこと】等）を使わないよう明示的にプロンプトで禁止
- `noAnalysisRule` 変数でルールを定義

### 8. AIフィードバック品質改善（データ誤解釈防止）
- `index.html` `sendAIConsult()`: 過去データ解釈ルール追加
  - 通勤・移動・残業など義務的行動を褒めない
  - 運動・自炊・勉強・趣味など自発的行動のみ前向きに評価
  - データ不足時はデータに言及せず相談内容に集中
- `index.html` ジャーナルAIフィードバック: 同様の `dataInterpretRule` 追加

### 9. 名前変更 Daice → Dayce
- `index.html`: title, meta apple-mobile-web-app-title（2箇所）, ロゴテキスト（aice→ayce）
- `manifest.json`: name, short_name

### 10. AI分析中テキスト変更
- `index.html`: 「🤖 AI分析中...」→「今日もお疲れ様でした✨」（2箇所）

### 11. 音声入力ジャーナル2パターン（新機能）
- `index.html`: モード切替タブ（フリートーク / ステップ入力）
  - フリートーク: 従来の自由入力 → AIで整える
  - ステップ入力: 6カテゴリ別に1つずつガイド付き音声入力
    - よかったこと → 改善したいこと → 気づいたこと → もやっとしたこと → MUST → WANT
    - プログレスドット表示、戻る/スキップ/次へナビゲーション
    - 完了時にjournalEntriesV3のsummaryに直接保存（AI不要）
    - rawフィールドにも統合テキスト保存（フリートーク互換）
  - HTML: `#journalModeTabs`, `#journalStepInput`, `#journalFreetalkSection`
  - CSS: `.journal-mode-tabs`, `.step-card`, `.step-dot`, `.step-nav` 等
  - JS: `switchJournalMode()`, `journalStepNext/Prev/Skip/Restart()`, ステップ用SpeechRecognition

### 12. バグ修正バッチ
- localStorage不整合修正: `saveJournalWithAI()` が `'journals'` に保存していたのを `'journalEntriesV3'` (V3形式)に修正
- BACKEND_URL統一: 古い `lifelog-backend.vercel.app` を正しい Workers URLに修正
- `_saveGoalsToStorage` エラーハンドリング: localStorage容量超え時にアラート表示
- AIレスポンスnullチェック強化: 型チェックを先にする安全なパターンに変更
- チャット `_state` リセット完全化: `maxTurns`, `tone` もリセット対象に

### 13. その他（前セッション）
- `goals-v2.js`: 進捗カード紫→白に変更済み
- `voice-input-extra.js`: 音声入力テキスト重複バグ修正済み
- `manifest.json`: 新規作成（PWAアイコン設定）
- `index.html`: `border-radius` 削除（アイコン角丸の二重化防止）

## 未解決・今後の課題

### 優先度高
- **カテゴリと目標の連動**: 行動カテゴリ（運動/仕事等）と目標をリンクさせ、AIフィードバックで目標進捗を反映する。`buildContextSummary('goals', { goalCategory })` は実装済みだが、行動記録→目標の自動マッチングはまだ。

### 優先度中
- **クラウド同期機能**: デバイス間データ同期。Cloudflare Workers側にユーザー認証+データストレージの追加が必要。バックエンド変更が大きいため別セッション推奨。

### 注意点
- **PCでの「＋追加」ボタン**: レイアウト順序変更で改善したがPC動作は未確認
- **GitHub Pages反映**: 変更はローカルのみ。ユーザーがGitHub Webから手動アップロードする必要あり
- **PWAアイコン更新**: ホーム画面アイコンはキャッシュが強い。一度削除→再追加が必要
- **過去の目標データ**: 以前のバグで消失済み。復元不可

## localStorage キー一覧
| キー | 内容 |
|---|---|
| `activities` | 行動ログ配列 |
| `moneyRecords` | お金の記録配列 |
| `journalEntriesV3` | ジャーナル（日付キーのオブジェクト） |
| `monthlyGoals` | 月間目標配列（weeklyTasks含む） |
| `weightRecords` | 体重記録配列 |
| `isPremium` | 有料会員フラグ（'true'で有効） |

## 技術的な注意点
- `index.html`は約20000行あり、全体を一度に読めない場合がある。Grep/行番号指定で必要箇所を読むこと
- JavaScriptモジュールはIIFE（即時実行関数）パターン。`window.xxx` でグローバル公開
- CSSはJavaScript内で `createElement('style')` で動的注入しているものが多い
- ISO週キー: `"YYYY-W##"` 形式（例: `"2026-W07"`）
- 月キー: `"YYYY-MM"` 形式（例: `"2026-02"`）
- AIキャラクター3種: harsh（マネージャー）, normal（タクヤ先輩）, gentle（ハナさん）
