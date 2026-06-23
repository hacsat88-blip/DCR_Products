# TypeScript/JavaScript Standards — 言語固有ベースライン

> origin: ECC typescript/coding-style.md + typescript/testing.md (DCR 向けに再構成)
> extends: `_coding-standards.md`（共通ルール）を前提とする
> deploy.ps1: `_` プレフィクスのため deploy 対象外（参照ドキュメント）

## 型システム

### Public API

- エクスポートする関数には引数型と戻り値型を明示する
- ローカル変数の型は TypeScript の推論に任せる
- 繰り返し使うオブジェクト型は `interface` または `type` に抽出する

### interface vs type

| 使い分け | 選択 |
|----------|------|
| 拡張可能なオブジェクト型 | `interface` |
| Union / Intersection / Tuple / Mapped | `type` |
| 列挙的な値 | 文字列リテラル Union（`enum` より優先） |

### `any` 禁止

- アプリケーションコードで `any` を使わない
- 外部入力には `unknown` を使い、型ガードで安全に絞り込む
- 呼び出し側で型が決まる場合はジェネリクスを使う

```typescript
// NG
function parse(data: any) { return data.value }

// OK
function parse(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value)
  }
  throw new Error('Invalid data')
}
```

### React コンポーネント

- Props は名前付き `interface` で定義する
- コールバック Props は型を明示する
- `React.FC` は使わない（暗黙の `children` や戻り値型の問題を回避）

## 不変更新

オブジェクト更新はスプレッド構文で不変に行う:

```typescript
// NG: ミューテーション
function update(user: User, name: string): User {
  user.name = name
  return user
}

// OK: 不変更新
function update(user: Readonly<User>, name: string): User {
  return { ...user, name }
}
```

## エラー処理

- `catch` の型は `unknown` で受け、`instanceof Error` で絞り込む
- `console.log` は本番コードに残さない（ロギングライブラリを使用）

```typescript
async function loadUser(id: string): Promise<User> {
  try {
    return await fetchUser(id)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('loadUser failed', { id, message })
    throw new Error(message)
  }
}
```

## 入力バリデーション

外部入力のバリデーションには Zod を推奨:

```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})

type UserInput = z.infer<typeof userSchema>
```

## テスト

### フレームワーク

| 種別 | 推奨 |
|------|------|
| Unit / Integration | Vitest または Jest |
| E2E | Playwright |
| コンポーネント | Testing Library |

### ファイル配置

```
src/
  utils/
    format.ts
    format.test.ts      ← コロケーション
tests/
  e2e/
    auth.spec.ts         ← E2E は別ディレクトリ
```

### React テストの原則

- 実装詳細ではなくユーザー行動でテストする
- `getByRole`, `getByText` を優先（`getByTestId` は最終手段）
- 非同期は `waitFor` / `findBy` を使い、固定 sleep を避ける
