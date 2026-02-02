# wikiscroll.

[English](#english) | [Türkçe](#türkçe)

**Live Demo:** [ws.baris.world](https://ws.baris.world)

---

## English

A TikTok-style scrolling platform that delivers random facts from Wikipedia. Designed to make learning addictive.

### What is it?

wikiscroll. transforms Wikipedia content into bite-sized, scrollable facts. Instead of doom-scrolling through social media, you scroll through knowledge. Each card presents a concise piece of information sourced directly from Wikipedia.

### Features

**Core**
- Vertical scroll interface with snap-to-card behavior
- Random facts fetched from Wikipedia's REST API
- Multi-language support (Turkish and English)
- Like and save functionality for facts you want to remember
- Direct links to Wikipedia source articles

**Recommendation System**
- Custom-built algorithm that learns your interests over time
- Time decay: older preferences gradually lose influence (half-life: 7 days)
- Weighted scoring system:
  - Like: +10 points
  - Save: +8 points
  - Long read (5s+): +3 points
  - Quick skip: -2 points
  - "Not interested": -15 points
- Category and tag-level granularity
- Session awareness: tracks last 20 viewed items to enforce variety
- Diversity control: prevents same category appearing more than twice consecutively
- All preference data stored locally, never sent to any server

**Offline-First Caching**
- Articles are cached locally for instant loading
- Previously seen content is filtered out
- Automatic duplicate detection and cleanup
- Cache size limited to ~2.5MB to respect device storage

### Privacy

wikiscroll. takes a privacy-first approach:

- **No accounts required** - Just open and start scrolling
- **No tracking** - We don't collect any personal data
- **No analytics** - Your reading habits stay on your device
- **Local storage only** - All preferences, likes, and saved articles are stored in your browser's localStorage
- **No cookies** - We don't use cookies for tracking
- **Direct API calls** - Content is fetched directly from Wikipedia's public API

Your data never leaves your device. If you clear your browser data, everything resets.

### How It Works

1. On first load, wikiscroll. fetches random articles from Wikipedia
2. Articles are filtered for quality (removes stubs, disambiguation pages, boring location entries)
3. Content is trimmed to 1-2 sentences for quick consumption
4. As you scroll, the algorithm tracks your reading time per article
5. Quick skips signal disinterest, longer reads signal engagement
6. Likes and saves provide strong positive signals for category preferences
7. "Not interested" button provides explicit negative feedback (-15 points)
8. The recommendation engine scores new articles based on your accumulated preferences
9. Time decay ensures recent interactions matter more than old ones
10. A diversity factor ensures you still discover content outside your comfort zone
11. All articles are cached locally for offline access and faster subsequent loads

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

wikiscroll., Wikipedia içeriklerini kısa ve kaydırmalı bilgi kartlarına dönüştürür. Sosyal medyada vakit öldürme yerine, bilgi akışında gezinirsiniz. Her kart, doğrudan Wikipedia'dan alınan özlü bir bilgi sunar.

### Özellikler

**Temel**
- Karta yapışan dikey kaydırma arayüzü
- Wikipedia REST API'den rastgele bilgiler
- Çoklu dil desteği (Türkçe ve İngilizce)
- Hatırlamak istediğiniz bilgileri beğenme ve kaydetme
- Wikipedia kaynak makalelerine doğrudan bağlantılar

**Öneri Sistemi**
- Zamanla ilgi alanlarınızı öğrenen özel yapım algoritma
- Zaman azalması: eski tercihler kademeli olarak etkisini kaybeder (yarı ömür: 7 gün)
- Ağırlıklı puanlama sistemi:
  - Beğeni: +10 puan
  - Kaydetme: +8 puan
  - Uzun okuma (5sn+): +3 puan
  - Hızlı geçiş: -2 puan
  - "İlgilenmiyorum": -15 puan
- Kategori ve etiket düzeyinde hassasiyet
- Oturum farkındalığı: çeşitliliği sağlamak için son 20 görüntülenen içeriği takip eder
- Çeşitlilik kontrolü: aynı kategorinin art arda ikiden fazla gösterilmesini engeller
- Tüm tercih verileri yerel olarak saklanır, hiçbir sunucuya gönderilmez

**Çevrimdışı Önbellekleme**
- Makaleler anında yükleme için yerel olarak önbelleklenir
- Daha önce görülen içerikler filtrelenir
- Otomatik tekrar tespit ve temizleme
- Cihaz depolamasına saygı için önbellek boyutu ~2.5MB ile sınırlı

### Gizlilik

wikiscroll., gizlilik öncelikli bir yaklaşım benimser:

- **Hesap gerektirmez** - Sadece açın ve kaydırmaya başlayın
- **Takip yok** - Hiçbir kişisel veri toplamıyoruz
- **Analitik yok** - Okuma alışkanlıklarınız cihazınızda kalır
- **Sadece yerel depolama** - Tüm tercihler, beğeniler ve kaydedilen makaleler tarayıcınızın localStorage'ında saklanır
- **Çerez yok** - Takip için çerez kullanmıyoruz
- **Doğrudan API çağrıları** - İçerik doğrudan Wikipedia'nın açık API'sinden çekilir

Verileriniz cihazınızdan asla çıkmaz. Tarayıcı verilerinizi temizlerseniz her şey sıfırlanır.

### Nasıl Çalışır?

1. İlk yüklemede wikiscroll., Wikipedia'dan rastgele makaleler çeker
2. Makaleler kalite için filtrelenir (taslaklar, anlam ayrımı sayfaları, sıkıcı konum bilgileri kaldırılır)
3. İçerik hızlı tüketim için 1-2 cümleye kısaltılır
4. Kaydırdıkça algoritma her makale için okuma sürenizi takip eder
5. Hızlı geçişler ilgisizlik, uzun okumalar ilgi sinyali verir
6. Beğeniler ve kaydetmeler kategori tercihleri için güçlü pozitif sinyal sağlar
7. "İlgilenmiyorum" butonu açık negatif geri bildirim sağlar (-15 puan)
8. Öneri motoru, biriken tercihlerinize göre yeni makaleleri puanlar
9. Zaman azalması, son etkileşimlerin eski olanlardan daha önemli olmasını sağlar
10. Çeşitlilik faktörü, konfor alanınız dışındaki içerikleri keşfetmenizi sağlar
11. Tüm makaleler çevrimdışı erişim ve daha hızlı yükleme için yerel olarak önbelleklenir

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

## Inspiration / İlham

This project was inspired by [@rebane2001](https://x.com/rebane2001)'s [TikTok-style Wikipedia concept](https://x.com/rebane2001/status/2018107789512474738). While the original used pre-compiled data, wikiscroll. fetches real-time content directly from Wikipedia's API.

Bu proje [@rebane2001](https://x.com/rebane2001)'in [TikTok tarzı Wikipedia konseptinden](https://x.com/rebane2001/status/2018107789512474738) ilham almıştır. Orijinal proje önceden derlenmiş veri kullanırken, wikiscroll. içerikleri doğrudan Wikipedia API'sinden anlık olarak çeker.

---

## License / Lisans

MIT

## Author / Geliştirici

Baris Bayburtlu
- Website: [bayburt.lu](https://bayburt.lu)
- GitHub: [@byigitt](https://github.com/byigitt)
- LinkedIn: [bbayburtlu](https://linkedin.com/in/bbayburtlu)
