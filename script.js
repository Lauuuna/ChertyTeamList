const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const playersCache = new Map();
let allLevels = [];

function isAnyFilterActive() {
    return document.getElementById('search-input').value !== '' ||
           document.getElementById('phase-filter').value !== '' ||
           document.getElementById('position-filter').value !== '' ||
           document.getElementById('single-record-filter').checked;
}

function clearAllFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('phase-filter').value = '';
    document.getElementById('position-filter').value = '';
    document.getElementById('single-record-filter').checked = false;
    loadLevels();
}

function scrollToLevel(levelId) {
    const levelCard = document.querySelector(`.level-card[data-level-id="${levelId}"]`);
    if (levelCard) {
        const y = levelCard.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 2) + (levelCard.offsetHeight / 2);
        window.scrollTo({
            top: y,
            behavior: 'auto'
        });
        levelCard.classList.add('highlight');
        setTimeout(() => levelCard.classList.remove('highlight'), 1000);
    }
}

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

function filterLevels(levels, searchText, phaseFilter, positionFilter, singleRecordOnly) {
    const searchLower = searchText.toLowerCase();
    return levels.filter((level, index) => {
        const matchesSearch = level.name.toLowerCase().includes(searchLower);
        const matchesPhase = !phaseFilter || level.phase === phaseFilter;
        const matchesPosition = !positionFilter || (index + 1) === parseInt(positionFilter);
        
        const completedRecords = level.players.filter(p => p.progress === 100).length;
        const matchesSingleRecord = !singleRecordOnly || completedRecords === 1;
        
        return matchesSearch && matchesPhase && matchesPosition && matchesSingleRecord;
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
        const singleRecordOnly = document.getElementById('single-record-filter').checked;
        const filtersActive = isAnyFilterActive();

        const filteredLevels = filterLevels(allLevels, searchText, phaseFilter, positionFilter, singleRecordOnly);

        levelsList.innerHTML = '';

        for (const level of filteredLevels) {
            const originalPosition = allLevels.indexOf(level) + 1;
            const playerNickname = await getPlayerInfo(level.players[0]?.id);
            
            const weIcon = level.show_we_icon 
                ? '<img src="icons/we-icon.png" class="we-icon" alt="WE Icon">' 
                : '';
            
            const newIcon = level.show_new_icon
                ? '<img src="icons/new.png" class="new-icon" alt="NEW Icon">'
                : '';
            
            const phaseBadge = `<span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span>`;
            
            let previewUrl = '';
            if (level.players[0]?.video_link) {
                const videoId = extractYouTubeId(level.players[0].video_link);
                if (videoId) previewUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }

            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.dataset.levelId = level.id;
            levelCard.innerHTML = `
                <div>
                    <h2>#${originalPosition} - ${level.name}${weIcon}${newIcon} ${phaseBadge}</h2>
                    <p>${playerNickname}</p>
                    ${filtersActive ? `<button class="view-in-list" data-level-id="${level.id}">View in the list</button>` : ''}
                </div>
                <div class="preview">
                    ${previewUrl 
                        ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class="no-preview"></p>'">` 
                        : '<p class="no-preview"></p>'}
                </div>
            `;

            levelCard.addEventListener('click', (e) => {
                if (!e.target.classList.contains('view-in-list')) {
                    window.location.href = `level.html?id=${level.id}`;
                }
            });
            
            levelsList.appendChild(levelCard);
        }

        if (filtersActive) {
            document.querySelectorAll('.view-in-list').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const levelId = button.dataset.levelId;
                    clearAllFilters();
                    setTimeout(() => scrollToLevel(levelId), 50);
                });
            });
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

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const phaseFilter = document.getElementById('phase-filter');
    const positionFilter = document.getElementById('position-filter');
    const singleRecordFilter = document.getElementById('single-record-filter');
    
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
    singleRecordFilter.addEventListener('change', loadLevels);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        await loadAllLevels();
        setupEventListeners();
        loadLevels();
    }
});