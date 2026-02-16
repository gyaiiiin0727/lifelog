# Dayce PWA セッション引き継ぎ

## プロジェクト
- **アプリ名**: Dayce (Day + Voice) - ライフログPWA
- **場所**: `/Users/shuhei.sugai/Downloads/lifelog_pwa_ai_button_click_fix (1)/`
- **GitHub Pages**: gyaiiiin0727.github.io/lifelog
- **デプロイ方法**: SSH/gh CLI なし。GitHub Web で「Add file → Upload files」で手動アップロード

## 主要ファイル
| ファイル | 役割 |
|---|---|
| `index.html` | メインHTML/CSS/JS全部入り（~21000行, 1.7MB） |
| `goal-ai-breakdown.js` | AI目標設定チャット機能 |
| `goals-v2.js` | 目標ページUI（進捗カード、週タスク、目標リスト）**← 最終的にwindow関数を支配** |
| `manifest.json` | PWA設定 |
| `icon.jpg` | アプリアイコン |
| `drill_instructor.png` / `takumi_senpai.png` / `hana_san.png` | AIキャラクター画像 |

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

## ⚠️ 最重要: 目標コードの分散問題

**次回セッションの最優先タスク: 目標コードのリファクタリング→カレンダー連動**

現在、目標関連コードが **4箇所** に分散し、`window.*`を上書きし合っている：

| # | 場所 | 行番号(目安) | 内容 |
|---|---|---|---|
| 1 | index.html | L8946付近 | 古い`changeGoalsMonth`, `updateGoalsMonthDisplay` |
| 2 | index.html | L11601-11880付近 | GoalsModule IIFE（renderGoals, changeGoalsMonth等を再定義） |
| 3 | index.html | L12026-12364付近 | GoalsModule v2 IIFE（App.state.goals使用、DOMContentLoadedでinit） |
| 4 | goals-v2.js | 全体 | **最終勝者** — window.changeGoalsMonth等を全て上書き |

### 上書き順序（後が勝つ）:
```
index.html L8946 → index.html L11867 → index.html L12354 → goals-v2.js L534-548
```

### リファクタリング計画:
1. **ステップ1**: index.html内の古い3つの目標コード（#1, #2, #3）を削除
2. **ステップ2**: goals-v2.jsに一本化（必要な機能をgoals-v2.jsに移植）
3. **ステップ3**: weeklyTasksを日付ベースに変更（`week: "2026-W07"` → `date: "2026-02-16"`）
4. **ステップ4**: カレンダーUIと連動（月の残り日数でタスクスケジュール）

### 注意:
- `App.state.goals.selectedMonth` と `window.selectedGoalsMonth` が競合している
- goals-v2.jsの`renderAll()`内で`updateMonthDisplayV2()`を呼んで月表示を直接更新するようにした（今回修正）
- `currentWeekKey`はgoals-v2.jsで定義・window公開（ISO week形式 "YYYY-W##"）

## 今回のセッションで完了した修正

### 14. モードタブデザイン改善
- 外側: `border-radius:0`（四角）、`background:#e3f2fd`、`padding:14px 8px`
- 内側タブ: `flex`なし（文字幅に合わせた自動幅）、`justify-content:center`、`padding:6px 16px`
- アクティブ: `background:#2196F3; color:#fff; border-radius:6px`

### 15. ステップ入力の音声重複修正
- `continuous: true` → `false` に変更
- `onend`リスタート時に`baseText`と`finalAccum`をリセット

### 16. ステップ入力にフィードバック担当選択+AIで整える追加
- 完了画面にキャラクター選択UI（step-tone-btn）追加
- `window.selectStepTone()` — フリートーク側と同期
- `window.stepAIRefine()` — ステップ入力内容をAIに送信、フィードバック表示
- フィードバック結果をjournalEntriesV3に保存（summary抽出含む）

### 17. ジャーナル削除ボタン移動
- `journalV3ClearBtn`を`journalFreetalkSection`の**外**に移動
- ステップ入力モードでも削除可能に

### 18. HTML構造バグ修正（div開閉タグ）
- journalタブの`</div>`漏れ修正 → 他タブに要素が漏れていた
- goalsタブの余分な`</div>`削除
- L5726の余分な`</div></div>`削除（カテゴリUIがjournalタブ外に出ていた）
- **全8タブのdivバランスを検証・確認済み**

### 19. 目標ページ月表示修正
- goals-v2.jsに`updateMonthDisplayV2()`追加
- `renderAll()`の先頭で月表示を毎回更新
- `window.updateGoalsMonthDisplay`もgoals-v2.jsで上書き

### 20. 今週やること: タスク未設定でも表示
- goals-v2.jsの`renderWeekly()`: タスク0個の目標もスキップせず表示
- 各目標に「この週のタスクはまだありません」+「＋ 追加」ボタンを常に表示

### 21. ホーム概要: 目標達成率→タスク達成度
- HTMLラベル「目標」→「今週のタスク」に変更
- 月間目標の達成率ではなく、今週のweeklyTasks完了数/総数を表示
- 2箇所の更新関数を両方修正（L14843付近、L17684付近）

### 22. 当日要約の「整える一言」→キャラクター名表示
- `getCharacterInfo`依存を排除、直接トーン名を解決
- `e.aiFeedbackTone`がなくてもlocalStorageからフォールバック
- 常に「💬 キャラクター名 の一言」と表示

### 23. ステップ入力のstep-card黒枠削除
- `border:2px solid #111` → `border:none; border-radius:0; padding:20px 0`

## 未解決・今後の課題

### 最優先（次回セッション）
- **目標コードリファクタリング**: 4箇所の分散コードを goals-v2.js に一本化
- **カレンダー連動**: weeklyTasksを日付ベースに変更、カレンダーUIと連動

### 優先度中
- **カテゴリと目標の連動**: 行動カテゴリと目標をリンク
- **クラウド同期**: デバイス間データ同期（バックエンド変更必要、別セッション推奨）

### 既知の残留
- **旧`journals`キー（L6088, L6116, L6999）**: 古い保存機能がまだ残っている。現在のメイン機能はjournalEntriesV3なので直接影響なし
- **ステップ入力のstep-card**: CSSで`border:none`に変更済みだがキャッシュで反映遅れる可能性あり

## localStorage キー一覧
| キー | 内容 |
|---|---|
| `activities` | 行動ログ配列 |
| `moneyRecords` | お金の記録配列 |
| `journalEntriesV3` | ジャーナル（日付キーのオブジェクト） |
| `monthlyGoals` | 月間目標配列（weeklyTasks含む） |
| `weightRecords` | 体重記録配列 |
| `activityCategories` | 行動カテゴリ |
| `expenseCategories` | 支出カテゴリ |
| `incomeCategories` | 収入カテゴリ |
| `journalFeedbackTone` | ジャーナルのフィードバック担当 |
| `aiConsultTone` | AI相談のキャラクター選択（独立） |
| `lastActiveTab` | 最後に開いたタブ |
| `isPremium` | 有料会員フラグ |

## 技術的な注意点
- `index.html`は約21000行, 1.7MBあり全体を一度に読めない。Grep/行番号指定で必要箇所を読むこと
- JavaScriptモジュールはIIFE（即時実行関数）パターン。`window.xxx` でグローバル公開
- CSSはJavaScript内で `createElement('style')` で動的注入しているものが多い
- ISO週キー: `"YYYY-W##"` 形式（例: `"2026-W07"`）
- 月キー: `"YYYY-MM"` 形式（例: `"2026-02"`）
- **goals-v2.jsが最終的にwindow関数を全て上書きする**（読み込み順: index.html → goal-ai-breakdown.js → goals-v2.js）
