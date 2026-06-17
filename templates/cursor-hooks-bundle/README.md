# Cursor hooks bundle（DCR / サトシ開発）

## 導入

リポジトリルートで:

```powershell
Copy-Item -Recurse -Force templates\cursor-hooks-bundle\.cursor .\
```

既に `.cursor\hooks.json` がある場合は **マージ**してください。

## 構成（本番と同一）

| ファイル | 役割 |
|-----------|------|
| `.cursor/hooks.json` | `beforeShellExecution` で `risky-shell.ps1` を実行（**`-File`、EncodedCommand 不使用**） |
| `.cursor/hooks/risky-shell.ps1` | `dd` / `mkfs` / force push / `reset --hard` 等のみ **ask**（ルーティン削除は検知しない） |
| `.cursor/hooks/dcr-git-gate.ps1` | **未接続**。`git commit` / `push` 前に validate + deploy -Check を掛けたいとき、`hooks.json` にブロックを追加して利用 |

## 注意

- ルート `.gitignore` の `/.cursor/` により既定ではコミットされません。共有時は `git add -f` か ignore 調整。
- `chat.tools.terminal.autoApprove` を使う場合は、個人のエディタ設定で **`git add` のみ**に寄せてください（commit/push は IDE で確認）。
