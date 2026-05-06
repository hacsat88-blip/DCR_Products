"""
opencode_mcp - Pydantic v2 入出力スキーマ定義

OpenCode Go API 経由でOSSモデルに委任するための入出力モデル。
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class OssTaskInput(BaseModel):
    """OSSモデルへのタスク入力スキーマ。"""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra="forbid",
    )

    task: str = Field(
        ...,
        description="OSSモデルに実行させるタスクの説明。具体的かつ明確に記述する。",
        min_length=1,
        max_length=32000,
    )
    context: Optional[str] = Field(
        default=None,
        description="タスクに必要な追加コンテキスト（ファイル内容、コードスニペット等）。",
        max_length=128000,
    )
    model_override: Optional[str] = Field(
        default=None,
        description="デフォルトモデルの上書き。例: 'deepseek-v4-pro', 'kimi-k2.6', 'deepseek-v4-flash'",
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="カスタムシステムプロンプト。未指定の場合はデフォルトプロンプトを使用。",
        max_length=8000,
    )


class OssTaskResult(BaseModel):
    """OSSモデルからのタスク出力スキーマ。"""

    model_config = ConfigDict(
        validate_assignment=True,
        extra="ignore",
    )

    content: str = Field(
        ...,
        description="OSSモデルの応答テキスト。",
    )
    model_used: str = Field(
        ...,
        description="実際に使用したモデルID。",
    )
    input_tokens: int = Field(
        default=0,
        description="入力トークン数。",
        ge=0,
    )
    output_tokens: int = Field(
        default=0,
        description="出力トークン数。",
        ge=0,
    )
    reasoning_content: Optional[str] = Field(
        default=None,
        description="DeepSeek V4 Pro 等の reasoning_content（思考プロセス）。",
    )
    error: Optional[str] = Field(
        default=None,
        description="エラーが発生した場合のメッセージ。",
    )
