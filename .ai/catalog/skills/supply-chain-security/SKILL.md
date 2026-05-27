---
name: supply-chain-security
routing_category: governance
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline q/ Supply Chain Gate for OpenAI Skills baseline slimming."
description: "ソフトウェアサプライチェーンセキュリティ：SBOM生成・依存関係監査・GitHub Actionsピン留め・パッケージ改ざん検知"
disable-model-invocation: true
---

# Supply Chain Security

## 基本原則

- 使うライブラリ全てが攻撃経路になり得る（信頼は検証で確保）
- CI/CDパイプライン自体がサプライチェーン攻撃の標的
- SBOM（部品表）なくして脆弱性管理なし

## SBOM（Software Bill of Materials）生成

- 形式: CycloneDX（推奨）または SPDX
- 生成タイミング: ビルド時に自動生成
- ツール: `syft`（コンテナ・ファイルシステム）, `cdxgen`（パッケージマネージャー）

```bash
# Syft でコンテナイメージのSBOM生成
syft my-app:latest -o cyclonedx-json > sbom.json

# CI/CDで毎ビルド自動生成
syft packages dir:. -o spdx-json > sbom-$(git rev-parse --short HEAD).json
```

## 依存関係脆弱性スキャン

| ツール | 用途 |
|--------|------|
| Trivy | コンテナ・ファイルシステム・SBOM |
| Snyk | 多言語対応・開発者向け |
| Dependabot | GitHub自動PRで依存更新 |
| OSV Scanner | Google製・OSS向け |

```yaml
# GitHub Actions: Trivy スキャン
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@0.28.0  # バージョンピン留め必須
  with:
    scan-type: 'fs'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
```

## GitHub Actions ピン留めとハッシュ固定

```yaml
# ❌ 危険: タグは上書き可能
uses: actions/checkout@v4

# ✅ 安全: コミットハッシュで固定
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

- `actionlint` でActions構文チェックを自動化
- `pinact` ツールで既存ワークフローを一括ハッシュ固定

## パッケージ改ざん検知

- npm: `npm audit` + `package-lock.json` のコミット必須
- Python: `pip-audit` + `requirements.txt` ハッシュ固定
- コード署名: npm provenance（2023年〜）の確認
- Typosquatting 対策: `npm install lodash` → `npm install 1odash` などのミスを防ぐCIチェック

## CI/CDセキュリティチェックリスト

- [ ] Actions をハッシュでピン留め
- [ ] Secrets を環境変数経由でのみ渡す（コードに直書き禁止）
- [ ] Pull Requestのワークフローは最小権限（`read-only`）
- [ ] 外部PRからのSecrets漏洩防止（`pull_request_target` の慎重な使用）
- [ ] SBOM を成果物として保存・署名
