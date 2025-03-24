if (!window.supabase) {
    console.error('Supabase не инициализирован! Проверьте подключение в HTML');
    throw new Error('Supabase не загружен');
}

const ALL_SKILL_SETS = [
    "cube", "ship", "ball", "ufo", "wave", "robot", "spider", "swing", 
    "overall", "nerve-control", "learny", "chokepoints", "flow", 
    "fast-paced", "low-paced", "high cps", "timings"
];

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return [];
    }
}

async function fetchPlayers() {
    try {
        const { data, error } = await window.supabase
            .from('players')
            .select('*');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка Supabase, используем локальный файл:', error);
        return fetchData('players.json');
    }
}

function calculateSkillPoints(playerId, levelsData) {
    const skillPoints = new Map(ALL_SKILL_SETS.map(skill => [skill, 0]));
    
    levelsData.forEach(level => {
        const playerProgress = level.players.find(p => p.id === playerId);
        if (playerProgress?.progress === 100) {
            level.skill_sets?.forEach(skill => {
                skillPoints.set(skill, (skillPoints.get(skill) || 0) + level.points);
            });
        }
    });
    
    return skillPoints;
}

function selectLevels(playerId, skillPoints, levelsData, numLevels = 5) {
    const selectedLevels = [];
    const skillPointsCopy = new Map(skillPoints);
    
    const availableLevels = levelsData
        .filter(level => {
            const playerProgress = level.players.find(p => p.id === playerId);
            return (!playerProgress || playerProgress.progress < 100);
        })
        .sort((a, b) => (b.enjoyment || 0) - (a.enjoyment || 0) || a.points - b.points);

    while (selectedLevels.length < numLevels && availableLevels.length > 0) {
        const minSkill = [...skillPointsCopy.entries()].reduce((a, b) => a[1] < b[1] ? a : b)[0];
        
        const foundIndex = availableLevels.findIndex(level => 
            level.skill_sets?.includes(minSkill)
        );
        
        if (foundIndex !== -1) {
            const [foundLevel] = availableLevels.splice(foundIndex, 1);
            selectedLevels.push(foundLevel);
            foundLevel.skill_sets?.forEach(skill => {
                skillPointsCopy.set(skill, (skillPointsCopy.get(skill) || 0) + foundLevel.points);
            });
        } else {
            selectedLevels.push(availableLevels.shift());
        }
    }
    
    return selectedLevels;
}

function displaySkillPoints(skillPoints) {
    const container = document.getElementById('skill-points-list');
    if (!container) return;
    
    container.innerHTML = ALL_SKILL_SETS.map(skill => `
        <div class="skill-point">
            <h3>${skill}</h3>
            <p>${(skillPoints.get(skill) || 0).toFixed(1)}</p>
        </div>
    `).join('');
}

function displayRecommendedLevels(levels, players) {
    const container = document.getElementById('levels-list');
    if (!container) return;
    
    container.innerHTML = levels.map(level => {
        const player = players.find(p => p.id === level.players[0]?.id);
        let previewUrl = '';
        
        if (level.players[0]?.video_link) {
            const link = level.players[0].video_link;
            const videoId = link.includes('youtube.com') 
                ? link.split('v=')[1].split('&')[0] 
                : link.split('/').pop();
            previewUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        }
        
        return `
            <div class="level-card" data-level-id="${level.id}">
                <div>
                    <h2>${level.name}</h2>
                    <p>${player?.nickname || 'Unknown'}</p>
                </div>
                <div class="preview">
                    ${previewUrl 
                        ? `<img src="${previewUrl}" alt="Preview" onerror="this.parentElement.innerHTML='<p>No preview</p>'">` 
                        : '<p>No preview</p>'}
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = `level.html?id=${card.dataset.levelId}`;
        });
    });
}

async function initRecommendations() {
    try {
        const [levels, players] = await Promise.all([
            fetchData('levels.json'),
            fetchPlayers()
        ]);
        
        const select = document.getElementById('player-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">select a player</option>';
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.nickname;
            select.appendChild(option);
        });
        
        select.addEventListener('change', async (e) => {
            const playerId = e.target.value;
            if (!playerId) return;
            
            const skillPoints = calculateSkillPoints(playerId, levels);
            displaySkillPoints(skillPoints);
            
            const recommended = selectLevels(playerId, skillPoints, levels);
            displayRecommendedLevels(recommended, players);
        });
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Error loading data. Please try again later.');
    }
}

document.addEventListener('DOMContentLoaded', initRecommendations);