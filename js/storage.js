// LocalStorage Manager
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

    CACHE_DURATION: 60 * 60 * 1000, // 1 saat
    MAX_CACHE_SIZE: 100,

    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    // Likes
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

    // Seen facts
    getSeen() {
        return this.get(this.KEYS.SEEN) || [];
    },

    markSeen(factId) {
        const seen = this.getSeen();
        if (!seen.includes(factId)) {
            seen.push(factId);
            // Keep only last 500 seen items
            if (seen.length > 500) {
                seen.shift();
            }
            this.set(this.KEYS.SEEN, seen);
        }
    },

    // Category Scores (for recommendation)
    getCategoryScores() {
        return this.get(this.KEYS.CATEGORY_SCORES) || {};
    },

    updateCategoryScore(category, delta) {
        const scores = this.getCategoryScores();
        scores[category] = (scores[category] || 0) + delta;
        this.set(this.KEYS.CATEGORY_SCORES, scores);
        return scores;
    },

    // Preferences
    getPreferences() {
        return this.get(this.KEYS.PREFERENCES) || {
            language: 'tr',
            theme: 'dark'
        };
    },

    setPreference(key, value) {
        const prefs = this.getPreferences();
        prefs[key] = value;
        this.set(this.KEYS.PREFERENCES, prefs);
        return prefs;
    },

    // Article Cache
    getCache(lang) {
        const cache = this.get(this.KEYS.ARTICLE_CACHE) || {};
        const articles = cache[lang] || null;
        
        // No cache at all
        if (!articles || articles.length === 0) {
            console.log('[Cache] No cache for', lang);
            return null;
        }
        
        const cacheTime = this.get(this.KEYS.CACHE_TIME) || {};
        const lastUpdate = cacheTime[lang] || 0;
        const age = Date.now() - lastUpdate;
        
        console.log('[Cache] lang:', lang);
        console.log('[Cache] articles:', articles.length);
        console.log('[Cache] lastUpdate:', lastUpdate ? new Date(lastUpdate).toLocaleString() : 'never');
        console.log('[Cache] age:', Math.round(age / 1000), 'seconds');
        
        // If no timestamp but cache exists, use it and set timestamp now
        if (!lastUpdate && articles.length > 0) {
            console.log('[Cache] No timestamp, setting now and using cache');
            cacheTime[lang] = Date.now();
            this.set(this.KEYS.CACHE_TIME, cacheTime);
            return articles;
        }
        
        // Check if cache expired
        if (age > this.CACHE_DURATION) {
            console.log('[Cache] EXPIRED');
            return null;
        }
        
        console.log('[Cache] ✅ Valid cache found');
        return articles;
    },

    setCache(lang, articles) {
        const cache = this.get(this.KEYS.ARTICLE_CACHE) || {};
        const cacheTime = this.get(this.KEYS.CACHE_TIME) || {};
        
        // Merge with existing, remove duplicates, limit size
        const existing = cache[lang] || [];
        const merged = [...articles];
        
        existing.forEach(article => {
            if (!merged.find(a => a.id === article.id)) {
                merged.push(article);
            }
        });
        
        // Keep only last MAX_CACHE_SIZE
        cache[lang] = merged.slice(0, this.MAX_CACHE_SIZE);
        cacheTime[lang] = Date.now();
        
        this.set(this.KEYS.ARTICLE_CACHE, cache);
        this.set(this.KEYS.CACHE_TIME, cacheTime);
        console.log('[Cache] setCache: saved', cache[lang].length, 'articles for', lang);
    },

    addToCache(lang, articles) {
        const cache = this.get(this.KEYS.ARTICLE_CACHE) || {};
        const cacheTime = this.get(this.KEYS.CACHE_TIME) || {};
        const existing = cache[lang] || [];
        
        let added = 0;
        articles.forEach(article => {
            if (!existing.find(a => a.id === article.id)) {
                existing.push(article);
                added++;
            }
        });
        
        cache[lang] = existing.slice(0, this.MAX_CACHE_SIZE);
        cacheTime[lang] = Date.now();
        
        this.set(this.KEYS.ARTICLE_CACHE, cache);
        this.set(this.KEYS.CACHE_TIME, cacheTime);
        console.log('[Cache] addToCache: added', added, 'new, total', cache[lang].length, 'for', lang);
    },

    clearCache() {
        localStorage.removeItem(this.KEYS.ARTICLE_CACHE);
        localStorage.removeItem(this.KEYS.CACHE_TIME);
    },

    // Saved articles
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

    // Clear all
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};
