const Storage = {
    KEYS: {
        LIKES: 'wikiscroll_likes',
        SEEN: 'wikiscroll_seen',
        PREFERENCES: 'wikiscroll_prefs',
        CATEGORY_SCORES: 'wikiscroll_cat_scores',
        ARTICLE_CACHE: 'wikiscroll_cache',
        CACHE_TIME: 'wikiscroll_cache_time',
        SAVED: 'wikiscroll_saved'
    },

    CACHE_DURATION: 60 * 60 * 1000,
    MAX_CACHE_SIZE: 200,
    MAX_STORAGE_KB: 2500,

    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    getLikes() {
        return this.get(this.KEYS.LIKES) || [];
    },

    addLike(factId) {
        const likes = this.getLikes();
        if (!likes.includes(factId)) {
            likes.push(factId);
            this.set(this.KEYS.LIKES, likes);
        }
        return likes;
    },

    removeLike(factId) {
        const likes = this.getLikes().filter(id => id !== factId);
        this.set(this.KEYS.LIKES, likes);
        return likes;
    },

    isLiked(factId) {
        return this.getLikes().includes(factId);
    },

    getSeen() {
        return this.get(this.KEYS.SEEN) || [];
    },

    markSeen(factId) {
        const seen = this.getSeen();
        if (!seen.includes(factId)) {
            seen.push(factId);
            if (seen.length > 500) {
                seen.shift();
            }
            this.set(this.KEYS.SEEN, seen);
        }
    },

    getCategoryScores() {
        return this.get(this.KEYS.CATEGORY_SCORES) || {};
    },

    updateCategoryScore(category, delta) {
        const scores = this.getCategoryScores();
        scores[category] = (scores[category] || 0) + delta;
        this.set(this.KEYS.CATEGORY_SCORES, scores);
        return scores;
    },

    getPreferences() {
        return this.get(this.KEYS.PREFERENCES) || { language: 'tr', theme: 'dark' };
    },

    setPreference(key, value) {
        const prefs = this.getPreferences();
        prefs[key] = value;
        this.set(this.KEYS.PREFERENCES, prefs);
        return prefs;
    },

    getCache(lang) {
        const cache = this.get(this.KEYS.ARTICLE_CACHE) || {};
        const articles = cache[lang];

        if (!articles || articles.length === 0) {
            return null;
        }

        const cacheTime = this.get(this.KEYS.CACHE_TIME) || {};
        const lastUpdate = cacheTime[lang] || 0;

        if (!lastUpdate && articles.length > 0) {
            cacheTime[lang] = Date.now();
            this.set(this.KEYS.CACHE_TIME, cacheTime);
            return articles;
        }

        if (Date.now() - lastUpdate > this.CACHE_DURATION) {
            return null;
        }

        return articles;
    },

    addToCache(lang, articles) {
        const cache = this.get(this.KEYS.ARTICLE_CACHE) || {};
        const cacheTime = this.get(this.KEYS.CACHE_TIME) || {};
        let existing = cache[lang] || [];

        articles.forEach(article => {
            if (!existing.find(a => a.id === article.id)) {
                existing.push({
                    id: article.id,
                    hook: article.hook,
                    emoji: article.emoji,
                    category: article.category,
                    thumbnail: article.thumbnail,
                    source: { title: article.source?.title, url: article.source?.url }
                });
            }
        });

        if (existing.length > this.MAX_CACHE_SIZE) {
            existing = existing.slice(0, this.MAX_CACHE_SIZE);
        }

        cache[lang] = existing;
        cacheTime[lang] = Date.now();

        this.trimCacheIfNeeded(cache);
        this.set(this.KEYS.ARTICLE_CACHE, cache);
        this.set(this.KEYS.CACHE_TIME, cacheTime);
    },

    trimCacheIfNeeded(cache) {
        const sizeKB = new Blob([JSON.stringify(cache)]).size / 1024;

        if (sizeKB > this.MAX_STORAGE_KB) {
            const langs = Object.keys(cache);
            let trimmed = 0;

            while (new Blob([JSON.stringify(cache)]).size / 1024 > this.MAX_STORAGE_KB * 0.8) {
                for (const lang of langs) {
                    if (cache[lang] && cache[lang].length > 10) {
                        cache[lang].pop();
                        trimmed++;
                    }
                }
                if (trimmed > 50) break;
            }
        }
    },

    clearCache() {
        localStorage.removeItem(this.KEYS.ARTICLE_CACHE);
        localStorage.removeItem(this.KEYS.CACHE_TIME);
    },

    getSaved() {
        return this.get(this.KEYS.SAVED) || [];
    },

    saveArticle(article) {
        const saved = this.getSaved();
        if (!saved.find(a => a.id === article.id)) {
            saved.unshift({
                id: article.id,
                hook: article.hook,
                emoji: article.emoji,
                category: article.category,
                source: article.source,
                savedAt: Date.now()
            });
            this.set(this.KEYS.SAVED, saved);
        }
        return saved;
    },

    unsaveArticle(articleId) {
        const saved = this.getSaved().filter(a => a.id !== articleId);
        this.set(this.KEYS.SAVED, saved);
        return saved;
    },

    isSaved(articleId) {
        return this.getSaved().some(a => a.id === articleId);
    },

    removeDuplicates() {
        const cache = this.get(this.KEYS.ARTICLE_CACHE) || {};
        let removed = 0;

        Object.keys(cache).forEach(lang => {
            if (!cache[lang]) return;

            const seen = new Set();
            const unique = [];

            cache[lang].forEach(article => {
                if (!seen.has(article.id)) {
                    seen.add(article.id);
                    unique.push(article);
                } else {
                    removed++;
                }
            });

            cache[lang] = unique;
        });

        if (removed > 0) {
            this.set(this.KEYS.ARTICLE_CACHE, cache);
        }

        return removed;
    },

    clearAll() {
        Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    }
};
