/**
 * Popup Script
 * UI kontrolü ve API iletişimi
 */

// ═══════════════════════════════════════
// DOM ELEMENTS
// ═══════════════════════════════════════

const elements = {
    // Views
    loginView: document.getElementById('loginView'),
    registerView: document.getElementById('registerView'),
    dashboardView: document.getElementById('dashboardView'),
    offlineView: document.getElementById('offlineView'),

    // Login Form
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    loginError: document.getElementById('loginError'),
    showRegister: document.getElementById('showRegister'),
    continueWithoutLogin: document.getElementById('continueWithoutLogin'),

    // Register Form
    registerForm: document.getElementById('registerForm'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    registerError: document.getElementById('registerError'),
    showLogin: document.getElementById('showLogin'),

    // Dashboard
    userEmail: document.getElementById('userEmail'),
    logoutBtn: document.getElementById('logoutBtn'),
    totalVideos: document.getElementById('totalVideos'),
    totalTime: document.getElementById('totalTime'),
    todayVideos: document.getElementById('todayVideos'),
    scrollDelay: document.getElementById('scrollDelay'),
    scrollDelayValue: document.getElementById('scrollDelayValue'),
    autoStart: document.getElementById('autoStart'),
    saveSettings: document.getElementById('saveSettings'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),

    // Offline
    offlineScrollDelay: document.getElementById('offlineScrollDelay'),
    offlineScrollDelayValue: document.getElementById('offlineScrollDelayValue'),
    goToLogin: document.getElementById('goToLogin')
};

// ═══════════════════════════════════════
// VIEW MANAGEMENT
// ═══════════════════════════════════════

function showView(viewName) {
    // Tüm view'ları gizle
    elements.loginView.classList.add('hidden');
    elements.registerView.classList.add('hidden');
    elements.dashboardView.classList.add('hidden');
    elements.offlineView.classList.add('hidden');

    // İstenen view'ı göster
    switch (viewName) {
        case 'login':
            elements.loginView.classList.remove('hidden');
            break;
        case 'register':
            elements.registerView.classList.remove('hidden');
            break;
        case 'dashboard':
            elements.dashboardView.classList.remove('hidden');
            loadDashboardData();
            break;
        case 'offline':
            elements.offlineView.classList.remove('hidden');
            loadOfflineSettings();
            break;
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 3000);
}

// ═══════════════════════════════════════
// AUTH HANDLERS
// ═══════════════════════════════════════

// Login
elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = elements.loginEmail.value;
    const password = elements.loginPassword.value;
    const submitBtn = elements.loginForm.querySelector('button[type="submit"]');

    submitBtn.classList.add('loading');

    try {
        const data = await API.login(email, password);
        showView('dashboard');
    } catch (error) {
        showError(elements.loginError, error.message);
    } finally {
        submitBtn.classList.remove('loading');
    }
});

// Register
elements.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = elements.registerEmail.value;
    const password = elements.registerPassword.value;
    const submitBtn = elements.registerForm.querySelector('button[type="submit"]');

    submitBtn.classList.add('loading');

    try {
        const data = await API.register(email, password);
        showView('dashboard');
    } catch (error) {
        showError(elements.registerError, error.message);
    } finally {
        submitBtn.classList.remove('loading');
    }
});

// Logout
elements.logoutBtn.addEventListener('click', async () => {
    await API.logout();
    showView('login');
});

// View switches
elements.showRegister.addEventListener('click', () => showView('register'));
elements.showLogin.addEventListener('click', () => showView('login'));
elements.continueWithoutLogin.addEventListener('click', () => showView('offline'));
elements.goToLogin.addEventListener('click', () => showView('login'));

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════

async function loadDashboardData() {
    try {
        // Profil
        const profile = await API.getProfile();
        elements.userEmail.textContent = profile.user.email;

        // İstatistikler
        const stats = await API.getStats();
        elements.totalVideos.textContent = stats.summary.totalVideos;
        elements.totalTime.textContent = stats.summary.totalTime;
        elements.todayVideos.textContent = stats.today.videosWatched;

        // Ayarlar
        const settings = await API.getSettings();
        elements.scrollDelay.value = settings.settings.scrollDelay / 1000;
        elements.scrollDelayValue.textContent = (settings.settings.scrollDelay / 1000) + 's';
        elements.autoStart.checked = settings.settings.autoStart;

    } catch (error) {
        console.error('Dashboard yüklenemedi:', error);
    }

    // Shorts durumu
    checkShortsStatus();
}

// Scroll delay slider
elements.scrollDelay.addEventListener('input', (e) => {
    elements.scrollDelayValue.textContent = e.target.value + 's';
});

// Save settings
elements.saveSettings.addEventListener('click', async () => {
    const btn = elements.saveSettings;
    btn.classList.add('loading');

    try {
        await API.updateSettings({
            scrollDelay: parseInt(elements.scrollDelay.value) * 1000,
            autoStart: elements.autoStart.checked
        });

        // Content script'e ayarları gönder
        sendSettingsToContentScript({
            scrollDelay: parseInt(elements.scrollDelay.value) * 1000,
            autoStart: elements.autoStart.checked
        });

        btn.textContent = '✓ Kaydedildi';
        setTimeout(() => {
            btn.textContent = 'Ayarları Kaydet';
        }, 2000);

    } catch (error) {
        console.error('Ayarlar kaydedilemedi:', error);
    } finally {
        btn.classList.remove('loading');
    }
});

// ═══════════════════════════════════════
// OFFLINE MODE
// ═══════════════════════════════════════

function loadOfflineSettings() {
    chrome.storage.local.get(['scrollDelay'], (result) => {
        const delay = result.scrollDelay || 5000;
        elements.offlineScrollDelay.value = delay / 1000;
        elements.offlineScrollDelayValue.textContent = (delay / 1000) + 's';
    });
}

elements.offlineScrollDelay.addEventListener('input', (e) => {
    const value = e.target.value;
    elements.offlineScrollDelayValue.textContent = value + 's';

    const delay = parseInt(value) * 1000;
    chrome.storage.local.set({ scrollDelay: delay });

    sendSettingsToContentScript({ scrollDelay: delay });
});

// ═══════════════════════════════════════
// CONTENT SCRIPT COMMUNICATION
// ═══════════════════════════════════════

function sendSettingsToContentScript(settings) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('youtube.com/shorts')) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                settings: settings
            });
        }
    });
}

async function checkShortsStatus() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url && tab.url.includes('youtube.com/shorts')) {
            elements.statusIndicator.classList.add('active');
            elements.statusText.textContent = 'Aktif';
        } else {
            elements.statusIndicator.classList.remove('active');
            elements.statusText.textContent = 'Shorts sayfasına gidin';
        }
    } catch (error) {
        elements.statusText.textContent = 'Bağlantı kurulamadı';
    }
}

// ═══════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════

async function init() {
    // Token var mı kontrol et
    await API.loadToken();

    if (API.token) {
        try {
            // Token geçerli mi?
            await API.getProfile();
            showView('dashboard');
        } catch (error) {
            // Token geçersiz
            await API.logout();
            showView('login');
        }
    } else {
        showView('login');
    }
}

// Başlat
document.addEventListener('DOMContentLoaded', init);
