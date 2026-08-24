const WebSocket = require('ws');
const crypto = require('crypto');

function getSecMsGec() {
    // Windows epoch is 1601-01-01T00:00:00Z
    const ticks = BigInt(Date.now() + 11644473600000) * 10000n;
    const roundedTicks = ticks - (ticks % 3000000000n);
    const strToHash = `${roundedTicks}6A5AA1D4EAFF4E9FB37E23D68491D6F4`;
    return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

async function synthesizeEdgeKhmer(text, voice = 'km-KH-PisethNeural') {
    return new Promise((resolve, reject) => {
        const secMsGec = getSecMsGec();
        const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68`;

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

        const reqId = crypto.randomBytes(16).toString('hex');
        const audioChunks = [];

        ws.on('open', () => {
            console.log('Connected to Edge TTS WebSocket!');
            
            // 1. Send speech.config
            const configMsg = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
            ws.send(configMsg);

            // 2. Send SSML request
            const timestamp = new Date().toISOString();
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='km-KH'><voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${text}</prosody></voice></speak>`;
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
                    ws.close();
                    const finalBuffer = Buffer.concat(audioChunks);
                    console.log('Received turn.end! Total audio size:', finalBuffer.length, 'bytes');
                    resolve(finalBuffer);
                }
            }
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
            reject(err);
        });

        ws.on('close', (code, reason) => {
            if (audioChunks.length > 0) {
                resolve(Buffer.concat(audioChunks));
            }
        });
    });
}

async function run() {
    console.log('Testing Khmer Piseth Neural synthesis...');
    const buf = await synthesizeEdgeKhmer('សួស្តីបាទ ខ្ញុំជាសំឡេង ពិសិដ្ឋ នៃប្រព័ន្ធ AI Studio');
    console.log('✅ Synthesis succeeded! Audio Buffer size:', buf.length);
}

run().catch(console.error);
