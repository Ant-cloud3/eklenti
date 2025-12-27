/**
 * YouTube Shorts Auto Scroll - Content Script
 * Firefox ve Chrome uyumlu
 * 
 * Özellikler:
 * - Video bittiğinde otomatik geçiş
 * - Zamanlayıcı ile otomatik kaydırma
 * - Popup'tan kontrol
 */

(function () {
    'use strict';

    // ═══════════════════════════════════════
    // DURUM YÖNETİMİ
    // ═══════════════════════════════════════

    let currentVideo = null;
    let pageObserver = null;
    let isProcessing = false;

    // Otomatik kaydırma durumu
    let autoScrollState = {
        enabled: false,
        timerId: null,
        scrollDelay: 5000  // Varsayılan 5 saniye
    };

    // ═══════════════════════════════════════
    // KONSOL MESAJLARI
    // ═══════════════════════════════════════

    function log(message, type = 'info') {
        const prefix = '[Shorts Auto Scroll]';
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
            chrome.storage.local.get(['scrollDelay', 'autoScrollEnabled'], (result) => {
                if (result.scrollDelay) {
                    autoScrollState.scrollDelay = result.scrollDelay;
                }
                if (result.autoScrollEnabled) {
                    startAutoScroll();
                }
                log('Ayarlar yüklendi: ' + autoScrollState.scrollDelay + 'ms', 'info');
            });
        }
    }

    function saveSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({
                scrollDelay: autoScrollState.scrollDelay,
                autoScrollEnabled: autoScrollState.enabled
            });
        }
    }

    // ═══════════════════════════════════════
    // OTOMATİK KAYDIRMA
    // ═══════════════════════════════════════

    /**
     * Sonraki videoya geç
     */
    function goToNextVideo() {
        try {
            // Yöntem 1: Klavye eventi
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

            // Yöntem 2: Aktif elemente de gönder
            if (document.activeElement) {
                document.activeElement.dispatchEvent(keyEvent);
            }

            // Yöntem 3: Scroll
            const container = document.querySelector('ytd-shorts');
            if (container) {
                window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
            }

            log('↓ Sonraki videoya geçildi', 'success');

            // İstatistik kaydet
            recordVideoWatch();

        } catch (error) {
            log('Geçiş hatası: ' + error.message, 'error');
        }
    }

    /**
     * Otomatik kaydırmayı başlat
     */
    function startAutoScroll() {
        if (autoScrollState.enabled) {
            log('Zaten aktif', 'warn');
            return;
        }

        autoScrollState.enabled = true;
        saveSettings();

        log('🚀 Otomatik kaydırma BAŞLADI (' + (autoScrollState.scrollDelay / 1000) + 's)', 'success');

        scheduleNextScroll();
        updateControlPanel();
    }

    /**
     * Otomatik kaydırmayı durdur
     */
    function stopAutoScroll() {
        if (!autoScrollState.enabled) {
            log('Zaten durdurulmuş', 'warn');
            return;
        }

        autoScrollState.enabled = false;
        saveSettings();

        if (autoScrollState.timerId) {
            clearTimeout(autoScrollState.timerId);
            autoScrollState.timerId = null;
        }

        log('🛑 Otomatik kaydırma DURDU', 'success');
        updateControlPanel();
    }

    /**
     * Sonraki kaydırmayı zamanla
     */
    function scheduleNextScroll() {
        if (!autoScrollState.enabled) return;

        autoScrollState.timerId = setTimeout(() => {
            if (autoScrollState.enabled) {
                goToNextVideo();
                scheduleNextScroll();
            }
        }, autoScrollState.scrollDelay);
    }

    // ═══════════════════════════════════════
    // KONTROL PANELİ
    // ═══════════════════════════════════════

    let controlPanel = null;

    function createControlPanel() {
        if (controlPanel) return;

        controlPanel = document.createElement('div');
        controlPanel.id = 'shorts-autoscroll-panel';
        controlPanel.innerHTML = `
            <style>
                #shorts-autoscroll-panel {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    z-index: 999999;
                    background: linear-gradient(145deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.98));
                    border-radius: 16px;
                    padding: 16px;
                    min-width: 200px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    backdrop-filter: blur(20px);
                }
                .panel-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 12px;
                    cursor: move;
                }
                .panel-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #fff;
                }
                .panel-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #ff0050, #ff4d4d);
                    color: white;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .panel-toggle.active {
                    background: linear-gradient(135deg, #00c853, #00e676);
                }
                .panel-toggle:hover {
                    transform: translateY(-2px);
                }
                .panel-slider {
                    margin-top: 12px;
                }
                .panel-slider label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 8px;
                }
                .panel-slider input {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    background: rgba(255, 255, 255, 0.1);
                    outline: none;
                    -webkit-appearance: none;
                }
                .panel-slider input::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #ff0050, #ff4d4d);
                    cursor: pointer;
                }
                .panel-slider input::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #ff0050, #ff4d4d);
                    cursor: pointer;
                    border: none;
                }
                .panel-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .status-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #666;
                }
                .status-dot.active {
                    background: #00e676;
                    box-shadow: 0 0 10px rgba(0, 230, 118, 0.6);
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 10px rgba(0, 230, 118, 0.6); }
                    50% { box-shadow: 0 0 20px rgba(0, 230, 118, 0.8); }
                }
                .status-text {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.7);
                }
            </style>
            <div class="panel-header">
                <span>🎬</span>
                <span class="panel-title">Auto Scroll</span>
            </div>
            <button class="panel-toggle" id="toggleAutoScroll">
                <span class="toggle-icon">▶️</span>
                <span class="toggle-text">Başlat</span>
            </button>
            <div class="panel-slider">
                <label>
                    <span>Süre:</span>
                    <span id="delayValue">${autoScrollState.scrollDelay / 1000}s</span>
                </label>
                <input type="range" id="delaySlider" min="2" max="30" value="${autoScrollState.scrollDelay / 1000}">
            </div>
            <div class="panel-status">
                <span class="status-dot" id="statusDot"></span>
                <span class="status-text" id="statusText">Kapalı</span>
            </div>
        `;

        document.body.appendChild(controlPanel);

        // Event listeners
        const toggleBtn = document.getElementById('toggleAutoScroll');
        const slider = document.getElementById('delaySlider');
        const delayValue = document.getElementById('delayValue');

        toggleBtn.addEventListener('click', () => {
            if (autoScrollState.enabled) {
                stopAutoScroll();
            } else {
                startAutoScroll();
            }
        });

        slider.addEventListener('input', (e) => {
            autoScrollState.scrollDelay = parseInt(e.target.value) * 1000;
            delayValue.textContent = e.target.value + 's';
            saveSettings();

            // Aktifse yeniden başlat
            if (autoScrollState.enabled) {
                if (autoScrollState.timerId) {
                    clearTimeout(autoScrollState.timerId);
                }
                scheduleNextScroll();
            }
        });

        // Sürüklenebilir yap
        makeDraggable(controlPanel);
    }

    function updateControlPanel() {
        const toggleBtn = document.getElementById('toggleAutoScroll');
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (!toggleBtn) return;

        if (autoScrollState.enabled) {
            toggleBtn.innerHTML = '<span class="toggle-icon">⏸️</span><span class="toggle-text">Durdur</span>';
            toggleBtn.classList.add('active');
            statusDot.classList.add('active');
            statusText.textContent = 'Aktif';
        } else {
            toggleBtn.innerHTML = '<span class="toggle-icon">▶️</span><span class="toggle-text">Başlat</span>';
            toggleBtn.classList.remove('active');
            statusDot.classList.remove('active');
            statusText.textContent = 'Kapalı';
        }
    }

    function makeDraggable(element) {
        const header = element.querySelector('.panel-header');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.style.left = (e.clientX - offsetX) + 'px';
            element.style.top = (e.clientY - offsetY) + 'px';
            element.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // ═══════════════════════════════════════
    // VİDEO BİTİŞİ İZLEME
    // ═══════════════════════════════════════

    function onVideoEnded(event) {
        const video = event.target;
        if (video.loop) return;
        if (isProcessing) return;

        isProcessing = true;
        log('Video bitti', 'info');

        setTimeout(() => {
            goToNextVideo();
            isProcessing = false;
        }, 300);
    }

    function attachVideoListener(video) {
        if (video.dataset.autoScrollAttached === 'true') return;
        video.addEventListener('ended', onVideoEnded);
        video.dataset.autoScrollAttached = 'true';
        log('Video izlemeye alındı', 'success');
    }

    function detachVideoListener(video) {
        if (video && video.dataset.autoScrollAttached === 'true') {
            video.removeEventListener('ended', onVideoEnded);
            video.dataset.autoScrollAttached = 'false';
        }
    }

    // ═══════════════════════════════════════
    // İSTATİSTİK
    // ═══════════════════════════════════════

    function recordVideoWatch() {
        if (typeof chrome === 'undefined' || !chrome.storage) return;

        chrome.storage.local.get(['authToken'], async (result) => {
            if (!result.authToken) return;

            try {
                await fetch('http://localhost:3000/api/stats/video', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${result.authToken}`
                    },
                    body: JSON.stringify({ watchTimeSeconds: 30 })
                });
            } catch (error) {
                // Sessizce devam et
            }
        });
    }

    // ═══════════════════════════════════════
    // SAYFA İZLEME
    // ═══════════════════════════════════════

    function findActiveVideo() {
        const container = document.querySelector('ytd-shorts');
        if (container) {
            return container.querySelector('video');
        }
        const videos = document.querySelectorAll('video');
        for (let v of videos) {
            if (v.offsetParent !== null) return v;
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

    function setupPageObserver() {
        if (pageObserver) pageObserver.disconnect();

        pageObserver = new MutationObserver(() => {
            setTimeout(updateVideoTracking, 100);
        });

        pageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // URL değişikliklerini izle
    let lastUrl = location.href;
    function checkUrl() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            if (!location.href.includes('/shorts')) {
                stopAutoScroll();
                if (controlPanel) {
                    controlPanel.remove();
                    controlPanel = null;
                }
            } else {
                if (!controlPanel) createControlPanel();
            }
        }
    }
    setInterval(checkUrl, 1000);

    // ═══════════════════════════════════════
    // MESAJ DİNLEME
    // ═══════════════════════════════════════

    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleAutoScroll') {
                if (autoScrollState.enabled) {
                    stopAutoScroll();
                } else {
                    startAutoScroll();
                }
                sendResponse({ enabled: autoScrollState.enabled });
            } else if (request.action === 'getStatus') {
                sendResponse({
                    enabled: autoScrollState.enabled,
                    scrollDelay: autoScrollState.scrollDelay
                });
            } else if (request.action === 'updateSettings') {
                if (request.settings.scrollDelay) {
                    autoScrollState.scrollDelay = request.settings.scrollDelay;
                }
                sendResponse({ status: 'ok' });
            }
            return true;
        });
    }

    // ═══════════════════════════════════════
    // BAŞLATMA
    // ═══════════════════════════════════════

    function init() {
        log('═══════════════════════════════════════', 'info');
        log('   YouTube Shorts Auto Scroll Aktif!   ', 'success');
        log('═══════════════════════════════════════', 'info');

        loadSettings();
        setupPageObserver();
        setTimeout(updateVideoTracking, 1000);

        if (location.href.includes('/shorts')) {
            createControlPanel();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
