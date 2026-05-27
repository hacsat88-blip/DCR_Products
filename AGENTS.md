<!-- AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
Generated from: .ai/book + .ai/kernel + .ai/catalog/rules/ + .ai/catalog/skills/ + .ai/catalog/agents-source/
To regenerate: Run pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 or .\tools\deploy-all.ps1
Any manual edits will be overwritten on next deploy. -->

# Codex / GitHub Copilot CLI Entrypoint

Unified entry point for Codex and GitHub Copilot CLI environments.

GitHub Copilot CLI specific behavior lives in [.ai/environments/copilot-cli/kernel.md](.ai/environments/copilot-cli/kernel.md).

## Scope Summary

- Active rules: 53
- Active skills: 140
- Active agents: 116
- Deprecated aliases (rules/skills/agents): 10 / 3 / 34

## Source of Truth

- Rules: [.ai/catalog/rules/](.ai/catalog/rules/)
- Skills: [.ai/catalog/skills/](.ai/catalog/skills/)
- Agents: [.ai/catalog/agents-source/](.ai/catalog/agents-source/)
- Shared Book: [.ai/book/](.ai/book/)
- Kernel: [.ai/kernel/](.ai/kernel/)
- Environment diff (Codex): [.ai/environments/codex/kernel.md](.ai/environments/codex/kernel.md)

---

## Unified Coordinator

蜈ｨ繧ｿ繧ｹ繧ｯ縺ｮ蜊倅ｸ蜈･蜿｣縺ｯ **pied-piper** agent縲３ule/Skill/Agent 驕ｸ螳壹・豎ｺ螳壽惠縺ｫ蠕薙＞縲∝呵｣懊ｒ蠅励ｄ縺輔★蠢・ｦ∝香蛻・↑蛟呵｣懊∈蝨ｧ邵ｮ縺励∫匱轣ｫ蜑阪↓蛟呵｣懊・逅・罰繝ｻ譛溷ｾ・柑譫懊ｒ蝣ｱ蜻翫☆繧九・
Skill縲、gent縲√し繝悶お繝ｼ繧ｸ繧ｧ繝ｳ繝医∽ｸｦ蛻・orchestration縲∝､夜Κ MCP/API縲￣2/P3 謫堺ｽ懊′髢｢繧上ｋ蝣ｴ蜷医・縲∝次蜑・→縺励※ **蛟呵｣懈署遉ｺ 竊・繝ｦ繝ｼ繧ｶ繝ｼ謇ｿ隱・竊・逋ｺ轣ｫ** 縺ｮ鬆・↓騾ｲ繧√ｋ縲１1 read-only 縺ｮ蜊倡峡菴弱Μ繧ｹ繧ｯ謗｢邏｢縺ｮ縺ｿ縲∫洒縺・ｺ句燕蝣ｱ蜻雁ｾ後↓閾ｪ蜍募ｮ溯｡後〒縺阪ｋ縲・
閾ｪ辟ｶ險隱槭・謇ｿ隱阪・譟斐ｉ縺九￥諡ｾ縺・′縲∽ｸ諢上〒縺ｪ縺・ｴ蜷医・蜀咲｢ｺ隱阪☆繧九・{MarkdownTick}縺翫☆縺吶ａ縺ｧ` / `謗ｨ螂ｨ縺ｧ` / `A縺ｧ` / `1縺ｧ` 縺ｯ蟇ｾ雎｡縺御ｸ諢上・逶ｴ蜑榊呵｣懊↓邨舌・縺､縺丞ｴ蜷医・縺ｿ謇ｿ隱肴桶縺・・{MarkdownTick}縺昴ｌ縺ｧ` / `騾ｲ繧√※` / `謇ｿ隱・{MarkdownTick} / `OK` 縺ｯ蜊倡峡蛟呵｣懊・蝣ｴ蜷医・縺ｿ謇ｿ隱肴桶縺・・
`縺・＞諢溘§縺ｫ` / `莉ｻ縺帙ｋ` / `縺翫∪縺九○` / `繧医＆縺昴≧` / `繧医＆縺・{MarkdownTick} / `縺溘・繧・{MarkdownTick} / `螟壼・` 縺ｯ謇ｿ隱阪↓縺帙★縲∝呵｣懈署遉ｺ縺ｾ縺溘・蜀咲｢ｺ隱阪↓謌ｻ縺吶・{MarkdownTick}繧ｭ繝｣繝ｳ繧ｻ繝ｫ` / `荳ｭ豁｢` 縺ｯ蜊ｴ荳九・{MarkdownTick}蛻･譯・{MarkdownTick} / `蛻･縺ｮ譯・{MarkdownTick} / `霆ｽ縺・{MarkdownTick} 縺ｯ蜀肴署譯医→縺励※謇ｱ縺・・
`.ai/kernel/gate-state.json` 縺ｫ `proposal_state.status = proposed|refined` 縺後≠繧句ｴ蜷医∫洒縺・ｬ｡逋ｺ隧ｱ縺ｯ騾壼ｸｸ繝ｫ繝ｼ繝・ぅ繝ｳ繧ｰ繧医ｊ蜈医↓逶ｴ蜑肴署譯医∈縺ｮ霑皮ｭ斐→縺励※隗｣驥医☆繧九よ価隱阪・蜊ｴ荳九・菫ｮ豁｣繝ｻ譖匁乂縺ｮ蛻・｡槭・ `tools/lib/gate-state.ps1` 縺ｮ proposal state machine 縺ｫ蠕薙≧縲・
## Runtime Memory Preflight

縲後％繧後←縺・ｼ溘阪後し繝医す髢狗匱逶ｮ邱壹〒縲阪悟燕縺ｨ蜷後§隕ｳ轤ｹ縺ｧ縲阪悟・繧後ｋ萓｡蛟､縺ゅｋ・溘阪悟ｰ主・縺励※縲阪檎ｽｮ縺肴鋤縺医ｋ蠢・ｦ√≠繧具ｼ溘阪後∪縺溷酔縺倥お繝ｩ繝ｼ縲阪碁℃蜴ｻ蛻､譁ｭ繧りｸ上∪縺医※縲阪↑縺ｩ縲・℃蜴ｻ蛻､譁ｭ縺悟刀雉ｪ縺ｫ蠖ｱ髻ｿ縺吶ｋ逶ｸ隲・〒縺ｯ縲∝茜逕ｨ蜿ｯ閭ｽ縺ｪ runtime memory 繧堤捩謇句燕縺ｫ遒ｺ隱阪☆繧九・

agentmemory 莠呈鋤 backend 縺御ｽｿ縺医ｋ蝣ｴ蜷医・縲∝酔遞ｮ繧ｿ繧ｹ繧ｯ縲・未騾｣繝輔ぃ繧､繝ｫ縺ｮ驕主悉蛻､譁ｭ縲∵治逕ｨ/髱樊治逕ｨ繝昴Μ繧ｷ繝ｼ縲∵､懆ｨｼ貂医∩繧ｳ繝槭Φ繝峨ｒ遏ｭ縺乗､懃ｴ｢縺吶ｋ縲ゆｽｿ縺医↑縺・ｴ蜷医・騾壼ｸｸ縺ｮ repo 謗｢邏｢縺ｸ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縺吶ｋ縲Ｎemory recall 縺ｯ豁｣譛ｬ縺ｧ縺ｯ縺ｪ縺上・{MarkdownTick}.ai/catalog` / `.ai/book` / repo artifact / 迴ｾ蝨ｨ縺ｮ git 迥ｶ諷九ｒ蜆ｪ蜈医☆繧九・
隧ｳ邏ｰ・・
- [.ai/module/unified-coordinator.md](.ai/module/unified-coordinator.md)
- [.ai/module/unified-router.md](.ai/module/unified-router.md)
- [.ai/module/unified-integration.md](.ai/module/unified-integration.md)

---

## Response Language

繝ｦ繝ｼ繧ｶ繝ｼ縺ｸ縺ｮ蝗樒ｭ斐∬ｪｬ譏弱，LI 蜃ｺ蜉帙・隕∫ｴ・√お繝ｩ繝ｼ蜴溷屏繝ｻ蠖ｱ髻ｿ繝ｻ菫ｮ豁｣譯医・縲√Θ繝ｼ繧ｶ繝ｼ縺悟挨險隱槭ｒ譏守､ｺ縺励↑縺・剞繧頑律譛ｬ隱槭〒陦後≧縲・
