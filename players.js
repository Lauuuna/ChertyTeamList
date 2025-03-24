document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey); 

    async function fetchPlayersFromSupabase() {
        const { data, error } = await supabaseClient
            .from('players')
            .select('*'); 

        if (error) {
            console.error('Error fetching players from Supabase:', error);
            return [];
        }

        return data;
    }

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
        const supabasePlayers = await fetchPlayersFromSupabase(); 
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';

        const playersWithDetails = players.map(player => {
            const supabaseData = supabasePlayers.find(p => p.user_id === player.user_id) || {};
            return {
                ...player,
                ...supabaseData, 
                points: calculatePlayerPoints(player.id, levels)
            };
        });

        playersWithDetails.sort((a, b) => b.points - a.points);

        playersWithDetails.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <div class="player-banner" style="background-image: url('${player.banner_url || 'https://via.placeholder.com/800x200'}');"></div>
                <div class="player-avatar-container">
                    <img src="${player.avatar_url || 'https://via.placeholder.com/150'}" alt="Avatar" class="player-avatar">
                    <div class="player-info-header">
                        <h2>#${index + 1} - ${player.nickname} <img src="flags/${player.flag}.png" class="flag" alt="${player.flag}"></h2>
                        <p>Stars: ${player.points}</p>
                    </div>
                </div>
                <div class="player-stats">
                    <div class="stat">
                        <span>OSC</span>
                        <span>${player.osc}</span>
                    </div>
                    <div class="stat">
                        <span>L%</span>
                        <span>${player.l_percent}</span>
                    </div>
                    <div class="stat">
                        <span>Attempts for 1⭐</span>
                        <span>${player.time_for_1_star}</span>
                    </div>
                </div>
            `;
            playerCard.addEventListener('click', () => {
                window.location.href = `player.html?id=${player.id}`;
            });
            playersList.appendChild(playerCard);
        });
    }

    loadPlayers();
});