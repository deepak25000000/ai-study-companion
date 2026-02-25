const { GoogleGenerativeAI } = require("@google/generative-ai");
const { HfInference } = require("@huggingface/inference");

// ==================== PROVIDER SETUP ====================

let genAI = null;
let hf = null;
let activeProvider = null;

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'paste-your-gemini-api-key-here') {
    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        activeProvider = 'gemini';
        console.log('✅ Gemini AI initialized');
    } catch (error) {
        console.error('❌ Gemini init failed:', error.message);
    }
}

if (process.env.HUGGINGFACE_API_TOKEN && process.env.HUGGINGFACE_API_TOKEN !== 'paste-your-hf-token-here') {
    try {
        hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
        if (!activeProvider) activeProvider = 'huggingface';
        console.log('✅ HuggingFace initialized');
    } catch (error) {
        console.error('❌ HuggingFace init failed:', error.message);
    }
}

if (!activeProvider) console.log('⚠️ No AI provider configured.');

// ==================== SETTINGS ====================
const TOKEN_LIMITS = {
    chat: 500, explain: 1000, summarize: 700, quiz: 1400, flashcard: 1500
};

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];
const HF_MODELS = [
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Llama-3.1-70B-Instruct",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
];

// ==================== HELPERS ====================
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT ${ms}ms`)), ms))
    ]);
}

// Safely try a model, never throws — returns null on failure
async function safeTryGemini(modelName, prompt, maxTokens, history, timeoutMs) {
    try {
        const start = Date.now();
        console.log(`⚡ [${modelName}] trying (${timeoutMs}ms)...`);
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens, topP: 0.9 },
        });

        let text;
        if (history && history.length > 0) {
            const geminiHistory = history.slice(-12).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            }));
            const chat = model.startChat({ history: geminiHistory });
            const result = await withTimeout(chat.sendMessage(prompt), timeoutMs);
            text = result.response.text();
        } else {
            const result = await withTimeout(model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            }), timeoutMs);
            text = result.response.text();
        }

        if (text && text.trim().length > 10) {
            console.log(`   ✅ ${modelName} in ${Date.now() - start}ms (${text.length} chars)`);
            return { response: text, provider: modelName };
        }
        throw new Error('Empty response');
    } catch (e) {
        console.log(`   ❌ ${modelName}: ${e.message}`);
        return null;
    }
}

async function safeTryHF(modelId, messages, maxTokens, timeoutMs) {
    try {
        const shortName = modelId.split('/')[1];
        const start = Date.now();
        console.log(`⚡ [HF:${shortName}] trying (${timeoutMs}ms)...`);
        const result = await withTimeout(hf.chatCompletion({
            model: modelId,
            messages,
            max_tokens: maxTokens,
            temperature: 0.5,
            top_p: 0.9,
        }), timeoutMs);

        const text = result.choices?.[0]?.message?.content;
        if (text && text.trim().length > 10) {
            console.log(`   ✅ HF:${shortName} in ${Date.now() - start}ms (${text.length} chars)`);
            return { response: text, provider: `hf/${shortName}` };
        }
        throw new Error('Empty HF response');
    } catch (e) {
        const shortName = modelId.split('/')[1];
        console.log(`   ❌ HF:${shortName}: ${e.message}`);
        return null;
    }
}

// ==================== MAIN GENERATE (simple & reliable) ====================

async function fastGenerate(prompt, maxTokens, history, hfMessages, timeoutMs = 8000) {
    const start = Date.now();
    const promises = [];

    // 1. Gemini Models (Prioritize Flash for speed)
    if (genAI) {
        // Try Flash first, then Pro if configured
        const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
        for (const modelName of models) {
            // Wrap to throw on null so Promise.any catches it as a failure
            promises.push(safeTryGemini(modelName, prompt, maxTokens, history, timeoutMs).then(res => {
                if (!res) throw new Error(`${modelName} failed`);
                return res;
            }));
        }
    }

    // 2. HuggingFace Fallbacks
    if (hf && hfMessages) {
        for (const modelId of HF_MODELS) {
            promises.push(safeTryHF(modelId, hfMessages, maxTokens, timeoutMs).then(res => {
                if (!res) throw new Error(`${modelId} failed`);
                return res;
            }));
        }
    }

    if (promises.length === 0) {
        return { response: 'No AI provider configured.', provider: 'none' };
    }

    try {
        // RACE CONDITION: Promise.any returns the FIRST fulfilled promise (Success)
        // It ignores rejections unless ALL reject.
        const winner = await Promise.any(promises);
        console.log(`🚀 Winner: ${winner.provider} in ${Date.now() - start}ms`);
        return winner;
    } catch (error) {
        console.error(`❌ All ${promises.length} models failed in ${Date.now() - start}ms`);
        // Fallback: Return a polite error, but don't crash
        return {
            response: "I'm experiencing heavy traffic. Please try again in a moment.",
            provider: 'error'
        };
    }
}

// ==================== PUBLIC: Chat with Context ====================

async function generateChatResponse(userMessage, conversationHistory = [], mode = 'chat', level = 'medium') {
    if (!activeProvider) {
        return { response: 'No AI provider configured.', provider: 'none' };
    }

    const maxTokens = TOKEN_LIMITS[mode] || TOKEN_LIMITS.chat;
    const sysPrompt = getChatSystemPrompt(mode, level);
    const fullPrompt = sysPrompt + "\n\n" + userMessage;
    const start = Date.now();

    const hfMessages = [{ role: "system", content: sysPrompt }];
    for (const msg of conversationHistory.slice(-10)) {
        hfMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        });
    }
    hfMessages.push({ role: "user", content: userMessage });

    const result = await fastGenerate(fullPrompt, maxTokens, conversationHistory, hfMessages, 15000);
    console.log(`🏁 Chat total: ${Date.now() - start}ms [${result.provider}]`);
    return result;
}

// ==================== PUBLIC: Structured Content ====================

async function generateContent(mode, topic, level, numQuestions = 5) {
    if (!activeProvider) {
        return getNoProviderMessage();
    }

    const maxTokens = TOKEN_LIMITS[mode] || TOKEN_LIMITS.explain;
    const sysPrompt = getSystemPrompt();
    const userPrompt = getUserPrompt(mode, topic, level, numQuestions);
    const fullPrompt = sysPrompt + "\n\n" + userPrompt;
    const start = Date.now();

    const hfMessages = [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt }
    ];

    // Study modes (quiz/flashcard) generate more content, need more time
    const timeout = (mode === 'flashcard' || mode === 'quiz') ? 25000 : 15000;
    const result = await fastGenerate(fullPrompt, maxTokens, null, hfMessages, timeout);
    console.log(`🏁 ${mode} total: ${Date.now() - start}ms [${result.provider}]`);

    if (result.provider !== 'error' && result.provider !== 'none') {
        return formatResult(result.response, mode, topic, level);
    }
    return result.response;
}

// ==================== PROMPTS ====================

function getChatSystemPrompt(mode, level) {
    const lvl = { simple: 'simple', medium: 'intermediate', complex: 'advanced' }[level] || 'intermediate';
    return `You are a study AI. Level: ${lvl}. Mode: ${mode}. RULES: 1) Remember full conversation, connect follow-ups to prior context. 2) Educational content only. 3) Use markdown (##, **, bullets). 4) Be concise and direct.`;
}

function getSystemPrompt() {
    return `Expert AI study companion. Create accurate, structured educational content. Use markdown headers, bullets, bold terms, emojis. Be concise but thorough.`;
}

function getUserPrompt(mode, topic, level, numQuestions = 5) {
    const lvl = { simple: 'beginner', medium: 'intermediate', complex: 'advanced' }[level] || 'intermediate';

    const prompts = {
        'explain': `Explain "${topic}" at ${lvl} level. Sections: 📌 Definition, 🎯 Core Concepts, ⚙️ How It Works, 🌍 Examples, 💡 Why It Matters. Use ## headers.`,
        'summarize': `Summarize "${topic}" at ${lvl} level. Sections: 🎯 Key Takeaways, 📋 Quick Facts, 🔑 Principles, ⚡ Quick Reference. Brief and scannable.`,
        'quiz': `Generate ${numQuestions} multiple-choice questions about "${topic}" at ${lvl} level. Return a STRICT JSON ARRAY. Format: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}]. options must be a text array. answer must be the letter A, B, C, or D. Do not wrap in markdown code blocks.`,
        'flashcard': `Create 10 flashcards about "${topic}" at ${lvl} level. Return a STRICT JSON ARRAY. Format: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}]. options must be a text array. answer must be the letter A, B, C, or D. Do not wrap in markdown code blocks.`
    };
    return prompts[mode] || `Explain "${topic}" at ${lvl} level with clear structure.`;
}

// ==================== FORMATTING ====================

function formatResult(result, mode, topic, level) {
    // Return raw JSON for quiz/flashcard to avoid breaking the parser
    if (mode === 'quiz' || mode === 'flashcard') return result;

    if (!result.startsWith('#') && !result.startsWith('**')) {
        const emoji = { explain: '📘', summarize: '📝', quiz: '❓', flashcard: '🃏' }[mode] || '📚';
        const badge = { simple: '🟢 BEGINNER', medium: '🟡 INTERMEDIATE', complex: '🔴 ADVANCED' }[level] || level;
        result = `# ${emoji} ${mode.toUpperCase()}: ${topic}\n## Difficulty: ${badge}\n\n---\n\n${result}`;
    }
    return result;
}

function getNoProviderMessage() {
    return `# 🤖 API Key Required\n\nAdd to .env:\n- \`GEMINI_API_KEY=your-key\`\n- \`HUGGINGFACE_API_TOKEN=your-token\`\n\nRestart: \`npm start\``;
}

module.exports = { generateContent, generateChatResponse };