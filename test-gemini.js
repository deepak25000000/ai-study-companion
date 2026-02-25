require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    console.log("🔑 Gemini API Key found:", process.env.GEMINI_API_KEY ? "YES" : "NO");

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'paste-your-gemini-api-key-here') {
        console.log("❌ Please add your real Gemini API key to the .env file first!");
        console.log("📋 Get your free key at: https://aistudio.google.com/apikey");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("📤 Sending test request to Gemini...");

    const result = await model.generateContent("Explain photosynthesis in 3 simple sentences.");
    const response = result.response.text();

    console.log("✅ Gemini Response:");
    console.log(response);
    console.log("\n🎉 SUCCESS! Gemini is working. You can now use your AI Study Buddy!");
}

testGemini().catch(err => console.error("❌ Error:", err.message));
