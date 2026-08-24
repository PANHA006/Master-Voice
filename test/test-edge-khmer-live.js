const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;

function generateSecMsGecToken() {
    const ticks = BigInt(Math.floor((Date.now() / 1000) + Number(WINDOWS_FILE_TIME_EPOCH))) * 10000000n;
    const roundedTicks = ticks - (ticks % 3000000000n);
    const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`;
    const hash = crypto.createHash('sha256');
    hash.update(strToHash, 'ascii');
    return hash.digest('hex').toUpperCase();
}

function synthesizeEdgeNeural(text, voice = 'km-KH-PisethNeural', rate = 1.0) {
    return new Promise((resolve, reject) => {
        const token = generateSecMsGecToken();
        const connId = crypto.randomUUID().replace(/-/g, '');
        const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${connId}`;

        const ws = new WebSocket(url, {
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
                'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        const reqId = crypto.randomUUID().replace(/-/g, '');
        const audioChunks = [];
        let completed = false;

        const timer = setTimeout(() => {
            if (!completed) {
                ws.close();
                if (audioChunks.length > 0) {
                    resolve(Buffer.concat(audioChunks));
                } else {
                    reject(new Error('Edge TTS Timeout'));
                }
            }
        }, 15000);

        ws.on('open', () => {
            // 1. Send speech.config
            const configMsg = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
            ws.send(configMsg);

            // 2. Format rate
            const ratePercent = Math.round((rate - 1.0) * 100);
            const rateStr = (ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`);

            // 3. Send SSML
            const timestamp = new Date().toISOString();
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='km-KH'><voice name='${voice}'><prosody pitch='+0Hz' rate='${rateStr}' volume='+0%'>${text}</prosody></voice></speak>`;
            const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`;
            ws.send(ssmlMsg);
        });

        ws.on('message', (data, isBinary) => {
            if (isBinary) {
                const buffer = Buffer.from(data);
                const headerEnd = buffer.indexOf('\r\n\r\n');
                if (headerEnd !== -1) {
                    const header = buffer.slice(0, headerEnd).toString('utf-8');
                    if (header.includes('Path:audio')) {
                        const audioData = buffer.slice(headerEnd + 4);
                        if (audioData.length > 0) {
                            audioChunks.push(audioData);
                        }
                    }
                }
            } else {
                const textMsg = data.toString('utf-8');
                if (textMsg.includes('Path:turn.end')) {
                    completed = true;
                    clearTimeout(timer);
                    ws.close();
                    const finalBuffer = Buffer.concat(audioChunks);
                    resolve(finalBuffer);
                }
            }
        });

        ws.on('error', (err) => {
            if (!completed) {
                clearTimeout(timer);
                reject(err);
            }
        });

        ws.on('close', () => {
            if (!completed && audioChunks.length > 0) {
                completed = true;
                clearTimeout(timer);
                resolve(Buffer.concat(audioChunks));
            }
        });
    });
}

async function testBoth() {
    console.log('Testing Piseth Neural (Male)...');
    const bufMale = await synthesizeEdgeNeural('សូមស្វាគមន៍ ខ្ញុំជាសំឡេង ពិសិដ្ឋ Neural', 'km-KH-PisethNeural');
    console.log('✅ Piseth Neural Success! Size:', bufMale.length, 'bytes');
    fs.writeFileSync('storage/outputs/test-piseth.mp3', bufMale);

    console.log('Testing Sreymom Neural (Female)...');
    const bufFemale = await synthesizeEdgeNeural('សូមស្វាគមន៍ ខ្ញុំជាសំឡេង ស្រីមុំ Neural ស្រទន់ពីរោះ', 'km-KH-SreymomNeural');
    console.log('✅ Sreymom Neural Success! Size:', bufFemale.length, 'bytes');
    fs.writeFileSync('storage/outputs/test-sreymom.mp3', bufFemale);
}

testBoth().catch(console.error);
