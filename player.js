document.addEventListener('DOMContentLoaded', async () => {
    const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    async function fetchPlayerData(playerId) {
        try {
            const { data, error } = await supabaseClient
                .from('players')
                .select('*')
                .eq('id', playerId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching player:', error);
            return null;
        }
    }

    async function fetchAllPlayers() {
        try {
            const { data, error } = await supabaseClient
                .from('players')
                .select('*');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching players:', error);
            return [];
        }
    }

    async function fetchLevels() {
        try {
            const response = await fetch('levels.json');
            if (!response.ok) throw new Error('Failed to load levels');
            return await response.json();
        } catch (error) {
            console.error('Error loading levels:', error);
            return [];
        }
    }

    function parseSkillSet(skillSet) {
        if (!skillSet) return [];
        if (Array.isArray(skillSet)) return skillSet;
        if (typeof skillSet === 'string') {
            try {
                if (skillSet.startsWith('[')) return JSON.parse(skillSet);
                return skillSet.split(',').map(s => s.trim());
            } catch (e) {
                return skillSet.split(',').map(s => s.trim());
            }
        }
        return [];
    }

    async function loadPlayerDetails() {
        const playerId = new URLSearchParams(window.location.search).get('id');
        if (!playerId) return;

        const [player, allPlayers, levels] = await Promise.all([
            fetchPlayerData(playerId),
            fetchAllPlayers(),
            fetchLevels()
        ]);

        if (!player) {
            document.getElementById('player-details').innerHTML = '<div class="error">Player not found</div>';
            return;
        }

        if (player.col1 && player.col2) {
            document.documentElement.style.setProperty('--col1', player.col1);
            document.documentElement.style.setProperty('--col2', player.col2);
        }

        const completedLevels = levels.filter(level => 
            level.players.some(p => p.id === playerId && p.progress === 100)
        ).map(level => {
            const playerRecord = level.players.find(p => p.id === playerId);
            return {
                ...level,
                position: levels.indexOf(level) + 1,
                date: playerRecord?.date
            };
        }).sort((a, b) => a.position - b.position);

        const progressLevels = levels.filter(level => 
            level.players.some(p => p.id === playerId && p.progress < 100)
        ).map(level => {
            const playerRecord = level.players.find(p => p.id === playerId);
            return {
                ...level,
                position: levels.indexOf(level) + 1,
                date: playerRecord?.date,
                progress: playerRecord?.progress
            };
        }).sort((a, b) => a.position - b.position);

        const totalPoints = completedLevels.reduce((sum, level) => sum + level.points, 0) +
            progressLevels.reduce((sum, level) => sum + (level.points / 5), 0);

        const limitPercent = player.l_percent ? parseFloat(player.l_percent) : 0;
        const playerRank = allPlayers
            .map(p => ({ id: p.id, points: calculatePlayerPoints(p.id, levels) }))
            .sort((a, b) => b.points - a.points)
            .findIndex(p => p.id === playerId) + 1;

        const skillSet = parseSkillSet(player.skill_set);

        document.getElementById('player-banner').style.backgroundImage = `url('${player.banner_url || 'https://via.placeholder.com/1200x250'}')`;
        document.getElementById('player-avatar').src = player.avatar_url || 'https://via.placeholder.com/300';
        document.getElementById('player-rank').textContent = `#${playerRank}`;
        document.getElementById('player-nickname').textContent = player.nickname;
        
        if (player.flag) {
            const flagImg = document.getElementById('player-flag');
            flagImg.src = `flags/${player.flag}.png`;
            flagImg.alt = player.flag;
            flagImg.style.display = 'inline-block';
        }

        if (player.about) {
            document.getElementById('player-description').textContent = player.about;
        } else {
            document.getElementById('player-description').style.display = 'none';
        }

        const statsContainer = document.getElementById('player-stats');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Total Stars</h3>
                <p class="stars-count">${Math.round(totalPoints * 10) / 10} <i class="fas fa-star"></i></p>
            </div>
            <div class="stat-card">
                <h3>Completed Levels</h3>
                <p>${completedLevels.length}</p>
            </div>
            <div class="stat-card">
                <h3>Progress Levels</h3>
                <p>${progressLevels.length}</p>
            </div>
            ${player.osc ? `
            <div class="stat-card">
                <h3>OSC</h3>
                <p>${player.osc}</p>
            </div>
            ` : ''}
            ${player.time_for_1_star ? `
            <div class="stat-card">
                <h3>Attempts for 1⭐</h3>
                <p>${player.time_for_1_star}</p>
            </div>
            ` : ''}
            ${skillSet.length > 0 ? `
            <div class="stat-card">
                <h3>Skill-sets</h3>
                <div class="skill-sets">${skillSet.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div>
            </div>
            ` : ''}
            ${player.l_percent ? `
            <div class="stat-card">
                <h3>LIMIT%</h3>
                <p>${player.l_percent}</p>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${limitPercent}%"></div>
                </div>
            </div>
            ` : ''}
        `;

        if (player.about_me) {
            document.getElementById('player-about').textContent = player.about_me;
        } else {
            document.getElementById('player-about').textContent = 'No description provided';
        }

        document.getElementById('completed-levels-title').textContent = `Completed Levels (${completedLevels.length})`;
        const completedList = document.getElementById('completed-levels-list');
        completedList.innerHTML = completedLevels.map(level => `
            <li onclick="window.location.href='level.html?id=${level.id}'">
                <div>
                    <span class="level-position">#${level.position}</span>
                    <span class="level-name">${level.name}</span>
                </div>
                <span class="level-date">${level.date || 'N/A'}</span>
            </li>
        `).join('');

        if (progressLevels.length > 0) {
            const progressSection = document.getElementById('progress-levels-section');
            progressSection.style.display = 'block';
            document.getElementById('progress-levels-title').textContent = `Progress Levels (${progressLevels.length})`;
            
            const progressList = document.getElementById('progress-levels-list');
            progressList.innerHTML = progressLevels.map(level => `
                <li onclick="window.location.href='level.html?id=${level.id}'">
                    <div>
                        <span class="level-position">#${level.position}</span>
                        <span class="level-name">${level.name}</span>
                    </div>
                    <span class="level-date">${level.progress || 0}% (${level.date || 'N/A'})</span>
                </li>
            `).join('');
        }

        setupScrollToTop();
    }

    function calculatePlayerPoints(playerId, levels) {
        let totalPoints = 0;
        levels.forEach(level => {
            const playerProgress = level.players.find(p => p.id === playerId);
            if (playerProgress) {
                if (playerProgress.progress === 100) {
                    totalPoints += level.points;
                } else {
                    totalPoints += level.points / 5;
                }
            }
        });
        return Math.round(totalPoints * 10) / 10;
    }

    function setupScrollToTop() {
        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollButton = document.getElementById('scroll-to-top');
            if (scrollButton) scrollButton.classList.toggle('visible', scrollTop > 300);
        });

        const scrollButton = document.getElementById('scroll-to-top');
        if (scrollButton) {
            scrollButton.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    loadPlayerDetails();
});