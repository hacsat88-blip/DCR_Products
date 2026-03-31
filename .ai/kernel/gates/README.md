# DCR Kernel Gates

このディレクトリは trigger ごとの詳細ハンドラを保持します。共通の起動条件は [../_base.md](../_base.md) にあり、ここでは出力フォーマットと確認観点を定義します。

## Gate files

- `trigger-a-review.md`
- `trigger-a-debug.md`
- `trigger-s.md`
- `trigger-i.md`
- `trigger-r.md`
- `trigger-d.md`
- `trigger-p.md`
- `trigger-q.md`
- `trigger-sh.md`
- `trigger-harness-audit.md`
- `trigger-security-scan.md`
- `trigger-rules-distill.md`
- `trigger-model-route.md`

## Rule

- entrypoint には trigger 名の一覧だけを置き、詳細はここへ寄せる
- 行動指針の変更は `.commands/` と整合するように行う