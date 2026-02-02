// WikiScroll App
const App = {
    container: null,
    currentIndex: 0,
    facts: [],
    isLoading: false,
    language: 'tr',

    async init() {
        this.container = document.getElementById('cardsContainer');
        this.language = Storage.getPreferences().language || 'tr';
        
        // Clean up any duplicates from previous sessions
        const removed = Storage.removeDuplicates();
        if (removed > 0) {
            console.log(`Cleaned ${removed} duplicate articles from cache`);
        }
        
        this.showLoading();
        await this.loadArticles(10);
        this.renderCards();
        this.setupEvents();
        this.updateLangButtons();
    },

    showLoading() {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-inner">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
    },

    async loadArticles(count, forceRefresh = false) {
        if (this.isLoading) return;
        this.isLoading = true;
        
        console.log('--- loadArticles START ---');
        console.log('forceRefresh:', forceRefresh);
        console.log('current facts:', this.facts.length);
        console.log('language:', this.language);
        
        try {
            // Try cache first (only on initial load)
            if (this.facts.length === 0 && !forceRefresh) {
                console.log('Checking cache...');
                const cached = Storage.getCache(this.language);
                console.log('Cache result:', cached ? `${cached.length} articles` : 'null/expired');
                
                if (cached && cached.length > 0) {
                    // Filter out already seen articles
                    const seen = Storage.getSeen();
                    const unseen = cached.filter(a => !seen.includes(a.id));
                    console.log(`Unseen articles: ${unseen.length}/${cached.length}`);
                    
                    if (unseen.length >= count) {
                        const sorted = Recommender.recommend(unseen.slice(0, count));
                        this.facts.push(...sorted);
                        console.log(`✅ Loaded ${sorted.length} from CACHE (unseen). Total: ${this.facts.length}`);
                        this.isLoading = false;
                        
                        // Fetch new in background
                        this.fetchAndCache(count);
                        return;
                    } else if (unseen.length > 0) {
                        // Use what we have, then fetch more
                        const sorted = Recommender.recommend(unseen);
                        this.facts.push(...sorted);
                        console.log(`✅ Loaded ${sorted.length} unseen from CACHE, need more...`);
                    }
                }
                console.log('Cache miss or not enough unseen articles, fetching from API...');
            }
            
            // Fetch from API with retry for duplicates
            console.log('Fetching from API...');
            const seen = Storage.getSeen();
            const currentIds = this.facts.map(f => f.id);
            
            let newFacts = [];
            let retries = 0;
            const maxRetries = 5;
            
            while (newFacts.length < count && retries < maxRetries) {
                const [articles, onThisDay] = await Promise.all([
                    WikiAPI.getRandomArticles(count, this.language),
                    this.facts.length === 0 && retries === 0 ? WikiAPI.getOnThisDay(this.language) : Promise.resolve([])
                ]);
                
                // Filter out duplicates
                const filtered = [...articles, ...onThisDay.slice(0, 2)]
                    .filter(Boolean)
                    .filter(a => {
                        const isDuplicate = seen.includes(a.id) || 
                                           currentIds.includes(a.id) || 
                                           newFacts.some(f => f.id === a.id);
                        return !isDuplicate;
                    });
                
                newFacts.push(...filtered);
                retries++;
                
                console.log(`Retry ${retries}: got ${filtered.length} unique, total ${newFacts.length}/${count}`);
                
                if (filtered.length > 0) break; // Got some new content, stop retrying
            }
            
            // Trim to requested count
            newFacts = newFacts.slice(0, count);
            console.log(`Fetched ${newFacts.length} articles from API`);
            
            // Save to cache
            Storage.addToCache(this.language, newFacts);
            console.log('Saved to cache');
            
            // Apply recommendation sorting
            const sorted = Recommender.recommend(newFacts);
            this.facts.push(...sorted);
            
            console.log(`✅ Loaded ${sorted.length} from API. Total: ${this.facts.length}`);
        } catch (e) {
            console.error('Load failed:', e);
            
            // Fallback to cache on error
            const cached = Storage.getCache(this.language);
            if (cached && cached.length > 0) {
                const sorted = Recommender.recommend(cached);
                this.facts.push(...sorted);
                console.log('✅ Loaded from cache (fallback)');
            }
        }
        
        this.isLoading = false;
        console.log('--- loadArticles END ---');
    },

    async fetchAndCache(count) {
        // Background fetch for fresh content
        try {
            const articles = await WikiAPI.getRandomArticles(count * 2, this.language);
            // Filter duplicates before caching
            const existing = Storage.getCache(this.language) || [];
            const existingIds = existing.map(a => a.id);
            const unique = articles.filter(a => !existingIds.includes(a.id));
            
            if (unique.length > 0) {
                Storage.addToCache(this.language, unique);
                console.log(`Cached ${unique.length} new unique articles in background`);
            }
        } catch (e) {
            console.error('Background fetch failed:', e);
        }
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
            bilim: '🔬 Bilim', tarih: '📜 Tarih', doga: '🌿 Doğa',
            kultur: '🎭 Kültür', teknoloji: '💻 Teknoloji', insan: '👤 İnsan'
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
        
        // Double tap like
        let lastTap = 0;
        card.addEventListener('click', (e) => {
            if (Date.now() - lastTap < 300) {
                this.doLike(e.clientX, e.clientY);
            }
            lastTap = Date.now();
        });
        
        this.container.appendChild(card);
    },

    addNewCards(newFacts) {
        newFacts.forEach((fact, i) => {
            this.createCard(fact, this.facts.length - newFacts.length + i);
        });
    },

    setupEvents() {
        // Scroll event for infinite loading & tracking
        let scrollTimeout;
        this.container.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.onScrollEnd(), 50);
        }, { passive: true });

        // Buttons
        document.getElementById('likeBtn').addEventListener('click', () => this.toggleLike());
        document.getElementById('shareBtn').addEventListener('click', () => this.share());
        document.getElementById('sourceBtn').addEventListener('click', () => this.openSource());

        // Language
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchLanguage(btn.dataset.lang));
        });

        // Reset
        document.getElementById('resetBtn').addEventListener('click', () => this.showResetModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.hideResetModal());
        document.getElementById('modalConfirm').addEventListener('click', () => this.confirmReset());

        // Info
        document.getElementById('infoBtn').addEventListener('click', () => this.showInfoModal());
        document.getElementById('infoClose').addEventListener('click', () => this.hideInfoModal());

        // Save
        document.getElementById('saveBtn').addEventListener('click', () => this.toggleSave());
        document.getElementById('savedListBtn').addEventListener('click', () => this.showSavedModal());
        document.getElementById('savedClose').addEventListener('click', () => this.hideSavedModal());

        // Keyboard
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

        // Hide hint
        setTimeout(() => {
            document.getElementById('scrollHint')?.classList.add('hidden');
        }, 4000);
    },

    onScrollEnd() {
        const cards = this.container.querySelectorAll('.card');
        const containerTop = this.container.scrollTop;
        const cardHeight = this.container.clientHeight;
        
        // Find current card
        const newIndex = Math.round(containerTop / cardHeight);
        
        if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.facts.length) {
            // Track previous card view
            if (this.facts[this.currentIndex]) {
                Recommender.onView(this.facts[this.currentIndex], 2000);
            }
            
            this.currentIndex = newIndex;
            this.updateCurrentCard();
        }
        
        // Load more if near end (3 cards before end)
        if (this.currentIndex >= this.facts.length - 3) {
            this.loadMore();
        }
    },

    async loadMore() {
        if (this.isLoading) return;
        
        const prevLength = this.facts.length;
        await this.loadArticles(5);
        
        // Add only new cards
        const newFacts = this.facts.slice(prevLength);
        this.addNewCards(newFacts);
        
        console.log('Added cards. Current index:', this.currentIndex, 'Total:', this.facts.length);
    },

    scrollTo(index) {
        if (index < 0 || index >= this.facts.length) return;
        const cards = this.container.querySelectorAll('.card');
        cards[index]?.scrollIntoView({ behavior: 'smooth' });
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
        
        const btn = document.getElementById('likeBtn');
        const isLiked = Storage.isLiked(fact.id);
        btn.classList.toggle('liked', isLiked);
    },

    showLikeBurst(x, y) {
        const burst = document.createElement('div');
        burst.className = 'like-burst';
        burst.style.left = (x - 50) + 'px';
        burst.style.top = (y - 50) + 'px';
        burst.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
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
            this.toast('Kopyalandı!');
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
        const url = this.getCurrentFact()?.source?.url;
        if (url) window.open(url, '_blank');
    },

    async switchLanguage(lang) {
        if (lang === this.language) return;
        this.language = lang;
        Storage.setPreference('language', lang);
        this.updateLangButtons();
        
        // Reset
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
        document.querySelector('#likeBtn .label').textContent = isEn ? 'Like' : 'Beğen';
        document.querySelector('#saveBtn .label').textContent = isEn ? 'Save' : 'Kaydet';
        document.querySelector('#shareBtn .label').textContent = isEn ? 'Share' : 'Paylaş';
        document.querySelector('#sourceBtn .label').textContent = isEn ? 'Source' : 'Kaynak';
    },

    showResetModal() {
        const modal = document.getElementById('resetModal');
        modal.classList.add('active');
        
        // Update text based on language
        const isEn = this.language === 'en';
        modal.querySelector('.modal-title').textContent = isEn ? 'Reset' : 'Sıfırla';
        modal.querySelector('.modal-text').textContent = isEn 
            ? 'Reset all preferences and likes?' 
            : 'Tüm tercihler ve beğeniler sıfırlansın mı?';
        modal.querySelector('#modalCancel').textContent = isEn ? 'Cancel' : 'Vazgeç';
        modal.querySelector('#modalConfirm').textContent = isEn ? 'Reset' : 'Sıfırla';
    },

    hideResetModal() {
        document.getElementById('resetModal').classList.remove('active');
    },

    async confirmReset() {
        this.hideResetModal();
        
        Storage.clearAll();
        
        // Reset state
        this.facts = [];
        this.currentIndex = 0;
        
        // Reload (force refresh from API)
        this.showLoading();
        await this.loadArticles(10, true);
        this.renderCards();
        
        this.toast(this.language === 'en' ? 'Reset complete' : 'Sıfırlandı');
    },

    showInfoModal() {
        const modal = document.getElementById('infoModal');
        modal.classList.add('active');
        
        const isEn = this.language === 'en';
        modal.querySelector('.modal-text').innerHTML = isEn
            ? 'A TikTok-style scrolling platform that serves random facts from Wikipedia.<br><br>The more you like, the better the algorithm learns your interests.'
            : 'Wikipedia\'dan rastgele bilgiler sunan, TikTok tarzı kaydırmalı bir bilgi platformu.<br><br>Beğendikçe algoritma seni tanır ve ilgi alanlarına göre içerik önerir.';
        modal.querySelector('.modal-author').innerHTML = isEn
            ? 'Made by: <a href="https://bayburt.lu" target="_blank" rel="noopener">Barış Bayburtlu</a>'
            : 'Yapımcı: <a href="https://bayburt.lu" target="_blank" rel="noopener">Barış Bayburtlu</a>';
        modal.querySelector('#infoClose').textContent = isEn ? 'Close' : 'Kapat';
    },

    hideInfoModal() {
        document.getElementById('infoModal').classList.remove('active');
    },

    toggleSave() {
        const fact = this.getCurrentFact();
        if (!fact) return;
        
        const btn = document.getElementById('saveBtn');
        const isSaved = Storage.isSaved(fact.id);
        
        if (isSaved) {
            Storage.unsaveArticle(fact.id);
            btn.classList.remove('saved');
        } else {
            Storage.saveArticle(fact);
            btn.classList.add('saved');
            this.toast(this.language === 'en' ? 'Saved!' : 'Kaydedildi!');
        }
    },

    updateSaveButton() {
        const fact = this.getCurrentFact();
        if (!fact) return;
        
        const btn = document.getElementById('saveBtn');
        const isSaved = Storage.isSaved(fact.id);
        btn.classList.toggle('saved', isSaved);
    },

    showSavedModal() {
        const modal = document.getElementById('savedModal');
        const list = document.getElementById('savedList');
        const saved = Storage.getSaved();
        
        const isEn = this.language === 'en';
        modal.querySelector('.modal-title').textContent = isEn ? 'Saved' : 'Kaydedilenler';
        
        if (saved.length === 0) {
            list.innerHTML = `<div class="saved-empty">${isEn ? 'No saved items yet' : 'Henüz kayıt yok'}</div>`;
        } else {
            list.innerHTML = saved.map(item => `
                <div class="saved-item" data-id="${item.id}">
                    <div class="saved-item-emoji">${item.emoji || '💡'}</div>
                    <div class="saved-item-content">
                        <div class="saved-item-text">${item.hook}</div>
                        <div class="saved-item-meta">
                            <span class="saved-item-source">${item.source?.title || ''}</span>
                            <button class="saved-item-remove" data-id="${item.id}">${isEn ? 'Remove' : 'Kaldır'}</button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Add click handlers
            list.querySelectorAll('.saved-item').forEach(el => {
                el.addEventListener('click', (e) => {
                    if (e.target.classList.contains('saved-item-remove')) return;
                    const id = el.dataset.id;
                    const item = saved.find(s => s.id === id);
                    if (item?.source?.url) {
                        window.open(item.source.url, '_blank');
                    }
                });
            });
            
            list.querySelectorAll('.saved-item-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    Storage.unsaveArticle(id);
                    this.showSavedModal(); // Refresh list
                    this.updateSaveButton();
                });
            });
        }
        
        modal.classList.add('active');
    },

    hideSavedModal() {
        document.getElementById('savedModal').classList.remove('active');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
