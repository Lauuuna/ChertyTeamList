const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const ALL_SKILLS = [
    "cube", "ship", "ball", "ufo", "wave", "robot", "spider", "swing",
    "nerve-control", "learny", "chokepoints", "flow",
    "fast-paced", "low-paced", "high cps", "timings"
];

const SKILL_GROUPS = {
    gamemodes: ["cube", "ship", "ball", "ufo", "wave", "robot", "spider", "swing"],
    technical: ["nerve-control", "learny", "chokepoints", "flow"],
    gameplay: ["fast-paced", "low-paced", "high cps", "timings"]
};

let radarChart = null;
let allPlayersBalance = [];
let levels = [];
let players = [];

async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

async function fetchPlayers() {
    const { data, error } = await supabaseClient.from('players').select('*');
    return error ? await fetchData('players.json') : data;
}

function calculateSkillPoints(playerId, levelsData) {
    const skillPoints = new Map(ALL_SKILLS.map(skill => [skill, 0]));
    const skillCounts = new Map(ALL_SKILLS.map(skill => [skill, 0]));
    
    levelsData.forEach(level => {
        const playerProgress = level.players.find(p => p.id === playerId);
        if (playerProgress?.progress === 100) {
            level.skill_sets?.forEach(skill => {
                if (ALL_SKILLS.includes(skill)) {
                    skillPoints.set(skill, (skillPoints.get(skill) || 0) + level.points);
                    skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
                }
            });
        }
    });
    
    ALL_SKILLS.forEach(skill => {
        const count = skillCounts.get(skill);
        if (count > 0) {
            skillPoints.set(skill, skillPoints.get(skill) / count);
        }
    });
    
    return skillPoints;
}

function calculateBalanceScore(skillPoints) {
    const values = Array.from(skillPoints.values());
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    const groupAverages = {};
    for (const [groupName, groupSkills] of Object.entries(SKILL_GROUPS)) {
        const groupValues = groupSkills.map(skill => skillPoints.get(skill) || 0);
        groupAverages[groupName] = groupValues.reduce((sum, val) => sum + val, 0) / groupSkills.length;
    }

    const normalizedValues = values.map(v => v / Math.max(...values));
    let entropy = 0;
    for (const val of normalizedValues) {
        if (val > 0.1) {
            entropy -= val * Math.log(val);
        }
    }
    
    const maxEntropy = Math.log(ALL_SKILLS.length);
    let balance = (entropy / maxEntropy) * 100;
    
    const groupVariances = Object.values(groupAverages).map(avg => {
        const variance = Object.values(groupAverages).reduce((sum, otherAvg) => sum + Math.pow(avg - otherAvg, 2), 0);
        return variance / Object.keys(groupAverages).length;
    });
    
    const groupBalancePenalty = Math.sqrt(groupVariances.reduce((a, b) => a + b, 0) / groupVariances.length) * 15;
    balance = Math.max(0, balance - groupBalancePenalty);
    
    return Math.min(100, Math.round(balance * 10) / 10);
}

async function calculateAllPlayersBalance(players, levelsData) {
    allPlayersBalance = await Promise.all(players.map(async player => {
        const skillPoints = calculateSkillPoints(player.id, levelsData);
        return { playerId: player.id, balance: calculateBalanceScore(skillPoints) };
    }));
    allPlayersBalance.sort((a, b) => b.balance - a.balance);
}

function getPlayerBalanceRank(playerId) {
    const index = allPlayersBalance.findIndex(p => p.playerId === playerId);
    return index >= 0 ? index + 1 : null;
}

function getPlayerMaxPhase(playerId, levelsData) {
    const completedLevels = levelsData.filter(level => level.players.some(p => p.id === playerId && p.progress === 100));
    return completedLevels.length ? Math.max(...completedLevels.map(level => parseInt(level.phase))) : 5;
}

function getPlayerSkillProfile(skillPoints) {
    const values = Array.from(skillPoints.values());
    const avgSkill = values.reduce((a, b) => a + b, 0) / values.length;
    const maxSkill = Math.max(...values);
    
    return {
        avgSkill,
        maxSkill,
        isSpecialized: maxSkill > avgSkill * 1.5,
        weakSkills: ALL_SKILLS.filter(skill => (skillPoints.get(skill) || 0) < avgSkill * 0.7)
    };
}

function getRecommendedLevels(playerId, skillPoints, levelsData, count = 5) {
    const completedLevelIds = levelsData.filter(level => level.players.some(p => p.id === playerId && p.progress === 100)).map(level => level.id);
    const maxPhase = getPlayerMaxPhase(playerId, levelsData);
    
    const skillProfile = getPlayerSkillProfile(skillPoints);
    const avgPlayerSkill = skillProfile.avgSkill;
    
    let minPhase = Math.max(0, maxPhase - 2);
    let maxAllowedPhase = Math.min(10, maxPhase + (skillProfile.isSpecialized ? 1 : 2));

    if (maxPhase <= 2) {
        minPhase = 0;
        maxAllowedPhase = Math.min(4, maxPhase + (skillProfile.isSpecialized ? 1 : 2));
    } else if (maxPhase >= 8) {
        minPhase = Math.max(6, maxPhase - 2);
        maxAllowedPhase = 10;
    }

    return levelsData
        .filter(level => {
            if (completedLevelIds.includes(level.id)) return false;
            const phase = parseInt(level.phase);
            return phase >= minPhase && phase <= maxAllowedPhase;
        })
        .map(level => {
            const levelSkills = (level.skill_sets || []).filter(skill => ALL_SKILLS.includes(skill));
            const levelDifficulty = level.points;
            
            const requiredSkills = levelSkills.map(skill => skillPoints.get(skill) || 0);
            const minRequiredSkill = requiredSkills.length ? Math.min(...requiredSkills) : 0;
            const avgRequiredSkill = requiredSkills.length ? requiredSkills.reduce((a, b) => a + b, 0) / requiredSkills.length : 0;
            
            const weakSkillBonus = levelSkills.filter(skill => skillProfile.weakSkills.includes(skill)).length * 0.3;
            const difficultyMatch = 1 - Math.min(1, Math.abs(levelDifficulty - avgPlayerSkill) / 100);
            
            let score = 0;
            
            if (skillProfile.isSpecialized) {
                const specializationPenalty = 0.5 - (minRequiredSkill / (2 * avgPlayerSkill));
                score = (difficultyMatch * 0.6) + (weakSkillBonus * 0.4) + specializationPenalty;
            } else {
                score = (difficultyMatch * 0.5) + (weakSkillBonus * 0.5);
            }
            
            return { 
                ...level, 
                score: Math.max(0, Math.min(1, score)),
                difficultyScore: difficultyMatch,
                improvementScore: weakSkillBonus,
                minRequiredSkill,
                avgRequiredSkill
            };
        })
        .sort((a, b) => {
            if (skillProfile.isSpecialized) {
                return a.minRequiredSkill - b.minRequiredSkill || b.score - a.score;
            }
            return b.score - a.score;
        })
        .slice(0, count);
}

function displayPlayerSelector(players) {
    const select = document.getElementById('player-select');
    select.innerHTML = '<option value="">Select a player</option>';
    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.nickname;
        select.appendChild(option);
    });
}

function updateRadarChart(skillPoints) {
    const ctx = document.getElementById('radar-chart').getContext('2d');
    if (radarChart) radarChart.destroy();
    
    const values = ALL_SKILLS.map(skill => skillPoints.get(skill) || 0);
    const maxValue = Math.max(...values);
    const normalizedValues = values.map(v => maxValue > 0 ? v / maxValue * 100 : 0);
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ALL_SKILLS,
            datasets: [{
                data: normalizedValues,
                backgroundColor: 'rgba(255, 68, 68, 0.2)',
                borderColor: 'rgba(255, 68, 68, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 68, 68, 1)',
                pointRadius: 4
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#fff', font: { size: 10 } },
                    ticks: { 
                        display: true,
                        backdropColor: 'transparent',
                        stepSize: 20,
                        max: 100,
                        min: 0
                    }
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const skill = ALL_SKILLS[context.dataIndex];
                            const rawValue = values[context.dataIndex];
                            return `${skill}: ${rawValue.toFixed(1)} (${context.raw.toFixed(1)}%)`;
                        }
                    }
                }
            },
            elements: { line: { tension: 0.1 } }
        }
    });
}

function displayBalanceInfo(playerId) {
    const skillPoints = calculateSkillPoints(playerId, levels);
    const balanceScore = calculateBalanceScore(skillPoints);
    const rank = getPlayerBalanceRank(playerId);
    
    const scoreElement = document.getElementById('balance-score');
    scoreElement.textContent = `${balanceScore.toFixed(1)}%`;
    
    if (balanceScore >= 80) {
        scoreElement.style.color = '#4CAF50';
    } else if (balanceScore >= 60) {
        scoreElement.style.color = '#8BC34A';
    } else if (balanceScore >= 40) {
        scoreElement.style.color = '#FFC107';
    } else if (balanceScore >= 20) {
        scoreElement.style.color = '#FF9800';
    } else {
        scoreElement.style.color = '#F44336';
    }
    
    document.getElementById('balance-rank').textContent = rank ? `Rank: #${rank}` : 'Rank: -';
}

function displayRecommendedLevels(recommendedLevels, players) {
    const container = document.getElementById('levels-list');
    container.innerHTML = '';
    
    recommendedLevels.forEach(level => {
        const player = players.find(p => p.id === level.players[0]?.id);
        const videoId = level.players[0]?.video_link ? extractYouTubeId(level.players[0].video_link) : null;
        const previewUrl = videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : null;
        const weIcon = level.show_we_icon ? '<img src="icons/we-icon.png" class="we-icon" alt="WE Icon">' : '';
        const newIcon = level.show_new_icon ? '<img src="icons/new.png" class="new-icon" alt="NEW Icon">' : '';
        const phaseBadge = `<span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span>`;
        const positionText = level.position ? `#${level.position}` : 'Unranked';

        const levelCard = document.createElement('div');
        levelCard.className = 'level-card';
        levelCard.innerHTML = `
            <div>
                <h2>${level.name}${weIcon}${newIcon} ${phaseBadge}</h2>
                <p>${player?.nickname || 'Unknown'} • ${positionText}</p>
                <p class="level-skills">${(level.skill_sets || []).join(', ')}</p>
            </div>
            <div class="preview">
                ${previewUrl ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class="no-preview"></p>'">` : '<p class="no-preview"></p>'}
            </div>
        `;
        levelCard.addEventListener('click', () => window.location.href = `level.html?id=${level.id}`);
        container.appendChild(levelCard);
    });
}

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
}

async function initRecommendations() {
    [levels, players] = await Promise.all([fetchData('levels.json'), fetchPlayers()]);
    await calculateAllPlayersBalance(players, levels);
    displayPlayerSelector(players);
    
    document.getElementById('player-select').addEventListener('change', async (e) => {
        const playerId = e.target.value;
        if (!playerId) return;
        const skillPoints = calculateSkillPoints(playerId, levels);
        updateRadarChart(skillPoints);
        displayBalanceInfo(playerId);
        displayRecommendedLevels(getRecommendedLevels(playerId, skillPoints, levels), players);
    });
}

document.addEventListener('DOMContentLoaded', initRecommendations);