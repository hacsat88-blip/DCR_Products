---
name: contract-testing
routing_category: devops
description: "APIコントラクトテスト：Consumer-Driven Contract Testing・Pact・Pact Broker・OpenAPI Contract Validation"
disable-model-invocation: true
---

# Contract Testing

## 基本原則

- コントラクトはAPIの「約束」——Consumerが期待することをProviderが保証する
- 統合テスト環境なしでサービス間互換性を保証できる
- Breaking change を本番前に検出する

## Consumer-Driven Contract Testing（CDCT）の概念

```
Consumer（APIを使う側）:
  → 「私はこういうレスポンスを期待する」を記述（Pact）
  → Pact ファイルを生成して Pact Broker にアップロード

Provider（APIを提供する側）:
  → Pact Broker から期待値を取得
  → 実際のAPIが期待に応えられるか検証
  → 結果を Pact Broker に報告
```

## Pact フレームワーク実装

### Consumer 側（TypeScript）
```typescript
import { Pact } from '@pact-foundation/pact';

const provider = new Pact({ consumer: 'Frontend', provider: 'UserAPI' });

describe('User API contract', () => {
  it('returns user by ID', async () => {
    await provider.addInteraction({
      state: 'user 123 exists',
      uponReceiving: 'a request for user 123',
      withRequest: { method: 'GET', path: '/users/123' },
      willRespondWith: {
        status: 200,
        body: { id: 123, name: like('John'), email: email() }
      }
    });
    
    const user = await userClient.getUser(123);
    expect(user.id).toBe(123);
  });
});
```

### Provider 側（FastAPI / Python）
```python
@pytest.fixture
def provider_verifier():
    return Verifier(
        provider='UserAPI',
        provider_base_url='http://localhost:8000',
        pact_broker_url='https://broker.example.com',
        publish_verification_results=True,
    )

def test_provider_contracts(provider_verifier):
    provider_verifier.verify()
```

## Pact Broker 設定

```yaml
# docker-compose.yml
services:
  pact-broker:
    image: pactfoundation/pact-broker
    environment:
      PACT_BROKER_DATABASE_URL: postgres://...
    ports:
      - "9292:9292"
```

## OpenAPI Contract Validation

```bash
# Prism でモックサーバーを立てて結合テスト前に検証
npx @stoplight/prism-cli mock openapi.yaml &
curl http://localhost:4010/users/123  # モックレスポンスを確認

# Specmatic でコントラクトテストを自動化
specmatic test --testBaseURL http://localhost:8000
```

## CI 組み込み

```yaml
name: Contract Tests
on: [push]
jobs:
  consumer:
    steps:
      - run: npm test -- --testPathPattern=pact  # Pact生成
      - run: npx pact-broker publish ./pacts --broker-base-url $BROKER_URL
  
  provider:
    needs: consumer
    steps:
      - run: pytest tests/contract/  # Provider検証
```

## チェックリスト

- [ ] Consumer のPactファイルをCIで自動生成
- [ ] Pact Broker にデプロイして共有
- [ ] Provider の検証をCIに組み込み
- [ ] Can-I-Deploy チェック（デプロイ前の互換性確認）
