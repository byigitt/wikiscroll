const Recommender = {
    getWeights() {
        return Storage.getCategoryScores();
    },

    scoreArticle(article) {
        const weights = this.getWeights();
        let score = Math.random() * 5;

        if (weights[article.category]) {
            score += weights[article.category] * 3;
        }

        if (article.tags) {
            article.tags.forEach(tag => {
                if (weights[tag]) {
                    score += weights[tag] * 1.5;
                }
            });
        }

        if (Storage.getSeen().includes(article.id)) {
            score -= 10;
        }

        return score;
    },

    rankArticles(articles) {
        return articles
            .map(article => ({ article, score: this.scoreArticle(article) }))
            .sort((a, b) => b.score - a.score)
            .map(item => item.article);
    },

    diversify(articles) {
        const result = [];
        const maxConsecutive = 2;

        for (const article of articles) {
            const lastCategories = result.slice(-maxConsecutive).map(a => a.category);
            const categoryCount = lastCategories.filter(c => c === article.category).length;

            if (categoryCount < maxConsecutive) {
                result.push(article);
            } else {
                result.push(article);
            }
        }

        return result;
    },

    recommend(articles) {
        return this.diversify(this.rankArticles(articles));
    },

    onLike(article) {
        Storage.addLike(article.id);
        Storage.updateCategoryScore(article.category, 5);

        if (article.tags) {
            article.tags.forEach(tag => Storage.updateCategoryScore(tag, 2));
        }
    },

    onUnlike(article) {
        Storage.removeLike(article.id);
        Storage.updateCategoryScore(article.category, -3);
    },

    onView(article, duration) {
        Storage.markSeen(article.id);

        if (duration < 1500) {
            Storage.updateCategoryScore(article.category, -0.5);
        } else if (duration < 4000) {
            Storage.updateCategoryScore(article.category, 0.5);
        } else {
            Storage.updateCategoryScore(article.category, 1.5);
        }
    }
};
