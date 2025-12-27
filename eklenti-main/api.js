/**
 * API Client
 * Backend ile iletişim için yardımcı fonksiyonlar
 */

const API = {
    // Backend URL
    BASE_URL: 'http://localhost:3000/api',

    // Token yönetimi
    token: null,

    /**
     * Token'ı storage'dan yükle
     */
    async loadToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['authToken'], (result) => {
                this.token = result.authToken || null;
                resolve(this.token);
            });
        });
    },

    /**
     * Token'ı storage'a kaydet
     */
    async saveToken(token) {
        this.token = token;
        return new Promise((resolve) => {
            chrome.storage.local.set({ authToken: token }, resolve);
        });
    },

    /**
     * Token'ı sil (logout)
     */
    async clearToken() {
        this.token = null;
        return new Promise((resolve) => {
            chrome.storage.local.remove(['authToken'], resolve);
        });
    },

    /**
     * HTTP isteği gönder
     */
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Token varsa ekle
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Bir hata oluştu');
            }

            return data;
        } catch (error) {
            console.error('[API]', error.message);
            throw error;
        }
    },

    // ═══════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════

    /**
     * Kayıt ol
     */
    async register(email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.token) {
            await this.saveToken(data.token);
        }

        return data;
    },

    /**
     * Giriş yap
     */
    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.token) {
            await this.saveToken(data.token);
        }

        return data;
    },

    /**
     * Çıkış yap
     */
    async logout() {
        await this.clearToken();
    },

    /**
     * Profil bilgisi
     */
    async getProfile() {
        return await this.request('/auth/me');
    },

    // ═══════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════

    /**
     * Ayarları getir
     */
    async getSettings() {
        return await this.request('/settings');
    },

    /**
     * Ayarları güncelle
     */
    async updateSettings(settings) {
        return await this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    },

    // ═══════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════

    /**
     * Video izleme kaydı
     */
    async recordVideo(watchTimeSeconds = 0) {
        return await this.request('/stats/video', {
            method: 'POST',
            body: JSON.stringify({ watchTimeSeconds })
        });
    },

    /**
     * İstatistik özeti
     */
    async getStats() {
        return await this.request('/stats/summary');
    }
};

// Chrome storage kullanılamıyorsa (test için)
if (typeof chrome === 'undefined' || !chrome.storage) {
    API.loadToken = async function () {
        this.token = localStorage.getItem('authToken');
        return this.token;
    };
    API.saveToken = async function (token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    };
    API.clearToken = async function () {
        this.token = null;
        localStorage.removeItem('authToken');
    };
}
