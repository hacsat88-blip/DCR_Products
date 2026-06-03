# Deprecation Removed Ledger

物理削除した rule / skill / agent の累積ログ。`.ai/module/deprecation-lifecycle.md` の
Stage 4（REMOVED）に進めた時に追記する。

git 履歴と異なり、本ファイルは **「いつ・なぜ・誰が」削除したか** のヒューマン読み
やすい1行サマリ。後で「あの旧名は誰が消した？」を5秒で確認できることを目的とする。

## フォーマット

| 削除日 | 種別 | 旧名 | 後継 | 経過日数 | 最終呼び出し | 削除PR | 備考 |
|---|---|---|---|---|---|---|---|

## 削除実績

<!--
新規エントリは表の下に追記。例：
| 2026-07-26 | rule | instagram-curator | content-creator | 92 | 2026-05-12 | #142 | router-decisions.jsonl で 30日0件 |
-->

| 2026-05-28 | skill | ad-creative | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | adr-management | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | advanced-evaluation | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | agent-evaluation | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | agent-overload-recovery | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | ai-seo | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | analytics-tracking | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | api-docs-automation | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | architecture-diagram-generator | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | autonomous-qa-loop | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | canvas-design | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | churn-prevention | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | code-review | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | cold-email | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | competitor-alternatives | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | content-strategy | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | context-compression | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | context-degradation | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | context-optimization | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | continuous-learning | continuous-learning-v2 | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | contract-testing | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | conversion-optimization-hub | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | copy-editing | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | copywriting | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | data-pipeline-orchestration | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | dcf-valuation | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | decision-complete-planning | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | doc-coauthoring | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | docs-update | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | docx | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | domain-decision-grilling | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | email-marketing-flow | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | email-sequence | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | form-cro | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | free-tool-strategy | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | launch-strategy | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | marketing-ideas | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | marketing-psychology | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | mobile-cicd | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | mobile-performance | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | model-debate-stress-test | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | multimodal-pipeline | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | namespace-skill-routing | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | onboarding-cro | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | page-cro | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | paid-ads | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | parallel-agent-patterns | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | parallel-wave-execution | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | paywall-upgrade-cro | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | pdf | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | performance-profiling | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | persuasive-content-craft | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | phase-state-artifacts | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | popup-cro | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | pptx | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | prd-to-issues | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | pricing-strategy | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | product-analytics | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | product-marketing-context | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | programmatic-seo | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | referral-program | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | rules-distill | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | schema-markup | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | security-deepdive | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | seo-audit | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | signup-flow-cro | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | skill-router | unified-router | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | social-content | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | static-analysis | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | strategic-compact | governance-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | strategic-messaging | growth-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | supply-chain-security | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | uat-verification-gate | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | ubiquitous-language | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | webapp-testing | dcr-pipeline | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | x-research | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | skill | xlsx | documents-ops | lifecycle override | n/a | n/a | OpenAI baseline slimming bulk removal with tombstone registry |
| 2026-05-28 | agent | ad-security-reviewer | security-auditor | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | agent-organizer | pied-piper | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | ai-prompt-manager-orchestrator | pied-piper | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | api-designer | backend-developer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | api-documenter | documentation-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | architecture-diagram-orchestrator | pied-piper | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | browser-debugger | debugger | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | competitive-analyst | research-analyst | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | data-researcher | research-analyst | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | database-optimizer | database-administrator | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | deployment-engineer | devops-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | devops-incident-responder | incident-responder | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | docs-researcher | research-analyst | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | error-detective | debugger | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | graphql-architect | backend-developer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | knowledge-synthesizer | research-analyst | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | llm-architect | ai-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | machine-learning-engineer | ml-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | market-researcher | research-analyst | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | microservices-architect | backend-developer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | mobile-app-developer | mobile-developer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | multi-agent-coordinator | pied-piper | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | nlp-engineer | ml-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | payment-integration | fintech-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | performance-monitor | performance-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | platform-engineer | devops-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | reviewer | code-reviewer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | risk-manager | fintech-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | search-specialist | research-analyst | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | task-distributor | pied-piper | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | tooling-engineer | build-engineer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | trend-analyst | research-analyst | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | ui-fixer | frontend-developer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | agent | workflow-orchestrator | pied-piper | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | behavioral-nudge-engine | growth-hacker | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | evidence-collector | qa-reality-checker | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | inclusive-visuals-specialist | ui-designer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | instagram-curator | content-creator | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | reddit-community-builder | social-media-strategist | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | sprint-prioritizer | senior-project-manager | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | test-results-analyzer | qa-reality-checker | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | tiktok-strategist | social-media-strategist | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | twitter-engager | social-media-strategist | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-05-28 | rule | ux-architect | ui-designer | lifecycle override | n/a | n/a | Rule/agent alias tombstone bulk removal with registry |
| 2026-06-03 | skill | oss-delegate | model-route | lifecycle override | n/a | n/a | Provider-specific external delegation path retired with tombstone registry |


## 関連

- ライフサイクル仕様: [.ai/module/deprecation-lifecycle.md](../.ai/module/deprecation-lifecycle.md)
- 監視ダッシュボード: `pwsh tools/deprecation-dashboard.ps1`
- 候補抽出: `pwsh tools/deprecation-dashboard.ps1 -OutputJson`
- Stage 4候補Markdown: `pwsh tools/deprecation-dashboard.ps1 -OutputMarkdown`
