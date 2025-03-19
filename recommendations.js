const ALL_SKILL_SETS = [
    "cube", "ship", "ball", "ufo", "wave", "robot", "spider", "swing", 
    "overall", "nerve-control", "learny", "chokepoints", "flow", 
    "fast-paced", "low-paced", "high cps", "timings"
];

async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

function calculateSkillPoints(playerId, levelsData) {
    const skillPoints = new Map(ALL_SKILL_SETS.map(skill => [skill, 0]));
    levelsData.forEach(level => {
        const playerProgress = level.players.find(p => p.id === playerId);
        if (playerProgress && playerProgress.progress === 100) {
            level.skill_sets.forEach(skill => {
                skillPoints.set(skill, skillPoints.get(skill) + level.points);
            });
        }
    });
    return skillPoints;
}

function getMaxCompletedPoints(playerId, levelsData) {
    let maxPoints = 0;
    levelsData.forEach(level => {
        const playerProgress = level.players.find(p => p.id === playerId);
        if (playerProgress && playerProgress.progress === 100 && level.points > maxPoints) {
            maxPoints = level.points;
        }
    });
    return maxPoints;
}

function selectLevels(playerId, skillPoints, levelsData, numLevels = 5) {
    const selectedLevels = [];
    const skillPointsCopy = new Map(skillPoints);
    const maxCompletedPoints = getMaxCompletedPoints(playerId, levelsData);
    const maxRecommendedPoints = Math.min(maxCompletedPoints * 2.2, 28);
    const sortedLevels = levelsData.sort((a, b) => (b.enjoyment || 0) - (a.enjoyment || 0) || a.points - b.points);

    while (selectedLevels.length < numLevels) {
        const minSkill = [...skillPointsCopy.entries()].reduce((a, b) => a[1] < b[1] ? a : b)[0];
        const foundLevel = sortedLevels.find(level => {
            const playerProgress = level.players.find(p => p.id === playerId);
            return (
                level.skill_sets.includes(minSkill) &&
                (!playerProgress || playerProgress.progress < 100) &&
                !selectedLevels.includes(level) &&
                level.points <= maxRecommendedPoints
            );
        });

        if (foundLevel) {
            selectedLevels.push(foundLevel);
            foundLevel.skill_sets.forEach(skill => {
                skillPointsCopy.set(skill, skillPointsCopy.get(skill) + foundLevel.points);
            });
        } else {
            const fallbackLevel = sortedLevels.find(level => {
                const playerProgress = level.players.find(p => p.id === playerId);
                return (
                    (!playerProgress || playerProgress.progress < 100) &&
                    !selectedLevels.includes(level) &&
                    level.points <= maxRecommendedPoints
                );
            });
            if (fallbackLevel) {
                selectedLevels.push(fallbackLevel);
                fallbackLevel.skill_sets.forEach(skill => {
                    skillPointsCopy.set(skill, skillPointsCopy.get(skill) + fallbackLevel.points);
                });
            } else {
                break;
            }
        }
    }
    return selectedLevels;
}

function displaySkillPoints(skillPoints) {
    const skillPointsList = document.getElementById('skill-points-list');
    skillPointsList.innerHTML = ALL_SKILL_SETS.map(skill => `
        <div class="skill-point">
            <h3>${skill}</h3>
            <p>${skillPoints.get(skill).toFixed(1)}</p>
        </div>
    `).join('');
}

function displayRecommendedLevels(levels, players) {
    const levelsList = document.getElementById('levels-list');
    levelsList.innerHTML = levels.map(level => {
        const position = levels.indexOf(level) + 1;
        let previewUrl = '';
        if (level.players[0]?.video_link) {
            const videoLink = level.players[0].video_link;
            let videoId = '';
            if (videoLink.includes('youtube.com')) {
                videoId = videoLink.split('v=')[1];
                const ampersandPosition = videoId.indexOf('&');
                if (ampersandPosition !== -1) {
                    videoId = videoId.substring(0, ampersandPosition);
                }
            } else if (videoLink.includes('youtu.be')) {
                videoId = videoLink.split('/').pop();
            }
            if (videoId) {
                previewUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }
        }
        const player = players.find(p => p.id === level.players[0]?.id);
        const playerName = player ? player.nickname : 'Unknown Player';
        return `
            <div class="level-card" data-level-id="${position}">
                <div>
                    <h2>#${position} - ${level.name} ${level.show_we_icon ? '<img src="icons/we-icon.png" class="we-icon" alt="WE Icon">' : ''} <span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span></h2>
                    <p>${playerName}</p>
                </div>
                <div class="preview">
                    ${previewUrl ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class=\\'no-preview\\'></p>';" />` : '<p class="no-preview"></p>'}
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', () => {
            const levelId = card.getAttribute('data-level-id');
            window.location.href = `level.html?id=${levelId}`;
        });
    });
}

async function initRecommendations() {
    const levelsData = await fetchData('levels.json');
    const playersData = await fetchData('players.json');
    const playerSelect = document.getElementById('player-select');

    playersData.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.nickname;
        playerSelect.appendChild(option);
    });

    playerSelect.addEventListener('change', async (event) => {
        const playerId = parseInt(event.target.value);
        if (!playerId) return;

        const skillPoints = calculateSkillPoints(playerId, levelsData);
        displaySkillPoints(skillPoints);

        const recommendedLevels = selectLevels(playerId, skillPoints, levelsData);
        displayRecommendedLevels(recommendedLevels, playersData);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initRecommendations();
});