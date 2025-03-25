const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const ALL_SKILLS = [
    "cube", "ship", "ball", "ufo", "wave", "robot", "spider", "swing",
    "nerve-control", "learny", "chokepoints", "flow",
    "fast-paced", "low-paced", "high cps", "timings"
];

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
    levelsData.forEach(level => {
        const playerProgress = level.players.find(p => p.id === playerId);
        if (playerProgress?.progress === 100) {
            level.skill_sets?.forEach(skill => {
                if (ALL_SKILLS.includes(skill)) skillPoints.set(skill, (skillPoints.get(skill) || 0) + level.points);
            });
        }
    });
    return skillPoints;
}

function calculateBalanceScore(skillPoints) {
    const values = Array.from(skillPoints.values());
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    const max = Math.max(...values);
    const normalized = values.map(v => v / max);
    
    let entropy = 0;
    for (const val of normalized) {
        if (val > 0.1) {
            entropy -= val * Math.log(val);
        }
    }
    
    const maxEntropy = Math.log(ALL_SKILLS.length);
    const balance = (entropy / maxEntropy) * 100;
    
    return Math.round(balance * 10) / 10;
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

function getRecommendedLevels(playerId, skillPoints, levelsData, count = 5) {
    const completedLevelIds = levelsData.filter(level => level.players.some(p => p.id === playerId && p.progress === 100)).map(level => level.id);
    const maxPhase = getPlayerMaxPhase(playerId, levelsData);
    let minPhase = Math.max(0, maxPhase - 2);
    let maxAllowedPhase = Math.min(10, maxPhase + 2);

    if (maxPhase <= 2) minPhase = 0, maxAllowedPhase = Math.min(4, maxPhase + 2);
    else if (maxPhase >= 8) minPhase = Math.max(6, maxPhase - 2), maxAllowedPhase = 10;

    const playerTotalPoints = Array.from(skillPoints.values()).reduce((sum, val) => sum + val, 0);
    const avgPlayerSkill = playerTotalPoints / ALL_SKILLS.length;

    return levelsData
        .filter(level => !completedLevelIds.includes(level.id) && parseInt(level.phase) >= minPhase && parseInt(level.phase) <= maxAllowedPhase)
        .map(level => {
            const levelSkills = (level.skill_sets || []).filter(skill => ALL_SKILLS.includes(skill));
            const levelDifficulty = level.points * (1 + parseInt(level.phase) * 0.1);
            const avgSkillValue = levelSkills.length ? levelSkills.reduce((sum, skill) => sum + (skillPoints.get(skill) || 0), 0) / levelSkills.length : 0;
            const variance = levelSkills.length ? levelSkills.reduce((sum, skill) => sum + Math.pow((skillPoints.get(skill) || 0) - avgSkillValue, 2), 0) / levelSkills.length : 0;
            const difficultyScore = 1 - Math.min(1, Math.abs(levelDifficulty - avgPlayerSkill) / 100);
            const balanceScore = 1 / (1 + Math.sqrt(variance));
            return { ...level, score: (difficultyScore * 0.6) + (balanceScore * 0.4), avgSkillValue };
        })
        .sort((a, b) => b.score - a.score)
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
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ALL_SKILLS,
            datasets: [{
                data: ALL_SKILLS.map(skill => skillPoints.get(skill) || 0),
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
                    ticks: { display: false, backdropColor: 'transparent' }
                }
            },
            plugins: { legend: { display: false } },
            elements: { line: { tension: 0.1 } }
        }
    });
}

function displayBalanceInfo(playerId) {
    const skillPoints = calculateSkillPoints(playerId, levels);
    const balanceScore = calculateBalanceScore(skillPoints);
    const rank = getPlayerBalanceRank(playerId);
    document.getElementById('balance-score').textContent = `${balanceScore.toFixed(1)}%`;
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

        const levelCard = document.createElement('div');
        levelCard.className = 'level-card';
        levelCard.innerHTML = `
            <div>
                <h2>${level.name}${weIcon}${newIcon} ${phaseBadge}</h2>
                <p>${player?.nickname || 'Unknown'}</p>
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