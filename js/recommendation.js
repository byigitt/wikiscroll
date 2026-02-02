// Recommendation Engine
const Recommender = {
    // Category weights based on user interactions
    getWeights() {
        return Storage.getCategoryScores();
    },

    // Score an article based on user preferences
    scoreArticle(article) {
        const weights = this.getWeights();
        let score = Math.random() * 5; // Base randomness for discovery
        
        // Category boost
        if (weights[article.category]) {
            score += weights[article.category] * 3;
        }
        
        // Tag boost
        if (article.tags) {
            article.tags.forEach(tag => {
                if (weights[tag]) {
                    score += weights[tag] * 1.5;
                }
            });
        }
        
        // Penalize if already seen recently
        const seen = Storage.getSeen();
        if (seen.includes(article.id)) {
            score -= 10;
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

    // Ensure diversity - don't show same category too many times in a row
    diversify(articles) {
        const result = [];
        const maxConsecutive = 2;
        
        for (const article of articles) {
            const lastCategories = result.slice(-maxConsecutive).map(a => a.category);
            const categoryCount = lastCategories.filter(c => c === article.category).length;
            
            if (categoryCount < maxConsecutive) {
                result.push(article);
            } else {
                // Push to end of queue
                result.push(article);
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

    // Track user interactions
    onLike(article) {
        Storage.addLike(article.id);
        Storage.updateCategoryScore(article.category, 5);
        
        if (article.tags) {
            article.tags.forEach(tag => {
                Storage.updateCategoryScore(tag, 2);
            });
        }
    },

    onUnlike(article) {
        Storage.removeLike(article.id);
        Storage.updateCategoryScore(article.category, -3);
    },

    onView(article, duration) {
        Storage.markSeen(article.id);
        
        // Short view = not interested
        if (duration < 1500) {
            Storage.updateCategoryScore(article.category, -0.5);
        }
        // Medium view = somewhat interested
        else if (duration < 4000) {
            Storage.updateCategoryScore(article.category, 0.5);
        }
        // Long view = very interested
        else {
            Storage.updateCategoryScore(article.category, 1.5);
        }
    },

    // Get stats for debugging
    getStats() {
        return {
            weights: this.getWeights(),
            likes: Storage.getLikes().length,
            seen: Storage.getSeen().length
        };
    }
};
