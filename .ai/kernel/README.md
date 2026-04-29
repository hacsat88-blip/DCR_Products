# DCR Kernel — 統一・最適化アーキテクチャ

このディレクトリは、複数の AI モデル・環境間で DCR Kernel（Decision-Making Coherence & Reliability）の仕様を統一・最適化する共有レイヤーです。

**設計哲学**: 
- **Core は統一** → Signal protocol / Triggers / Permission model など変わらない要素
- **差分のみカスタマイズ** → 環境固有機能（CLI Session init など）のみ分離
- **単一ソース・オブ・トゥルース** → Core を修正すれば全環境に自動反映

---

## 📁 ファイル構成

```
.ai/kernel/
├── README.md                    ← このファイル
├── _base.md                     ← ★ Core 統一定義（全モデル共通）
├── _permissions.md              ← 権限モデル（P1/P2/P3）
├── _safety-boundaries.md        ← セーフティバウンダリ（全モデル共通）
├── _module-behaviors.md         ← モジュール動作（a/s/i/d 詳細）
├── dcr-kernel.md                ← runtime entrypoint 生成用の共有 kernel
│
├── environments/                ← 環境別実装レイヤー
│   ├── README.md               ← 環境選択ガイド
│   ├── vscode-copilot.md       ← VS Code Copilot Chat 用（差分のみ）
│   ├── claude-code.md          ← Claude Code 用（差分のみ）
│   ├── copilot-cli.md          ← GitHub Copilot CLI 用（差分のみ + CLI固有）
│   └── codex.md                ← Codex 用（差分のみ）
│
└── gates/                       ← トリガーハンドラ統一層
    ├── README.md               ← トリガー説明
    ├── trigger-a-review.md     ← a/ Review
    ├── trigger-a-debug.md      ← a/ Debug
    ├── trigger-s.md            ← s/ Strategy
    ├── trigger-i.md            ← i/ Integrate
    ├── trigger-r.md            ← r/ Recommendation
    ├── trigger-d.md            ← d/ Adversarial
    ├── trigger-p.md            ← p/ Plan Gate
    ├── trigger-q.md            ← q/ QA Gate
    ├── trigger-sh.md           ← sh/ Ship Gate
    ├── trigger-harness-audit.md
    ├── trigger-security-scan.md
    └── trigger-rules-distill.md
```

---

## 🎯 ファイル対応表：モデル・環境別

| 環境 / モデル                | メインロード                      | 参照先                                                   | 用途             |
| ---------------------------- | --------------------------------- | -------------------------------------------------------- | ---------------- |
| **VS Code Copilot Chat**     | `.github/copilot-instructions.md` | `.ai/kernel/_base.md` + `environments/vscode-copilot.md` | Chat 統合        |
| **Claude Code**              | `CLAUDE.md`                       | `.ai/kernel/_base.md` + `environments/claude-code.md`    | Code 通合        |
| **GitHub Copilot CLI**       | `AGENTS.md`                       | `.ai/kernel/_base.md` + `environments/copilot-cli.md`    | CLI 起動時       |
| **Windsurf**                 | `.windsurf/rules/dcr-kernel.md`   | `.ai/kernel/dcr-kernel.md`                               | ルール自動ロード |
| **Codex**                    | `AGENTS.md`                       | `.ai/kernel/_base.md` + `environments/codex.md`          | リファレンス     |

---

## 📖 各ファイルの役割

### 🔧 Core 統一層（`_*.md`）

#### `_base.md` ⭐ 最重要
**共通定義** — 全モデルで変わらない要素：
- Signal protocol（🟢 / 🟡 / 🔴）
- Response behavior（明示的・簡潔・実装志向）
- Triggers 定義（a/ s/ i/ r/ d/ p/ q/ sh/）
- Execution Modes（autopilot / ralph / ulw / ralplan など）
- Pipeline gate chain（p/ → 実装 → q/ → sh/）

**新規追加時**: Core の仕様変更が発生したら `_base.md` 更新 → **全環境に自動反映**

#### `_permissions.md`
- P1 / P2 / P3 権限モデル
- 判断の優先順位（安全 ＞ 目的 ＞ 速度）

#### `_safety-boundaries.md`
- Secret 露出防止
- 仕様変更前の確認義務
- 破壊的操作の警告ルール

#### `_module-behaviors.md`
- a/ 動作（Review / Debug）
- s/ 動作（Strategy）
- i/ 動作（Integrate）
- d/ 動作（Adversarial）
- r/ 動作（Recommendation）
- その他トリガーの詳細ハンドラ

#### `dcr-kernel.md`
- Windsurf など inline runtime が必要な環境へ配る共有 kernel
- `.windsurf/` ではなく、このファイルを正本として編集する
- `deploy.ps1` / `tools/adapters/*.ps1` が各環境の形式へ同期する

---

### 🌍 環境別層（`environments/`）

各ファイルは **差分のみ** 記載：

#### `vscode-copilot.md`
- 環境固有：VS Code Chat の UI / コンテキスト制限
- 拡張：module files reference（`.ai/repo-map.md` 等）

#### `claude-code.md`
- 環境固有：Claude Code の Communication（日本語指定）
- 拡張：External capability packs（Azure Skills）

#### `copilot-cli.md` ⭐ 差分大
- 環境固有：**Session initialization**（CLI固有）
- 環境固有：**Tool priority hierarchy**（LSP / grep の優先度）
- 環境固有：**SQL tracking**（キャッシュ管理）
- 環境固有：**Troubleshooting**（CLI固有エラー）

#### `codex.md`
- 環境固有：Codex の agent orchestration
- リファレンス層での役割定義

---

### 🎛️ トリガーハンドラ層（`gates/`）

**統一トリガーハンドラ** → 全モデルで共有：

| トリガー   | ファイル              | 動作                           |
| ---------- | --------------------- | ------------------------------ |
| `a/`       | `trigger-a-review.md` | コード・デザイン審査           |
| `a/ debug` | `trigger-a-debug.md`  | デバッグ（症状 → 根本原因）    |
| `s/`       | `trigger-s.md`        | 戦略概観（現状→問い→方向）     |
| `i/`       | `trigger-i.md`        | 競合解決（複数アイデアの統合） |
| `r/`       | `trigger-r.md`        | トレードオフ分析               |
| `d/`       | `trigger-d.md`        | 悪手分析（失敗シナリオ）       |
| `p/`       | `trigger-p.md`        | Plan Gate（計画ロック）        |
| `q/`       | `trigger-q.md`        | QA Gate（検証ロック）          |
| `sh/`      | `trigger-sh.md`       | Ship Gate（リリース判定）      |

追加トリガー（リクエスト駆動）:
- `trigger-harness-audit.md`
- `trigger-security-scan.md`
- `trigger-rules-distill.md`

---

## 🔄 使用フロー

### 📌 **モデルを選択して作業開始**

```
ユーザー / IDE
    ↓
エントリポイント選択
    ├─ VS Code Copilot Chat
    │   ↓
    │   copilot-instructions.md（自動ロード）
    │   ↓
    │   .ai/kernel/ 参照
    │
    ├─ Claude Code
    │   ↓
    │   CLAUDE.md（プロンプト埋め込み）
    │   ↓
    │   .ai/kernel/ 参照
    │
    ├─ GitHub Copilot CLI
    │   ↓
    │   AGENTS.md（共通入口）
    │   ↓
    │   .ai/kernel/ 参照
    │
    ├─ Windsurf
    │   ↓
    │   .windsurf/rules/dcr-kernel.md（自動ロード）
    │   ↓
    │   .ai/kernel/ 参照
    │
    └─ Codex
        ↓
        AGENTS.md（リファレンス）
        ↓
        .ai/kernel/ 参照
```

### 📌 **トリガーを実行**

```
ユーザー入力: "a/ ......"
    ↓
各モデルが _base.md の Triggers セクション参照
    ↓
gate/trigger-a-review.md を実行
    ↓
ハンドラ共通動作: 「欠陥・リスク・矛盾を洗い出す」
```

---

## 🔧 管理ガイドライン

### ✅ 追加・修正の判断フロー

```
修正対象 = ?
    ├─ Trigger 新規追加
    │   ↓
    │   gate/trigger-[new].md を作成
    │   ↓
    │   validate.ps1 で frontmatter 確認
    │
    ├─ Signal / Permission / Safety の変更
    │   ↓
    │   → _base.md / _permissions.md / _safety-boundaries.md 修正
    │   → 全環境に自動適用
    │
    ├─ 環境固有機能の追加
    │   ↓
    │   → environments/[env].md に差分のみ追加
    │
    ├─ モデル別エントリポイントの更新
    │   ↓
    │   → copilot-instructions.md / CLAUDE.md / AGENTS.md 等を更新
    │   → 参照先は .ai/kernel/ を指すキープ
    │
    └─ 説明文の改善
        ↓
        → 該当する _*.md またはトリガー ファイルを修正
```

### 🚨 "修正ミス"を避けるために

1. **コア定義（_base.md）を直接いじるな** → 必ず差分を確認して環境別層で吸収できないか検討
2. **トリガーハンドラの重複排除** → gates/ 内で統一化し、環境別では override しない
3. **参照切れ防止** → 環境別ファイル内のリンク参照は相対パス（`../_base.md`）を使用
4. **validate.ps1 で検証** → すべての修正後に `validate.ps1` → `deploy.ps1 -Check` を実行

---

## 📊 ファイル統合前後の比較

### Before（現状：重複が高い）

```
ファイル数: 4 個
AGENTS.md          ～170 行
CLAUDE.md          ～200 行
dcr-kernel.md      ～150 行
copilot-instructions.md  ～160 行
────────────────────────────
計: ～1030 行
重複度: Signal protocol / Triggers ⭐⭐⭐⭐⭐
```

### After（最適化後：統一 + 差分のみ）

```
ファイル数: 13 個（構造化）
_base.md           ～200 行（統一 Core）
_permissions.md    ～50 行
_safety-boundaries.md ～40 行
_module-behaviors.md ～150 行
vscode-copilot.md  ～40 行（差分のみ）
claude-code.md     ～40 行（差分のみ）
copilot-cli.md     ～80 行（CLI固有）
codex.md           ～30 行（差分のみ）
gate/*.md（12個）   ～300 行（統一）
────────────────────────────
計: ～960 行
重複度: Signal protocol / Triggers ⭐（Core に統一）
保守性: ↑↑↑（Core 修正 = 全環境反映）
```

**メリット**:
- ✅ 重複削減（70 行削減）
- ✅ 参照の一元化（理解しやすい）
- ✅ 拡張性向上（新環境・トリガー追加が容易）
- ✅ 同期ズレ防止（Core 1ファイル → 全反映）

---

## 🚀 次のステップ

### Phase 1: Core 統一層の生成
```
□ _base.md を生成（Signal/Mode/Trigger/Gate chain を統合）
□ _permissions.md を生成
□ _safety-boundaries.md を生成
□ _module-behaviors.md を生成
```

### Phase 2: 環境別層の分離
```
□ environments/vscode-copilot.md を生成
□ environments/claude-code.md を生成
□ environments/copilot-cli.md を生成（CLI固有セクション保持）
□ environments/codex.md を生成
```

### Phase 3: トリガーハンドラの統一化
```
✅ gates/trigger-*.md を生成（.commands/ から移行完了、.commands/ 削除済み）
```

### Phase 4: エントリポイント参照化
```
□ copilot-instructions.md → 参照層に縮約
□ CLAUDE.md → 参照層に縮約
□ AGENTS.md → 参照層に縮約
✅ .windsurf/rules/dcr-kernel.md → `.ai/kernel/dcr-kernel.md` から同期
```

### Phase 5-7: 検証・デプロイ
```
□ validate.ps1 / deploy.ps1 -Check で整合性確認
□ Git コミット
```

---

## 📝 参考資料

- **統合元仕様**: `.ai/module/unified-integration.md`
- **検証スクリプト**: `validate.ps1` / `deploy.ps1`
- **モデルファイル**: `AGENTS.md` / `CLAUDE.md` / `.windsurf/rules/dcr-kernel.md` / `.github/copilot-instructions.md`

---

**最終更新**: 2026-03-31  
**管理者**: サトシ開発チーム  
**構想**: DCR Kernel ハイブリッド統一・最適化アーキテクチャ
