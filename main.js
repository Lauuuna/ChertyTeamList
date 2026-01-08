class App {
    constructor() {
        window.app = this;
        
        this.currentPage = 'main';
        this.levelsData = [];
        this.filteredLevels = [];
        this.isLoading = false;
        this.searchTerm = '';
        this.selectedPhases = new Set();
        this.allPhases = new Set();
        
        if (typeof LevelManager !== 'undefined') {
            this.levelManager = new LevelManager(this);
        } else {
            console.error('LevelManager class not found. Make sure level-manager.js is loaded.');
        }

        if (typeof PlayersManager !== 'undefined') {
            this.playersManager = new PlayersManager(this);
        } else {
            console.error('PlayersManager class not found.');
        }
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.handleInitialPage();
        this.setupDropdowns();
    }

    bindEvents() {
        document.querySelector('.logo-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchPage('main');
            window.history.pushState({}, '', '/');
            
            const dropdownItems = document.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(i => i.classList.remove('active'));
            document.querySelector('.dropdown-item[data-page="main"]').classList.add('active');
        });

        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
                
                const dropdownItems = document.querySelectorAll('.dropdown-item');
                dropdownItems.forEach(i => i.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFilterDropdown();
            });
        }

        const closeFilter = document.getElementById('close-filter');
        if (closeFilter) {
            closeFilter.addEventListener('click', () => {
                this.closeFilterDropdown();
            });
        }

        const applyFilters = document.getElementById('apply-filters');
        if (applyFilters) {
            applyFilters.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        document.addEventListener('click', (e) => {
            const filterDropdown = document.getElementById('filter-dropdown');
            const filterBtn = document.getElementById('filter-btn');
            if (filterDropdown && !filterDropdown.contains(e.target) && filterBtn && !filterBtn.contains(e.target)) {
                this.closeFilterDropdown();
            }
        });

        window.addEventListener('popstate', (event) => {
            this.handleInitialPage();
        });
    }

    handleInitialPage() {
        const path = window.location.pathname;
        
        if (path.startsWith('/level/')) {
            const levelId = path.split('/')[2];
            if (levelId) {
                this.openLevelDetail(levelId);
            } else {
                this.switchPage('main');
                this.loadMainPage();
            }
        } else {
            this.switchPage('main');
            this.loadMainPage();
        }
    }

    setupDropdowns() {
        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            const btn = dropdown.querySelector('.dropdown-btn');
            const content = dropdown.querySelector('.dropdown-content');
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                document.querySelectorAll('.dropdown-content').forEach(c => {
                    if (c !== content) {
                        c.style.opacity = '0';
                        c.style.visibility = 'hidden';
                        c.style.transform = 'translateY(-10px)';
                    }
                });
                
                if (content.style.opacity === '1') {
                    content.style.opacity = '0';
                    content.style.visibility = 'hidden';
                    content.style.transform = 'translateY(-10px)';
                } else {
                    content.style.opacity = '1';
                    content.style.visibility = 'visible';
                    content.style.transform = 'translateY(0)';
                }
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.style.opacity = '0';
                content.style.visibility = 'hidden';
                content.style.transform = 'translateY(-10px)';
            });
        });
    }

    toggleFilterDropdown() {
        const dropdown = document.getElementById('filter-dropdown');
        if (dropdown) dropdown.classList.toggle('show');
    }

    closeFilterDropdown() {
        const dropdown = document.getElementById('filter-dropdown');
        if (dropdown) dropdown.classList.remove('show');
    }

    switchPage(page) {
        if (this.currentPage === page && page !== 'level-detail') return;

        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        this.currentPage = page;
        let pageId;
        if (page === 'level-detail') {
            pageId = 'level-detail-page';
        } else {
            pageId = `${page}-page`;
        }
        
        const pageEl = document.getElementById(pageId);
        if (pageEl) {
            pageEl.classList.add('active');
            window.scrollTo(0, 0);
        }

        if (page === 'main') {
            this.loadMainPage();
        } else if (page === 'players') {
            if (this.playersManager) {
                this.playersManager.load();
            }
        }
    }

    openLevelDetail(levelId) {
        if (this.levelManager) {
            this.switchPage('level-detail');
            this.levelManager.loadLevel(levelId);
            
            const dropdownItems = document.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(i => i.classList.remove('active'));
            
            window.history.pushState({levelId: levelId}, '', `/level/${levelId}`);
        }
    }

    async loadMainPage() {
        const mainPage = document.getElementById('main-page');
        if (!mainPage.classList.contains('active')) {
            return;
        }
        
        if (this.isLoading) return;
        
        const levelsGrid = document.getElementById('levels-grid');
        const loading = document.querySelector('#main-page .loading');
        const noResults = document.getElementById('no-results');
        
        if (this.levelsData.length > 0) {
            this.renderLevels();
            return;
        }
        
        this.isLoading = true;
        if (levelsGrid) levelsGrid.innerHTML = '';
        if (loading) {
            loading.style.display = 'flex';
            loading.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Loading levels...</p>
            `;
        }
        if (noResults) noResults.style.display = 'none';
        
        try {
            const leaderboard = await api.getLeaderboard();
            if (!leaderboard || !leaderboard.level_order) {
                throw new Error('Invalid leaderboard data');
            }

            const levelIds = leaderboard.level_order;
            
            const levelPromises = levelIds.map(id => api.getLevel(id));
            const results = await Promise.allSettled(levelPromises);
            
            this.levelsData = [];
            
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result.status === 'fulfilled' && result.value) {
                    const levelData = result.value;
                    levelData.id = levelIds[i];
                    this.levelsData.push(levelData);
                }
            }

            if (this.levelsData.length === 0) {
                throw new Error('No levels loaded');
            }

            this.collectAllPhases();
            this.filteredLevels = [...this.levelsData];
            this.renderLevels();
            this.renderFilterOptions();
            
        } catch (error) {
            console.error('Failed to load levels:', error);
            if (loading) {
                loading.style.display = 'flex';
                loading.innerHTML = `
                    <div style="color: #ff5555; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Failed to load levels</p>
                        <p style="font-size: 0.9rem; color: #888; margin-top: 0.5rem;">${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #333; border: none; color: white; border-radius: 4px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            }
        } finally {
            this.isLoading = false;
            if (loading && this.levelsData.length > 0) {
                loading.style.display = 'none';
            }
        }
    }

    collectAllPhases() {
        this.allPhases.clear();
        this.levelsData.forEach(level => {
            if (level.phase) {
                this.allPhases.add(level.phase);
            }
        });
    }

    renderFilterOptions() {
        const filterOptions = document.getElementById('filter-options');
        if (!filterOptions) return;
        
        filterOptions.innerHTML = '';
        
        const sortedPhases = Array.from(this.allPhases)
            .sort((a, b) => {
                const numA = parseInt(a) || 0;
                const numB = parseInt(b) || 0;
                return numB - numA;
            });
        
        sortedPhases.forEach(phase => {
            const option = document.createElement('div');
            option.className = `filter-option ${this.selectedPhases.has(phase) ? 'active' : ''}`;
            option.innerHTML = `
                <div class="filter-checkbox"></div>
                <span class="filter-label">${phase}</span>
                <span class="filter-count-badge">${this.getPhaseCount(phase)}</span>
            `;
            
            option.addEventListener('click', () => {
                option.classList.toggle('active');
                
                if (option.classList.contains('active')) {
                    this.selectedPhases.add(phase);
                } else {
                    this.selectedPhases.delete(phase);
                }
                
                this.updateFilterCount();
            });
            
            filterOptions.appendChild(option);
        });
    }

    getPhaseCount(phase) {
        return this.levelsData.filter(level => level.phase === phase).length;
    }

    updateFilterCount() {
        const count = this.selectedPhases.size;
        const countEl = document.getElementById('filter-count');
        if (countEl) countEl.textContent = count;
    }

    performSearch() {
        const searchInput = document.getElementById('search-input');
        this.searchTerm = searchInput.value.trim().toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        this.closeFilterDropdown();
        
        this.filteredLevels = this.levelsData.filter(level => {
            const matchesSearch = !this.searchTerm || 
                (level.name && level.name.toLowerCase().includes(this.searchTerm));
            
            const matchesPhase = this.selectedPhases.size === 0 || 
                (level.phase && this.selectedPhases.has(level.phase));
            
            return matchesSearch && matchesPhase;
        });
        
        this.renderLevels();
        this.updateFilterCount();
    }

    clearFilters() {
        this.searchTerm = '';
        this.selectedPhases.clear();
        document.getElementById('search-input').value = '';
        this.applyFilters();
        this.renderFilterOptions();
        this.updateFilterCount();
    }

    showInList(levelId) {
        this.clearFilters();
        
        setTimeout(() => {
            const levelElement = document.querySelector(`[data-level-id="${levelId}"]`);
            if (levelElement) {
                levelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                levelElement.style.animation = 'none';
                setTimeout(() => {
                    levelElement.style.animation = 'pulse 1s';
                }, 10);
                
                setTimeout(() => {
                    levelElement.style.animation = '';
                }, 1100);
            }
        }, 100);
    }

    renderLevels() {
        const levelsGrid = document.getElementById('levels-grid');
        const loading = document.querySelector('#main-page .loading');
        const noResults = document.getElementById('no-results');
        
        if (!levelsGrid) return;
        
        if (loading) loading.style.display = 'none';
        
        levelsGrid.innerHTML = '';
        
        if (this.filteredLevels.length === 0) {
            if (noResults) noResults.style.display = 'block';
            levelsGrid.style.display = 'none';
            return;
        }
        
        if (noResults) noResults.style.display = 'none';
        levelsGrid.style.display = 'grid';
        
        this.filteredLevels.forEach((level, filteredIndex) => {
            const originalIndex = this.levelsData.findIndex(l => l.id === level.id) + 1;
            const levelCard = this.createLevelCard(level, originalIndex);
            levelsGrid.appendChild(levelCard);
        });
    }

    createLevelCard(level, originalPosition) {
        const card = document.createElement('div');
        card.className = 'level-card';
        card.dataset.levelId = level.id;
        
        const shouldShowButton = this.searchTerm || this.selectedPhases.size > 0;
        
        if (shouldShowButton) {
            card.classList.add('show-button');
        }
        
        const firstPlayer = level.players && level.players.length > 0 ? level.players[0] : null;
        const videoId = firstPlayer && firstPlayer.video_link ? 
            this.extractYoutubeId(firstPlayer.video_link) : null;
        const thumbnailUrl = videoId ? 
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="112" viewBox="0 0 200 112"><rect width="200" height="112" fill="%23222"/><text x="100" y="56" text-anchor="middle" fill="%23888" font-family="sans-serif" font-size="12">No Video</text></svg>';
        
        const phase = level.phase || '';

        card.innerHTML = `
            <div class="video-preview">
                <img src="${thumbnailUrl}" alt="${this.escapeHtml(level.name)}" loading="lazy" 
                     onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${videoId || 'dQw4w9WgXcQ'}/hqdefault.jpg'">
                ${firstPlayer && firstPlayer.video_link ? `
                    <div class="video-overlay">
                        <i class="fas fa-play play-icon"></i>
                    </div>
                ` : ''}
            </div>
            <div class="level-info">
                <div class="level-header">
                    <div class="level-position">#${originalPosition} -</div>
                    <div class="level-name">${this.escapeHtml(level.name)}</div>
                    ${phase ? `<div class="phase-badge">Phase: ${phase}</div>` : ''}
                </div>
                <div class="level-details">
                    <div class="points">Points: ${level.points || 0}</div>
                </div>
            </div>
            ${shouldShowButton ? `
                <button class="show-level-btn" data-level-id="${level.id}" title="Find in list">
                    <i class="fas fa-arrow-down"></i>
                </button>
            ` : ''}
        `;

        if (shouldShowButton) {
            const showBtn = card.querySelector('.show-level-btn');
            showBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showInList(level.id);
            });
        }

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.show-level-btn')) {
                e.preventDefault();
                this.openLevelDetail(level.id);
            }
        });

        return card;
    }

    extractYoutubeId(url) {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});

if (!document.getElementById('dynamic-styles')) {
    const style = document.createElement('style');
    style.id = 'dynamic-styles';
    style.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3); }
            70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
    `;
    document.head.appendChild(style);
}