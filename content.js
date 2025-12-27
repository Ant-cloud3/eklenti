/**
 * ShortsFlow Pro - Content Script
 */

let settings = {
    autoScrollEnabled: true,
    loopEnabled: false
};

// Ayarları yükle
chrome.storage.local.get(['autoScrollEnabled', 'loopEnabled'], (result) => {
    if (result.autoScrollEnabled !== undefined) settings.autoScrollEnabled = result.autoScrollEnabled;
    if (result.loopEnabled !== undefined) settings.loopEnabled = result.loopEnabled;
    applyLoopToVideos();
});

// Popup'tan gelen ayar değişikliklerini dinle
chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'UPDATE_SETTINGS') {
        settings = request.settings;
        applyLoopToVideos();
        console.log(`[ShortsFlow] Güncel Ayarlar:`, settings);
    }
});

/**
 * Sayfadaki tüm videolara Loop ayarını uygular
 */
function applyLoopToVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.loop = settings.loopEnabled;
    });
}

/**
 * Klavyeden 'ArrowDown' tuşunu simüle eder.
 */
function scrollToNext() {
    if (!settings.autoScrollEnabled) return;

    const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        code: 'ArrowDown',
        keyCode: 40,
        which: 40,
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(event);
}

/**
 * Video bittiğinde tetiklenecek fonksiyon
 */
function handleVideoEnd(event) {
    const video = event.target;
    // Eğer video loop modunda değilse ve kaydırma aktifse kaydır
    if (!video.loop && settings.autoScrollEnabled) {
        console.log("[ShortsFlow] Video bitti, sonrakine geçiliyor...");
        scrollToNext();
    }
}

/**
 * Sayfa yapısını izler
 */
function observeVideos() {
    const observer = new MutationObserver(() => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.dataset.shortsFlowFixed) {
                video.addEventListener('ended', handleVideoEnd);
                video.dataset.shortsFlowFixed = 'true';
                // Yeni yüklenen videoya mevcut loop ayarını uygula
                video.loop = settings.loopEnabled;
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Mevcut videoları başlat
    document.querySelectorAll('video').forEach(video => {
        video.addEventListener('ended', handleVideoEnd);
        video.dataset.shortsFlowFixed = 'true';
        video.loop = settings.loopEnabled;
    });
}

observeVideos();
