# Cursor hooks bundle (DCR / サトシ開発 向け)

## 導入（コピーのみ）

リポジトリルートで PowerShell:

```powershell
Copy-Item -Recurse -Force templates\cursor-hooks-bundle\.cursor .\
```

既に `.cursor\hooks.json` がある場合は内容をマージしてください。

## 含まれるフック（現在）

- `hooks/risky-shell.ps1` のみ — 明らかに危険なシェル（dd / mkfs / force push 等）で **確認(ask)**。
- `hooks.json` の起動コマンドは、カレントディレクトリから親を最大 32 階まで辿って `.cursor/hooks/risky-shell.ps1` を解決してから実行します。サブディレクトリが cwd でもフックが適用され、スクリプトが見つからない場合のみ許可（allow）にフォールバックします。
- **Git 前の validate/deploy ゲートは既定では含めません**（commit が軽くなるため）。必要なら Git 用ブロックを `hooks.json` に戻してください。

## 注意

- `.gitignore` に `/.cursor/` があるため、チーム共有時は `git add -f` 等で追跡するか ignore を調整してください。

