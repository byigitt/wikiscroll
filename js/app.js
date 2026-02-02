const App = {
    container: null,
    currentIndex: 0,
    facts: [],
    isLoading: false,
    language: 'tr',

    async init() {
        this.container = document.getElementById('cardsContainer');
        this.language = Storage.getPreferences().language || 'tr';
        Storage.removeDuplicates();
        this.showLoading();
        await this.loadArticles(10);
        this.renderCards();
        this.setupEvents();
        this.updateLangButtons();
    },

    showLoading() {
        this.container.innerHTML = '<div class="card"><div class="card-inner"><div class="spinner"></div></div></div>';
    },

    async loadArticles(count, forceRefresh = false) {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            if (this.facts.length === 0 && !forceRefresh) {
                const cached = Storage.getCache(this.language);
                if (cached && cached.length > 0) {
                    const seen = Storage.getSeen();
                    const unseen = cached.filter(a => !seen.includes(a.id));

                    if (unseen.length >= count) {
                        this.facts.push(...Recommender.recommend(unseen.slice(0, count)));
                        this.isLoading = false;
                        this.fetchAndCache(count);
                        return;
                    }

                    if (unseen.length > 0) {
                        this.facts.push(...Recommender.recommend(unseen));
                    }
                }
            }

            const seen = Storage.getSeen();
            const currentIds = this.facts.map(f => f.id);
            let newFacts = [];
            let retries = 0;

            while (newFacts.length < count && retries < 5) {
                const [articles, onThisDay] = await Promise.all([
                    WikiAPI.getRandomArticles(count, this.language),
                    this.facts.length === 0 && retries === 0 ? WikiAPI.getOnThisDay(this.language) : Promise.resolve([])
                ]);

                const filtered = [...articles, ...onThisDay.slice(0, 2)]
                    .filter(Boolean)
                    .filter(a => !seen.includes(a.id) && !currentIds.includes(a.id) && !newFacts.some(f => f.id === a.id));

                newFacts.push(...filtered);
                retries++;

                if (filtered.length > 0) break;
            }

            newFacts = newFacts.slice(0, count);
            Storage.addToCache(this.language, newFacts);
            this.facts.push(...Recommender.recommend(newFacts));
        } catch {
            const cached = Storage.getCache(this.language);
            if (cached && cached.length > 0) {
                this.facts.push(...Recommender.recommend(cached));
            }
        }

        this.isLoading = false;
    },

    async fetchAndCache(count) {
        try {
            const articles = await WikiAPI.getRandomArticles(count * 2, this.language);
            const existing = Storage.getCache(this.language) || [];
            const existingIds = existing.map(a => a.id);
            const unique = articles.filter(a => !existingIds.includes(a.id));

            if (unique.length > 0) {
                Storage.addToCache(this.language, unique);
            }
        } catch {}
    },

    renderCards() {
        this.container.innerHTML = '';
        this.facts.forEach((fact, i) => this.createCard(fact, i));
        this.updateCurrentCard();
    },

    createCard(fact, index) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = index;
        card.dataset.category = fact.category || 'kultur';

        const labels = {
            bilim: '🔬 Bilim', tarih: '📜 Tarih', doga: '🌿 Doga',
            kultur: '🎭 Kultur', teknoloji: '💻 Teknoloji', insan: '👤 Insan'
        };

        const thumbnail = fact.thumbnail
            ? `<img src="${fact.thumbnail}" class="card-thumbnail" alt="" onerror="this.remove()">`
            : '';

        card.innerHTML = `
            <div class="card-inner">
                ${thumbnail}
                <div class="card-emoji">${fact.emoji || '💡'}</div>
                <div class="card-category">${labels[fact.category] || fact.category}</div>
                <p class="card-fact">${fact.hook}</p>
                <div class="card-source">${fact.source?.title || ''}</div>
            </div>
        `;

        this.setupCardInteractions(card);
        this.container.appendChild(card);
    },

    setupCardInteractions(card) {
        let lastTap = 0;
        card.addEventListener('click', (e) => {
            if (Date.now() - lastTap < 300) {
                this.doLike(e.clientX, e.clientY);
            }
            lastTap = Date.now();
        });

        let pressTimer;
        const sideNav = document.querySelector('.side-nav');
        const hideNav = () => sideNav?.classList.add('hidden');
        const showNav = () => sideNav?.classList.remove('hidden');

        const startPress = () => { pressTimer = setTimeout(hideNav, 150); };
        const endPress = () => { clearTimeout(pressTimer); showNav(); };

        card.addEventListener('mousedown', startPress);
        card.addEventListener('mouseup', endPress);
        card.addEventListener('mouseleave', endPress);
        card.addEventListener('touchstart', startPress, { passive: true });
        card.addEventListener('touchend', endPress);
    },

    setupEvents() {
        let scrollTimeout;
        this.container.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.onScrollEnd(), 50);
        }, { passive: true });

        document.getElementById('likeBtn').addEventListener('click', () => this.toggleLike());
        document.getElementById('shareBtn').addEventListener('click', () => this.share());
        document.getElementById('sourceBtn').addEventListener('click', () => this.openSource());
        document.getElementById('saveBtn').addEventListener('click', () => this.toggleSave());
        document.getElementById('savedListBtn').addEventListener('click', () => this.showSavedModal());
        document.getElementById('savedClose').addEventListener('click', () => this.hideSavedModal());
        document.getElementById('resetBtn').addEventListener('click', () => this.showResetModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.hideResetModal());
        document.getElementById('modalConfirm').addEventListener('click', () => this.confirmReset());
        document.getElementById('infoBtn').addEventListener('click', () => this.showInfoModal());
        document.getElementById('infoClose').addEventListener('click', () => this.hideInfoModal());
        document.getElementById('notInterestedBtn').addEventListener('click', () => this.notInterested());

        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchLanguage(btn.dataset.lang));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault();
                this.scrollTo(this.currentIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.scrollTo(this.currentIndex - 1);
            } else if (e.key === 'l') {
                this.toggleLike();
            }
        });

        setTimeout(() => document.getElementById('scrollHint')?.classList.add('hidden'), 4000);
    },

    onScrollEnd() {
        const cardHeight = this.container.clientHeight;
        const newIndex = Math.round(this.container.scrollTop / cardHeight);

        if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.facts.length) {
            if (this.facts[this.currentIndex]) {
                Recommender.onView(this.facts[this.currentIndex], 2000);
            }
            this.currentIndex = newIndex;
            this.updateCurrentCard();
        }

        if (this.currentIndex >= this.facts.length - 3) {
            this.loadMore();
        }
    },

    async loadMore() {
        if (this.isLoading) return;

        const prevLength = this.facts.length;
        await this.loadArticles(5);

        this.facts.slice(prevLength).forEach((fact, i) => {
            this.createCard(fact, prevLength + i);
        });
    },

    scrollTo(index) {
        if (index < 0 || index >= this.facts.length) return;
        this.container.querySelectorAll('.card')[index]?.scrollIntoView({ behavior: 'smooth' });
    },

    updateCurrentCard() {
        this.updateLikeButton();
        this.updateSaveButton();
        document.getElementById('scrollHint')?.classList.add('hidden');
    },

    getCurrentFact() {
        return this.facts[this.currentIndex];
    },

    toggleLike() {
        const fact = this.getCurrentFact();
        if (!fact) return;

        const btn = document.getElementById('likeBtn');
        const isLiked = Storage.isLiked(fact.id);

        if (isLiked) {
            Recommender.onUnlike(fact);
            btn.classList.remove('liked');
        } else {
            Recommender.onLike(fact);
            btn.classList.add('liked');
            this.showLikeBurst(window.innerWidth / 2, window.innerHeight / 2);
        }
    },

    doLike(x, y) {
        const fact = this.getCurrentFact();
        if (!fact) return;

        const btn = document.getElementById('likeBtn');
        const isLiked = Storage.isLiked(fact.id);

        if (isLiked) {
            Recommender.onUnlike(fact);
            btn.classList.remove('liked');
        } else {
            Recommender.onLike(fact);
            btn.classList.add('liked');
            this.showLikeBurst(x, y);
        }
    },

    updateLikeButton() {
        const fact = this.getCurrentFact();
        if (!fact) return;
        document.getElementById('likeBtn').classList.toggle('liked', Storage.isLiked(fact.id));
    },

    showLikeBurst(x, y) {
        const burst = document.createElement('div');
        burst.className = 'like-burst';
        burst.style.left = (x - 50) + 'px';
        burst.style.top = (y - 50) + 'px';
        burst.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 600);
    },

    share() {
        const fact = this.getCurrentFact();
        if (!fact) return;

        const text = fact.hook;
        const url = fact.source?.url || '';

        if (navigator.share) {
            navigator.share({ text, url });
        } else {
            navigator.clipboard.writeText(`${text}\n\n${url}`);
            this.toast('Kopyalandi!');
        }
    },

    toast(msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:140px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:12px 24px;border-radius:8px;z-index:999;';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    },

    openSource() {
        const fact = this.getCurrentFact();
        if (!fact?.source?.url) return;

        Recommender.onOpenSource(fact);
        window.open(fact.source.url, '_blank');
    },

    async switchLanguage(lang) {
        if (lang === this.language) return;
        this.language = lang;
        Storage.setPreference('language', lang);
        this.updateLangButtons();

        this.facts = [];
        this.currentIndex = 0;
        this.showLoading();
        await this.loadArticles(10);
        this.renderCards();
    },

    updateLangButtons() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.language);
        });

        const isEn = this.language === 'en';
        document.getElementById('likeBtn').dataset.tooltip = isEn ? 'Like' : 'Beğen';
        document.getElementById('saveBtn').dataset.tooltip = isEn ? 'Save' : 'Kaydet';
        document.getElementById('shareBtn').dataset.tooltip = isEn ? 'Share' : 'Paylaş';
        document.getElementById('sourceBtn').dataset.tooltip = isEn ? 'Source' : 'Kaynak';
        document.getElementById('notInterestedBtn').dataset.tooltip = isEn ? 'Not interested' : 'İlgilenmiyorum';
    },

    showResetModal() {
        const modal = document.getElementById('resetModal');
        modal.classList.add('active');

        const isEn = this.language === 'en';
        modal.querySelector('.modal-title').textContent = isEn ? 'Reset' : 'Sifirla';
        modal.querySelector('.modal-text').textContent = isEn
            ? 'Reset all preferences and likes?'
            : 'Tum tercihler ve begeniler sifirlansin mi?';
        modal.querySelector('#modalCancel').textContent = isEn ? 'Cancel' : 'Vazgec';
        modal.querySelector('#modalConfirm').textContent = isEn ? 'Reset' : 'Sifirla';
    },

    hideResetModal() {
        document.getElementById('resetModal').classList.remove('active');
    },

    async confirmReset() {
        this.hideResetModal();
        Storage.clearAll();

        this.facts = [];
        this.currentIndex = 0;

        this.showLoading();
        await this.loadArticles(10, true);
        this.renderCards();

        this.toast(this.language === 'en' ? 'Reset complete' : 'Sifirlandi');
    },

    showInfoModal() {
        const modal = document.getElementById('infoModal');
        modal.classList.add('active');

        const isEn = this.language === 'en';
        modal.querySelector('.modal-text').innerHTML = isEn
            ? 'A TikTok-style scrolling platform that serves random facts from Wikipedia.<br><br>The more you like, the better the algorithm learns your interests.'
            : 'Wikipedia\'dan rastgele bilgiler sunan, TikTok tarzi kaydirmali bir bilgi platformu.<br><br>Begendikce algoritma seni tanir ve ilgi alanlarina gore icerik onerir.';
        modal.querySelector('.modal-author').innerHTML = isEn
            ? 'Made by: <a href="https://bayburt.lu" target="_blank" rel="noopener">Baris Bayburtlu</a>'
            : 'Yapimci: <a href="https://bayburt.lu" target="_blank" rel="noopener">Baris Bayburtlu</a>';
        modal.querySelector('#infoClose').textContent = isEn ? 'Close' : 'Kapat';
    },

    hideInfoModal() {
        document.getElementById('infoModal').classList.remove('active');
    },

    toggleSave() {
        const fact = this.getCurrentFact();
        if (!fact) return;

        const btn = document.getElementById('saveBtn');

        if (Storage.isSaved(fact.id)) {
            Storage.unsaveArticle(fact.id);
            btn.classList.remove('saved');
        } else {
            Storage.saveArticle(fact);
            Recommender.onSave(fact);
            btn.classList.add('saved');
            this.toast(this.language === 'en' ? 'Saved!' : 'Kaydedildi!');
        }
    },

    updateSaveButton() {
        const fact = this.getCurrentFact();
        if (!fact) return;
        document.getElementById('saveBtn').classList.toggle('saved', Storage.isSaved(fact.id));
    },

    showSavedModal() {
        const modal = document.getElementById('savedModal');
        const list = document.getElementById('savedList');
        const saved = Storage.getSaved();
        const isEn = this.language === 'en';

        modal.querySelector('.modal-title').textContent = isEn ? 'Saved' : 'Kaydedilenler';

        if (saved.length === 0) {
            list.innerHTML = `<div class="saved-empty">${isEn ? 'No saved items yet' : 'Henuz kayit yok'}</div>`;
        } else {
            list.innerHTML = saved.map(item => `
                <div class="saved-item" data-id="${item.id}">
                    <div class="saved-item-emoji">${item.emoji || '💡'}</div>
                    <div class="saved-item-content">
                        <div class="saved-item-text">${item.hook}</div>
                        <div class="saved-item-meta">
                            <span class="saved-item-source">${item.source?.title || ''}</span>
                            <button class="saved-item-remove" data-id="${item.id}">${isEn ? 'Remove' : 'Kaldir'}</button>
                        </div>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.saved-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.classList.contains('saved-item-remove')) return;
                    const item = saved.find(s => s.id === el.dataset.id);
                    if (item?.source?.url) window.open(item.source.url, '_blank');
                });
            });

            list.querySelectorAll('.saved-item-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Storage.unsaveArticle(btn.dataset.id);
                    this.showSavedModal();
                    this.updateSaveButton();
                });
            });
        }

        modal.classList.add('active');
    },

    hideSavedModal() {
        document.getElementById('savedModal').classList.remove('active');
    },

    notInterested() {
        const fact = this.getCurrentFact();
        if (!fact) return;

        Recommender.onNotInterested(fact);

        const currentCard = this.container.querySelectorAll('.card')[this.currentIndex];
        if (currentCard) {
            currentCard.style.opacity = '0';
            currentCard.style.transform = 'translateX(-100%)';
            currentCard.style.transition = 'all 0.3s ease';
        }

        setTimeout(() => {
            this.facts.splice(this.currentIndex, 1);
            this.renderCards();

            if (this.currentIndex >= this.facts.length) {
                this.currentIndex = Math.max(0, this.facts.length - 1);
            }
            this.scrollTo(this.currentIndex);

            if (this.facts.length < 5) {
                this.loadMore();
            }
        }, 300);

        this.toast(this.language === 'en' ? 'Got it, showing less like this' : 'Anlasildi, benzeri daha az gosterilecek');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
