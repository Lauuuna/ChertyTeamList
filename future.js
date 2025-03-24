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

async function loadFutureLevels() {
    try {
        const levels = await fetchData('future-levels.json');
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;
        
        levelsList.innerHTML = '<div class="loading">Loading levels...</div>';

        const playerIds = levels.flatMap(level => 
            level.players.map(player => player.id)
        ).filter(Boolean);
        
        await preloadPlayerNicknames(playerIds);

        levelsList.innerHTML = '';

        for (const [index, level] of levels.entries()) {
            const position = index + 1;
            const firstPlayerNickname = await getPlayerInfo(level.players[0]?.id);
            
            let previewUrl = '';
            if (level.players[0]?.video_link) {
                const videoId = extractYouTubeId(level.players[0].video_link);
                if (videoId) previewUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }

            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.innerHTML = `
                <div>
                    <h2>#${position} - ${level.name}</h2>
                    <p>${firstPlayerNickname}</p>
                </div>
                <div class="preview">
                    ${previewUrl 
                        ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class="no-preview"></p>'">` 
                        : '<p class="no-preview"></p>'}
                </div>
            `;

            levelCard.addEventListener('click', () => {
                window.location.href = `future-level.html?id=${level.id}`;
            });
            levelsList.appendChild(levelCard);
        }
    } catch (error) {
        console.error('Error loading levels:', error);
        document.getElementById('levels-list').innerHTML = '<div class="error">Error loading levels</div>';
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
    if (window.location.pathname.includes('future.html')) {
        loadFutureLevels();
    }
});