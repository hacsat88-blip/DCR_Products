// content.js

// Background からの挿入メッセージをリッスンする
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "insertPrompt") {
    const success = injectText(message.text);
    if (success) {
      sendResponse({ status: "success" });
    } else {
      sendResponse({ status: "error", message: "no_input_area_found" });
    }
  }
  return true;
});

/**
 * ページの主要なテキスト入力エリアを特定し、テキストを挿入する関数
 * 各AIチャットサービスのDOM構造の違いを吸収する試み。
 */
function injectText(textToInsert) {
  // 一般的なAIチャットサービスのテキスト入力エリアを探す
  // ChatGPT: textarea[id="prompt-textarea"]
  // Claude: .ProseMirror (contenteditable)
  // Gemini: rich-textarea (contenteditable) または textarea

  let targetElement = null;
  const hostname = window.location.hostname;

  // 1. 各サービス専用のセレクタでターゲットを検索
  if (hostname.includes("chatgpt.com")) {
    targetElement = document.getElementById("prompt-textarea");
  } else if (hostname.includes("claude.ai")) {
    targetElement = document.querySelector(
      'div.ProseMirror[contenteditable="true"]',
    );
  } else if (hostname.includes("gemini.google.com")) {
    targetElement =
      document.querySelector('rich-textarea div[contenteditable="true"]') ||
      document.querySelector(
        'div[aria-label="Message Gemini"][contenteditable="true"]',
      ) ||
      document.querySelector(
        'div[data-placeholder="Enter a prompt here"][contenteditable="true"]',
      );
  }

  // 2. 見つからなければ、他の一般的な textarea や contenteditable を探す (フォールバック)
  if (!targetElement) {
    const textareas = document.querySelectorAll("textarea");
    for (const ta of textareas) {
      // 見えているtextareaを探す
      if (ta.offsetParent !== null && !ta.readOnly && !ta.disabled) {
        targetElement = ta;
        break;
      }
    }
  }

  if (!targetElement) {
    const editables = document.querySelectorAll(
      '[contenteditable="true"], .ProseMirror',
    );
    for (const el of editables) {
      if (el.offsetParent !== null && el.isContentEditable) {
        targetElement = el;
        break;
      }
    }
  }

  if (!targetElement) {
    console.warn(
      "AI Prompt Manager: Active text input area not found on this page.",
    );
    return false;
  }

  // 要素にフォーカスを当てる
  targetElement.focus();

  // 挿入処理
  if (
    targetElement.tagName.toLowerCase() === "textarea" ||
    targetElement.tagName.toLowerCase() === "input"
  ) {
    // Textarea / Input の場合
    const startPos = targetElement.selectionStart || 0;
    const endPos = targetElement.selectionEnd || 0;
    const currentVal = targetElement.value;

    // 内容を更新
    targetElement.value =
      currentVal.substring(0, startPos) +
      textToInsert +
      currentVal.substring(endPos);

    // カーソル位置を更新
    targetElement.selectionStart = targetElement.selectionEnd =
      startPos + textToInsert.length;

    // Reactなどの仮想DOMに値の変更を検知させるためのイベント発火
    targetElement.dispatchEvent(new Event("input", { bubbles: true }));
    targetElement.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (targetElement.isContentEditable) {
    // ContentEditable (ProseMirror等) の場合
    // ProseMirror等のリッチエディタにはexecCommandが最も確実にイベントを発火させる
    const success = document.execCommand("insertText", false, textToInsert);

    if (!success) {
      // 失敗した場合は Selection/Range API を使ってカーソル位置にテキストを挿入する
      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // 改行を <br> に変換して挿入
        const parts = textToInsert.split("\n");
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            fragment.appendChild(document.createElement("br"));
          }
          if (parts[i].length > 0) {
            fragment.appendChild(document.createTextNode(parts[i]));
          }
        }

        range.insertNode(fragment);

        // カーソルを末尾に移動
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // カーソルがない場合は末尾に追記
        targetElement.innerText +=
          (targetElement.innerText.endsWith("\n") ? "" : "\n") + textToInsert;
      }
    }

    // フレームワーク（React等）に変更を通知するイベント発火
    targetElement.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return true;
}
