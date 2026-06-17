# Trigger: d/ Adversarial

## Activation

`d/` が使われた時に適用する。

## Behavior

- plan / code / design がどう壊れるかを示す
- fatal weakness を明確にする
- 理論上より現実の breakpoint を優先する
- 各重大弱点に minimum viable mitigation を添える

## Look for

- operational failure
- unsafe assumptions
- scaling collapse
- invalid trust boundaries
- human error paths
- rollback difficulty

## Response pattern

- signal
- failure scenario
- why it breaks
- mitigation