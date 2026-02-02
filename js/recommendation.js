// Recommendation Engine v2
const Recommender = {
    // Session tracking
    sessionCategories: [],
    sessionStartTime: Date.now(),

    // Score weights
    WEIGHTS: {
        LIKE: 10,
        UNLIKE: -5,
        LONG_READ: 3,
        SHORT_READ: -1,
        SKIP: -2,
        SAVE: 8,
        NOT_INTERESTED: -15,
        RELATED_BOOST: 5
    },

    // Time decay - halves every 7 days
    DECAY_HALF_LIFE: 7 * 24 * 60 * 60 * 1000,

    // Calculate decayed score
    applyTimeDecay(score, timestamp) {
        if (!timestamp) return score;
        const age = Date.now() - timestamp;
        const decayFactor = Math.pow(0.5, age / this.DECAY_HALF_LIFE);
        return score * decayFactor;
    },

    // Get category scores with time decay applied
    getWeights() {
        const raw = Storage.getCategoryScores();
        const decayed = {};
        
        Object.entries(raw).forEach(([category, data]) => {
            if (typeof data === 'number') {
                // Legacy format - no timestamp
                decayed[category] = data * 0.5; // Apply default decay
            } else if (data && typeof data === 'object') {
                decayed[category] = this.applyTimeDecay(data.score, data.timestamp);
            }
        });
        
        return decayed;
    },

    // Update category score with timestamp
    updateScore(category, delta) {
        const scores = Storage.get(Storage.KEYS.CATEGORY_SCORES) || {};
        const current = scores[category];
        
        let newScore;
        if (typeof current === 'number') {
            newScore = current + delta;
        } else if (current && typeof current === 'object') {
            newScore = current.score + delta;
        } else {
            newScore = delta;
        }
        
        scores[category] = {
            score: newScore,
            timestamp: Date.now()
        };
        
        Storage.set(Storage.KEYS.CATEGORY_SCORES, scores);
        return scores;
    },

    // Score an article based on user preferences
    scoreArticle(article) {
        const weights = this.getWeights();
        let score = Math.random() * 3; // Base randomness
        
        // Category boost
        const categoryWeight = weights[article.category] || 0;
        score += categoryWeight * 2;
        
        // Tag boost
        if (article.tags) {
            article.tags.forEach(tag => {
                const tagWeight = weights[tag] || 0;
                score += tagWeight;
            });
        }
        
        // Wikipedia categories boost (if available)
        if (article.wikiCategories) {
            article.wikiCategories.forEach(cat => {
                const catWeight = weights[cat] || 0;
                score += catWeight * 0.5;
            });
        }
        
        // Related article boost
        if (article.isRelated) {
            score += this.WEIGHTS.RELATED_BOOST;
        }
        
        // Session diversity penalty
        const recentCategories = this.sessionCategories.slice(-3);
        const categoryCount = recentCategories.filter(c => c === article.category).length;
        score -= categoryCount * 3;
        
        // Penalize if seen
        const seen = Storage.getSeen();
        if (seen.includes(article.id)) {
            score -= 20;
        }
        
        return score;
    },

    // Sort articles by recommendation score
    rankArticles(articles) {
        return articles
            .map(article => ({
                article,
                score: this.scoreArticle(article)
            }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.article);
    },

    // Ensure diversity in results
    diversify(articles, maxConsecutive = 2) {
        const result = [];
        const remaining = [...articles];
        
        while (remaining.length > 0) {
            const lastCategories = result.slice(-maxConsecutive).map(a => a.category);
            
            // Find first article that doesn't violate diversity
            let found = false;
            for (let i = 0; i < remaining.length; i++) {
                const categoryCount = lastCategories.filter(c => c === remaining[i].category).length;
                if (categoryCount < maxConsecutive) {
                    result.push(remaining.splice(i, 1)[0]);
                    found = true;
                    break;
                }
            }
            
            // If all violate, just take the first one
            if (!found && remaining.length > 0) {
                result.push(remaining.shift());
            }
        }
        
        return result;
    },

    // Main recommendation function
    recommend(articles) {
        const ranked = this.rankArticles(articles);
        const diversified = this.diversify(ranked);
        return diversified;
    },

    // Track article view in session
    trackView(article) {
        this.sessionCategories.push(article.category);
        // Keep only last 20
        if (this.sessionCategories.length > 20) {
            this.sessionCategories.shift();
        }
    },

    // User interactions
    onLike(article) {
        Storage.addLike(article.id);
        this.updateScore(article.category, this.WEIGHTS.LIKE);
        
        if (article.tags) {
            article.tags.forEach(tag => {
                this.updateScore(tag, this.WEIGHTS.LIKE * 0.5);
            });
        }
        
        if (article.wikiCategories) {
            article.wikiCategories.forEach(cat => {
                this.updateScore(cat, this.WEIGHTS.LIKE * 0.3);
            });
        }
    },

    onUnlike(article) {
        Storage.removeLike(article.id);
        this.updateScore(article.category, this.WEIGHTS.UNLIKE);
    },

    onSave(article) {
        this.updateScore(article.category, this.WEIGHTS.SAVE);
    },

    onNotInterested(article) {
        this.updateScore(article.category, this.WEIGHTS.NOT_INTERESTED);
        
        if (article.tags) {
            article.tags.forEach(tag => {
                this.updateScore(tag, this.WEIGHTS.NOT_INTERESTED * 0.5);
            });
        }
        
        // Mark as seen so it won't show again
        Storage.markSeen(article.id);
    },

    onView(article, duration) {
        Storage.markSeen(article.id);
        this.trackView(article);
        
        if (duration < 800) {
            // Very fast skip
            this.updateScore(article.category, this.WEIGHTS.SKIP);
        } else if (duration < 1500) {
            // Quick skip
            this.updateScore(article.category, this.WEIGHTS.SHORT_READ);
        } else if (duration > 3000) {
            // Read with interest
            this.updateScore(article.category, this.WEIGHTS.LONG_READ);
        }
        // 1.5-3 seconds is neutral
    },

    onOpenSource(article) {
        // User wants to learn more - strong positive signal
        this.updateScore(article.category, this.WEIGHTS.SAVE);
        
        if (article.tags) {
            article.tags.forEach(tag => {
                this.updateScore(tag, this.WEIGHTS.LONG_READ);
            });
        }
    },

    // Get related article IDs from a liked article
    getRelatedArticles(article) {
        return article.relatedIds || [];
    },

    // Reset session (e.g., after 30 min inactivity)
    checkSession() {
        const inactivity = Date.now() - this.sessionStartTime;
        if (inactivity > 30 * 60 * 1000) {
            this.sessionCategories = [];
            this.sessionStartTime = Date.now();
        }
    },

    // Debug stats
    getStats() {
        return {
            weights: this.getWeights(),
            sessionCategories: this.sessionCategories,
            likes: Storage.getLikes().length,
            seen: Storage.getSeen().length,
            saved: Storage.getSaved().length
        };
    }
};
