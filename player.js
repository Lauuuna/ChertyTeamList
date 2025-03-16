async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
  }
  
  function getPlayerInfo(playerId, players) {
    return players.find(player => player.id === playerId);
  }
  
  function calculatePlayerPoints(player, levels) {
    let totalPoints = 0;
    player.levels_completed.forEach(levelName => {
      const level = levels.find(l => l.name === levelName);
      if (level) {
        totalPoints += level.points;
      }
    });
    return totalPoints;
  }
  
  async function loadPlayerDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');
    const levels = await fetchData('levels.json');
    const players = await fetchData('players.json');
    const player = players.find(p => p.id == playerId);
    const playerDetails = document.getElementById('player-details');
  
    if (player) {
        document.title = `${player.nickname} | Cherti Team List`;
        const totalPoints = calculatePlayerPoints(player, levels);
        const hardestLevel = player.levels_completed.reduce((hardest, levelName) => {
            const level = levels.find(l => l.name === levelName);
            return level && level.points > (hardest?.points || 0) ? level : hardest;
        }, null);

        playerDetails.innerHTML = `
            <h2>#${players.indexOf(player) + 1} - ${player.nickname} <img src="flags/${player.flag}.png" class="flag" alt="${player.flag}"></h2>
            <div class="player-info">
                <p><span>Stars:</span> ${totalPoints}</p>
                <p><span>Hardest:</span> ${hardestLevel ? hardestLevel.name : 'Нет данных'}</p>
                <p><span>OSC:</span> ${player.osc}</p> <!-- Новое поле: OSC -->
                <p><span>L%:</span> ${player.l_percent}</p> <!-- Новое поле: L% -->
                <p><span>ЗА СКОЛЬКО ПРОЙДЕТ 1⭐:</span> ${player.time_for_1_star}</p> <!-- Новое поле: ЗА СКОЛЬКО ПРОЙДЕТ 1⭐ -->
                <p><span>Skill-set:</span> ${player.skill_set.join(', ')}</p> <!-- Новое поле: Skill-set -->
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
                        ${player.levels_completed.map(levelName => {
                            const level = levels.find(l => l.name === levelName);
                            if (level) {
                                const position = levels.indexOf(level) + 1;
                                return `
                                    <tr onclick="window.location.href='level.html?id=${position}'">
                                        <td>${level.name}</td>
                                        <td>#${position}</td>
                                        <td>${level.points}</td>
                                    </tr>
                                `;
                            } else {
                                return `
                                    <tr>
                                        <td>${levelName}</td>
                                        <td>N/A</td>
                                        <td>N/A</td>
                                    </tr>
                                `;
                            }
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        playerDetails.innerHTML = '<p>Игрок не найден.</p>';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    loadPlayerDetails();
});