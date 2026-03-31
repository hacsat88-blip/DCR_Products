# DCR Kernel Environments

このディレクトリは環境別差分の正本です。共通仕様は [../_base.md](../_base.md) を参照し、このディレクトリには環境固有の追加ルールだけを置きます。

## Environment files

- `vscode-copilot.md` = VS Code Copilot Chat 用差分
- `claude-code.md` = Claude Code 用差分
- `copilot-cli.md` = GitHub Copilot CLI 用差分
- `cursor.md` = Cursor 用差分
- `codex.md` = Codex 用差分

## Rule

- 共通仕様をここで再定義しない
- 環境固有の UI、初期化、制約、参照ファイルだけを書く
- entrypoint を変更する時は、このディレクトリの差分定義と矛盾しないこと