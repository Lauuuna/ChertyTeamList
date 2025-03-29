const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const playersCache = new Map();

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error loading data: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

async function getPlayerInfo(playerId) {
    if (playersCache.has(playerId)) {
        return playersCache.get(playerId);
    }

    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('nickname')
            .eq('id', playerId)
            .single();
        
        if (error) throw error;
        
        const nickname = data?.nickname || 'Unknown';
        playersCache.set(playerId, nickname);
        return nickname;
    } catch (error) {
        console.error('Error fetching player:', error);
        return 'Unknown';
    }
}

async function loadFutureLevelDetails() {
    try {
        const levelId = new URLSearchParams(window.location.search).get('id');
        const levels = await fetchData('future-levels.json');
        const level = levels.find(l => l.id === parseInt(levelId));
        const levelDetails = document.getElementById('level-details');
        
        if (!level) {
            levelDetails.innerHTML = '<div class="error-message">Level not found</div>';
            return;
        }

        await preloadPlayerNicknames(level.players.map(p => p.id));

        const position = levels.indexOf(level) + 1;
        const verifierNickname = await getPlayerInfo(level.players[0]?.id);
        
        let videoId = '';
        if (level.players[0]?.video_link) {
            const videoLink = level.players[0].video_link;
            if (videoLink.includes('youtube.com')) {
                videoId = videoLink.split('v=')[1]?.split('&')[0];
            } else if (videoLink.includes('youtu.be')) {
                videoId = videoLink.split('/').pop();
            }
        }

        const playerRecords = await Promise.all(level.players.map(async player => {
            const nickname = await getPlayerInfo(player.id);
            return { ...player, nickname };
        }));

        levelDetails.innerHTML = `
            <div class="level-header">
                <div class="level-position">#${position}</div>
                <div class="level-title">
                    <h1 class="level-name">${level.name}</h1>
                </div>
            </div>
            
            <div class="level-info-grid">
                <div class="info-card">
                    <h3>ID</h3>
                    <p>${level.id || 'N/A'}</p>
                </div>
                <div class="info-card">
                    <h3>Skill-sets</h3>
                    <p>${level.skill_sets?.join(', ') || 'N/A'}</p>
                </div>
                ${level.enjoyment ? `
                <div class="info-card">
                    <h3>Enjoyment</h3>
                    <p>${level.enjoyment}/10</p>
                </div>
                ` : ''}
                <div class="info-card">
                    <h3>Verified by</h3>
                    <p>${verifierNickname}</p>
                </div>
            </div>
            
            ${videoId ? `
            <div class="video-container">
                <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            ` : '<div class="video-error">Video unavailable</div>'}
            
            <div class="records-section">
                <h2 class="section-title">Total Records (${playerRecords.length})</h2>
                <ul class="player-list">
                    ${playerRecords.map(player => `
                        <li ${player.video_link ? `onclick="window.open('${player.video_link}', '_blank')"` : ''}>
                            <p class="player-name">${player.nickname}</p>
                            <p class="player-date">${player.date || 'N/A'} (${player.progress || '0'}%)</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } catch (error) {
        console.error('Error loading level details:', error);
        document.getElementById('level-details').innerHTML = '<div class="error-message">Error loading level details</div>';
    }
}

async function preloadPlayerNicknames(playerIds) {
    const uniqueIds = [...new Set(playerIds)];
    const uncachedIds = uniqueIds.filter(id => !playersCache.has(id));
    
    if (uncachedIds.length === 0) return;

    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('id, nickname')
            .in('id', uncachedIds);
        
        if (error) throw error;
        
        data.forEach(player => {
            playersCache.set(player.id, player.nickname);
        });
    } catch (error) {
        console.error('Error preloading players:', error);
    }
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

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('future-level.html')) {
        loadFutureLevelDetails();
        setupScrollToTop();
    }
});