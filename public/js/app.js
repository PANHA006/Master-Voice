/**
 * VoxSync AI Studio - Main Application Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
    // Cache UI navigation elements
    const tabTtsBtn = document.getElementById('tabTtsBtn');
    const tabSttBtn = document.getElementById('tabSttBtn');
    const tabCloneBtn = document.getElementById('tabCloneBtn');
    const tabHistoryBtn = document.getElementById('tabHistoryBtn');

    const tabTts = document.getElementById('tabTts');
    const tabStt = document.getElementById('tabStt');
    const tabClone = document.getElementById('tabClone');
    const tabHistory = document.getElementById('tabHistory');

    const moduleTitle = document.getElementById('moduleTitle');
    const moduleBadge = document.getElementById('moduleBadge');

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const customApiKeyInput = document.getElementById('customApiKeyInput');
    const customElevenKeyInput = document.getElementById('customElevenKeyInput');
    const customAzureKeyInput = document.getElementById('customAzureKeyInput');
    const customAzureRegionInput = document.getElementById('customAzureRegionInput');

    // Load saved API keys
    const savedGemini = localStorage.getItem('voxsync_api_key') || '';
    const savedEleven = localStorage.getItem('voxsync_eleven_key') || '';
    const savedAzure = localStorage.getItem('voxsync_azure_key') || '';
    const savedRegion = localStorage.getItem('voxsync_azure_region') || 'eastus';
    if (customApiKeyInput) customApiKeyInput.value = savedGemini;
    if (customElevenKeyInput) customElevenKeyInput.value = savedEleven;
    if (customAzureKeyInput) customAzureKeyInput.value = savedAzure;
    if (customAzureRegionInput) customAzureRegionInput.value = savedRegion;

    const navMeta = [
        {
            btn: tabTtsBtn,
            section: tabTts,
            title: 'Text-to-Speech & Timestamp Synchronizer',
            badge: 'TTS Studio'
        },
        {
            btn: tabSttBtn,
            section: tabStt,
            title: 'Voice-to-Text & Speech Transcription (Gemini AI)',
            badge: 'STT Studio'
        },
        {
            btn: tabCloneBtn,
            section: tabClone,
            title: 'AI Voice Cloning & Custom Speech Generation',
            badge: 'Voice Clone'
        },
        {
            btn: tabHistoryBtn,
            section: tabHistory,
            title: 'Audio File History & Storage Manager',
            badge: 'Audio History'
        }
    ];

    function switchTab(activeBtn, activeSection) {
        navMeta.forEach(item => {
            if (item.btn && item.section) {
                if (item.btn === activeBtn) {
                    item.btn.classList.add('nav-item-active');
                    item.btn.classList.remove('nav-item-inactive');
                    item.section.classList.remove('hidden');
                    if (moduleTitle) moduleTitle.textContent = item.title;
                    if (moduleBadge) moduleBadge.textContent = item.badge;
                    if (item.btn === tabHistoryBtn && typeof History !== 'undefined') {
                        History.loadHistory();
                    }
                } else {
                    item.btn.classList.remove('nav-item-active');
                    item.btn.classList.add('nav-item-inactive');
                    item.section.classList.add('hidden');
                }
            }
        });
    }

    if (tabTtsBtn && tabTts) tabTtsBtn.addEventListener('click', () => switchTab(tabTtsBtn, tabTts));
    if (tabSttBtn && tabStt) tabSttBtn.addEventListener('click', () => switchTab(tabSttBtn, tabStt));
    if (tabCloneBtn && tabClone) tabCloneBtn.addEventListener('click', () => switchTab(tabCloneBtn, tabClone));
    if (tabHistoryBtn && tabHistory) tabHistoryBtn.addEventListener('click', () => switchTab(tabHistoryBtn, tabHistory));

    // Settings Modal
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
        closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
        saveSettingsBtn.addEventListener('click', () => {
            const geminiKey = customApiKeyInput ? customApiKeyInput.value.trim() : '';
            const elevenKey = customElevenKeyInput ? customElevenKeyInput.value.trim() : '';
            const azureKey = customAzureKeyInput ? customAzureKeyInput.value.trim() : '';
            const azureRegion = customAzureRegionInput ? customAzureRegionInput.value.trim() : 'eastus';

            localStorage.setItem('voxsync_api_key', geminiKey);
            localStorage.setItem('voxsync_eleven_key', elevenKey);
            localStorage.setItem('voxsync_azure_key', azureKey);
            localStorage.setItem('voxsync_azure_region', azureRegion);

            if (typeof showToast === 'function') {
                showToast('Settings saved successfully', 'success');
            }
            settingsModal.classList.add('hidden');
        });
    }

    // Initialize all modules
    if (typeof TTS !== 'undefined') TTS.init();
    if (typeof STT !== 'undefined') STT.init();
    if (typeof CloneVoice !== 'undefined') CloneVoice.init();
    if (typeof History !== 'undefined') History.init();
});
