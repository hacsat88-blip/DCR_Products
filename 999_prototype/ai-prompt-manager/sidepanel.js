// sidepanel.js

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const categoryTabsEl = document.getElementById("category-tabs");
  const promptListEl = document.getElementById("prompt-list");
  const searchInput = document.getElementById("search-input");
  const searchSuggestionsEl = document.getElementById("search-suggestions");

  // Modal Elements
  const promptModal = document.getElementById("prompt-modal");
  const addPromptBtn = document.getElementById("add-prompt-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const modalSaveBtn = document.getElementById("modal-save-btn");
  const modalTitle = document.getElementById("modal-title");
  const promptTitleInput = document.getElementById("prompt-title");
  const promptCategoryCheckboxesEl = document.getElementById(
    "prompt-category-checkboxes",
  );
  const promptContentInput = document.getElementById("prompt-content");
  const toast = document.getElementById("toast");

  const variableModal = document.getElementById("variable-modal");
  const variableInputsContainer = document.getElementById(
    "variable-inputs-container",
  );
  const varModalCancelBtn = document.getElementById(
    "variable-modal-cancel-btn",
  );
  const varModalInsertBtn = document.getElementById(
    "variable-modal-insert-btn",
  );

  // Category Manage Modal
  const manageCategoriesBtn = document.getElementById("manage-categories-btn");
  const categoryModal = document.getElementById("category-modal");
  const categoryModalCloseBtn = document.getElementById(
    "category-modal-close-btn",
  );
  const addCategoryBtn = document.getElementById("add-category-btn");
  const newCategoryNameInput = document.getElementById("new-category-name");
  const categoryManageList = document.getElementById("category-manage-list");

  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const displayModeToggleBtn = document.getElementById(
    "display-mode-toggle-btn",
  );
  const wrapTextToggleBtn = document.getElementById("wrap-text-toggle-btn");
  const tabScrollLeftBtn = document.getElementById("tab-scroll-left");
  const tabScrollRightBtn = document.getElementById("tab-scroll-right");

  let draggedPromptId = null; // ドラッグ中のプロンプトID

  // --- State Management ---
  let state = {
    activeCategoryId: null,
    editingPromptId: null,
    categories: [],
    prompts: [],
    settings: { theme: "auto", displayMode: "normal", wrapText: false },
  };
  // AI Buttons
  const aiSearchBtn = document.getElementById("ai-search-btn");
  const aiGenerateMetaBtn = document.getElementById("ai-generate-meta-btn");
  const aiPolishBtn = document.getElementById("ai-polish-btn");

  // Import/Export
  const importBtn = document.getElementById("import-btn");
  const autoSortBtn = document.getElementById("auto-sort-btn");
  const exportBtn = document.getElementById("export-btn");
  const importFileInput = document.getElementById("import-file-input");

  // --- Initialization ---
  init();

  async function init() {
    await loadData();
    if (!state.activeCategoryId && state.categories.length > 0) {
      state.activeCategoryId = state.categories[0].id;
    }
    render();
    setupEventListeners();
  }

  // --- Storage Functions ---
  const FIXED_CATEGORIES = [
    { id: "cat-general", name: "汎用・整理", order: 1, isFixed: true },
    { id: "cat-analysis", name: "深掘り・分析", order: 2, isFixed: true },
    { id: "cat-verification", name: "検証・逆質問", order: 3, isFixed: true },
    { id: "cat-ideation", name: "発想・役割", order: 4, isFixed: true },
    { id: "cat-action", name: "行動・決断", order: 5, isFixed: true },
  ];

  async function loadData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["categories", "prompts", "settings"],
        (result) => {
          let loadedCategories = result.categories || [];
          let loadedPrompts = result.prompts || [];
          state.settings = result.settings || {
            theme: "auto",
            displayMode: "normal",
            wrapText: false,
          };

          // マイグレーション: 旧固定カテゴリのIDと名称の更新
          let changed = false;

          // 固定カテゴリが完全でない場合の補充・名称更新
          FIXED_CATEGORIES.forEach((fc) => {
            const existing = loadedCategories.find((c) => c.id === fc.id);
            if (!existing) {
              loadedCategories.push({ ...fc });
              changed = true;
            } else if (existing.name !== fc.name || !existing.isFixed) {
              existing.name = fc.name;
              existing.isFixed = true;
              changed = true;
            }
          });

          // 旧固定カテゴリIDから新固定カテゴリIDへのマッピング
          const LEGACY_ID_MAP = {
            "cat-writing": "cat-verification",
            "cat-dev": "cat-ideation",
            "cat-other": "cat-action",
          };

          // loadedCategoriesから移行済みの旧IDを削除
          Object.keys(LEGACY_ID_MAP).forEach((oldId) => {
            const idx = loadedCategories.findIndex((c) => c.id === oldId);
            if (idx !== -1) {
              loadedCategories.splice(idx, 1);
              changed = true;
            }
          });

          // マイグレーション: categoryId -> categoryIds および古いIDの移行
          loadedPrompts = loadedPrompts.map((p) => {
            if (p.categoryId && !p.categoryIds) {
              p.categoryIds = [p.categoryId];
              delete p.categoryId;
              changed = true;
            }
            if (!p.categoryIds || p.categoryIds.length === 0) {
              p.categoryIds = ["cat-general"];
              changed = true;
            }

            // idの移行 (cat-writing -> cat-verification 等)
            const oldIdsStr = JSON.stringify(p.categoryIds);
            p.categoryIds = p.categoryIds.map((id) => LEGACY_ID_MAP[id] || id);
            p.categoryIds = [...new Set(p.categoryIds)]; // 念のため重複排除

            if (JSON.stringify(p.categoryIds) !== oldIdsStr) {
              changed = true;
            }

            return p;
          });

          state.categories = loadedCategories;
          state.prompts = loadedPrompts;

          if (state.settings.theme === "light")
            themeToggleBtn.querySelector(".material-icons-round").textContent =
              "light_mode";
          if (state.settings.theme === "dark")
            themeToggleBtn.querySelector(".material-icons-round").textContent =
              "dark_mode";

          applySettings();

          if (changed || !result.categories) {
            saveData();
          }
          resolve();
        },
      );
    });
  }

  function saveData() {
    chrome.storage.local.set({
      categories: state.categories,
      prompts: state.prompts,
      settings: state.settings,
    });
  }

  function applySettings() {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
    document.documentElement.setAttribute(
      "data-display",
      state.settings.displayMode,
    );
    document.documentElement.setAttribute(
      "data-wrap",
      state.settings.wrapText ? "true" : "false",
    );
  }

  // --- Render Functions ---
  function render() {
    renderTabs();
    renderPrompts();
    updateCategoryCheckboxes();
  }

  /**
   * プロンプトカード要素を生成して返す共通ファクトリ関数
   * @param {object} prompt - プロンプトオブジェクト
   * @param {object} [options]
   * @param {string} [options.titlePrefix=""] - タイトルの先頭に付ける文字列（例: "✨ "）
   * @param {boolean} [options.showFavorite=true] - お気に入りボタンを表示するか（通常リスト: true、AI検索結果: false）
   * @param {boolean} [options.showDrag=true] - ドラッグ&ドロップを有効にするか（通常リスト: true、AI検索結果: false）
   * @returns {HTMLLIElement} 生成されたプロンプトカードの li 要素
   */
  function createPromptCard(prompt, { titlePrefix = "", showFavorite = true, showDrag = true } = {}) {
    const card = document.createElement("li");
    card.className = "prompt-card";
    card.dataset.id = prompt.id;

    if (showDrag) {
      card.draggable = true;
      card.addEventListener("dragstart", (e) => {
        draggedPromptId = prompt.id;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", prompt.id);
      });
      card.addEventListener("dragend", () => {
        draggedPromptId = null;
        card.classList.remove("dragging");
        document
          .querySelectorAll(".prompt-card")
          .forEach((el) => el.classList.remove("drag-over", "drag-over-bottom"));
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          card.classList.add("drag-over");
          card.classList.remove("drag-over-bottom");
        } else {
          card.classList.add("drag-over-bottom");
          card.classList.remove("drag-over");
        }
      });
      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over", "drag-over-bottom");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over", "drag-over-bottom");
        const droppedId = e.dataTransfer.getData("text/plain");
        if (!droppedId || droppedId === prompt.id) return;
        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertAfter = e.clientY > midY;
        reorderPrompts(droppedId, prompt.id, insertAfter);
      });
    }

    const favButtonHtml = showFavorite
      ? `<button class="icon-btn fav-btn" data-id="${escapeHtml(prompt.id)}" title="お気に入り">
                         <span class="material-icons-round" style="font-size: 16px; color: ${prompt.isFavorite ? "gold" : "inherit"}">${prompt.isFavorite ? "star" : "star_border"}</span>
                     </button>`
      : "";

    const headerRow = document.createElement("div");
    headerRow.className = "prompt-title-row";
    headerRow.innerHTML = `
                <div class="prompt-title">${titlePrefix}${escapeHtml(prompt.title)}</div>
                <div class="prompt-actions">
                    ${favButtonHtml}
                    <button class="icon-btn edit-btn" data-id="${escapeHtml(prompt.id)}" title="編集">
                        <span class="material-icons-round" style="font-size: 16px;">edit</span>
                    </button>
                    <button class="icon-btn delete-btn" data-id="${escapeHtml(prompt.id)}" title="削除">
                        <span class="material-icons-round" style="font-size: 16px;">delete</span>
                    </button>
                </div>
            `;
    card.appendChild(headerRow);
    card.insertAdjacentHTML(
      "beforeend",
      `<div class="prompt-preview">${escapeHtml(prompt.content)}</div>`,
    );

    card.addEventListener("click", (e) => {
      if (e.target.closest(".prompt-actions")) return;
      const vars = extractVariables(prompt.content);
      if (vars.length > 0) {
        openVariableModal(prompt.content, vars);
      } else {
        insertPrompt(prompt.content);
      }
    });

    if (showFavorite) {
      const favBtn = card.querySelector(".fav-btn");
      if (favBtn) {
        favBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          prompt.isFavorite = !prompt.isFavorite;
          saveData();
          renderPrompts();
        });
      }
    }

    const editBtn = card.querySelector(".edit-btn");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(prompt);
    });

    const deleteBtn = card.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("このプロンプトを削除しますか？")) {
        deletePrompt(prompt.id);
      }
    });

    return card;
  }

  function renderTabs() {
    categoryTabsEl.innerHTML = "";

    // --- お気に入りタブ ---
    const favBtn = document.createElement("button");
    favBtn.className =
      "tab-btn" + ("favorites" === state.activeCategoryId ? " active" : "");
    favBtn.innerHTML =
      '<span class="material-icons-round" style="font-size:16px; vertical-align:text-bottom; margin-right:4px;">star</span>お気に入り';
    favBtn.onclick = () => {
      state.activeCategoryId = "favorites";
      if (searchInput.value) {
        searchInput.value = "";
        searchSuggestionsEl.classList.remove("active");
      }
      render();
    };
    categoryTabsEl.appendChild(favBtn);

    // 検索中はタブを薄くするか、そのままで良い
    state.categories
      .sort((a, b) => a.order - b.order)
      .forEach((cat) => {
        const btn = document.createElement("button");
        btn.className =
          "tab-btn" + (cat.id === state.activeCategoryId ? " active" : "");
        btn.textContent = cat.name;
        btn.onclick = () => {
          state.activeCategoryId = cat.id;
          // タブ切り替え時は検索をリセット
          if (searchInput.value) {
            searchInput.value = "";
            searchSuggestionsEl.classList.remove("active");
          }
          render();
        };
        categoryTabsEl.appendChild(btn);
      });
  }

  function renderPrompts() {
    promptListEl.innerHTML = "";
    const query = searchInput.value.trim();
    let displayPrompts = [];

    if (query) {
      // 検索時は全カテゴリからあいまい検索
      displayPrompts = state.prompts.filter(
        (p) => fuzzyMatch(query, p.title) || fuzzyMatch(query, p.content),
      );
    } else if (state.activeCategoryId === "favorites") {
      // お気に入りタブ選択時
      displayPrompts = state.prompts.filter((p) => p.isFavorite);
    } else {
      // 通常時はアクティブなカテゴリのみ
      displayPrompts = state.prompts.filter(
        (p) => p.categoryIds && p.categoryIds.includes(state.activeCategoryId),
      );
    }

    const isDragEnabled = !query && state.activeCategoryId !== "favorites";

    displayPrompts
      .sort((a, b) => a.order - b.order)
      .forEach((prompt) => {
        promptListEl.appendChild(createPromptCard(prompt, { showDrag: isDragEnabled }));
      });

    if (displayPrompts.length === 0) {
      promptListEl.innerHTML =
        '<div class="prompt-preview" style="text-align:center; padding: 16px;">プロンプトがありません</div>';
    }
  }

  // --- Drag and Drop Logic ---
  function reorderPrompts(draggedId, targetId, insertAfter) {
    let currentDisplayPrompts = Array.from(promptListEl.children)
      .map((li) => state.prompts.find((p) => p.id === li.dataset.id))
      .filter(Boolean);

    const draggedIndex = currentDisplayPrompts.findIndex(
      (p) => p.id === draggedId,
    );
    let targetIndex = currentDisplayPrompts.findIndex((p) => p.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = currentDisplayPrompts.splice(draggedIndex, 1);

    targetIndex = currentDisplayPrompts.findIndex((p) => p.id === targetId); // Re-find target index after splice
    const insertPosition = insertAfter ? targetIndex + 1 : targetIndex;
    currentDisplayPrompts.splice(insertPosition, 0, draggedItem);

    // Create a map for quick lookup of new order
    const newOrderMap = new Map();
    currentDisplayPrompts.forEach((p, index) => {
      newOrderMap.set(p.id, index);
    });

    // Apply new order to the global state.prompts
    state.prompts.forEach((p) => {
      if (p.categoryIds && p.categoryIds.includes(state.activeCategoryId)) {
        if (newOrderMap.has(p.id)) {
          p.order = newOrderMap.get(p.id);
        }
      }
    });

    saveData();
    renderPrompts();
  }

  // --- Variable Templating Logic ---
  function extractVariables(text) {
    const regex = /\[([^\]\n]+)\]|\{\{([^\}\n]+)\}\}/g;
    const matches = Array.from(text.matchAll(regex));
    let vars = matches.map((m) => m[1] || m[2]);
    // [x] や [ ] などのチェックボックス記法を除外
    vars = vars.filter((v) => !["x", "X", " ", "/"].includes(v.trim()));
    return [...new Set(vars)];
  }

  let currentTemplateVariables = [];
  let currentTemplateContent = "";

  function openVariableModal(content, variables) {
    currentTemplateContent = content;
    currentTemplateVariables = variables;
    variableInputsContainer.innerHTML = "";

    variables.forEach((v) => {
      const group = document.createElement("div");
      group.className = "form-group";
      const label = document.createElement("label");
      label.textContent = v;

      const input = document.createElement("textarea");
      input.rows = 2;
      input.dataset.varName = v;
      input.placeholder = `${v} を入力（空欄のままでも可）`;

      group.appendChild(label);
      group.appendChild(input);
      variableInputsContainer.appendChild(group);
    });

    variableModal.classList.remove("hidden");
    const firstInput = variableInputsContainer.querySelector("textarea");
    if (firstInput) firstInput.focus();
  }

  function closeVariableModal() {
    variableModal.classList.add("hidden");
    currentTemplateContent = "";
    currentTemplateVariables = [];
  }

  function insertWithVariables() {
    let finalContent = currentTemplateContent;
    const inputs = variableInputsContainer.querySelectorAll("textarea");

    inputs.forEach((input) => {
      const varName = input.dataset.varName;
      // 未入力の場合は元の記法を残すようにはせず、空文字への置換の方が良いか検討。
      // しかし、明示的に入れるように設計。空欄なら空文字を入れる。
      // それでもあえて元のタグを残したい場合は未入力時に [xxx] とするかだが、
      // 今回は入力値をそのまま採用する。
      const val = input.value;
      const regexBracket = new RegExp(`\\[${escapeRegExp(varName)}\\]`, "g");
      const regexCurley = new RegExp(
        `\\{\\{${escapeRegExp(varName)}\\}\\}`,
        "g",
      );
      finalContent = finalContent
        .replace(regexBracket, val)
        .replace(regexCurley, val);
    });

    closeVariableModal();
    insertPrompt(finalContent);
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // --- AI Functions ---
  async function handleAISearch() {
    const query = searchInput.value.trim();
    if (!query) {
      alert("検索キーワードを入力してください");
      return;
    }

    try {
      aiSearchBtn.classList.add("loading"); // CSSでローディングアニメーションを後で追加
      aiSearchBtn.innerHTML =
        '<span class="material-icons-round">hourglass_empty</span>';

      // AIサービスを呼び出して関連IDを取得
      const matchedIds = await window.aiService.semanticSearch(
        query,
        state.prompts,
      );

      if (matchedIds && matchedIds.length > 0) {
        // UIを更新
        promptListEl.innerHTML = "";
        // 関連度順にソートして表示
        const displayPrompts = matchedIds
          .map((id) => state.prompts.find((p) => p.id === id))
          .filter((p) => p !== undefined);

        displayPrompts.forEach((prompt) => {
          promptListEl.appendChild(
            createPromptCard(prompt, { titlePrefix: "✨ ", showFavorite: false, showDrag: false }),
          );
        });
      } else {
        promptListEl.innerHTML =
          '<div class="prompt-preview" style="text-align:center; padding: 16px;">関連するプロンプトは見つかりませんでした</div>';
      }
    } catch (error) {
      alert("AI検索エラー: " + error.message);
    } finally {
      aiSearchBtn.classList.remove("loading");
      aiSearchBtn.innerHTML =
        '<span class="material-icons-round">auto_awesome</span>';
    }
  }

  async function handleAIGenerateMeta() {
    const content = promptContentInput.value.trim();
    if (!content) {
      alert("プロンプト本文を入力してから生成ボタンを押してください");
      return;
    }

    try {
      await withButtonLoading(
        aiGenerateMetaBtn,
        '<span class="material-icons-round" style="font-size:14px">hourglass_empty</span>生成中...',
        async () => {
          const metadata = await window.aiService.generateMetadata(
            content,
            state.categories,
          );

          promptTitleInput.value = metadata.title;
          // previewフィールドは一旦保留（要件上保存しないが将来用）

          // カテゴリの自動選択
          const existingCat = state.categories.find(
            (c) => c.name === metadata.suggestedCategory,
          );
          // 全てのチェックボックスを一旦クリア
          const checkboxes = promptCategoryCheckboxesEl.querySelectorAll(
            'input[type="checkbox"]',
          );
          checkboxes.forEach((cb) => (cb.checked = false));

          if (existingCat) {
            const targetCb = promptCategoryCheckboxesEl.querySelector(
              `input[value="${existingCat.id}"]`,
            );
            if (targetCb) targetCb.checked = true;
          } else {
            // 提案されたカテゴリが見つからない場合は「汎用・整理」にフォールバック
            const fallbackCb = promptCategoryCheckboxesEl.querySelector(
              `input[value="cat-general"]`,
            );
            if (fallbackCb) fallbackCb.checked = true;
          }
        },
      );
    } catch (error) {
      alert("生成エラー: " + error.message);
    }
  }

  async function handleAIPolish() {
    const content = promptContentInput.value.trim();
    if (!content) {
      alert("プロンプト本文（ラフメモなど）を入力してください");
      return;
    }

    try {
      await withButtonLoading(
        aiPolishBtn,
        '<span class="material-icons-round" style="font-size:14px">hourglass_empty</span>整形中...',
        async () => {
          const polished = await window.aiService.polishPrompt(content);
          promptContentInput.value = polished;
        },
      );
    } catch (error) {
      alert("エラー: " + error.message);
    }
  }

  // --- Import / Export ---
  function handleExport() {
    const data = {
      categories: state.categories,
      prompts: state.prompts,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_prompts_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("エクスポート完了（JSON）");
  }

  function triggerImport() {
    importFileInput.click();
  }

  async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) {
      importFileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        let importedData = null;

        if (file.name.endsWith(".json")) {
          importedData = JSON.parse(content);
        } else if (file.name.endsWith(".md")) {
          importedData = parseMarkdownDictionary(content);
        } else {
          alert(
            "サポートされていないファイル形式です。(.json または .md を選択してください)",
          );
          importFileInput.value = "";
          return;
        }

        if (importedData && importedData.categories && importedData.prompts) {
          const isOverwrite = confirm(
            `現在のデータをすべて削除してインポート（上書）しますか？\n[OK] = 上書\n[キャンセル] = 追加（${importedData.prompts.length}件）`,
          );

          if (isOverwrite) {
            if (
              !confirm(
                "本当に現在のすべてのカテゴリとプロンプトを削除して上書きしますか？",
              )
            ) {
              importFileInput.value = "";
              return; // 中止
            }
            // ★ 上書きモード ★
            // カテゴリは固定カテゴリをベースにし、不足分は追加
            state.categories = [...FIXED_CATEGORIES];
            state.prompts = [];

            importedData.categories.forEach((newCat) => {
              if (!state.categories.find((c) => c.name === newCat.name)) {
                state.categories.push(newCat);
              }
            });

            importedData.prompts.forEach((newPrompt) => {
              state.prompts.push({
                ...newPrompt,
                categoryId: undefined,
                categoryIds: newPrompt.categoryIds || ["cat-general"],
              });
            });
            if (state.categories.length > 0) {
              state.activeCategoryId = state.categories[0].id;
            }
            saveData();
            render();
            showToast("上書きインポートしました");
          } else {
            // ★ 追加モード ★
            if (
              confirm(
                `${importedData.prompts.length}件のプロンプトを追加（マージ）します。よろしいですか？`,
              )
            ) {
              const catIdMap = {};
              importedData.categories.forEach((newCat) => {
                const existingCat = state.categories.find(
                  (c) => c.name === newCat.name,
                );
                if (existingCat) {
                  catIdMap[newCat.id] = existingCat.id;
                } else {
                  const newId = generateId();
                  catIdMap[newCat.id] = newId;
                  state.categories.push({ ...newCat, id: newId });
                }
              });

              importedData.prompts.forEach((newPrompt) => {
                let mappedCategoryIds = [];
                if (newPrompt.categoryIds) {
                  mappedCategoryIds = newPrompt.categoryIds.map(
                    (cId) => catIdMap[cId] || cId,
                  );
                } else if (newPrompt.categoryId) {
                  mappedCategoryIds = [
                    catIdMap[newPrompt.categoryId] || newPrompt.categoryId,
                  ];
                } else {
                  mappedCategoryIds = ["cat-general"];
                }
                if (!state.prompts.find((p) => p.id === newPrompt.id)) {
                  state.prompts.push({
                    ...newPrompt,
                    categoryId: undefined,
                    categoryIds: mappedCategoryIds,
                  });
                }
              });

              saveData();
              render();
              showToast("追加インポートしました");
            }
          }
        } else {
          alert("認識または解析できないデータフォーマットです。");
        }
      } catch (error) {
        alert("読み込みエラー: " + error.message);
      }
      // リセット
      importFileInput.value = "";
    };
    reader.readAsText(file);
  }

  function parseMarkdownDictionary(mdText) {
    const lines = mdText.split("\n");
    // MDインポート時は新規カテゴリを生成せず空配列を返す。
    // プロンプトは固定カテゴリID（cat-general等）を直接参照するため、
    // handleImportの追加モードでcatIdMapが空ループになるが、
    // 固定IDがそのまま素通りして問題ない。
    const categories = [];
    const prompts = [];
    let currentCategoryId = "cat-general"; // デフォルト

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // カテゴリの抽出 (## カテゴリ名)
      const catMatch = line.match(/^##\s+(.*)/);
      if (catMatch) {
        const catName = catMatch[1].replace(/^[①-⑳\d]+\s*/, "").trim();
        // 新カテゴリのいずれかにマッピングする
        if (
          catName.includes("整理") ||
          catName.includes("基本") ||
          catName.includes("定番")
        ) {
          currentCategoryId = "cat-general";
        } else if (
          catName.includes("深掘り") ||
          catName.includes("分析") ||
          catName.includes("視点")
        ) {
          currentCategoryId = "cat-analysis";
        } else if (
          catName.includes("検証") ||
          catName.includes("逆質問") ||
          catName.includes("批判")
        ) {
          currentCategoryId = "cat-verification";
        } else if (
          catName.includes("発想") ||
          catName.includes("ペルソナ") ||
          catName.includes("役割")
        ) {
          currentCategoryId = "cat-ideation";
        } else if (
          catName.includes("行動") ||
          catName.includes("決断") ||
          catName.includes("出力")
        ) {
          currentCategoryId = "cat-action";
        } else {
          currentCategoryId = "cat-general";
        }
        continue;
      }

      // テーブル行の抽出
      if (line.startsWith("|") && line.endsWith("|")) {
        const cols = line
          .split("|")
          .map((c) => c.trim())
          .slice(1, -1); // 左右の余白を削除
        // ヘッダーや区切り線をスキップ
        if (cols.length >= 4 && cols[0] !== "No." && !cols[0].includes("---")) {
          // 読み (Title)
          let title = cols[1].replace(/`/g, "");
          // 展開テキスト (Content)
          let content = cols[2];
          // 効果 (Preview)
          let preview = cols[3] || "";

          if (title && content && title !== "読み") {
            // 内容に応じた微調整ヒューリスティック
            let assignedCat = currentCategoryId;
            if (
              content.includes("分析") ||
              content.includes("比較") ||
              content.includes("原因")
            )
              assignedCat = "cat-analysis";
            else if (
              content.includes("アイデア") ||
              content.includes("斬新") ||
              content.includes("専門家")
            )
              assignedCat = "cat-ideation";
            else if (
              content.includes("反論") ||
              content.includes("リスク") ||
              content.includes("質問")
            )
              assignedCat = "cat-verification";
            else if (
              content.includes("手順") ||
              content.includes("アクション") ||
              content.includes("目標")
            )
              assignedCat = "cat-action";

            prompts.push({
              id: generateId(),
              categoryIds: [assignedCat],
              title:
                title +
                (preview ? " 💡" + preview.substring(0, 10) + "..." : ""),
              content: content,
              order: prompts.length + 1,
            });
          }
        }
      }
    }
    return { categories, prompts };
  }

  // --- あいまい検索とサジェスト ---
  function fuzzyMatch(query, text) {
    // スペース区切りで複数キーワードの AND 検索（簡易的なあいまい検索）
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t);
    const target = text.toLowerCase();
    return terms.every((term) => target.includes(term));
  }

  function handleSearchInput() {
    const query = searchInput.value.trim();
    searchSuggestionsEl.innerHTML = "";

    if (!query) {
      searchSuggestionsEl.classList.remove("active");
      renderPrompts();
      return;
    }

    const matches = state.prompts.filter(
      (p) => fuzzyMatch(query, p.title) || fuzzyMatch(query, p.content),
    );

    // サジェストドロップダウンの表示 (最大5件)
    if (matches.length > 0) {
      matches.slice(0, 5).forEach((p) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.innerHTML = `
          <div class="suggestion-title">${escapeHtml(p.title)}</div>
          <div class="suggestion-preview">${escapeHtml(p.content.substring(0, 40))}...</div>
        `;
        item.addEventListener("click", () => {
          insertPrompt(p.content);
          searchInput.value = "";
          searchSuggestionsEl.classList.remove("active");
          renderPrompts();
        });
        searchSuggestionsEl.appendChild(item);
      });
      searchSuggestionsEl.classList.add("active");
    } else {
      searchSuggestionsEl.classList.remove("active");
    }

    // メインリストもフィルタリング
    renderPrompts();
  }

  function updateCategoryCheckboxes() {
    promptCategoryCheckboxesEl.innerHTML = "";
    state.categories.forEach((cat) => {
      const label = document.createElement("label");
      label.className = "category-checkbox-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = cat.id;

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(cat.name));
      promptCategoryCheckboxesEl.appendChild(label);
    });
  }

  // --- CRUD Operations ---
  function savePrompt() {
    const title = promptTitleInput.value.trim();
    const content = promptContentInput.value.trim();

    // 選択されたカテゴリIDを取得
    const checkboxes = Array.from(
      promptCategoryCheckboxesEl.querySelectorAll(
        'input[type="checkbox"]:checked',
      ),
    );
    const categoryIds = checkboxes.map((cb) => cb.value);

    if (!title || !content) {
      alert("タイトルと本文は必須です。");
      return;
    }

    if (categoryIds.length === 0) {
      alert("少なくとも1つのカテゴリを選択してください。");
      return;
    }

    if (state.editingPromptId) {
      // 編集
      const index = state.prompts.findIndex(
        (p) => p.id === state.editingPromptId,
      );
      if (index !== -1) {
        state.prompts[index] = {
          ...state.prompts[index],
          title,
          content,
          categoryIds,
        };
      }
    } else {
      // 新規作成
      state.prompts.push({
        id: generateId(),
        categoryIds,
        title,
        content,
        order: state.prompts.length + 1,
      });
    }

    // 保存したら最初のカテゴリをアクティブにする(UXの一環)
    state.activeCategoryId = categoryIds[0];

    saveData();
    closeModal();
    render();
  }

  function deletePrompt(id) {
    state.prompts = state.prompts.filter((p) => p.id !== id);
    saveData();
    render();
  }

  // --- Action Functions ---
  async function insertPrompt(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("コピーしました");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }

    chrome.runtime.sendMessage(
      { action: "insertPrompt", text: text },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Message error:", chrome.runtime.lastError.message);
          showToast("コピーしました（挿入は手動でペーストしてください）");
          return;
        }
        if (!response || response.status === "error") {
          console.log("DOM insertion failed. Fallback to clipboard used.");
          showToast("コピーしました（挿入は手動でペーストしてください）");
        } else {
          showToast("挿入しました");
        }
      },
    );

    // サジェストが出ている場合は消す
    searchSuggestionsEl.classList.remove("active");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 2000);
  }

  // --- Modal Control ---
  function openModal(prompt = null) {
    state.editingPromptId = prompt ? prompt.id : null;
    modalTitle.textContent = prompt ? "プロンプトを編集" : "新規プロンプト作成";

    promptTitleInput.value = prompt ? prompt.title : "";
    promptContentInput.value = prompt ? prompt.content : "";

    // チェックボックスの状態をリセットして生成
    updateCategoryCheckboxes();

    if (prompt && prompt.categoryIds) {
      // 既存プロンプトのカテゴリにチェックを入れる
      prompt.categoryIds.forEach((id) => {
        const cb = promptCategoryCheckboxesEl.querySelector(
          `input[value="${id}"]`,
        );
        if (cb) cb.checked = true;
      });
    } else {
      // 新規作成時はアクティブなカテゴリにチェックを入れる
      // ただし「お気に入り」タブの場合は最初の固定カテゴリにフォールバック
      const targetCatId =
        state.activeCategoryId === "favorites"
          ? state.categories.length > 0
            ? state.categories[0].id
            : null
          : state.activeCategoryId;
      if (targetCatId) {
        const activeCb = promptCategoryCheckboxesEl.querySelector(
          `input[value="${targetCatId}"]`,
        );
        if (activeCb) activeCb.checked = true;
      }
    }

    promptModal.classList.remove("hidden");
  }

  function closeModal() {
    promptModal.classList.add("hidden");
    state.editingPromptId = null;
  }

  // --- Category Management ---
  function openCategoryManager() {
    renderCategoryManageList();
    categoryModal.classList.remove("hidden");
  }

  function closeCategoryManager() {
    categoryModal.classList.add("hidden");
    newCategoryNameInput.value = "";
  }

  function renderCategoryManageList() {
    categoryManageList.innerHTML = "";
    state.categories.forEach((cat) => {
      const li = document.createElement("li");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = cat.name;
      if (cat.isFixed) {
        nameSpan.innerHTML += ' <span class="fixed-badge">固定</span>';
      }
      li.appendChild(nameSpan);

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "category-actions";

      if (!cat.isFixed) {
        const renameBtn = document.createElement("button");
        renameBtn.className = "icon-btn";
        renameBtn.innerHTML =
          '<span class="material-icons-round" style="font-size: 16px;">edit</span>';
        renameBtn.title = "名称変更";
        renameBtn.onclick = () => handleRenameCategory(cat.id, cat.name);
        actionsDiv.appendChild(renameBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-btn delete-btn";
        deleteBtn.innerHTML =
          '<span class="material-icons-round" style="font-size: 16px;">delete</span>';
        deleteBtn.title = "削除";
        deleteBtn.onclick = () => handleDeleteCategory(cat.id);
        actionsDiv.appendChild(deleteBtn);
      }
      li.appendChild(actionsDiv);
      categoryManageList.appendChild(li);
    });
  }

  function handleAddCategory() {
    const name = newCategoryNameInput.value.trim();
    if (!name) return;

    // 既存チェック
    if (state.categories.find((c) => c.name === name)) {
      alert("そのタグ名は既に存在します");
      return;
    }

    const newCat = {
      id: generateId(),
      name: name,
      order: state.categories.length + 1,
      isFixed: false,
    };

    state.categories.push(newCat);
    newCategoryNameInput.value = "";

    saveData();
    render(); // タブ等の更新
    renderCategoryManageList();
    showToast(`タグ「${name}」を追加しました`);
  }

  function handleDeleteCategory(id) {
    if (
      !confirm(
        "このタグを削除しますか？\n（プロンプトからはこのタグのみ削除されます）",
      )
    )
      return;

    // カテゴリから削除
    state.categories = state.categories.filter((c) => c.id !== id);

    // プロンプトからこのカテゴリを削除
    state.prompts.forEach((p) => {
      p.categoryIds = p.categoryIds.filter((cid) => cid !== id);
      // 万が一カテゴリが空になったら汎用に
      if (p.categoryIds.length === 0) {
        p.categoryIds = ["cat-general"];
      }
    });

    if (state.activeCategoryId === id) {
      state.activeCategoryId = "cat-general";
    }

    saveData();
    render();
    renderCategoryManageList();
    showToast("タグを削除しました");
  }

  function handleRenameCategory(id, currentName) {
    const newName = prompt(`タグ名を変更してください:`, currentName);
    if (!newName || newName.trim() === "" || newName.trim() === currentName)
      return;

    const trimmedName = newName.trim();
    if (state.categories.find((c) => c.name === trimmedName && c.id !== id)) {
      alert("その名前は既に使われています");
      return;
    }

    const cat = state.categories.find((c) => c.id === id);
    if (cat) {
      cat.name = trimmedName;
      saveData();
      render();
      renderCategoryManageList();
      showToast(`タグ名を「${trimmedName}」に変更しました`);
    }
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    searchInput.addEventListener("input", handleSearchInput);

    // サジェスト外をクリックしたらサジェストを閉じる
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-bar")) {
        searchSuggestionsEl.classList.remove("active");
      }
    });

    addPromptBtn.addEventListener("click", () => openModal());
    modalCancelBtn.addEventListener("click", closeModal);
    modalSaveBtn.addEventListener("click", savePrompt);

    promptModal.addEventListener("click", (e) => {
      if (e.target === promptModal) closeModal();
    });

    // Tag Management Modal Listeners
    if (manageCategoriesBtn)
      manageCategoriesBtn.addEventListener("click", openCategoryManager);
    if (categoryModalCloseBtn)
      categoryModalCloseBtn.addEventListener("click", closeCategoryManager);
    if (addCategoryBtn)
      addCategoryBtn.addEventListener("click", handleAddCategory);
    if (newCategoryNameInput) {
      newCategoryNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleAddCategory();
      });
    }
    if (categoryModal) {
      categoryModal.addEventListener("click", (e) => {
        if (e.target === categoryModal) closeCategoryManager();
      });
    }

    varModalCancelBtn.addEventListener("click", closeVariableModal);
    varModalInsertBtn.addEventListener("click", insertWithVariables);
    variableModal.addEventListener("click", (e) => {
      if (e.target === variableModal) closeVariableModal();
    });

    // Theme and Display Mode Event Listeners
    themeToggleBtn.addEventListener("click", () => {
      const modes = ["auto", "light", "dark"];
      const currentIndex = modes.indexOf(state.settings.theme || "auto");
      state.settings.theme = modes[(currentIndex + 1) % modes.length];

      let icon = "brightness_auto";
      if (state.settings.theme === "light") icon = "light_mode";
      if (state.settings.theme === "dark") icon = "dark_mode";

      themeToggleBtn.querySelector(".material-icons-round").textContent = icon;

      applySettings();
      saveData();
    });

    displayModeToggleBtn.addEventListener("click", () => {
      state.settings.displayMode =
        state.settings.displayMode === "compact" ? "normal" : "compact";
      applySettings();
      saveData();
      // UI上の見た目（要素の高さなど）が変わる可能性があるが、今回はCSSのみで制御するためrenderは不要
    });

    // テキスト折り返し切替
    wrapTextToggleBtn.addEventListener("click", () => {
      state.settings.wrapText = !state.settings.wrapText;
      applySettings();
      saveData();
    });

    // タブの左右スクロールボタン
    if (tabScrollLeftBtn && categoryTabsEl) {
      tabScrollLeftBtn.addEventListener("click", () => {
        categoryTabsEl.scrollBy({ left: -150, behavior: "smooth" });
      });
    }
    if (tabScrollRightBtn && categoryTabsEl) {
      tabScrollRightBtn.addEventListener("click", () => {
        categoryTabsEl.scrollBy({ left: 150, behavior: "smooth" });
      });
    }

    // キーボード（左・右矢印キー）によるタブ切り替え
    document.addEventListener("keydown", (e) => {
      // 文字入力中（検索窓やプロンプト編集時）は無効
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName))
        return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();

        // お気に入り＋全カテゴリを合わせた順番のIDリストを作成
        const tabIds = [
          "favorites",
          ...[...state.categories]
            .sort((a, b) => a.order - b.order)
            .map((c) => c.id),
        ];

        const currentIndex = tabIds.indexOf(state.activeCategoryId);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (e.key === "ArrowLeft") {
          nextIndex = Math.max(0, currentIndex - 1);
        } else if (e.key === "ArrowRight") {
          nextIndex = Math.min(tabIds.length - 1, currentIndex + 1);
        }

        if (nextIndex !== currentIndex) {
          state.activeCategoryId = tabIds[nextIndex];
          if (searchInput.value) {
            searchInput.value = "";
            searchSuggestionsEl.classList.remove("active");
          }
          render();

          // アクティブになったタブが見えるようにスクロール
          setTimeout(() => {
            const activeTabBtn =
              categoryTabsEl.querySelector(".tab-btn.active");
            if (activeTabBtn) {
              activeTabBtn.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
              });
            }
          }, 50);
        }
      }
    });

    // AI Event Listeners
    if (aiSearchBtn) aiSearchBtn.addEventListener("click", handleAISearch);
    if (aiGenerateMetaBtn)
      aiGenerateMetaBtn.addEventListener("click", handleAIGenerateMeta);
    if (aiPolishBtn) aiPolishBtn.addEventListener("click", handleAIPolish);

    // Import/Export
    if (exportBtn) exportBtn.addEventListener("click", handleExport);
    if (importBtn) importBtn.addEventListener("click", triggerImport);
    if (importFileInput)
      importFileInput.addEventListener("change", handleImport);
    if (autoSortBtn) autoSortBtn.addEventListener("click", handleAutoSortBulk);
  }

  /**
   * 未分類のプロンプトを一括で5つの固定カテゴリにAI整理する
   */
  async function handleAutoSortBulk() {
    if (!window.aiService) {
      alert("AI連携サービスが初期化されていません。");
      return;
    }

    if (!aiService.isReady) {
      const ready = await aiService.initialize();
      if (!ready) {
        alert(
          "APIキーが設定されていません。オプション画面（歯車アイコン）からGemini APIキーを設定してください。",
        );
        return;
      }
    }

    const fixedCategoryIds = [
      "cat-general",
      "cat-analysis",
      "cat-verification",
      "cat-ideation",
      "cat-action",
    ];
    // 固定カテゴリに属していないプロンプトを抽出
    const promptsToSort = state.prompts.filter(
      (p) => !p.categoryIds.some((cid) => fixedCategoryIds.includes(cid)),
    );

    if (promptsToSort.length === 0) {
      showToast("整理する未分類のプロンプトはありません✨");
      return;
    }

    const totalBatches = Math.ceil(promptsToSort.length / 15);
    const estimatedMinutes = Math.ceil((totalBatches * 5) / 60);
    const timeNote =
      totalBatches > 1
        ? `\n※${totalBatches}回のバッチ処理（推定約${estimatedMinutes}分）`
        : "";

    if (
      !confirm(
        `固定カテゴリ（5種）に属していない ${promptsToSort.length} 件のプロンプトをAIで自動整理しますか？${timeNote}`,
      )
    ) {
      return;
    }

    showToast(
      `${promptsToSort.length}件をAI分類中... (バッチ 1/${totalBatches})`,
    );

    try {
      await withButtonLoading(
        autoSortBtn,
        '<span class="material-icons-round" style="animation: spin 1s linear infinite;">sync</span>',
        async () => {
          const fixedCategories = state.categories.filter((c) => c.isFixed);
          const resultMapping = await aiService.autoCategorizeBulk(
            promptsToSort,
            fixedCategories,
            (batchNum, total, doneCount) => {
              showToast(
                `AI分類中... バッチ ${batchNum}/${total}（${doneCount}件完了）`,
              );
            },
          );

          let updatedCount = 0;
          state.prompts.forEach((p) => {
            const assignedCategoryId = resultMapping[p.id];
            if (
              assignedCategoryId &&
              fixedCategoryIds.includes(assignedCategoryId)
            ) {
              // 古いカテゴリを上書きして、固定カテゴリに組み込む
              p.categoryIds = [assignedCategoryId];
              updatedCount++;
            }
          });

          if (updatedCount > 0) {
            // 不要になった動的カテゴリ（固定カテゴリ以外で使われていないもの）のクリーンアップ
            const usedCategoryIds = new Set();
            state.prompts.forEach((p) =>
              p.categoryIds.forEach((id) => usedCategoryIds.add(id)),
            );

            state.categories = state.categories.filter(
              (c) => c.isFixed || usedCategoryIds.has(c.id),
            );

            saveData();
            render();
            showToast(`${updatedCount}件のプロンプトを自動整理しました！`);
          } else {
            showToast("分類可能なプロンプトがありませんでした。");
          }
        },
      );
    } catch (error) {
      console.error(error);
      alert("一括自動分類中にエラーが発生しました:\n" + error.message);
    }
  }

  // --- Utils ---
  /**
   * ボタンのローディング状態を管理する共通ヘルパー
   * 非同期処理の実行中はボタンのHTMLをloadingHtmlに差し替え、無効化する。
   * 処理完了後（成功・失敗問わず）に元のHTMLと有効状態を復元する。
   * @param {HTMLButtonElement} btn - ローディング状態を管理するボタン要素
   * @param {string} loadingHtml - ローディング中に表示するHTML文字列
   * @param {Function} asyncFn - 実行する非同期処理（引数なし）
   * @returns {Promise<*>} asyncFn の戻り値をそのまま返す
   */
  async function withButtonLoading(btn, loadingHtml, asyncFn) {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = loadingHtml;
    btn.disabled = true;
    try {
      return await asyncFn();
    } finally {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }

  function generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
