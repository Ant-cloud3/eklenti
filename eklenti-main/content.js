/**
 * ShortsFlow Pro - Content Script
 */

let settings = {
    autoScrollEnabled: true,
    loopEnabled: false
};

// Sayfanın Shorts olup olmadığını kontrol et
function isShortsPage() {
    return window.location.pathname.startsWith('/shorts/');
}

// Ayarları yükle
function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['autoScrollEnabled', 'loopEnabled'], (result) => {
            if (result.autoScrollEnabled !== undefined) settings.autoScrollEnabled = result.autoScrollEnabled;
            if (result.loopEnabled !== undefined) settings.loopEnabled = result.loopEnabled;
            applySettingsToCurrentVideo();
        });
    }
}

// Popup'tan gelen ayar değişikliklerini dinle
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'UPDATE_SETTINGS') {
            settings = request.settings;
            applySettingsToCurrentVideo();
            console.log(`[ShortsFlow] Güncel Ayarlar:`, settings);
        }
    });
}

function applySettingsToCurrentVideo() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        video.loop = settings.loopEnabled;
    });
}

/**
 * Sıradaki videoya geçiş yapar.
 */
function scrollToNext() {
    if (!settings.autoScrollEnabled) return;

    console.log("[ShortsFlow] Sonraki videoya geçiliyor...");

    // YouTube Shorts'un kendi "Aşağı" butonu - En kesin çözüm
    const nextButton = document.querySelector('#navigation-button-down button') ||
        document.querySelector('button[aria-label="Sonraki video"]') ||
        document.querySelector('button[aria-label="Sıradaki video"]');

    if (nextButton) {
        nextButton.click();
    } else {
        // Buton bulunamazsa klavye tuşu simüle et
        const eventParams = { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40, bubbles: true };
        window.dispatchEvent(new KeyboardEvent('keydown', eventParams));
        document.dispatchEvent(new KeyboardEvent('keydown', eventParams));
    }
}

/**
 * Video bittiğinde veya bitmeye yakın olduğunda kontrol et
 */
function checkVideoStatus() {
    if (!isShortsPage() || !settings.autoScrollEnabled || settings.loopEnabled) return;

    // Aktif videoyu bul
    const activeVideo = document.querySelector('ytd-reel-video-renderer[is-active] video') ||
        document.querySelector('video');

    if (activeVideo && !activeVideo.paused) {
        // YouTube videoyu bitirmeden hemen önce loop'a sokabilir. 
        // Bitişine 0.3 saniye kala veya bittiğinde kontrol ediyoruz.
        if (activeVideo.currentTime > 0 && activeVideo.currentTime >= activeVideo.duration - 0.3) {
            if (!activeVideo.dataset.transitioning) {
                activeVideo.dataset.transitioning = 'true';
                console.log("[ShortsFlow] Bitiş algılandı, kaydırılıyor...");
                scrollToNext();
                // Kısa bir süre sonra bayrağı temizle ki bir sonraki videoda çalışabilsin
                setTimeout(() => {
                    if (activeVideo) activeVideo.dataset.transitioning = '';
                }, 2000);
            }
        }
    }
}

// Video bitti mi diye kontrol eden döngü (ended event'ine alternatif)
setInterval(checkVideoStatus, 400);

/**
 * Sayfa yapısını ve videoları izle
 */
function init() {
    loadSettings();

    // MutationObserver ile yeni yüklenen videoları yakala
    const observer = new MutationObserver(() => {
        if (!isShortsPage()) return;

        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.dataset.shortsFlowFixed) {
                video.dataset.shortsFlowFixed = 'true';

                // YouTube'un loop ayarını ezmesini engelle
                video.addEventListener('play', () => {
                    video.loop = settings.loopEnabled;
                });

                // Standart bitiş olayını da dinle
                video.addEventListener('ended', () => {
                    if (settings.autoScrollEnabled && !settings.loopEnabled) {
                        scrollToNext();
                    }
                });

                // Başlangıçta loop'u ayarla
                video.loop = settings.loopEnabled;
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Başlat
init();
console.log("[ShortsFlow] Eklenti aktif.");
