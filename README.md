# YouTube Shorts Auto Next - Tarayıcı Eklentisi

YouTube Shorts videosu bittiğinde otomatik olarak sonraki videoya geçen Firefox ve Chrome uyumlu eklenti.

---

## 📦 Dosya Yapısı

```
youtube-shorts-autoscroll/
├── manifest.json    # Eklenti yapılandırması
├── content.js       # Ana script
└── icon.png         # Eklenti ikonu (opsiyonel)
```

---

## 🦊 Firefox'a Geçici Eklenti Olarak Yükleme

### Adım 1: Eklenti Sayfasını Aç
1. Firefox'u aç
2. Adres çubuğuna `about:debugging` yaz ve Enter'a bas
3. Sol menüden **"Bu Firefox"** seçeneğine tıkla

### Adım 2: Eklentiyi Yükle
1. **"Geçici Eklenti Yükle..."** butonuna tıkla
2. Açılan dosya seçicisinde `youtube-shorts-autoscroll` klasörüne git
3. `manifest.json` dosyasını seç ve **"Aç"** butonuna tıkla

### Adım 3: Test Et
1. [youtube.com/shorts](https://www.youtube.com/shorts) sayfasına git
2. Bir Shorts videosu izle
3. Video bittiğinde otomatik olarak sonraki videoya geçecek!

> ⚠️ **Not**: Geçici eklentiler Firefox kapatıldığında silinir. Kalıcı kurulum için eklentiyi imzalamanız gerekir.

---

## 🌐 Chrome'a Yükleme

### Adım 1: Eklenti Sayfasını Aç
1. Chrome'u aç
2. Adres çubuğuna `chrome://extensions` yaz ve Enter'a bas
3. Sağ üst köşeden **"Geliştirici modu"**nu AÇ

### Adım 2: Eklentiyi Yükle
1. **"Paketlenmemiş öğe yükle"** butonuna tıkla
2. `youtube-shorts-autoscroll` klasörünü seç
3. **"Klasör Seç"** butonuna tıkla

### Adım 3: Test Et
1. [youtube.com/shorts](https://www.youtube.com/shorts) sayfasına git
2. Video bittiğinde otomatik geçiş yapılacak!

---

## ⚙️ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🎬 Video Bitişi Algılama | `ended` eventi ile video bitişini tespit eder |
| 🔄 SPA Desteği | MutationObserver ile dinamik içerik değişikliklerini izler |
| 🔁 Loop Kontrolü | Döngüdeki videolarda geçiş yapmaz |
| ⌨️ Klavye Simülasyonu | ArrowDown tuşu ile doğal geçiş |

---

## 🐛 Sorun Giderme

### Eklenti çalışmıyor
- Sayfayı yenileyin (F5)
- Eklentinin etkin olduğundan emin olun
- Konsolu açın (F12) ve hata mesajlarını kontrol edin

### Video geçmiyor
- Videonun döngüde olmadığından emin olun
- Videonun tamamen bitmesini bekleyin

---

## 📝 Lisans

Açık kaynak - istediğiniz gibi kullanabilirsiniz.
