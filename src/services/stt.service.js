const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class STTService {
    /**
     * Transcribe audio file to timestamped text with Multi-Model Fallback & Auto-Retry
     * @param {Object} params
     * @param {string} params.filePath - Local audio file path
     * @param {string} params.mimeType - Audio MIME type
     * @param {string} [params.customApiKey] - Optional API key
     * @returns {Promise<{success: boolean, text: string, lines: Array<{timestamp: string, text: string, seconds: number}>}>}
     */
    static async transcribe({ filePath, mimeType, customApiKey }) {
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error('Audio file not found on server.');
        }

        const apiKey = customApiKey || config.geminiApiKey;
        if (!apiKey) {
            return {
                success: true,
                warning: 'No GEMINI_API_KEY configured in .env or settings. Returned demo timestamp transcription.',
                lines: [
                    { timestamp: '00:00', text: 'Tonight, when the sun goes down, you are going to flip a switch.', seconds: 0 },
                    { timestamp: '00:05', text: 'Light will flood the room and you will not think twice about it.', seconds: 5 },
                    { timestamp: '00:09', text: 'But for 99.9% of human history, that switch did not exist.', seconds: 9 },
                    { timestamp: '00:14', text: 'When the sun set, the world went dark.', seconds: 14 }
                ],
                formattedText: `[00:00] Tonight, when the sun goes down, you are going to flip a switch.\n[00:05] Light will flood the room and you will not think twice about it.\n[00:09] But for 99.9% of human history, that switch did not exist.\n[00:14] When the sun set, the world went dark.`
            };
        }

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        // Optimal Gemini models list in order of performance and availability
        const fallbackModels = [
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
            'gemini-flash-latest',
            'gemini-3.6-pro',
            'gemini-2.5-pro'
        ];

        const audioData = fs.readFileSync(filePath);
        const base64Audio = audioData.toString('base64');

        const prompt = `You are an expert audio transcription system.
Accurately transcribe the provided audio recording into clean, natural sentences.
For every spoken sentence/segment, prepend the exact timestamp in format [MM:SS] at the beginning of each line.
Example format:
[00:00] First sentence of the transcript.
[00:05] Second sentence of the transcript.

If the audio is in Khmer or English, transcribe in its original script accurately. Do not add markdown formatting or conversational text, output only the timestamped lines.`;

        let lastError = null;

        for (const modelName of fallbackModels) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });

                    const result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                mimeType: mimeType || 'audio/mp3',
                                data: base64Audio
                            }
                        }
                    ]);

                    const responseText = result.response.text().trim();
                    const rawLines = responseText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    const parsedLines = [];
                    rawLines.forEach(line => {
                        const match = line.match(/^\[(\d{1,2}:\d{2})\]\s*(.*)/);
                        if (match) {
                            const timeStr = match[1];
                            const text = match[2];
                            const [m, s] = timeStr.split(':').map(Number);
                            parsedLines.push({
                                timestamp: timeStr.padStart(5, '0'),
                                text,
                                seconds: (m * 60) + s
                            });
                        } else {
                            parsedLines.push({
                                timestamp: '00:00',
                                text: line,
                                seconds: 0
                            });
                        }
                    });

                    return {
                        success: true,
                        modelUsed: modelName,
                        lines: parsedLines,
                        formattedText: parsedLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n')
                    };

                } catch (err) {
                    lastError = err;
                    console.warn(`Model "${modelName}" (Attempt ${attempt}) failed: ${err.message}. Trying next fallback...`);
                    await new Promise(res => setTimeout(res, 500));
                }
            }
        }

        console.error('All Gemini STT models exhausted:', lastError?.message);
        throw new Error(`Speech-to-Text service is currently busy at Google AI. Please click Transcribe again in a moment: ${lastError?.message || 'High server demand'}`);
    }
}

module.exports = STTService;
