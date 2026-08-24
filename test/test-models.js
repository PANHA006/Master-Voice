const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../src/config/config');

async function testGemini() {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const models = ['gemini-3.6-flash', 'gemini-3.6-flash-latest', 'gemini-3.6-pro', 'gemini-2.5-flash'];
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const res = await model.generateContent('Hello');
            console.log(`✅ Success with model: "${m}" -> Response:`, res.response.text().trim());
            return;
        } catch (e) {
            console.log(`❌ Model "${m}": ${e.message}`);
        }
    }
}

testGemini();
