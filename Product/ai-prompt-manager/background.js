// background.js

// サイドパネルの動作設定
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
  setupContextMenus();
});

// ストレージ変更時にコンテキストメニューを再構築
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.prompts) {
    setupContextMenus();
  }
});

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "ai-prompt-manager-parent",
      title: "選択したテキストをAIプロンプトに送る",
      contexts: ["selection"]
    });

    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      prompts.forEach((prompt) => {
        chrome.contextMenus.create({
          id: `prompt-${prompt.id}`,
          parentId: "ai-prompt-manager-parent",
          title: prompt.title,
          contexts: ["selection"]
        });
      });
    });
  });
}

// コンテキストメニュートリガー時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("prompt-")) {
    const promptId = info.menuItemId.replace("prompt-", "");
    const selectedText = info.selectionText;

    chrome.storage.local.get(['prompts'], (result) => {
      const prompt = (result.prompts || []).find(p => p.id === promptId);
      if (prompt) {
        let finalContent = prompt.content;
        // 変数 [選択テキスト] または {{selected}} があれば置換、なければ末尾に追加
        if (finalContent.includes('[選択テキスト]')) {
          finalContent = finalContent.replace(/\[選択テキスト\]/g, selectedText);
        } else if (finalContent.includes('{{selected}}')) {
          finalContent = finalContent.replace(/\{\{selected\}\}/g, selectedText);
        } else {
          finalContent += "\n\n" + selectedText;
        }

        // アクティブなタブにメッセージ送信 (content_scriptがあれば挿入)
        chrome.tabs.sendMessage(tab.id, { action: 'insertPrompt', text: finalContent }, (response) => {
          if (chrome.runtime.lastError) {
            // コンテンツスクリプトがいない場合（普通のWebサイトなど）は、クリップボードにコピー
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (text) => {
                navigator.clipboard.writeText(text).then(() => {
                  // ToastなどのUIがない汎用ページなのでalertにフォールバック
                  alert("AI Prompt Manager:\nプロンプトに選択テキストを統合してコピーしました。\nAIチャット画面にペーストしてください。");
                }).catch(err => {
                  console.error("Clipboard copy failed:", err);
                });
              },
              args: [finalContent]
            }).catch(err => console.error("Scripting error:", err));
          }
        });
      }
    });
  }
});

// サイドパネルとコンテンツスクリプト間のメッセージ中継
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'insertPrompt') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            // Content scriptが未ロードの場合、動的に注入してリトライ
            console.warn("Content script not found, injecting dynamically:", chrome.runtime.lastError.message);
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content.js']
            }).then(() => {
              // 注入後に再度メッセージを送信
              chrome.tabs.sendMessage(activeTab.id, message, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  console.warn("Retry failed:", chrome.runtime.lastError.message);
                  sendResponse({ status: "error", message: "content_script_injection_failed" });
                } else {
                  sendResponse(retryResponse);
                }
              });
            }).catch((err) => {
              console.error("Script injection error:", err);
              sendResponse({ status: "error", message: "injection_not_allowed" });
            });
          } else {
            sendResponse(response);
          }
        });
      } else {
        sendResponse({ status: "error", message: "no_active_tab" });
      }
    });
    return true;
  }
});
