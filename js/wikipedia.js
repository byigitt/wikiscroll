// Wikipedia API Client
const WikiAPI = {
    endpoints: {
        tr: 'https://tr.wikipedia.org/api/rest_v1',
        en: 'https://en.wikipedia.org/api/rest_v1'
    },

    // Boring content filters
    boringPatterns: {
        tr: [
            /ilçesine bağlı/i,
            /bir mahalledir/i,
            /bir köydür/i,
            /bir belediyedir/i,
            /nüfusu \d+ kişidir/i,
            /\d+ yılında kurulmuştur/i,
            /bir yerleşim yeridir/i,
            /idari birim/i
        ],
        en: [
            /is a village/i,
            /is a town/i,
            /is a municipality/i,
            /is a commune/i,
            /census-designated place/i,
            /unincorporated community/i,
            /administrative unit/i
        ]
    },

    // Check if content is interesting
    isInteresting(text, lang = 'tr') {
        if (!text || text.length < 50) return false;
        if (text.length > 500) return true; // Long = probably interesting
        
        const patterns = this.boringPatterns[lang] || this.boringPatterns.tr;
        for (const pattern of patterns) {
            if (pattern.test(text)) return false;
        }
        return true;
    },

    // Get single random article
    async getRandomSummary(lang = 'tr') {
        const endpoint = this.endpoints[lang];
        
        try {
            const response = await fetch(`${endpoint}/page/random/summary`);
            if (!response.ok) return null;
            
            const data = await response.json();
            return this.formatArticle(data, lang);
        } catch (e) {
            console.error('Failed to fetch random article:', e);
            return null;
        }
    },

    // Aggressive fetching - get many, filter to best
    async getRandomArticles(count = 10, lang = 'tr') {
        const fetchCount = count * 3; // Fetch 3x more, filter down
        const promises = [];
        
        for (let i = 0; i < fetchCount; i++) {
            promises.push(this.getRandomSummary(lang));
        }
        
        const results = await Promise.all(promises);
        
        // Filter: not null, has extract, is interesting
        const good = results.filter(a => 
            a !== null && 
            a.hook && 
            a.hook.length >= 50 &&
            this.isInteresting(a.hook, lang)
        );
        
        // Return requested count
        return good.slice(0, count);
    },

    // Get article by title
    async getArticle(title, lang = 'tr') {
        const endpoint = this.endpoints[lang];
        
        try {
            const response = await fetch(`${endpoint}/page/summary/${encodeURIComponent(title)}`);
            if (!response.ok) return null;
            
            const data = await response.json();
            return this.formatArticle(data, lang);
        } catch (e) {
            console.error('Failed to fetch article:', e);
            return null;
        }
    },

    // Get "On this day" facts
    async getOnThisDay(lang = 'tr') {
        const endpoint = this.endpoints[lang];
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        try {
            const response = await fetch(`${endpoint}/feed/onthisday/events/${month}/${day}`);
            if (!response.ok) return [];
            
            const data = await response.json();
            
            if (data.events) {
                return data.events
                    .filter(e => e.text && e.text.length > 30)
                    .slice(0, 10)
                    .map(event => ({
                        id: `otd-${event.year}-${Math.random().toString(36).substr(2, 9)}`,
                        hook: `${event.year}: ${event.text}`,
                        emoji: '📅',
                        category: 'tarih',
                        tags: ['tarih', 'bugün'],
                        source: event.pages?.[0] ? {
                            title: event.pages[0].title,
                            url: event.pages[0].content_urls?.desktop?.page,
                            lang
                        } : null
                    }));
            }
            return [];
        } catch (e) {
            console.error('Failed to fetch on this day:', e);
            return [];
        }
    },

    // Format article data
    formatArticle(data, lang) {
        if (!data || !data.extract) return null;
        
        let extract = data.extract.trim();
        
        // Skip disambiguation pages
        if (data.type === 'disambiguation') return null;
        
        // Get first 2-3 sentences
        const sentences = extract.match(/[^.!?]+[.!?]+/g) || [extract];
        extract = sentences.slice(0, 2).join(' ').trim();
        
        // Skip too short
        if (extract.length < 50) return null;
        
        // Truncate if too long
        if (extract.length > 280) {
            extract = extract.substring(0, 277) + '...';
        }

        const category = this.detectCategory(data.title, data.description, lang);
        
        return {
            id: `wiki-${lang}-${data.pageid || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            hook: extract,
            emoji: this.getCategoryEmoji(category),
            category: category,
            tags: this.extractTags(data.title, data.description),
            thumbnail: data.thumbnail?.source || null,
            source: {
                title: data.title,
                url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
                lang
            }
        };
    },

    detectCategory(title, description = '', lang) {
        const text = `${title} ${description}`.toLowerCase();
        
        const patterns = {
            bilim: /fizik|kimya|biyoloji|bilim|atom|molekül|enerji|uzay|gezegen|yıldız|science|physics|chemistry|biology|planet|star|quantum/,
            tarih: /savaş|tarih|imparator|kral|antik|osmanlı|war|history|emperor|king|ancient|battle|dynasty|empire/,
            doga: /hayvan|bitki|deniz|orman|kuş|balık|tür|species|animal|plant|forest|ocean|bird|fish|mammal/,
            teknoloji: /bilgisayar|yazılım|internet|teknoloji|mühendis|computer|software|technology|digital|engineer|algorithm/,
            kultur: /sanat|müzik|film|yazar|edebiyat|roman|şarkı|art|music|film|author|literature|novel|song|album/,
            insan: /futbolcu|oyuncu|aktör|şarkıcı|bilim insanı|footballer|actor|singer|scientist|politician|athlete/
        };

        for (const [cat, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) return cat;
        }
        
        return 'kultur';
    },

    getCategoryEmoji(category) {
        const emojis = {
            bilim: '🔬',
            tarih: '📜',
            doga: '🌿',
            teknoloji: '💻',
            kultur: '🎭',
            insan: '👤'
        };
        return emojis[category] || '💡';
    },

    extractTags(title, description = '') {
        const words = `${title} ${description}`.toLowerCase()
            .replace(/[^\wğüşıöçĞÜŞİÖÇ\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 4)
            .slice(0, 3);
        return words;
    }
};
