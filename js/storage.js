// LocalStorage Manager
const Storage = {
    KEYS: {
        LIKES: 'wikiscroll_likes',
        SEEN: 'wikiscroll_seen',
        PREFERENCES: 'wikiscroll_prefs',
        CATEGORY_SCORES: 'wikiscroll_cat_scores'
    },

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

    // Clear all
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};
