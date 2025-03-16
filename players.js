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

  async function loadPlayers() {
    const levels = await fetchData('levels.json');
    const players = await fetchData('players.json');
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    players.sort((a, b) => calculatePlayerPoints(b, levels) - calculatePlayerPoints(a, levels));
  
    players.forEach((player, index) => {
      const playerCard = document.createElement('div');
      playerCard.className = 'player-card';
      playerCard.innerHTML = `
        <h2>#${index + 1} - ${player.nickname} <img src="flags/${player.flag}.png" class="flag" alt="${player.flag}"></h2>
        <p>Stars: ${calculatePlayerPoints(player, levels)}</p>
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