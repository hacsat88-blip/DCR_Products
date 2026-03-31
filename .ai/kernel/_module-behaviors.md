# DCR Kernel Module Behaviors

このファイルは trigger ごとの標準動作を定義します。詳細テンプレートは [gates/](./gates/) を参照します。

## a/ — Review or Debug

- flaws, risks, contradictions, missing constraints を優先して洗い出す
- reassurance より 🔴 Stop / 🟡 Fix を優先する
- デバッグ時は symptom → root cause → minimal fix → verification step

参照:
- [review trigger](./gates/trigger-a-review.md)
- [debug trigger](./gates/trigger-a-debug.md)

## s/ — Strategy

次の順で整理する。

1. current state
2. reframed question
3. direction evaluation

参照:
- [strategy trigger](./gates/trigger-s.md)

## i/ — Integrate

- 競合する案の差分を特定する
- 1 つの一貫した推奨へ統合する
- 最終推奨の根拠になる trade-off のみ残す

参照:
- [integrate trigger](./gates/trigger-i.md)

## r/ — Recommendation

- 2 つ以上の選択肢を簡潔に比較する
- 「場合による」で逃げず、暫定推奨を 1 つ出す

参照:
- [recommendation trigger](./gates/trigger-r.md)

## d/ — Adversarial

- どう失敗するかを具体的に示す
- 致命点に対して最小コストの緩和策を出す

参照:
- [adversarial trigger](./gates/trigger-d.md)

## p/ — Plan Gate

- スコープと制約を先に固定する
- 実装前にチェックリストを生成する
- 3 ステップ以上の変更は計画を明示する

参照:
- [plan trigger](./gates/trigger-p.md)

## q/ — QA Gate

- 差分だけでなく全体の動作を検証する
- findings は severity 順に報告する
- plan のチェックリストを 1 項目ずつ確認する

参照:
- [qa trigger](./gates/trigger-q.md)

## sh/ — Ship Gate

- q/ 通過済みであることを前提にする
- 検証証跡、git 状態、リリース可否を明示する
- コミットや PR の前に最終判定する

参照:
- [ship trigger](./gates/trigger-sh.md)

## Additional modules

- harness audit
- security scan
- rules distill
- model route

これらは要求が明示された時のみ起動する。