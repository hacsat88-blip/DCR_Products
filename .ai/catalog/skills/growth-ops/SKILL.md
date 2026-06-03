---
name: growth-ops
routing_category: growth
description: "Growth umbrella skill for marketing, CRO, conversion optimization, popup/modal/exit intent, signup/registration, onboarding, paywall, copy, content, persuasive messaging, message strategy, 心理, 説得, email, cold outreach, メール, SEO, schema, structured data, analytics, paid ads, launch, retention, churn, pricing, referrals, social content, and product marketing context. Use this as the active DCR growth entrypoint; former narrow growth skills remain deprecated aliases."
contract:
  preconditions:
    - "growth, marketing, CRO, content, email, SEO, analytics, pricing, or launch task is requested"
  postconditions:
    - "the requested growth task is routed to the relevant growth lane without activating many narrow skills"
    - "the output preserves useful DCR-specific context while avoiding skill catalog sprawl"
  invariants:
    - "do not treat growth advice as a replacement for product, legal, financial, or platform-specific review"
    - "when external current facts, prices, rankings, laws, or platform policies matter, verify them from current sources"
composable:
  input_type: growth-brief
  output_type: growth-plan-or-asset
  chains_with:
    - documents-ops
    - verification-before-completion
metadata:
  origin: DCR local
  imported_at: "2026-05-28"
  adapted_from: "DCR growth skill umbrella for OpenAI Skills baseline slimming."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - copilot
    - cursor
    - gemini-cli
absorbs:
  - ad-creative
  - ai-seo
  - analytics-tracking
  - churn-prevention
  - cold-email
  - competitor-alternatives
  - content-strategy
  - conversion-optimization-hub
  - copy-editing
  - copywriting
  - dcf-valuation
  - email-marketing-flow
  - email-sequence
  - form-cro
  - free-tool-strategy
  - launch-strategy
  - marketing-ideas
  - marketing-psychology
  - onboarding-cro
  - page-cro
  - paid-ads
  - paywall-upgrade-cro
  - persuasive-content-craft
  - popup-cro
  - pricing-strategy
  - product-analytics
  - product-marketing-context
  - programmatic-seo
  - referral-program
  - seo-audit
  - signup-flow-cro
  - social-content
  - strategic-messaging
---

# Growth Ops

OpenAI Skills baseline へのスリム化では、細かすぎる growth skill を個別発火せず、この umbrella で受ける。旧 skill は本文を参照用に残し、routing は `growth-ops` を優先する。

## Lanes

| Lane | Former skills | 用途 |
|---|---|---|
| Messaging | `strategic-messaging`, `marketing-psychology`, `content-strategy`, `product-marketing-context` | positioning, core message, buyer psychology, reusable marketing context |
| Copy and Creative | `persuasive-content-craft`, `copywriting`, `copy-editing`, `ad-creative`, `social-content` | LP copy, headlines, CTA, ad creative, social posts |
| CRO | `conversion-optimization-hub`, `page-cro`, `popup-cro`, `form-cro`, `signup-flow-cro`, `onboarding-cro`, `paywall-upgrade-cro` | conversion, signup, forms, popups, onboarding, in-app upgrade |
| Email and Retention | `email-marketing-flow`, `email-sequence`, `cold-email`, `churn-prevention`, `referral-program` | lifecycle email, cold outreach, churn prevention, referrals |
| Acquisition | `seo-audit`, `ai-seo`, `programmatic-seo`, `competitor-alternatives`, `paid-ads`, `free-tool-strategy`, `launch-strategy`, `marketing-ideas` | SEO, AI search visibility, paid ads, launch, marketing ideas |
| Measurement and Monetization | `analytics-tracking`, `product-analytics`, `pricing-strategy`, `dcf-valuation` | tracking, funnels, cohort analysis, pricing, valuation analysis |

## Flow

1. Identify the lane from the user's request.
2. Pull only the useful checklist or template from the former skill if needed.
3. Produce the smallest artifact that advances the task: plan, copy, audit, sequence, experiment, or measurement spec.
4. If the output depends on current platform rules, public facts, prices, rankings, laws, or financial data, verify before giving final advice.
5. Finish with concrete next actions and verification criteria.

## Output Template

```markdown
GROWTH OPS
- lane:
- goal:
- context needed:
- recommendation:
- artifact:
- verification:
- next action:
```
