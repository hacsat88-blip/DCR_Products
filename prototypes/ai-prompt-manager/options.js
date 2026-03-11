// options.js

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('gemini-api-key');
    const modelSelect = document.getElementById('ai-model');
    const saveBtn = document.getElementById('save-btn');
    const saveStatus = document.getElementById('save-status');

    // 設定の読み込み
    chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
            apiKeyInput.value = result.settings.geminiApiKey || '';
            modelSelect.value = result.settings.aiModel || 'gemini-3-flash-preview';
        }
    });

    // 設定の保存
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;

        // 既存の settings を読んでマージする（theme / displayMode を上書きしないため）
        chrome.storage.local.get(['settings'], (result) => {
            const existingSettings = result.settings || {};
            const mergedSettings = {
                ...existingSettings,
                geminiApiKey: apiKey,
                aiModel: model
            };

            chrome.storage.local.set({ settings: mergedSettings }, () => {
                saveStatus.style.display = 'flex';
                setTimeout(() => {
                    saveStatus.style.display = 'none';
                }, 3000);
            });
        });
    });
});
