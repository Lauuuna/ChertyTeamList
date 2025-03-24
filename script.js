// Инициализация Supabase клиента
const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Кэш для игроков
const playersCache = new Map();
let allLevels = []; // Глобальная переменная для хранения всех уровней

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

function filterLevels(levels, searchText, phaseFilter, positionFilter) {
    const searchLower = searchText.toLowerCase();
    return levels.filter((level, index) => {
        const matchesSearch = level.name.toLowerCase().includes(searchLower);
        const matchesPhase = !phaseFilter || level.phase === phaseFilter;
        const matchesPosition = !positionFilter || (index + 1) === parseInt(positionFilter);
        return matchesSearch && matchesPhase && matchesPosition;
    });
}

async function loadAllLevels() {
    try {
        allLevels = await fetchData('levels.json');
        const playerIds = allLevels.map(level => level.players[0]?.id).filter(Boolean);
        await preloadPlayerNicknames(playerIds);
    } catch (error) {
        console.error('Error loading all levels:', error);
    }
}

async function loadLevels() {
    try {
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;
        
        levelsList.innerHTML = '<div class="loading">Loading levels...</div>';

        const searchText = document.getElementById('search-input').value;
        const phaseFilter = document.getElementById('phase-filter').value;
        const positionFilter = document.getElementById('position-filter').value;

        const filteredLevels = filterLevels(allLevels, searchText, phaseFilter, positionFilter);

        levelsList.innerHTML = '';

        for (const level of filteredLevels) {
            const position = allLevels.indexOf(level) + 1;
            const playerNickname = await getPlayerInfo(level.players[0]?.id);
            
            // WE иконка
            const weIcon = level.show_we_icon 
                ? '<img src="icons/we-icon.png" class="we-icon" alt="WE Icon">' 
                : '';
            
            // NEW иконка
            const newIcon = level.show_new_icon
                ? '<img src="icons/new.png" class="new-icon" alt="NEW Icon">'
                : '';
            
            // Phase бейдж с оригинальными классами
            const phaseBadge = `<span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span>`;
            
            // Видео превью
            let previewUrl = '';
            if (level.players[0]?.video_link) {
                const videoId = extractYouTubeId(level.players[0].video_link);
                if (videoId) previewUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }

            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.innerHTML = `
                <div>
                    <h2>#${position} - ${level.name}${weIcon}${newIcon} ${phaseBadge}</h2>
                    <p>${playerNickname}</p>
                </div>
                <div class="preview">
                    ${previewUrl 
                        ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class="no-preview"></p>'">` 
                        : '<p class="no-preview"></p>'}
                </div>
            `;

            levelCard.addEventListener('click', () => {
                window.location.href = `level.html?id=${level.id}`;
            });
            levelsList.appendChild(levelCard);
        }
    } catch (error) {
        console.error('Error loading levels:', error);
        document.getElementById('levels-list').innerHTML = '<div class="error">Error loading levels</div>';
    }
}

// Вспомогательные функции
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

// Обработчики событий
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const phaseFilter = document.getElementById('phase-filter');
    const positionFilter = document.getElementById('position-filter');
    
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadLevels, 300);
    });
    
    phaseFilter.addEventListener('change', loadLevels);
    positionFilter.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadLevels, 300);
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        await loadAllLevels();
        setupEventListeners();
        loadLevels();
    }
});