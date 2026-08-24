async function testCloneVoicesAPI() {
    console.log('Testing GET /api/clone/voices...');
    const res = await fetch('http://127.0.0.1:3000/api/clone/voices');
    const data = await res.json();
    console.log('Cloned voices count:', data.count);

    if (data.voices && data.voices.length > 0) {
        console.log('First voice:', data.voices[0].name, data.voices[0].id);
    }
}

testCloneVoicesAPI();
