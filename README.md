# WikiScroll

[English](#english) | [Türkçe](#türkçe)

---

## English

A TikTok-style scrolling platform that delivers random facts from Wikipedia. Designed to make learning addictive.

### What is it?

WikiScroll transforms Wikipedia content into bite-sized, scrollable facts. Instead of doom-scrolling through social media, you scroll through knowledge. Each card presents a concise piece of information sourced directly from Wikipedia.

### Features

**Core**
- Vertical scroll interface with snap-to-card behavior
- Random facts fetched from Wikipedia's REST API
- Multi-language support (Turkish and English)
- Like and save functionality for facts you want to remember
- Direct links to Wikipedia source articles

**Recommendation System**
- Learns your interests based on reading time and likes
- Prioritizes categories you engage with more
- Maintains diversity to help you discover new topics
- All preferences stored locally in your browser

**Offline-First Caching**
- Articles are cached locally for instant loading
- Previously seen content is filtered out
- Automatic duplicate detection and cleanup
- Cache size limited to ~2.5MB to respect device storage

### Privacy

WikiScroll takes a privacy-first approach:

- **No accounts required** - Just open and start scrolling
- **No tracking** - We don't collect any personal data
- **No analytics** - Your reading habits stay on your device
- **Local storage only** - All preferences, likes, and saved articles are stored in your browser's localStorage
- **No cookies** - We don't use cookies for tracking
- **Direct API calls** - Content is fetched directly from Wikipedia's public API

Your data never leaves your device. If you clear your browser data, everything resets.

### How It Works

1. On first load, WikiScroll fetches random articles from Wikipedia
2. Articles are filtered for quality (removes stubs, disambiguation pages, etc.)
3. Content is trimmed to 1-2 sentences for quick consumption
4. As you scroll and interact, the app learns your preferences
5. Future content is weighted toward your interests while maintaining variety

### Tech Stack

- Vanilla JavaScript (no frameworks)
- Wikipedia REST API
- CSS with scroll-snap for native-feeling swipe
- localStorage for all data persistence

### Running Locally

Simply serve the files with any static file server:

```bash
npx serve
```

Or open `index.html` directly in a browser (some features may be limited due to CORS).

### Project Structure

```
wikiscroll/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── storage.js
    ├── recommendation.js
    └── wikipedia.js
```

---

## Türkçe

Wikipedia'dan rastgele bilgiler sunan, TikTok tarzı dikey kaydırmalı bir platform. Öğrenmeyi alışkanlık haline getirmek için tasarlandı.

### Nedir?

WikiScroll, Wikipedia içeriklerini kısa ve kaydırmalı bilgi kartlarına dönüştürür. Sosyal medyada vakit öldürme yerine, bilgi akışında gezinirsiniz. Her kart, doğrudan Wikipedia'dan alınan özlü bir bilgi sunar.

### Özellikler

**Temel**
- Karta yapışan dikey kaydırma arayüzü
- Wikipedia REST API'den rastgele bilgiler
- Çoklu dil desteği (Türkçe ve İngilizce)
- Hatırlamak istediğiniz bilgileri beğenme ve kaydetme
- Wikipedia kaynak makalelerine doğrudan bağlantılar

**Öneri Sistemi**
- Okuma süresi ve beğenilere göre ilgi alanlarınızı öğrenir
- Daha çok etkileşimde bulunduğunuz kategorilere öncelik verir
- Yeni konular keşfetmeniz için çeşitlilik sağlar
- Tüm tercihler tarayıcınızda yerel olarak saklanır

**Çevrimdışı Önbellekleme**
- Makaleler anında yükleme için yerel olarak önbelleklenir
- Daha önce görülen içerikler filtrelenir
- Otomatik tekrar tespit ve temizleme
- Cihaz depolamasına saygı için önbellek boyutu ~2.5MB ile sınırlı

### Gizlilik

WikiScroll, gizlilik öncelikli bir yaklaşım benimser:

- **Hesap gerektirmez** - Sadece açın ve kaydırmaya başlayın
- **Takip yok** - Hiçbir kişisel veri toplamıyoruz
- **Analitik yok** - Okuma alışkanlıklarınız cihazınızda kalır
- **Sadece yerel depolama** - Tüm tercihler, beğeniler ve kaydedilen makaleler tarayıcınızın localStorage'ında saklanır
- **Çerez yok** - Takip için çerez kullanmıyoruz
- **Doğrudan API çağrıları** - İçerik doğrudan Wikipedia'nın açık API'sinden çekilir

Verileriniz cihazınızdan asla çıkmaz. Tarayıcı verilerinizi temizlerseniz her şey sıfırlanır.

### Nasıl Çalışır?

1. İlk yüklemede WikiScroll, Wikipedia'dan rastgele makaleler çeker
2. Makaleler kalite için filtrelenir (taslaklar, anlam ayrımı sayfaları vb. kaldırılır)
3. İçerik hızlı tüketim için 1-2 cümleye kısaltılır
4. Kaydırdıkça ve etkileştikçe uygulama tercihlerinizi öğrenir
5. Gelecekteki içerik, çeşitliliği korurken ilgi alanlarınıza göre ağırlıklandırılır

### Teknoloji

- Vanilla JavaScript (framework yok)
- Wikipedia REST API
- Doğal hissettiren kaydırma için scroll-snap ile CSS
- Tüm veri kalıcılığı için localStorage

### Yerel Çalıştırma

Dosyaları herhangi bir statik dosya sunucusuyla sunun:

```bash
npx serve
```

Veya `index.html` dosyasını doğrudan tarayıcıda açın (CORS nedeniyle bazı özellikler sınırlı olabilir).

### Proje Yapısı

```
wikiscroll/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── storage.js
    ├── recommendation.js
    └── wikipedia.js
```

---

## License / Lisans

MIT

## Author / Geliştirici

Baris Bayburtlu
- Website: [bayburt.lu](https://bayburt.lu)
- GitHub: [@byigitt](https://github.com/byigitt)
- LinkedIn: [bbayburtlu](https://linkedin.com/in/bbayburtlu)
