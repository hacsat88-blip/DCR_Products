---
name: mobile-performance
routing_category: devops
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline q/ Mobile Performance Gate for OpenAI Skills baseline slimming."
description: "モバイルパフォーマンス最適化：ANR/Crash分析・Profilerツール・バッテリー最適化・UIジャンク解消"
disable-model-invocation: true
---

# Mobile Performance

## 基本原則

- メインスレッドでは最小限の処理のみ行う（UIはメインスレッド専用）
- 計測なしの最適化は時間の無駄——Profilerを先に使う
- ユーザーが感じる体験がパフォーマンス（数値だけが全てではない）

## ANR（Application Not Responding）解消

**原因**: メインスレッドが5秒以上ブロック

```kotlin
// ❌ 悪い例: メインスレッドでDB/Network処理
fun onClick() {
    val result = database.query("SELECT * FROM users")  // ブロッキング
}

// ✅ 良い例: Coroutineで非同期処理
fun onClick() = lifecycleScope.launch {
    val result = withContext(Dispatchers.IO) {
        database.query("SELECT * FROM users")
    }
    updateUI(result)  // UIスレッドで更新
}
```

## Crashlytics / Firebase Crash レポート分析

```
優先度付け:
1. 影響ユーザー数の多いクラッシュを優先
2. クラッシュレート > 1% → P0（即時対応）
3. スタックトレースでルートコーズを特定
4. 再現条件（OS/デバイス/アプリバージョン）を確認
```

## Android Profiler の使い方

- **CPU Profiler**: 処理時間の長い関数を特定
- **Memory Profiler**: メモリリーク・GCの頻発を検出
- **Network Profiler**: 不要なAPI呼び出しを特定
- **Energy Profiler**: バッテリー消費の高い処理を特定

```bash
# ADB で ANR トレースを取得
adb pull /data/anr/traces.txt
```

## Xcode Instruments（iOS）

- **Time Profiler**: CPU使用率・関数コール解析
- **Allocations**: メモリ割り当てパターン
- **Leaks**: 循環参照によるメモリリーク
- **Core Animation**: UIレンダリング・フレームレート

## バッテリー最適化

```kotlin
// Android: Doze mode対応
// バックグラウンド処理はWorkManagerを使用
val workRequest = PeriodicWorkRequestBuilder<SyncWorker>(
    15, TimeUnit.MINUTES
).setConstraints(
    Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)  // バッテリー低下時は実行しない
        .build()
).build()
WorkManager.getInstance(context).enqueue(workRequest)
```

## UI レンダリングジャンク解消（60fps維持）

```
目標: 1フレーム = 16ms以内に処理

ジャンク原因:
- RecyclerView: ViewHolder の inflate が重い → View Binding 使用
- 画像: メインスレッドでデコード → Glide/Coil で非同期
- レイアウト: ネストが深い → ConstraintLayout で平坦化
- onDraw(): 重い処理 → キャッシュを使用
```

## チェックリスト

- [ ] クラッシュレート < 0.5% の維持
- [ ] ANRレート < 0.1% の維持
- [ ] スタートアップ時間 < 2秒（Cold Start）
- [ ] Doze mode での動作確認済み
- [ ] メモリリーク検査（Leaks / LeakCanary）実施済み
