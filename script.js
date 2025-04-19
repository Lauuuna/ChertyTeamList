const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const playersCache = new Map();
const levelsCache = {
    data: null,
    timestamp: 0
};
let allLevels = [];
let availableDates = [];
let activeFilters = {
    searchText: '',
    phaseFilter: '',
    positionFilter: '',
    skillFilter: '',
    monthFilter: '',
    singleRecordOnly: false
};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
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
    
    document.getElementById('phase-filter')?.addEventListener('change', (e) => {
        activeFilters.phaseFilter = e.target.value;
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
    
    document.getElementById('month-filter')?.addEventListener('change', (e) => {
        activeFilters.monthFilter = e.target.value;
        loadLevels();
    });
    
    document.getElementById('single-record-filter')?.addEventListener('change', (e) => {
        activeFilters.singleRecordOnly = e.target.checked;
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
        phaseFilter: document.getElementById('phase-filter')?.value || '',
        positionFilter: document.getElementById('position-filter')?.value || '',
        skillFilter: document.getElementById('skill-filter')?.value || '',
        monthFilter: document.getElementById('month-filter')?.value || '',
        singleRecordOnly: document.getElementById('single-record-filter')?.checked || false
    };
    loadLevels();
    toggleFilterPanel();
}

function clearAllFilters() {
    const searchInput = document.getElementById('search-input');
    const phaseFilter = document.getElementById('phase-filter');
    const positionFilter = document.getElementById('position-filter');
    const skillFilter = document.getElementById('skill-filter');
    const monthFilter = document.getElementById('month-filter');
    const singleRecordFilter = document.getElementById('single-record-filter');

    if (searchInput) searchInput.value = '';
    if (phaseFilter) phaseFilter.value = '';
    if (positionFilter) positionFilter.value = '';
    if (skillFilter) skillFilter.value = '';
    if (monthFilter) monthFilter.value = '';
    if (singleRecordFilter) singleRecordFilter.checked = false;

    activeFilters = {
        searchText: '',
        phaseFilter: '',
        positionFilter: '',
        skillFilter: '',
        monthFilter: '',
        singleRecordOnly: false
    };
    loadLevels();
}

async function loadAllLevels() {
    try {
        const now = Date.now();
        if (levelsCache.data && now - levelsCache.timestamp < 300000) {
            allLevels = levelsCache.data;
        } else {
            const response = await fetch('levels.json');
            if (!response.ok) throw new Error('Failed to load levels');
            allLevels = await response.json();
            levelsCache.data = allLevels;
            levelsCache.timestamp = now;
        }
        
        allLevels.forEach(level => {
            level.show_new_icon = isNewLevel(level);
        });

        const playerIds = allLevels.map(level => level.players[0]?.id).filter(Boolean);
        await preloadPlayerNicknames(playerIds);
        populateSkillFilters();
        populateMonthFilters();
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

function populateMonthFilters() {
    const monthFilter = document.getElementById('month-filter');
    if (!monthFilter) return;

    const datesSet = new Set();
    
    allLevels.forEach(level => {
        if (level.players && level.players.length > 0 && level.players[0].date) {
            const dateParts = level.players[0].date.split('-');
            if (dateParts.length === 3) {
                const year = dateParts[0];
                const month = dateParts[2].padStart(2, '0');
                datesSet.add(`${year}-${month}`);
            }
        }
    });

    availableDates = Array.from(datesSet).sort((a, b) => {
        const [yearA, monthA] = a.split('-');
        const [yearB, monthB] = b.split('-');
        return new Date(yearB, monthB - 1) - new Date(yearA, monthA - 1);
    });

    if (availableDates.length > 0) {
        const [minYear, minMonth] = availableDates[availableDates.length - 1].split('-');
        const [maxYear, maxMonth] = availableDates[0].split('-');
        monthFilter.min = `${minYear}-${minMonth}`;
        monthFilter.max = `${maxYear}-${maxMonth}`;
    }
}

function isNewLevel(level) {
    if (!level.players || level.players.length === 0) return false;
    const recordDate = parseCustomDate(level.players[0].date);
    if (!recordDate) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return recordDate > oneWeekAgo;
}

function parseCustomDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const month = parseInt(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(year, month - 1, day);
}

async function loadLevels() {
    try {
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;

        levelsList.innerHTML = '<div class="loading">Loading levels...</div>';

        const filteredLevels = filterLevels(
            allLevels,
            activeFilters.searchText,
            activeFilters.phaseFilter,
            activeFilters.positionFilter,
            activeFilters.skillFilter,
            activeFilters.monthFilter,
            activeFilters.singleRecordOnly
        );

        levelsList.innerHTML = '';

        filteredLevels.forEach((level, index) => {
            const filteredPosition = index + 1;
            const levelCard = createLevelCard(level, filteredPosition, isAnyFilterActive());
            levelsList.appendChild(levelCard);
        });

        setupViewInListButtons();
    } catch (error) {
        console.error('Error loading levels:', error);
        const levelsList = document.getElementById('levels-list');
        if (levelsList) levelsList.innerHTML = '<div class="error">Error loading levels</div>';
    }
}

function filterLevels(levels, searchText, phaseFilter, positionFilter, skillFilter, monthFilter, singleRecordOnly) {
    const searchLower = searchText.toLowerCase();
    let filtered = levels.filter((level, index) => {
        const matchesSearch = level.name.toLowerCase().includes(searchLower);
        const matchesPhase = !phaseFilter || level.phase === phaseFilter;
        const matchesPosition = !positionFilter || (index + 1) === parseInt(positionFilter);
        const matchesSkill = !skillFilter || (level.skill_sets && level.skill_sets.includes(skillFilter));
        const completedRecords = level.players.filter(p => p.progress === 100).length;
        const matchesSingleRecord = !singleRecordOnly || completedRecords === 1;
        
        return matchesSearch && matchesPhase && matchesPosition && matchesSkill && matchesSingleRecord;
    });

    if (monthFilter) {
        const [selectedYear, selectedMonth] = monthFilter.split('-');
        const selectedDate = new Date(selectedYear, selectedMonth - 1);
        
        filtered = filtered.filter(level => {
            if (!level.players || level.players.length === 0) return false;
            
            const levelDateStr = level.players[0].date;
            const levelDateParts = levelDateStr.split('-');
            if (levelDateParts.length !== 3) return false;
            
            const levelYear = levelDateParts[0];
            const levelDay = levelDateParts[1] === 'XX' ? '01' : levelDateParts[1].padStart(2, '0');
            const levelMonth = levelDateParts[2].padStart(2, '0');
            
            const levelDate = new Date(levelYear, levelMonth - 1, levelDay);
            const compareDate = new Date(selectedYear, selectedMonth - 1, 1);
            
            return levelDate <= compareDate;
        });
    }

    return filtered;
}

function isAnyFilterActive() {
    return activeFilters.searchText !== '' ||
           activeFilters.phaseFilter !== '' ||
           activeFilters.positionFilter !== '' ||
           activeFilters.skillFilter !== '' ||
           activeFilters.monthFilter !== '' ||
           activeFilters.singleRecordOnly;
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
                        <span class="level-name">${level.name}${createIcons(level)} ${createPhaseBadge(level)}</span>
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
        if (!e.target.classList.contains('we-icon') && !e.target.classList.contains('new-icon')) {
            window.location.href = `level.html?id=${level.id}`;
        }
    });
    
    return levelCard;
}

function createIcons(level) {
    return (level.show_we_icon ? '<img src="icons/we-icon.png" class="we-icon" title="WEGDPS">' : '') + 
           (level.show_new_icon ? '<img src="icons/new.png" class="new-icon" title="New Level">' : '');
}

function createPhaseBadge(level) {
    return `<span class="level-phase phase-${level.phase}">Phase ${level.phase}</span>`;
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