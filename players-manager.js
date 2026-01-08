class PlayersManager {
    constructor(app) {
        this.app = app;
        this.container = document.querySelector('.players-list-content');
        this.playersData = [];
        this.currentSearch = '';
        this.selectedPlayerIndex = 0;
    }

    async load() {
        this.container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Calculating player stats...</p>
            </div>
        `;

        try {
            if (!this.app.levelsData || this.app.levelsData.length === 0) {
                const leaderboard = await api.getLeaderboard();
                if (!leaderboard || !leaderboard.level_order) throw new Error('No leaderboard data');
                
                const promises = leaderboard.level_order.map(id => api.getLevel(id));
                const results = await Promise.allSettled(promises);
                
                this.app.levelsData = [];
                results.forEach((res, index) => {
                    if (res.status === 'fulfilled' && res.value) {
                        res.value.id = leaderboard.level_order[index];
                        this.app.levelsData.push(res.value);
                    }
                });
            }

            this.calculateStats();
            this.renderLayout();
            this.renderPlayerList();
            
            if (this.playersData.length > 0) {
                this.selectPlayer(0);
            }
        } catch (error) {
            console.error('Error loading players:', error);
            this.container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load players</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }

    calculateStats() {
        const playersMap = new Map();

        this.app.levelsData.forEach((level, levelIndex) => {
            if (!level.players) return;
            
            const levelPoints = parseFloat(level.points) || 0;
            const levelRank = levelIndex + 1;

            level.players.forEach(record => {
                if (parseInt(record.progress) === 100) {
                    const username = record.username;
                    const normalizedName = username.toLowerCase();

                    if (!playersMap.has(normalizedName)) {
                        playersMap.set(normalizedName, {
                            username: username,
                            country: record.country,
                            totalPoints: 0,
                            completedLevels: [],
                            osc: null,
                            attemptsFor1: null,
                            skillSets: null,
                            limitPercent: null,
                            role: null
                        });
                    }

                    const playerData = playersMap.get(normalizedName);
                    
                    if (record.country && !playerData.country) {
                        playerData.country = record.country;
                    }

                    if (record.osc !== undefined && record.osc !== null) playerData.osc = record.osc;
                    if (record.attempts_for_1 !== undefined && record.attempts_for_1 !== null) {
                        playerData.attemptsFor1 = record.attempts_for_1;
                    }
                    if (record.skill_sets !== undefined && record.skill_sets !== null) playerData.skillSets = record.skill_sets;
                    if (record.limit_percent !== undefined && record.limit_percent !== null) playerData.limitPercent = record.limit_percent;

                    if (record.role !== undefined && record.role !== null) {
                        playerData.role = record.role;
                    }

                    playerData.totalPoints += levelPoints;
                    playerData.completedLevels.push({
                        id: level.id,
                        name: level.name,
                        points: levelPoints,
                        rank: levelRank,
                        phase: level.phase
                    });
                }
            });
        });

        this.playersData = Array.from(playersMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);

        this.playersData.forEach((player, index) => {
            player.rank = index + 1;
            player.completedLevels.sort((a, b) => b.points - a.points);
            player.hardestLevel = player.completedLevels.length > 0 ? player.completedLevels[0] : null;
        });
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="players-layout">
                <div class="players-sidebar">
                    <div class="player-search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="player-search-input" placeholder="Search player...">
                    </div>
                    <div class="players-list-scroll" id="players-list-container"></div>
                </div>
                <div class="player-detail-wrapper" id="player-detail-container"></div>
            </div>
        `;

        const searchInput = document.getElementById('player-search-input');
        searchInput.addEventListener('input', (e) => {
            this.currentSearch = e.target.value.toLowerCase();
            this.renderPlayerList();
        });
    }

    renderPlayerList() {
        const listContainer = document.getElementById('players-list-container');
        listContainer.innerHTML = '';

        const filteredPlayers = this.playersData.filter(p => 
            p.username.toLowerCase().includes(this.currentSearch)
        );

        if (filteredPlayers.length === 0) {
            listContainer.innerHTML = '<div class="players-empty">No players found</div>';
            return;
        }

        filteredPlayers.forEach((player) => {
            const item = document.createElement('div');
            const globalIndex = this.playersData.indexOf(player);
            
            item.className = `player-list-item ${globalIndex === this.selectedPlayerIndex ? 'active' : ''}`;
            item.onclick = () => this.selectPlayer(globalIndex);

            const flagHtml = player.country 
                ? `<img src="https://flagcdn.com/24x18/${player.country.toLowerCase()}.png" alt="${player.country}" class="player-flag-mini">` 
                : '<span class="no-flag"></span>';

            let statusIcon = '';
            if (player.role === 'ban') {
                statusIcon = '<i class="fas fa-ban status-icon icon-ban" title="Banned"></i>';
            } else if (player.role === 'leave') {
                statusIcon = '<i class="fas fa-user-slash status-icon icon-leave" title="Left Server"></i>';
            }

            item.innerHTML = `
                <span class="p-rank">#${player.rank}</span>
                <span class="p-name">
                    ${this.escapeHtml(player.username)}
                    ${statusIcon}
                </span>
                <div class="p-right">
                    <span class="p-points">${player.totalPoints.toFixed(1)} pts</span>
                    ${flagHtml}
                </div>
            `;
            listContainer.appendChild(item);
        });
    }

    selectPlayer(index) {
        this.selectedPlayerIndex = index;
        this.renderPlayerList(); 
        this.renderPlayerDetail(this.playersData[index]);

        if (window.innerWidth <= 768) {
             const detailContainer = document.getElementById('player-detail-container');
             detailContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    renderPlayerDetail(player) {
        const container = document.getElementById('player-detail-container');
        if (!player) {
            container.innerHTML = '';
            return;
        }

        const flagUrl = player.country ? `https://flagcdn.com/80x60/${player.country.toLowerCase()}.png` : null;

        let skillString = 'None';
        if (player.skillSets) {
            if (Array.isArray(player.skillSets)) {
                skillString = player.skillSets.join(', ');
            } else if (typeof player.skillSets === 'object') {
                skillString = Object.values(player.skillSets).join(', ');
            } else {
                skillString = String(player.skillSets);
            }
        }

        let statusIcon = '';
        if (player.role === 'ban') {
            statusIcon = '<i class="fas fa-ban status-icon icon-ban" title="Banned"></i>';
        } else if (player.role === 'leave') {
            statusIcon = '<i class="fas fa-user-slash status-icon icon-leave" title="Left Server"></i>';
        }

        const extraStatsHtml = `
            <div class="tooltip-container">
                <i class="fas fa-question-circle tooltip-icon"></i>
                <div class="tooltip-box player-tooltip">
                    <div class="pt-row">
                        <span class="pt-label">OSC:</span>
                        <span class="pt-val">${player.osc !== null ? player.osc : '-'}</span>
                    </div>
                    <div class="pt-row">
                        <span class="pt-label">1pt Att.:</span>
                        <span class="pt-val">${player.attemptsFor1 !== null ? player.attemptsFor1 : '-'}</span>
                    </div>
                    <div class="pt-row">
                        <span class="pt-label">Skills:</span>
                        <span class="pt-val">${this.escapeHtml(skillString)}</span>
                    </div>
                    <div class="pt-row">
                        <span class="pt-label">Limit:</span>
                        <span class="pt-val">${player.limitPercent !== null ? player.limitPercent + '%' : '-'}</span>
                    </div>
                    <div class="pt-divider"></div>
                    <div class="pt-footer">
                        Last update: 2025-01-04
                    </div>
                </div>
            </div>
        `;

        const html = `
            <div class="player-detail-card">
                <div class="pd-header">
                    ${flagUrl ? `<img src="${flagUrl}" class="pd-flag-large">` : ''}
                    <h2 class="pd-username">
                        ${this.escapeHtml(player.username)}
                        ${statusIcon}
                    </h2>
                    ${extraStatsHtml}
                </div>

                <div class="pd-stats-grid">
                    <div class="pd-stat-box">
                        <div class="pd-label">Global Rank</div>
                        <div class="pd-value">#${player.rank}</div>
                    </div>
                    <div class="pd-stat-box">
                        <div class="pd-label">Total Points</div>
                        <div class="pd-value highlight">${player.totalPoints.toFixed(1)}</div>
                    </div>
                    <div class="pd-stat-box full-width">
                        <div class="pd-label">Hardest Completion</div>
                        <div class="pd-value">
                            ${player.hardestLevel ? this.escapeHtml(player.hardestLevel.name) : 'N/A'}
                        </div>
                    </div>
                </div>

                <div class="pd-levels-section">
                    <h3 class="pd-subtitle">Completed Levels (${player.completedLevels.length})</h3>
                    <div class="pd-levels-list">
                        ${player.completedLevels.map(lvl => `
                            <div class="pd-level-item" onclick="app.openLevelDetail('${lvl.id}')">
                                <span class="lvl-name">#${lvl.rank} - ${this.escapeHtml(lvl.name)}</span>
                                <span class="lvl-points">${parseFloat(lvl.points).toFixed(1)} pts</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}