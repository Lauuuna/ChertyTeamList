class LevelManager {
    constructor(app) {
        this.app = app;
        this.container = document.querySelector('.level-detail-content');
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.levelId) {
                this.loadLevel(event.state.levelId);
            }
        });
    }

    async loadLevel(levelId) {
        this.container.innerHTML = `
            <div class="loading" style="padding: 4rem;">
                <div class="loading-spinner"></div>
                <p>Retrieving level data...</p>
            </div>
        `;

        try {
            const levelData = await api.getLevel(levelId);
            if (!levelData) throw new Error('Level data not found');
            const leaderboard = await api.getLeaderboard();
            let position = "N/A";
            if (leaderboard && leaderboard.level_order) {
                const idx = leaderboard.level_order.findIndex(id => String(id) === String(levelId));
                if (idx !== -1) position = idx + 1;
            }
            
            this.renderLevel(levelData, position);
        } catch (error) {
            console.error('Error loading level:', error);
            this.container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load level</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }

    renderLevel(data, position) {
        const bestPlayer = data.players && data.players.length > 0 ? data.players[0] : null;
        const videoId = bestPlayer && bestPlayer.video_link ? this.app.extractYoutubeId(bestPlayer.video_link) : null;
        
        const sortedPlayers = data.players ? [...data.players].sort((a, b) => {
            return (parseInt(b.progress) || 0) - (parseInt(a.progress) || 0);
        }) : [];

        const html = `
            <div class="ld-grid">
                <div class="ld-video-section">
                    <div class="ld-video-container">
                        ${videoId ? `
                            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&showinfo=0" 
                                    allowfullscreen 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                            </iframe>
                        ` : `
                            <div class="ld-video-placeholder">
                                <i class="fab fa-youtube"></i>
                                <p>No Verification Video Available</p>
                            </div>
                        `}
                    </div>
                </div>

                <div class="ld-stats-sidebar">
                    <div class="ld-stats-card">
                        <div class="ld-stat-group">
                            <span class="ld-stat-label">Level Details</span>
                            <div style="font-size: 0.9rem; color: #ccc; line-height: 1.8;">
                                <div><i class="fas fa-list-ol" style="width: 20px; color: #666;"></i> List Rank: #${position}</div>
                                <div><i class="fas fa-heading" style="width: 20px; color: #666;"></i> Name: ${this.escapeHtml(data.name)}</div>
                                <div><i class="fas fa-layer-group" style="width: 20px; color: #666;"></i> Phase: ${data.phase || 'N/A'}</div>
                                <div><i class="fas fa-star" style="width: 20px; color: #666;"></i> Points: ${data.points || 0}</div>
                                ${data.list_percent ? `<div><i class="fas fa-percentage" style="width: 20px; color: #666;"></i> List: ${data.list_percent}%</div>` : ''}
                                <div><i class="fas fa-hashtag" style="width: 20px; color: #666;"></i> ID: ${data.id}</div>
                                <div><i class="fas fa-trophy" style="width: 20px; color: #666;"></i> Victories: ${sortedPlayers.filter(p => p.progress == 100).length}</div>
                                <div><i class="fas fa-users" style="width: 20px; color: #666;"></i> Records: ${sortedPlayers.length}</div>
                            </div>
                        </div>

                        <div class="ld-stat-group">
                            <span class="ld-stat-label">Skill Sets</span>
                            <div class="skill-tags">
                                ${data.skill_sets && data.skill_sets.length > 0 ? 
                                    data.skill_sets.map(skill => `<span class="skill-tag">${skill}</span>`).join('') : 
                                    '<span style="color: #666; font-size: 0.9rem;">None specified</span>'}
                            </div>
                        </div>
                        
                        <div class="ld-stat-group">
                            <div class="skill-sets-v2-header">
                                <span class="ld-stat-label">Skill Sets V2</span>
                                <div class="tooltip-container">
                                    <i class="fas fa-question-circle tooltip-icon"></i>
                                    <div class="tooltip-box">
                                        Система, которая позволяет посмотреть, на сколько конкретный режим игры преобладает в уровне. Она предлагает наглядно посмотреть, какой процент влияния в уровне есть у каждого режима игры.
                                    </div>
                                </div>
                            </div>
                            <div class="skill-sets-v2-placeholder">
                                <div class="construction-tape tape-left"></div>
                                <div class="construction-tape tape-right"></div>
                                <div class="construction-content">
                                    <i class="fas fa-tools"></i>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="records-section">
                <div class="records-title">Records</div>
                <div class="records-table-container">
                    <table class="records-table">
                        <thead>
                            <tr>
                                <th class="col-rank">Rank</th>
                                <th class="col-player">Player</th>
                                <th class="col-progress">Progress</th>
                                <th class="col-video">Video</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedPlayers.length > 0 ? sortedPlayers.map((player, index) => this.createRecordRow(player, index + 1)).join('') : 
                            '<tr><td colspan="4" style="text-align: center; color: #666; padding: 2rem;">No records found.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    createRecordRow(player, rank) {
        const progressClass = parseInt(player.progress) === 100 ? 'percent-100' : 'percent-high';
        const flagUrl = player.country ? `https://flagcdn.com/24x18/${player.country.toLowerCase()}.png` : null;

        return `
            <tr>
                <td class="col-rank">#${rank}</td>
                <td class="col-player">
                    ${flagUrl ? `<img src="${flagUrl}" alt="${player.country}" class="country-flag">` : ''}
                    ${this.escapeHtml(player.username)}
                </td>
                <td class="col-progress ${progressClass}">${player.progress}%</td>
                <td class="col-video">
                    ${player.video_link ? `
                        <a href="${player.video_link}" target="_blank" rel="noopener noreferrer" class="video-link-icon">
                            <i class="fas fa-play-circle"></i>
                        </a>
                    ` : '-'}
                </td>
            </tr>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}