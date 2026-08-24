const { GoogleGenAI } = require('@google/genai');
const config = require('../src/config/config');
const fs = require('fs');

async function testGeminiTTS() {
    if (!config.geminiApiKey) {
        console.log('No GEMINI_API_KEY set.');
        return;
    }

    try {
        console.log('Testing Gemini 2.0 Flash Audio output for Khmer...');
        const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'សូមអានអត្ថបទនេះជាសំឡេងនិយាយបែបធម្មជាតិ៖ "សួស្តីបងប្អូនទាំងអស់គ្នា សូមស្វាគមន៍មកកាន់ VoxSync AI"',
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Puck' // Or Aoede, Charon, Fenrir, Kore, Puck
                        }
                    }
                }
            }
        });

        console.log('Candidates count:', response.candidates?.length);
        const parts = response.candidates?.[0]?.content?.parts;
        console.log('Parts count:', parts?.length);

        if (parts) {
            for (let part of parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                    console.log('✅ Found audio part! MIME:', part.inlineData.mimeType, 'Data length:', part.inlineData.data?.length);
                    const buf = Buffer.from(part.inlineData.data, 'base64');
                    fs.writeFileSync('storage/outputs/gemini-tts-test.wav', buf);
                    console.log('Saved test audio to storage/outputs/gemini-tts-test.wav (size:', buf.length, 'bytes)');
                    return;
                }
            }
        }
    } catch (e) {
        console.error('Gemini TTS error:', e.message);
    }
}

testGeminiTTS();
