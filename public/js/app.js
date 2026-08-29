/**
 * VoxSync AI Studio - Main Application Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {
    // Cache UI navigation elements
    const tabTtsBtn = document.getElementById('tabTtsBtn');
    const tabTestVoiceBtn = document.getElementById('tabTestVoiceBtn');
    const tabSttBtn = document.getElementById('tabSttBtn');
    const tabCloneBtn = document.getElementById('tabCloneBtn');
    const tabVoiceChangerBtn = document.getElementById('tabVoiceChangerBtn');
    const tabEditorBtn = document.getElementById('tabEditorBtn');
    const tabHistoryBtn = document.getElementById('tabHistoryBtn');

    const tabTts = document.getElementById('tabTts');
    const tabTestVoice = document.getElementById('tabTestVoice');
    const tabStt = document.getElementById('tabStt');
    const tabClone = document.getElementById('tabClone');
    const tabVoiceChanger = document.getElementById('tabVoiceChanger');
    const tabEditor = document.getElementById('tabEditor');
    const tabHistory = document.getElementById('tabHistory');

    const moduleTitle = document.getElementById('moduleTitle');
    const moduleBadge = document.getElementById('moduleBadge');

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const customApiKeyInput = document.getElementById('customApiKeyInput');
    const customAzureKeyInput = document.getElementById('customAzureKeyInput');
    const customAzureRegionInput = document.getElementById('customAzureRegionInput');

    // Load saved API keys
    const savedGemini = localStorage.getItem('voxsync_api_key') || '';
    const savedAzure = localStorage.getItem('voxsync_azure_key') || '';
    const savedRegion = localStorage.getItem('voxsync_azure_region') || 'eastus';
    if (customApiKeyInput) customApiKeyInput.value = savedGemini;
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
            btn: tabTestVoiceBtn,
            section: tabTestVoice,
            title: 'Voice Models Library & Real-time Voice Tester (សាកល្បងម៉ូឌែលសំឡេងទាំងអស់)',
            badge: 'Test Voice'
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
            btn: tabVoiceChangerBtn,
            section: tabVoiceChanger,
            title: 'Speech-to-Speech Voice Changer (រក្សាចង្វាក់ & អារម្មណ៍និយាយដើម)',
            badge: 'Voice Changer'
        },
        {
            btn: tabEditorBtn,
            section: tabEditor,
            title: 'Professional Voice & Audio Editor (ស្ទូឌីយោកាត់ត និងកែច្នៃសំឡេង)',
            badge: 'Voice Editor'
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
    if (tabTestVoiceBtn && tabTestVoice) tabTestVoiceBtn.addEventListener('click', () => switchTab(tabTestVoiceBtn, tabTestVoice));
    if (tabSttBtn && tabStt) tabSttBtn.addEventListener('click', () => switchTab(tabSttBtn, tabStt));
    if (tabCloneBtn && tabClone) tabCloneBtn.addEventListener('click', () => switchTab(tabCloneBtn, tabClone));
    if (tabVoiceChangerBtn && tabVoiceChanger) tabVoiceChangerBtn.addEventListener('click', () => switchTab(tabVoiceChangerBtn, tabVoiceChanger));
    if (tabEditorBtn && tabEditor) tabEditorBtn.addEventListener('click', () => switchTab(tabEditorBtn, tabEditor));
    if (tabHistoryBtn && tabHistory) tabHistoryBtn.addEventListener('click', () => switchTab(tabHistoryBtn, tabHistory));

    // Settings Modal
    const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
        closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

        if (resetDefaultsBtn) {
            resetDefaultsBtn.addEventListener('click', () => {
                if (customApiKeyInput) customApiKeyInput.value = '';
                if (customAzureKeyInput) customAzureKeyInput.value = '';
                if (customAzureRegionInput) customAzureRegionInput.value = 'eastus';

                localStorage.removeItem('voxsync_api_key');
                localStorage.removeItem('voxsync_azure_key');
                localStorage.removeItem('voxsync_azure_region');

                // Reset Language to Khmer in TTS
                const ttsLang = document.getElementById('ttsLangSelect');
                const ttsSpeed = document.getElementById('ttsSpeedRange');
                const ttsSpeedVal = document.getElementById('ttsSpeedVal');
                if (ttsLang) {
                    ttsLang.value = 'km';
                    ttsLang.dispatchEvent(new Event('change'));
                }
                if (ttsSpeed) {
                    ttsSpeed.value = '1.0';
                    if (ttsSpeedVal) ttsSpeedVal.textContent = '1.0x';
                    ttsSpeed.dispatchEvent(new Event('input'));
                }

                // Reset Voice Editor Defaults
                const editorTone = document.getElementById('editorStudioTone');
                const editorDenoise = document.getElementById('editorDenoise');
                const editorLimiter = document.getElementById('editorLimiterEnabled');
                const editorLimiterCeiling = document.getElementById('editorLimiterCeiling');
                const editorVoiceLeveler = document.getElementById('editorVoiceLeveler');

                if (editorTone) editorTone.value = 'audition_vocal';
                if (editorDenoise) editorDenoise.value = 'audition_clean';
                if (editorLimiter) editorLimiter.checked = true;
                if (editorLimiterCeiling) editorLimiterCeiling.value = '-1.0';
                if (editorVoiceLeveler) editorVoiceLeveler.checked = true;

                if (typeof showToast === 'function') {
                    showToast('បានកំណត់ការកំណត់ទាំងអស់ទៅលំនាំដើមរួចរាល់ហើយ! (Reset to Defaults)', 'success');
                }
                settingsModal.classList.add('hidden');
            });
        }

        saveSettingsBtn.addEventListener('click', () => {
            const geminiKey = customApiKeyInput ? customApiKeyInput.value.trim() : '';
            const azureKey = customAzureKeyInput ? customAzureKeyInput.value.trim() : '';
            const azureRegion = customAzureRegionInput ? customAzureRegionInput.value.trim() : 'eastus';

            localStorage.setItem('voxsync_api_key', geminiKey);
            localStorage.setItem('voxsync_azure_key', azureKey);
            localStorage.setItem('voxsync_azure_region', azureRegion);

            if (typeof showToast === 'function') {
                showToast('បានរក្សាទុកការកំណត់ដោយជោគជ័យ (Settings Saved)', 'success');
            }
            settingsModal.classList.add('hidden');
        });
    }

    // Initialize all modules
    if (typeof TTS !== 'undefined') TTS.init();
    if (typeof TestVoice !== 'undefined') TestVoice.init();
    if (typeof STT !== 'undefined') STT.init();
    if (typeof CloneVoice !== 'undefined') CloneVoice.init();
    if (typeof History !== 'undefined') History.init();
});
