document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('weekly-hardest.html')) {
        await loadWeeklyHardest();
    }
});

async function loadWeeklyHardest() {
    try {
        const response = await fetch('levels.json');
        if (!response.ok) throw new Error('Failed to load levels');
        const allLevels = await response.json();
        
        const weeklyHardest = findWeeklyHardest(allLevels);
        if (weeklyHardest) {
            const position = allLevels.findIndex(l => l.id === weeklyHardest.id) + 1;
            displayWeeklyHardest(weeklyHardest, position);
        } else {
            document.getElementById('weekly-hardest-level').innerHTML = 
                '<div class="no-hardest">No weekly hardest level found</div>';
        }
    } catch (error) {
        console.error('Error loading weekly hardest:', error);
        document.getElementById('weekly-hardest-level').innerHTML = 
            '<div class="error">Error loading weekly hardest</div>';
    }
}

function findWeeklyHardest(levels) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentLevels = levels.filter(level => {
        if (!level.players || level.players.length === 0) return false;
        const recordDate = parseCustomDate(level.players[0].date);
        return recordDate && recordDate > oneWeekAgo;
    });
    
    if (recentLevels.length === 0) return null;
    
    return recentLevels.reduce((hardest, current) => {
        return (!hardest || current.points > hardest.points) ? current : hardest;
    }, null);
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

function displayWeeklyHardest(level, position) {
    const levelCard = document.getElementById('weekly-hardest-level');
    levelCard.innerHTML = `
        <div class="level-card">
            ${level.background ? `<div class="level-background" style="background-image: url('${level.background}')"></div>` : ''}
            <div class="level-overlay"></div>
            <div class="level-card-content">
                <div class="level-info">
                    <div class="level-header">
                        <span class="level-position">#${position}</span>
                        <div>
                            <span class="level-name">${level.name}${createIcons(level)} ${createPhaseBadge(level)}</span>
                        </div>
                    </div>
                </div>
                <div class="level-preview">
                    ${createPreviewContent(level)}
                </div>
            </div>
        </div>
    `;
    
    levelCard.querySelector('.level-card').addEventListener('click', () => {
        window.location.href = `level.html?id=${level.id}`;
    });
}

function createIcons(level) {
    return (level.show_we_icon ? '<img src="icons/we-icon.png" class="we-icon" title="Weekly Extreme">' : '') + 
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

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
}