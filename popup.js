document.addEventListener('DOMContentLoaded', () => {
    const scrollToggle = document.getElementById('scrollToggle');
    const loopToggle = document.getElementById('loopToggle');

    const isExtension = typeof chrome !== 'undefined' && chrome.storage;

    // Ayarları Yükle
    if (isExtension) {
        chrome.storage.local.get(['autoScrollEnabled', 'loopEnabled'], (result) => {
            if (result.autoScrollEnabled !== undefined) scrollToggle.checked = result.autoScrollEnabled;
            if (result.loopEnabled !== undefined) loopToggle.checked = result.loopEnabled;
        });
    }

    // Ortak mesaj gönderme fonksiyonu
    const updateSettings = () => {
        const settings = {
            autoScrollEnabled: scrollToggle.checked,
            loopEnabled: loopToggle.checked
        };

        if (isExtension) {
            chrome.storage.local.set(settings);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_SETTINGS', settings });
                }
            });
        } else {
            console.log("%c[Test Modu]", "color: #ff0055; font-weight: bold", settings);
        }
    };

    // Kaydırma Değiştiğinde
    scrollToggle.addEventListener('change', () => {
        if (scrollToggle.checked) loopToggle.checked = false; // Çakışmayı önle
        updateSettings();
    });

    // Döngü Değiştiğinde
    loopToggle.addEventListener('change', () => {
        if (loopToggle.checked) scrollToggle.checked = false; // Çakışmayı önle
        updateSettings();
    });
});
