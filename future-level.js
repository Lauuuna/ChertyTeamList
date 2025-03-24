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
            levelDetails.innerHTML = '<p>Level not found</p>';
            return;
        }

        await preloadPlayerNicknames(level.players.map(p => p.id));

        const position = levels.indexOf(level) + 1;
        const firstPlayerNickname = await getPlayerInfo(level.players[0]?.id);

        let videoId = '';
        if (level.players[0]?.video_link) {
            videoId = extractYouTubeId(level.players[0].video_link);
        }
        const embedVideoLink = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

        const playerRecords = await Promise.all(level.players.map(async player => {
            const nickname = await getPlayerInfo(player.id);
            return { ...player, nickname };
        }));

        levelDetails.innerHTML = `
            <h2>#${position} - ${level.name}</h2>
            <div class="level-info">
                <div class="info-card">
                    <h3>Verified by</h3>
                    <p>${firstPlayerNickname}</p>
                </div>
                <div class="info-card">
                    <h3>Skill-sets</h3>
                    <p>${level.skill_sets?.join(', ') || 'N/A'}</p>
                </div>
                <div class="info-card">
                    <h3>Enjoyment</h3>
                    <p>${level.enjoyment || 'N/A'}/10</p>
                </div>
            </div>
            <div class="video-player">
                ${embedVideoLink 
                    ? `<iframe src="${embedVideoLink}" frameborder="0" allowfullscreen></iframe>` 
                    : '<p>Video unavailable</p>'}
            </div>
            <div class="total-records">
                <h3>Total Records (${playerRecords.length})</h3>
                <ul class="player-list">
                    ${playerRecords.map(player => `
                        <li ${player.video_link ? `onclick="window.open('${player.video_link}', '_blank')"` : ''}>
                            <p class="player-name">${player.nickname}</p>
                            <p class="player-date">${player.progress || 'N/A'}</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } catch (error) {
        console.error('Error loading level details:', error);
        document.getElementById('level-details').innerHTML = '<p>Error loading level details</p>';
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

function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('future-level.html')) {
        loadFutureLevelDetails();
    }
});