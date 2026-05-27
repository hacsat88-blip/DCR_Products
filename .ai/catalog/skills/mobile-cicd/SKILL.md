---
name: mobile-cicd
routing_category: devops
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline sh/ Mobile Ship Gate for OpenAI Skills baseline slimming."
description: "モバイルCI/CD：コード署名管理・Fastlane lane設計・EAS Build・TestFlight/Play Console自動配布"
disable-model-invocation: true
---

# Mobile CI/CD

## 基本原則

- 署名証明書は安全なシークレットストアで管理する（リポジトリ直置き禁止）
- テストはデバイス・エミュレータ両方で実行する
- ストアへの配布は自動化し、人的ミスを排除する

## コード署名管理

### iOS
- Provisioning Profile & 証明書を Fastlane Match で管理
- Match はプライベートリポジトリ（または encrypted storage）に保存
- CI環境では `readonly` モードで取得

```ruby
# Fastfile
lane :setup_signing do
  match(type: "appstore", readonly: true)
end
```

### Android
- Keystore ファイルを GitHub Secrets / AWS Secrets Manager に保存
- `gradle.properties` にパスワードを直書きしない

```yaml
# CI: Android Keystore
- name: Decode Keystore
  env:
    KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
  run: echo $KEYSTORE_BASE64 | base64 -d > release.jks
```

## Fastlane Lane 設計

```ruby
# Fastfile の基本構成
lane :test do
  run_tests(scheme: "App", devices: ["iPhone 15"])
end

lane :beta do
  increment_build_number
  build_app
  upload_to_testflight(skip_waiting_for_build_processing: true)
  slack(message: "Beta build uploaded!")
end

lane :release do
  match(type: "appstore")
  build_app
  upload_to_app_store(submit_for_review: true)
end
```

## EAS Build (React Native / Expo)

```json
// eas.json
{
  "build": {
    "development": { "developmentClient": true },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  }
}
```

```bash
# ビルド実行
eas build --platform all --profile production
# OTA更新
eas update --branch production --message "Hotfix v1.2.1"
```

## TestFlight / Play Console 自動配布フロー

```
PR マージ → CI ビルド → テスト実行
         → ビルド成功 → TestFlight(iOS) / Internal Track(Android)
         → QA承認 → External Testers → App Store / Production
```

## バージョンバンプ自動化

- `build number` はCI実行番号に連動させる
- `version number` は `VERSION` ファイルで管理
- タグ (`v1.2.3`) プッシュでリリースビルドをトリガー

## モバイル専用テスト

- **Unit**: Jest / XCTest
- **UI/E2E**: Detox (RN) / XCUITest / Espresso
- **Visual Regression**: Happo / Percy
- テストは実機デバイスファーム（Firebase Test Lab）でも実行
