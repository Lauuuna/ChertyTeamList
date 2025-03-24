async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error loading data: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading.', error);
        return [];
    }
}

function getPlayerInfo(playerId, players) {
    return players.find(player => player.id === playerId);
}

async function loadFutureLevelDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const levelId = urlParams.get('id');
        const levels = await fetchData('future-levels.json');
        const players = await fetchData('players.json');
        const level = levels.find(l => l.id === parseInt(levelId));
        const levelDetails = document.getElementById('level-details');

        if (!levelDetails) return;

        if (level) {
            const levelPosition = levels.indexOf(level) + 1;

            document.title = `${level.name} | Future List`;
            const firstPlayer = getPlayerInfo(level.players[0].id, players);
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

            const embedVideoLink = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

            levelDetails.innerHTML = `
                <h2>#${levelPosition} - ${level.name}</h2>
                <div class="level-info">
                    <div class="info-card">
                        <h3>Skill-sets</h3>
                        <p>${level.skill_sets.join(', ')}</p>
                    </div>
                    <div class="info-card">
                        <h3>Highest % by</h3>
                        <p>${firstPlayer.nickname}</p>
                    </div>
                </div>
                <div class="video-player">
                    ${embedVideoLink ? `
                        <iframe src="${embedVideoLink}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    ` : `
                        <p class="video-error">Video unavailable.</p>
                    `}
                </div>
                <div class="total-records">
                    <h3>Total Records (${level.players.length})</h3>
                    <ul class="player-list">
                        ${level.players.map(player => {
                            const playerData = getPlayerInfo(player.id, players);
                            return `
                                <li onclick="window.open('${player.video_link}', '_blank')">
                                    <p class="player-name">${playerData.nickname}</p>
                                    <p class="player-date">${player.progress}%</p>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            `;
        } else {
            levelDetails.innerHTML = '<p>Level not found.</p>';
        }
    } catch (error) {
        console.error('Error loading:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('future-level.html')) {
        loadFutureLevelDetails();
    }
});