"""
opencode_mcp - OpenCode Go API MCP サーバー

FastMCP ベースで4つのOSS委任ツールを提供する:
  - oss_explore  : Kimi K2.6 によるコード探索・要約
  - oss_document : DeepSeek V4 Flash によるドキュメント生成
  - oss_implement: DeepSeek V4 Pro による実装補助
  - oss_agentic  : GLM-5.1 による複雑なエージェント型実装計画・検証

使用方法:
  python server.py          # MCP stdio サーバーとして起動
  python server.py --self-test  # API 接続テストのみ実行
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

# .env ファイルのロード（オプション）
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file)

from mcp.server.fastmcp import FastMCP
from models import OssTaskInput
from client import call_oss_model

# サーバー名は best practices に従い {service}_mcp 形式
mcp = FastMCP("opencode_mcp")

# モデルID定数
MODEL_EXPLORE = "kimi-k2.6"
MODEL_DOCUMENT = "deepseek-v4-flash"
MODEL_IMPLEMENT = "deepseek-v4-pro"
MODEL_AGENTIC = "glm-5.1"


@mcp.tool(
    name="oss_explore",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def oss_explore(
    task: str,
    context: str = "",
    model_override: str = "",
) -> str:
    """コード探索・要約タスクを Kimi K2.6 に委任する。

    ファイル構造の把握、関数一覧の取得、呼び出し関係の調査など
    読み取り専用の探索タスクに最適。Claude より約10倍コスト効率が高い。

    Args:
        task: 探索タスクの説明。例: "src/utils.ts の全エクスポート関数を一覧にして"
        context: 追加コンテキスト（ファイル内容等）。省略可。
        model_override: デフォルトモデル (kimi-k2.6) の上書き。省略可。

    Returns:
        Kimi K2.6 の応答テキスト。末尾に使用トークン数を付記。

    Examples:
        oss_explore(task="auth/ ディレクトリの全ファイルと主要関数を列挙して")
        oss_explore(task="formatName を呼び出している箇所をすべて探して", context=code_content)

    Error Handling:
        API キー未設定や接続エラー時はエラーメッセージを返す（例外を上げない）。
    """
    inp = OssTaskInput(
        task=task,
        context=context or None,
        model_override=model_override or None,
    )
    result = await call_oss_model(inp, MODEL_EXPLORE)
    if result.error:
        return f"[ERROR] {result.error}"
    return (
        f"{result.content}\n\n"
        f"---\n*モデル: {result.model_used} | "
        f"入力: {result.input_tokens} tok / 出力: {result.output_tokens} tok*"
    )


@mcp.tool(
    name="oss_document",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def oss_document(
    task: str,
    context: str = "",
    model_override: str = "",
) -> str:
    """ドキュメント生成タスクを DeepSeek V4 Flash に委任する。

    CHANGELOG 作成、README 更新、コメント付与、翻訳など
    定型テキスト生成タスクに最適。低コスト・高速。

    Args:
        task: ドキュメントタスクの説明。例: "直近3コミットの CHANGELOG を生成して"
        context: 追加コンテキスト（コード、既存ドキュメント等）。省略可。
        model_override: デフォルトモデル (deepseek-v4-flash) の上書き。省略可。

    Returns:
        DeepSeek V4 Flash の応答テキスト。末尾に使用トークン数を付記。

    Examples:
        oss_document(task="この関数の JSDoc コメントを書いて", context=function_code)
        oss_document(task="README の Installation セクションを日本語に翻訳して", context=readme)

    Error Handling:
        API キー未設定や接続エラー時はエラーメッセージを返す（例外を上げない）。
    """
    inp = OssTaskInput(
        task=task,
        context=context or None,
        model_override=model_override or None,
    )
    result = await call_oss_model(inp, MODEL_DOCUMENT)
    if result.error:
        return f"[ERROR] {result.error}"
    return (
        f"{result.content}\n\n"
        f"---\n*モデル: {result.model_used} | "
        f"入力: {result.input_tokens} tok / 出力: {result.output_tokens} tok*"
    )


@mcp.tool(
    name="oss_implement",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": True,
    },
)
async def oss_implement(
    task: str,
    context: str = "",
    model_override: str = "",
) -> str:
    """実装補助タスクを DeepSeek V4 Pro に委任する。

    単体テスト雛形の作成、限定スコープのコード生成、リファクタリング提案など
    パターン適用型の実装タスクに最適。高い推論能力を持つ。

    注意: 認証・セキュリティ・複数モジュール横断の変更には使用しないこと。
    それらは Claude 自身が処理すべき。

    Args:
        task: 実装タスクの説明。例: "validateToken 関数の単体テストを既存パターンに従って書いて"
        context: 追加コンテキスト（対象コード、テスト例等）。省略可。
        model_override: デフォルトモデル (deepseek-v4-pro) の上書き。省略可。

    Returns:
        DeepSeek V4 Pro の応答テキスト（コード + 説明）。末尾に使用トークン数を付記。

    Examples:
        oss_implement(task="この関数のテストケースを作成して", context=function_code)
        oss_implement(task="formatDate を UTC 対応にリファクタリングして", context=current_code)

    Error Handling:
        API キー未設定や接続エラー時はエラーメッセージを返す（例外を上げない）。
    """
    inp = OssTaskInput(
        task=task,
        context=context or None,
        model_override=model_override or None,
    )
    result = await call_oss_model(inp, MODEL_IMPLEMENT)
    if result.error:
        return f"[ERROR] {result.error}"

    parts = [result.content]
    parts.append(
        f"\n\n---\n*モデル: {result.model_used} | "
        f"入力: {result.input_tokens} tok / 出力: {result.output_tokens} tok*"
    )
    return "".join(parts)


@mcp.tool(
    name="oss_agentic",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def oss_agentic(
    task: str,
    context: str = "",
    model_override: str = "",
) -> str:
    """複雑なエージェント型ソフトウェア実装計画を GLM-5.1 に委任する。

    複数ステップの実装計画、検証方針、リスク分解、長めのツール利用設計など
    agentic engineering 寄りのタスクに使う。実ファイル変更は主担当AIが行うこと。

    注意: 秘密情報、顧客データ、外部共有できないコードは渡さないこと。

    Args:
        task: 実装計画・検証設計タスクの説明。
        context: 追加コンテキスト（必要最小限のコード、制約、ログ等）。省略可。
        model_override: デフォルトモデル (glm-5.1) の上書き。省略可。

    Returns:
        GLM-5.1 の応答テキスト（計画・検証観点・リスク）。末尾に使用トークン数を付記。
    """
    inp = OssTaskInput(
        task=task,
        context=context or None,
        model_override=model_override or None,
    )
    result = await call_oss_model(inp, MODEL_AGENTIC)
    if result.error:
        return f"[ERROR] {result.error}"
    return (
        f"{result.content}\n\n"
        f"---\n*モデル: {result.model_used} | "
        f"入力: {result.input_tokens} tok / 出力: {result.output_tokens} tok*"
    )


async def _self_test() -> None:
    """API 接続テストを実行する。"""
    print("opencode_mcp self-test: API 接続確認中...")
    api_key = os.environ.get("OPENCODE_GO_API_KEY", "")
    if not api_key:
        print("FAIL: OPENCODE_GO_API_KEY が設定されていません。")
        sys.exit(1)

    inp = OssTaskInput(task="Say: hello (this is a self-test)")
    result = await call_oss_model(inp, MODEL_DOCUMENT)
    if result.error:
        print(f"FAIL: {result.error}")
        sys.exit(1)

    print(f"OK: {result.model_used} から応答を受信")
    print(f"    入力: {result.input_tokens} tok / 出力: {result.output_tokens} tok")
    print(f"    応答: {result.content[:80]}...")


async def _list_tools() -> None:
    """登録済み MCP ツールを JSON で出力する。API キーなしで実行可能。"""
    tools = await mcp.list_tools()
    payload = [
        {
            "name": tool.name,
            "description": (tool.description or "").splitlines()[0],
            "inputSchema": tool.inputSchema,
        }
        for tool in tools
    ]
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        asyncio.run(_self_test())
    elif "--list-tools" in sys.argv:
        asyncio.run(_list_tools())
    else:
        mcp.run()
