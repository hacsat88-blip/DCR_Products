---
name: multimodal-pipeline
routing_category: devops
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline p/ Multimodal Pipeline Plan for OpenAI Skills baseline slimming."
description: "マルチモーダルパイプライン設計：画像前処理・音声転写・PDF分離処理・モデル選定・コスト最適化"
disable-model-invocation: true
---

# Multimodal Pipeline

## 基本原則

- モダリティごとに前処理パイプラインを分離する
- LLMに渡す前の品質が出力品質を決める
- コスト = テキストトークン + 画像トークン + 音声処理時間

## 画像前処理

```python
from PIL import Image
import base64, io

def prepare_image(image_path: str, max_size: tuple = (1568, 1568)) -> str:
    """画像をLLM向けにリサイズしてBase64エンコード"""
    img = Image.open(image_path)
    img.thumbnail(max_size, Image.LANCZOS)  # アスペクト比を保持
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()

# URL参照 vs Base64の使い分け
# URL: 公開アクセス可能な画像（高速・トークン節約）
# Base64: プライベート画像・ローカルファイル
```

## 音声処理（Whisper転写→LLM）

```python
import openai

def transcribe_audio(audio_path: str) -> str:
    client = openai.OpenAI()
    with open(audio_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="ja",  # 日本語指定で精度向上
            response_format="verbose_json",  # タイムスタンプ付き
        )
    return result.text

# 音声→テキスト→LLM の2ステップが基本
# 長音声は30秒チャンクに分割して並列処理
```

## PDF → テキスト + 画像の分離処理

```python
import pymupdf  # PyMuPDF

def extract_pdf(pdf_path: str) -> dict:
    doc = pymupdf.open(pdf_path)
    result = {"pages": []}
    
    for page_num, page in enumerate(doc):
        # テキスト抽出
        text = page.get_text("markdown")
        
        # 画像抽出
        images = []
        for img in page.get_images():
            xref = img[0]
            base_image = doc.extract_image(xref)
            images.append(base64.b64encode(base_image["image"]).decode())
        
        result["pages"].append({"text": text, "images": images, "page": page_num + 1})
    
    return result
```

## マルチモーダルモデル選定

| モデル | 画像 | 音声 | 動画 | コスト |
|--------|------|------|------|--------|
| GPT-4o | ✅ | ✅ | ❌ | 中 |
| Claude claude-opus-4-5 | ✅ | ❌ | ❌ | 高 |
| Gemini 2.0 Flash | ✅ | ✅ | ✅ | 安 |
| Gemini 2.0 Pro | ✅ | ✅ | ✅ | 中 |

## 画像トークンコスト計算

```
Anthropic: 画像1枚 ≈ 1500〜3500 tokens（サイズ依存）
OpenAI: 512×512 = 170 tokens, 1024×1024 = 765 tokens
→ 画像は必要最小サイズにリサイズしてコスト削減
```

## チェックリスト

- [ ] 画像のリサイズ・品質設定を調整
- [ ] 音声の言語を明示指定
- [ ] PDF処理でテキストと画像を分離
- [ ] 画像トークンのコスト見積もりを実施
- [ ] プライベート画像はBase64、公開画像はURLを使用
