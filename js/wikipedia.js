const WikiAPI = {
    endpoints: {
        tr: 'https://tr.wikipedia.org/api/rest_v1',
        en: 'https://en.wikipedia.org/api/rest_v1'
    },

    boringPatterns: {
        tr: [
            /ilcesine bagli/i, /bir mahalledir/i, /bir koydur/i, /bir belediyedir/i,
            /nufusu \d+ kisidir/i, /\d+ yilinda kurulmustur/i, /bir yerlesim yeridir/i, /idari birim/i
        ],
        en: [
            /is a village/i, /is a town/i, /is a municipality/i, /is a commune/i,
            /census-designated place/i, /unincorporated community/i, /administrative unit/i
        ]
    },

    categoryPatterns: {
        bilim: /fizik|kimya|biyoloji|bilim|atom|molekul|enerji|uzay|gezegen|yildiz|science|physics|chemistry|biology|planet|star|quantum/,
        tarih: /savas|tarih|imparator|kral|antik|osmanli|war|history|emperor|king|ancient|battle|dynasty|empire/,
        doga: /hayvan|bitki|deniz|orman|kus|balik|tur|species|animal|plant|forest|ocean|bird|fish|mammal/,
        teknoloji: /bilgisayar|yazilim|internet|teknoloji|muhendis|computer|software|technology|digital|engineer|algorithm/,
        kultur: /sanat|muzik|film|yazar|edebiyat|roman|sarki|art|music|film|author|literature|novel|song|album/,
        insan: /futbolcu|oyuncu|aktor|sarkici|bilim insani|footballer|actor|singer|scientist|politician|athlete/
    },

    categoryEmojis: {
        bilim: '🔬', tarih: '📜', doga: '🌿', teknoloji: '💻', kultur: '🎭', insan: '👤'
    },

    isInteresting(text, lang = 'tr') {
        if (!text || text.length < 50) return false;
        if (text.length > 500) return true;

        const patterns = this.boringPatterns[lang] || this.boringPatterns.tr;
        return !patterns.some(pattern => pattern.test(text));
    },

    async fetchJson(url) {
        const response = await fetch(url);
        if (!response.ok) return null;
        return response.json();
    },

    async getRandomSummary(lang = 'tr') {
        try {
            const data = await this.fetchJson(`${this.endpoints[lang]}/page/random/summary`);
            return this.formatArticle(data, lang);
        } catch {
            return null;
        }
    },

    async getRandomArticles(count = 10, lang = 'tr') {
        const fetchCount = count * 3;
        const promises = Array.from({ length: fetchCount }, () => this.getRandomSummary(lang));
        const results = await Promise.all(promises);

        return results
            .filter(a => a && a.hook && a.hook.length >= 50 && this.isInteresting(a.hook, lang))
            .slice(0, count);
    },

    async getOnThisDay(lang = 'tr') {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        try {
            const data = await this.fetchJson(`${this.endpoints[lang]}/feed/onthisday/events/${month}/${day}`);
            if (!data?.events) return [];

            return data.events
                .filter(e => e.text && e.text.length > 30)
                .slice(0, 10)
                .map(event => ({
                    id: `otd-${event.year}-${Math.random().toString(36).substr(2, 9)}`,
                    hook: `${event.year}: ${event.text}`,
                    emoji: '📅',
                    category: 'tarih',
                    tags: ['tarih', 'bugun'],
                    source: event.pages?.[0] ? {
                        title: event.pages[0].title,
                        url: event.pages[0].content_urls?.desktop?.page,
                        lang
                    } : null
                }));
        } catch {
            return [];
        }
    },

    formatArticle(data, lang) {
        if (!data || !data.extract || data.type === 'disambiguation') return null;

        let extract = data.extract.trim();
        const sentences = extract.match(/[^.!?]+[.!?]+/g) || [extract];
        extract = sentences.slice(0, 2).join(' ').trim();

        if (extract.length < 50) return null;
        if (extract.length > 280) {
            extract = extract.substring(0, 277) + '...';
        }

        const category = this.detectCategory(data.title, data.description);

        return {
            id: `wiki-${lang}-${data.pageid || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pageId: data.pageid,
            hook: extract,
            emoji: this.categoryEmojis[category] || '💡',
            category,
            tags: this.extractTags(data.title, data.description),
            wikiCategories: [],
            relatedTitles: [],
            thumbnail: data.thumbnail?.source || null,
            source: {
                title: data.title,
                url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
                lang
            }
        };
    },

    async getArticle(title, lang = 'tr') {
        try {
            const data = await this.fetchJson(`${this.endpoints[lang]}/page/summary/${encodeURIComponent(title)}`);
            return this.formatArticle(data, lang);
        } catch {
            return null;
        }
    },

    buildWikiApiUrl(lang, params) {
        const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
        return `${endpoint}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
    },

    async getArticleCategories(title, lang = 'tr') {
        const url = this.buildWikiApiUrl(lang, {
            action: 'query',
            titles: title,
            prop: 'categories',
            cllimit: '10',
            clshow: '!hidden'
        });

        try {
            const data = await this.fetchJson(url);
            const page = Object.values(data?.query?.pages || {})[0];

            if (page?.categories) {
                return page.categories
                    .map(c => c.title.replace(/^(Kategori|Category):/, '').toLowerCase())
                    .filter(c => !c.includes('artikel') && !c.includes('stub') && c.length < 50);
            }
        } catch {}
        return [];
    },

    async getRelatedTitles(title, lang = 'tr', limit = 5) {
        const url = this.buildWikiApiUrl(lang, {
            action: 'query',
            titles: title,
            prop: 'links',
            pllimit: String(limit * 3),
            plnamespace: '0'
        });

        try {
            const data = await this.fetchJson(url);
            const page = Object.values(data?.query?.pages || {})[0];

            if (page?.links) {
                return page.links.map(l => l.title).sort(() => Math.random() - 0.5).slice(0, limit);
            }
        } catch {}
        return [];
    },

    async getRelatedArticles(titles, lang = 'tr') {
        const articles = await Promise.all(titles.map(title => this.getArticle(title, lang)));
        return articles.filter(a => a && this.isInteresting(a.hook, lang));
    },

    detectCategory(title, description = '') {
        const text = `${title} ${description}`.toLowerCase();

        for (const [cat, pattern] of Object.entries(this.categoryPatterns)) {
            if (pattern.test(text)) return cat;
        }

        return 'kultur';
    },

    extractTags(title, description = '') {
        return `${title} ${description}`.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 4)
            .slice(0, 3);
    }
};
