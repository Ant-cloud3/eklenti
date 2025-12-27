/**
 * YouTube Shorts Auto Next - Content Script
 * Video ended eventi ile sonraki videoya geçiş
 */

(function () {
    'use strict';

    // ═══════════════════════════════════════
    // DURUM YÖNETİMİ
    // ═══════════════════════════════════════

    let currentVideo = null;
    let pageObserver = null;
    let isProcessing = false;
    let settings = {
        scrollDelay: 5000,
        autoStart: false
    };

    // ═══════════════════════════════════════
    // KONSOL MESAJLARI
    // ═══════════════════════════════════════

    function log(message, type = 'info') {
        const prefix = '[Shorts Auto Next]';
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warn: '#FF9800',
            error: '#F44336'
        };
        console.log(
            `%c${prefix} ${message}`,
            `color: ${colors[type]}; font-weight: bold;`
        );
    }

    // ═══════════════════════════════════════
    // AYAR YÖNETİMİ
    // ═══════════════════════════════════════

    function loadSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['scrollDelay', 'autoStart'], (result) => {
                if (result.scrollDelay) {
                    settings.scrollDelay = result.scrollDelay;
                }
                if (result.autoStart !== undefined) {
                    settings.autoStart = result.autoStart;
                }
                log('Ayarlar yüklendi: ' + settings.scrollDelay + 'ms', 'info');
            });
        }
    }

    // Popup'tan ayar güncellemesi
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateSettings') {
                Object.assign(settings, request.settings);
                log('Ayarlar güncellendi', 'success');
                sendResponse({ status: 'ok' });
            } else if (request.action === 'getStatus') {
                sendResponse({
                    status: currentVideo ? 'active' : 'inactive',
                    settings: settings
                });
            }
            return true;
        });
    }

    // ═══════════════════════════════════════
    // VİDEO İŞLEMLERİ
    // ═══════════════════════════════════════

    function goToNextVideo() {
        try {
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                which: 40,
                bubbles: true,
                cancelable: true,
                view: window
            });

            document.dispatchEvent(keyEvent);
            log('↓ Sonraki videoya geçildi', 'success');

            // İstatistik kaydet
            recordVideoWatch();

        } catch (error) {
            log('Geçiş hatası: ' + error.message, 'error');
        }
    }

    function onVideoEnded(event) {
        const video = event.target;

        if (video.loop) {
            log('Video döngüde, geçiş yapılmadı', 'warn');
            return;
        }

        if (isProcessing) return;

        isProcessing = true;

        log('Video bitti, sonrakine geçiliyor...', 'info');

        setTimeout(function () {
            goToNextVideo();
            isProcessing = false;
        }, 300);
    }

    function attachVideoListener(video) {
        if (video.dataset.shortsAutoNextAttached === 'true') return;

        video.addEventListener('ended', onVideoEnded);
        video.dataset.shortsAutoNextAttached = 'true';

        log('Video izlemeye alındı', 'success');
    }

    function detachVideoListener(video) {
        if (video && video.dataset.shortsAutoNextAttached === 'true') {
            video.removeEventListener('ended', onVideoEnded);
            video.dataset.shortsAutoNextAttached = 'false';
        }
    }

    // ═══════════════════════════════════════
    // İSTATİSTİK
    // ═══════════════════════════════════════

    async function recordVideoWatch() {
        if (typeof chrome === 'undefined' || !chrome.storage) return;

        // Token var mı?
        chrome.storage.local.get(['authToken'], async (result) => {
            if (!result.authToken) return;

            try {
                const response = await fetch('http://localhost:3000/api/stats/video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.authToken}`
                    },
                    body: JSON.stringify({ watchTimeSeconds: 30 })
                });

                if (response.ok) {
                    log('İzleme kaydedildi', 'info');
                }
            } catch (error) {
                // Sessizce devam et
            }
        });
    }

    // ═══════════════════════════════════════
    // VİDEO TESPİTİ
    // ═══════════════════════════════════════

    function findActiveVideo() {
        const shortsContainer = document.querySelector('ytd-shorts');

        if (shortsContainer) {
            const video = shortsContainer.querySelector('video');
            return video;
        }

        const videos = document.querySelectorAll('video');

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            if (video.offsetParent !== null && video.readyState >= 2) {
                return video;
            }
        }

        return null;
    }

    function updateVideoTracking() {
        const video = findActiveVideo();

        if (video && video !== currentVideo) {
            detachVideoListener(currentVideo);
            currentVideo = video;
            attachVideoListener(currentVideo);
        }
    }

    // ═══════════════════════════════════════
    // SAYFA İZLEME
    // ═══════════════════════════════════════

    function setupPageObserver() {
        if (pageObserver) {
            pageObserver.disconnect();
        }

        pageObserver = new MutationObserver(function (mutations) {
            setTimeout(updateVideoTracking, 100);
        });

        pageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        log('Sayfa izlemesi başlatıldı', 'info');
    }

    // URL izleme
    let lastUrl = location.href;

    function checkUrlChange() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;

            if (!location.href.includes('/shorts/')) {
                log('Shorts sayfasından çıkıldı', 'warn');
                cleanup();
            } else {
                setTimeout(updateVideoTracking, 500);
            }
        }
    }

    setInterval(checkUrlChange, 1000);

    // ═══════════════════════════════════════
    // BAŞLATMA ve TEMİZLİK
    // ═══════════════════════════════════════

    function cleanup() {
        detachVideoListener(currentVideo);
        currentVideo = null;

        if (pageObserver) {
            pageObserver.disconnect();
            pageObserver = null;
        }
    }

    function initialize() {
        log('═══════════════════════════════════════', 'info');
        log('   YouTube Shorts Auto Next Aktif!     ', 'success');
        log('═══════════════════════════════════════', 'info');

        loadSettings();
        setupPageObserver();
        setTimeout(updateVideoTracking, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    window.addEventListener('beforeunload', cleanup);

})();
