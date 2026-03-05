// ai-service.js

/**
 * Gemini APIとの通信を管理するサービスクラス
 */
class AIService {
    constructor() {
        this.apiKey = '';
        this.model = 'gemini-3-flash-preview';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.isReady = false;
    }

    /**
     * StorageからAPIキーとモデル設定を読み込む
     */
    async initialize() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['settings'], (result) => {
                if (result.settings && result.settings.geminiApiKey) {
                    this.apiKey = result.settings.geminiApiKey;
                    let model = result.settings.aiModel || 'gemini-3-flash-preview';

                    // 旧モデル名の自動マイグレーション
                    const modelMigration = {
                        'gemini-3.0-flash': 'gemini-3-flash-preview',
                        'gemini-3.0-flash-thinking': 'gemini-3-flash-preview',
                        'gemini-3.1-pro': 'gemini-3.1-pro-preview',
                        'gemini-2.5-flash': 'gemini-3-flash-preview',
                        'gemini-2.5-pro': 'gemini-3.1-pro-preview',
                        'gemini-3-flash': 'gemini-3-flash-preview' // 前回の修正ミスをカバー
                    };
                    if (modelMigration[model]) {
                        const oldModel = model;
                        model = modelMigration[model];
                        // マイグレーション後のモデル名をStorageに保存
                        const updatedSettings = { ...result.settings, aiModel: model };
                        chrome.storage.local.set({ settings: updatedSettings });
                        console.log(`AI Model migrated: ${oldModel} → ${model}`);
                    }

                    this.model = model;
                    this.isReady = true;
                } else {
                    this.isReady = false;
                }
                resolve(this.isReady);
            });
        });
    }

    /**
     * API呼び出しのベース関数
     */
    async callGeminiAPI(systemInstruction, userPrompt, jsonSchema = null) {
        if (!this.isReady) {
            const ready = await this.initialize();
            if (!ready) throw new Error("APIキーが設定されていません。オプション画面から設定してください。");
        }

        const endpoint = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

        const requestBody = {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                parts: [{ text: userPrompt }]
            }],
            generationConfig: {
                temperature: 0.2 // より決定論的で安定した出力にする
            }
        };

        // 構造化出力 (JSON) を強制する場合
        if (jsonSchema) {
            requestBody.generationConfig.responseMimeType = "application/json";
            requestBody.generationConfig.responseSchema = jsonSchema;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                const blockReason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || '不明';
                throw new Error(`AIからの応答が空でした（理由: ${blockReason}）。コンテンツフィルタによりブロックされた可能性があります。`);
            }

            // JSONスキーマ指定時はパースして返す
            if (jsonSchema) {
                return JSON.parse(textResponse);
            }
            return textResponse;

        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }

    /**
     * 機能1: プロンプトからのタイトル・効果生成 (A)
     */
    async generateMetadata(promptContent, existingCategories = []) {
        const systemPrompt = `
あなたは有能なプロンプトエンジニアです。
ユーザーが入力したプロンプト本文を分析し、最適な「タイトル」「効果（プレビュー用の一言説明）」「カテゴリ」を推測してください。
カテゴリは既存のリストから選ぶか、該当がなければ新しいカテゴリ名を1つだけ提案してください。

既存のカテゴリリスト: ${existingCategories.map(c => c.name).join(', ') || 'なし'}
    `;

        const schema = {
            type: "OBJECT",
            properties: {
                title: { type: "STRING", description: "プロンプトの分かりやすい短いタイトル（最大20文字）" },
                preview: { type: "STRING", description: "プロンプトの効果や目的を説明する短い文章（最大40文字）" },
                suggestedCategory: { type: "STRING", description: "プロンプトに最も適したカテゴリ名" }
            },
            required: ["title", "preview", "suggestedCategory"]
        };

        return this.callGeminiAPI(systemPrompt, promptContent, schema);
    }

    /**
     * 機能2: ラフメモからのプロンプト整形 (提案1)
     */
    async polishPrompt(roughNotes) {
        const systemPrompt = `
あなたは最高レベルのAIプロンプトエンジニアです。
ユーザーの「ラフなメモや指示」を受け取り、それをLLM（ChatGPTやClaude等）が最も理解しやすく、高品質な結果を出力できる「洗練されたプロンプト」に書き換えてください。
Markdown記法を使用し、必要に応じて「役割定義」「出力形式」「制約事項」などの要素を補って完璧な形に仕上げてください。
出力は整形されたプロンプトテキスト「のみ」を返してください。解説等は一切不要です。
    `;

        return this.callGeminiAPI(systemPrompt, roughNotes);
    }

    /**
     * 機能3: セマンティック検索用の評価 (B)
     * ※ 拡張機能のLocal Storageのみでベクトルデータベースを持てないため、
     * LLMに「検索クエリ」と「全プロンプトのリスト」を渡し、関連度の高い上位のIDを返させる擬似的な実装を行います。
     */
    async semanticSearch(query, promptsList) {
        // プロンプト数が多すぎるとトークン長を超えるため、簡易的な情報を渡す
        const simplifiedPrompts = promptsList.map(p => ({
            id: p.id,
            title: p.title,
            preview: p.preview || "",
            contentBrief: p.content.substring(0, 100) // プレビューとして冒頭だけ
        }));

        const systemPrompt = `
次にお渡しするJSONは「登録済みプロンプトのリスト」です。
ユーザーの検索クエリ（曖昧な要望や意図を含む）の「意味合い」を理解し、このリストの中から解決に役立ちそうなプロンプトのIDを、関連度が高い順に最大5つ抽出してください。
キーワードが完全に一致していなくても、意味や目的が合致しているものを優先してください。
    `;

        const userPromptText = `
【検索クエリ】
${query}

【プロンプトのリスト】
${JSON.stringify(simplifiedPrompts)}
    `;

        const schema = {
            type: "OBJECT",
            properties: {
                matchedIds: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "関連度の高い順に並んだプロンプトのIDの配列"
                }
            },
            required: ["matchedIds"]
        };

        const result = await this.callGeminiAPI(systemPrompt, userPromptText, schema);
        return result.matchedIds || [];
    }

    /**
     * 機能4: 未分類プロンプトの一括自動分類
     * LLMに複数のプロンプト情報を渡し、指定された固定カテゴリ（5種類）のいずれかに分類させる。
     */
    async autoCategorizeBulk(promptsList, fixedCategories, onProgress = null) {
        if (promptsList.length === 0) return {};

        const BATCH_SIZE = 15;
        const DELAY_MS = 4000; // レートリミット対策: バッチ間に4秒の遅延
        const categoriesText = fixedCategories.map(c => `- ${c.name} (id: ${c.id})`).join('\n');
        const allMappings = {};
        const totalBatches = Math.ceil(promptsList.length / BATCH_SIZE);

        for (let i = 0; i < promptsList.length; i += BATCH_SIZE) {
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const batch = promptsList.slice(i, i + BATCH_SIZE);

            // 進捗コールバック
            if (onProgress) {
                onProgress(batchNum, totalBatches, Object.keys(allMappings).length);
            }

            const simplifiedPrompts = batch.map(p => ({
                id: p.id,
                title: p.title,
                preview: p.preview || "",
                contentBrief: p.content.substring(0, 150)
            }));

            const systemPrompt = `
あなたは有能なデータ整理アシスタントです。
提供された複数のプロンプト情報を解析し、それぞれのプロンプトが以下の「5つの固定カテゴリ」のうち、どれに最も適しているかを判定してください。
該当するカテゴリのIDをマッピングして返してください。1つのプロンプトにつき、必ず1つのカテゴリIDを選んでください。

【固定カテゴリ一覧】
${categoriesText}
            `;

            const userPromptText = `
【分類対象のプロンプト一覧（JSON形式）】
${JSON.stringify(simplifiedPrompts)}
            `;

            const schema = {
                type: "OBJECT",
                properties: {
                    mapping: {
                        type: "ARRAY",
                        description: "プロンプトIDと判定したカテゴリIDのペアのリスト",
                        items: {
                            type: "OBJECT",
                            properties: {
                                promptId: { type: "STRING" },
                                categoryId: { type: "STRING" }
                            },
                            required: ["promptId", "categoryId"]
                        }
                    }
                },
                required: ["mapping"]
            };

            const result = await this.callGeminiAPI(systemPrompt, userPromptText, schema);

            if (result && result.mapping) {
                result.mapping.forEach(item => {
                    allMappings[item.promptId] = item.categoryId;
                });
            }

            // 最後のバッチでなければ、レートリミット回避のために待機
            if (i + BATCH_SIZE < promptsList.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        return allMappings;
    }
}

// グローバルスコープでインスタンス化して利用できるようにする
window.aiService = new AIService();
