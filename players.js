async function fetchData(url) {
  const response = await fetch(url);
  return await response.json();
}

function calculatePlayerPoints(playerId, levels) {
  let totalPoints = 0;
  levels.forEach(level => {
      const playerProgress = level.players.find(p => p.id === playerId);
      if (playerProgress) {
          if (playerProgress.progress === 100) {
              totalPoints += level.points;
          } else {
              totalPoints += level.points / 5;
          }
      }
  });
  return Math.round(totalPoints * 10) / 10; 
}

async function loadPlayers() {
  const levels = await fetchData('levels.json');
  const players = await fetchData('players.json');
  const playersList = document.getElementById('players-list');
  playersList.innerHTML = '';

  const playersWithPoints = players.map(player => ({
      ...player,
      points: calculatePlayerPoints(player.id, levels)
  }));

  playersWithPoints.sort((a, b) => b.points - a.points);

  playersWithPoints.forEach((player, index) => {
      const playerCard = document.createElement('div');
      playerCard.className = 'player-card';
      playerCard.innerHTML = `
          <h2>#${index + 1} - ${player.nickname} <img src="flags/${player.flag}.png" class="flag" alt="${player.flag}"></h2>
          <p>Stars: ${player.points}</p>
      `;
      playerCard.addEventListener('click', () => {
          window.location.href = `player.html?id=${player.id}`;
      });
      playersList.appendChild(playerCard);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadPlayers();
});