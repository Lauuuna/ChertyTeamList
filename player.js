async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

function calculatePlayerPoints(playerId, levels) {
    let totalPoints = 0;
    levels.forEach(level => {
        const playerProgress = level.players.find(p => p.id === playerId);
        if (playerProgress && playerProgress.progress === 100) {
            totalPoints += level.points;
        }
    });
    return Math.round(totalPoints * 10) / 10;
}

async function loadPlayerDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = parseInt(urlParams.get('id'));
    const levels = await fetchData('levels.json');
    const players = await fetchData('players.json');
    const player = players.find(p => p.id === playerId);
    const playerDetails = document.getElementById('player-details');

    if (player) {
        const totalPoints = calculatePlayerPoints(playerId, levels);

        const completedLevels = levels.filter(level => {
            const playerProgress = level.players.find(p => p.id === playerId);
            return playerProgress && playerProgress.progress === 100;
        });

        const hardestLevel = completedLevels.reduce((hardest, level) => {
            return level.points > (hardest?.points || 0) ? level : hardest;
        }, null);

        const progresses = levels.filter(level => {
            const playerProgress = level.players.find(p => p.id === playerId);
            return playerProgress && playerProgress.progress < 100;
        });

        const playersWithPoints = players.map(player => ({
            ...player,
            points: calculatePlayerPoints(player.id, levels)
        }));

        playersWithPoints.sort((a, b) => b.points - a.points);
        const playerPosition = playersWithPoints.findIndex(p => p.id === playerId) + 1;

        playerDetails.innerHTML = `
            <div class="player-card with-border">
                <h2>#${playerPosition} - ${player.nickname} <img src="flags/${player.flag}.png" class="flag" alt="${player.flag}"></h2>
            </div>
            <div class="player-info">
                <p><span>Stars:</span> ${totalPoints}</p>
                <p><span>Hardest:</span> ${hardestLevel ? hardestLevel.name : 'Нет данных'}</p>
                <p><span>OSC:</span> ${player.osc}</p>
                <p><span>L%:</span> ${player.l_percent}</p>
                <p><span>ATTEMPTS ARE REQUIRED TO 1⭐:</span> ${player.time_for_1_star}</p>
                <p><span>Skill-set:</span> ${player.skill_set.join(', ')}</p>
            </div>
            <div class="completed-levels">
                <h3>COMPLETIONS</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Level</th>
                            <th>Position</th>
                            <th>Stars</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${completedLevels.map(level => {
                            const position = levels.indexOf(level) + 1;
                            return `
                                <tr onclick="window.location.href='level.html?id=${position}'">
                                    <td>${level.name}</td>
                                    <td>#${position}</td>
                                    <td>${level.points}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ${progresses.length > 0 ? `
                <div class="progress-levels">
                    <h3>PROGRESSES</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Level</th>
                                <th>Position</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${progresses.map(level => {
                                const playerProgress = level.players.find(p => p.id === playerId);
                                const position = levels.indexOf(level) + 1;
                                return `
                                    <tr onclick="window.location.href='level.html?id=${position}'">
                                        <td>${level.name}</td>
                                        <td>#${position}</td>
                                        <td>${playerProgress.progress}%</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        `;
    } else {
        playerDetails.innerHTML = '<p>Игрок не найден.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadPlayerDetails();
});