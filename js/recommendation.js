const Recommender = {
    sessionCategories: [],
    sessionStartTime: Date.now(),

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

    DECAY_HALF_LIFE: 7 * 24 * 60 * 60 * 1000,

    applyTimeDecay(score, timestamp) {
        if (!timestamp) return score;
        const age = Date.now() - timestamp;
        return score * Math.pow(0.5, age / this.DECAY_HALF_LIFE);
    },

    getWeights() {
        const raw = Storage.getCategoryScores();
        const decayed = {};

        Object.entries(raw).forEach(([category, data]) => {
            if (typeof data === 'number') {
                decayed[category] = data * 0.5;
            } else if (data && typeof data === 'object') {
                decayed[category] = this.applyTimeDecay(data.score, data.timestamp);
            }
        });

        return decayed;
    },

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

        scores[category] = { score: newScore, timestamp: Date.now() };
        Storage.set(Storage.KEYS.CATEGORY_SCORES, scores);
        return scores;
    },

    scoreArticle(article) {
        const weights = this.getWeights();
        let score = Math.random() * 3;

        score += (weights[article.category] || 0) * 2;

        if (article.tags) {
            article.tags.forEach(tag => {
                score += weights[tag] || 0;
            });
        }

        if (article.wikiCategories) {
            article.wikiCategories.forEach(cat => {
                score += (weights[cat] || 0) * 0.5;
            });
        }

        if (article.isRelated) {
            score += this.WEIGHTS.RELATED_BOOST;
        }

        const recentCategories = this.sessionCategories.slice(-3);
        const categoryCount = recentCategories.filter(c => c === article.category).length;
        score -= categoryCount * 3;

        if (Storage.getSeen().includes(article.id)) {
            score -= 20;
        }

        return score;
    },

    rankArticles(articles) {
        return articles
            .map(article => ({ article, score: this.scoreArticle(article) }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.article);
    },

    diversify(articles, maxConsecutive = 2) {
        const result = [];
        const remaining = [...articles];

        while (remaining.length > 0) {
            const lastCategories = result.slice(-maxConsecutive).map(a => a.category);

            let found = false;
            for (let i = 0; i < remaining.length; i++) {
                const categoryCount = lastCategories.filter(c => c === remaining[i].category).length;
                if (categoryCount < maxConsecutive) {
                    result.push(remaining.splice(i, 1)[0]);
                    found = true;
                    break;
                }
            }

            if (!found && remaining.length > 0) {
                result.push(remaining.shift());
            }
        }

        return result;
    },

    recommend(articles) {
        return this.diversify(this.rankArticles(articles));
    },

    trackView(article) {
        this.sessionCategories.push(article.category);
        if (this.sessionCategories.length > 20) {
            this.sessionCategories.shift();
        }
    },

    updateTagScores(article, multiplier) {
        if (article.tags) {
            article.tags.forEach(tag => {
                this.updateScore(tag, this.WEIGHTS.LIKE * multiplier);
            });
        }
    },

    updateWikiCategoryScores(article, multiplier) {
        if (article.wikiCategories) {
            article.wikiCategories.forEach(cat => {
                this.updateScore(cat, this.WEIGHTS.LIKE * multiplier);
            });
        }
    },

    onLike(article) {
        Storage.addLike(article.id);
        this.updateScore(article.category, this.WEIGHTS.LIKE);
        this.updateTagScores(article, 0.5);
        this.updateWikiCategoryScores(article, 0.3);
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

        Storage.markSeen(article.id);
    },

    onView(article, duration) {
        Storage.markSeen(article.id);
        this.trackView(article);

        if (duration < 800) {
            this.updateScore(article.category, this.WEIGHTS.SKIP);
        } else if (duration < 1500) {
            this.updateScore(article.category, this.WEIGHTS.SHORT_READ);
        } else if (duration > 3000) {
            this.updateScore(article.category, this.WEIGHTS.LONG_READ);
        }
    },

    onOpenSource(article) {
        this.updateScore(article.category, this.WEIGHTS.SAVE);

        if (article.tags) {
            article.tags.forEach(tag => {
                this.updateScore(tag, this.WEIGHTS.LONG_READ);
            });
        }
    },

    getRelatedArticles(article) {
        return article.relatedIds || [];
    },

    checkSession() {
        const inactivity = Date.now() - this.sessionStartTime;
        if (inactivity > 30 * 60 * 1000) {
            this.sessionCategories = [];
            this.sessionStartTime = Date.now();
        }
    },

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
