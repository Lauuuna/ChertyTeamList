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

async function loadFutureLevels() {
    try {
        const levels = await fetchData('future-levels.json');
        const players = await fetchData('players.json');
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;
        levelsList.innerHTML = '';

        levels.forEach((level, index) => {
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            const firstPlayer = getPlayerInfo(level.players[0].id, players);
            const position = index + 1;

            let previewUrl = '';
            if (level.players[0].video_link) {
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

            levelCard.innerHTML = `
                <div>
                    <h2>#${position} - ${level.name}</h2>
                    <p>${firstPlayer.nickname}</p>
                </div>
                <div class="preview">
                    ${previewUrl ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class=\\'no-preview\\'></p>';" />` : '<p class="no-preview"></p>'}
                </div>
            `;

            levelCard.addEventListener('click', () => {
                window.location.href = `future-level.html?id=${level.id}`;
            });

            levelsList.appendChild(levelCard);
        });
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('future.html')) {
        loadFutureLevels();
    }
});