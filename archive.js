const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const playersCache = new Map();
const levelsCache = {
    data: null,
    timestamp: 0
};
let allLevels = [];
let currentArchiveType = 'actual';

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('archive.html')) {
        await loadAllLevels();
        setupFilterButtons();
        loadArchiveLevels();
        setupScrollToTop();
    }
});

function setupFilterButtons() {
    const filterButton = document.getElementById('filter-button');
    if (!filterButton) return;

    filterButton.addEventListener('click', toggleFilterPanel);
    
    const actualArchiveButton = document.getElementById('actual-archive');
    const officialArchiveButton = document.getElementById('official-archive');
    
    const switchArchive = (type) => {
        currentArchiveType = type;
        loadArchiveLevels();
        toggleFilterPanel();
    };
    
    actualArchiveButton.addEventListener('click', () => {
        actualArchiveButton.classList.add('active');
        officialArchiveButton.classList.remove('active');
        switchArchive('actual');
    });
    
    officialArchiveButton.addEventListener('click', () => {
        officialArchiveButton.classList.add('active');
        actualArchiveButton.classList.remove('active');
        switchArchive('official');
    });
}

function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    if (panel) panel.classList.toggle('active');
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
        
        const playerIds = allLevels.map(level => level.players[0]?.id).filter(Boolean);
        await preloadPlayerNicknames(playerIds);
    } catch (error) {
        console.error('Error loading all levels:', error);
    }
}

async function loadArchiveLevels() {
    try {
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;

        levelsList.innerHTML = '<div class="loading">Loading levels...</div>';

        const filteredLevels = allLevels
            .filter(level => level.archives && level.archives.some(archive => archive.type === currentArchiveType))
            .sort((a, b) => {
                const aArchive = a.archives.find(archive => archive.type === currentArchiveType);
                const bArchive = b.archives.find(archive => archive.type === currentArchiveType);
                return new Date(bArchive.date_end) - new Date(aArchive.date_end);
            });

        levelsList.innerHTML = '';

        filteredLevels.forEach((level) => {
            const archive = level.archives.find(a => a.type === currentArchiveType);
            const player = level.players[0];
            const originalPosition = allLevels.indexOf(level) + 1;
            
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.dataset.levelId = level.id;
            
            const bgImage = level.background || '';
            const previewContent = player?.video_link ? 
                `<img src="https://img.youtube.com/vi/${extractYouTubeId(player.video_link)}/0.jpg" alt="Preview">` : '';
            
            levelCard.innerHTML = `
                ${bgImage ? `<div class="level-background" style="background-image: url('${bgImage}')"></div>` : ''}
                <div class="level-overlay"></div>
                <div class="level-card-content">
                    <div class="level-info">
                        <div class="level-header">
                            <span class="level-position">#${originalPosition}</span>
                            <div>
                                <span class="level-name">${level.name} 
                                    <span class="level-phase phase-${level.phase}">Phase ${level.phase}</span>
                                </span>
                                <div class="level-dates">
                                    <i class="fas fa-crown crown-icon" title="On the first line from ${archive.date_start} to ${archive.date_end}"></i>
                                    <span class="level-days">${archive.duration_days} days</span>
                                </div>
                            </div>
                        </div>
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

            levelCard.addEventListener('click', () => {
                window.location.href = `level.html?id=${level.id}`;
            });
            
            levelsList.appendChild(levelCard);
        });
    } catch (error) {
        console.error('Error loading archive levels:', error);
        const levelsList = document.getElementById('levels-list');
        if (levelsList) levelsList.innerHTML = '<div class="error">Error loading levels</div>';
    }
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