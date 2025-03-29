const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const playersCache = new Map();
const levelsCache = {
    data: null,
    timestamp: 0
};
let allLevels = [];
let activeFilters = {
    searchText: '',
    skillFilter: '',
    positionFilter: ''
};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('future.html')) {
        await loadAllLevels();
        setupFilterButtons();
        loadLevels();
        setupScrollToTop();
    }
});

function setupFilterButtons() {
    const filterButton = document.getElementById('filter-button');
    if (!filterButton) return;

    filterButton.addEventListener('click', toggleFilterPanel);
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('clear-filters')?.addEventListener('click', clearAllFilters);
    
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        activeFilters.searchText = e.target.value;
        loadLevels();
    });
    
    document.getElementById('skill-filter')?.addEventListener('change', (e) => {
        activeFilters.skillFilter = e.target.value;
        loadLevels();
    });
    
    document.getElementById('position-filter')?.addEventListener('input', (e) => {
        activeFilters.positionFilter = e.target.value;
        loadLevels();
    });
}

function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    if (panel) panel.classList.toggle('active');
}

function applyFilters() {
    activeFilters = {
        searchText: document.getElementById('search-input')?.value || '',
        skillFilter: document.getElementById('skill-filter')?.value || '',
        positionFilter: document.getElementById('position-filter')?.value || ''
    };
    loadLevels();
    toggleFilterPanel();
}

function clearAllFilters() {
    const searchInput = document.getElementById('search-input');
    const skillFilter = document.getElementById('skill-filter');
    const positionFilter = document.getElementById('position-filter');

    if (searchInput) searchInput.value = '';
    if (skillFilter) skillFilter.value = '';
    if (positionFilter) positionFilter.value = '';

    activeFilters = {
        searchText: '',
        skillFilter: '',
        positionFilter: ''
    };
    loadLevels();
}

async function loadAllLevels() {
    try {
        const now = Date.now();
        if (levelsCache.data && now - levelsCache.timestamp < 300000) {
            allLevels = levelsCache.data;
        } else {
            const response = await fetch('future-levels.json');
            if (!response.ok) throw new Error('Failed to load levels');
            allLevels = await response.json();
            levelsCache.data = allLevels;
            levelsCache.timestamp = now;
        }
        
        const playerIds = allLevels.map(level => level.players[0]?.id).filter(Boolean);
        await preloadPlayerNicknames(playerIds);
        populateSkillFilters();
    } catch (error) {
        console.error('Error loading all levels:', error);
    }
}

function populateSkillFilters() {
    const skillFilter = document.getElementById('skill-filter');
    if (!skillFilter) return;

    const allSkills = new Set();
    
    allLevels.forEach(level => {
        if (level.skill_sets) {
            level.skill_sets.forEach(skill => allSkills.add(skill));
        }
    });

    skillFilter.innerHTML = '<option value="">All skill sets</option>';
    const fragment = document.createDocumentFragment();
    
    allSkills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        fragment.appendChild(option);
    });

    skillFilter.appendChild(fragment);
}

async function loadLevels() {
    try {
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;

        levelsList.innerHTML = '<div class="loading">Loading levels...</div>';

        const filteredLevels = filterLevels(
            allLevels,
            activeFilters.searchText,
            activeFilters.skillFilter,
            activeFilters.positionFilter
        );

        levelsList.innerHTML = '';

        filteredLevels.forEach((level, index) => {
            const originalPosition = allLevels.indexOf(level) + 1;
            const levelCard = createLevelCard(level, originalPosition, isAnyFilterActive());
            levelsList.appendChild(levelCard);
        });

        setupViewInListButtons();
    } catch (error) {
        console.error('Error loading levels:', error);
        const levelsList = document.getElementById('levels-list');
        if (levelsList) levelsList.innerHTML = '<div class="error">Error loading levels</div>';
    }
}

function filterLevels(levels, searchText, skillFilter, positionFilter) {
    const searchLower = searchText.toLowerCase();
    return levels.filter((level, index) => {
        const matchesSearch = level.name.toLowerCase().includes(searchLower);
        const matchesSkill = !skillFilter || (level.skill_sets && level.skill_sets.includes(skillFilter));
        const matchesPosition = !positionFilter || (index + 1) === parseInt(positionFilter);
        
        return matchesSearch && matchesSkill && matchesPosition;
    });
}

function isAnyFilterActive() {
    return activeFilters.searchText !== '' ||
           activeFilters.skillFilter !== '' ||
           activeFilters.positionFilter !== '';
}

function createLevelCard(level, position, filtersActive) {
    const levelCard = document.createElement('div');
    levelCard.className = 'level-card';
    levelCard.dataset.levelId = level.id;
    
    const bgImage = level.background || '';
    const previewContent = createPreviewContent(level);
    
    levelCard.innerHTML = `
        ${bgImage ? `<div class="level-background" style="background-image: url('${bgImage}')"></div>` : ''}
        <div class="level-overlay"></div>
        <div class="level-card-content">
            <div class="level-info">
                <div class="level-header">
                    <span class="level-position">#${position}</span>
                    <div>
                        <span class="level-name">${level.name} <i class="fas fa-clock future-icon"></i></span>
                    </div>
                </div>
                ${filtersActive ? `<button class="view-in-list" data-level-id="${level.id}">View in list</button>` : ''}
            </div>
            <div class="level-preview">
                ${previewContent}
            </div>
        </div>
    `;

    if (bgImage) {
        const img = new Image();
        img.src = bgImage;
        img.onerror = () => {
            const bgElement = levelCard.querySelector('.level-background');
            if (bgElement) bgElement.style.display = 'none';
        };
    }

    levelCard.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-in-list')) {
            e.stopPropagation();
            e.preventDefault();
            const levelId = e.target.dataset.levelId;
            clearAllFilters();
            scrollToLevel(levelId).then(() => highlightLevel(levelId));
            return;
        }
        window.location.href = `future-level.html?id=${level.id}`;
    });
    
    return levelCard;
}

function createPreviewContent(level) {
    if (!level.players[0]?.video_link) return '';
    const videoId = extractYouTubeId(level.players[0].video_link);
    return videoId ? `<img src="https://img.youtube.com/vi/${videoId}/0.jpg" alt="Preview">` : '';
}

async function preloadPlayerNicknames(playerIds) {
    const uniqueIds = [...new Set(playerIds)];
    const uncachedIds = uniqueIds.filter(id => !playersCache.has(id));
    if (uncachedIds.length === 0) return;

    try {
        const { data } = await supabaseClient
            .from('players')
            .select('id, nickname')
            .in('id', uncachedIds);
        data?.forEach(player => playersCache.set(player.id, player.nickname));
    } catch (error) {
        console.error('Error preloading players:', error);
    }
}

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
}

function setupViewInListButtons() {
    document.querySelectorAll('.view-in-list').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const levelId = button.dataset.levelId;
            clearAllFilters();
            scrollToLevel(levelId).then(() => highlightLevel(levelId));
        });
    });
}

async function scrollToLevel(levelId) {
    return new Promise(resolve => {
        const levelCard = document.querySelector(`.level-card[data-level-id="${levelId}"]`);
        if (!levelCard) return resolve();
        
        const y = levelCard.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 3);
        window.scrollTo({
            top: y,
            behavior: 'smooth'
        });
        
        setTimeout(resolve, 800);
    });
}

function highlightLevel(levelId) {
    const levelCard = document.querySelector(`.level-card[data-level-id="${levelId}"]`);
    if (levelCard) {
        levelCard.classList.add('highlight');
        setTimeout(() => levelCard.classList.remove('highlight'), 2000);
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