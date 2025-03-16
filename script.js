async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
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

async function loadLevels() {
    const levels = await fetchData('levels.json');
    const players = await fetchData('players.json');
    const levelsList = document.getElementById('levels-list');
    levelsList.innerHTML = '';

    levels.forEach((level, index) => {
        const levelCard = document.createElement('div');
        levelCard.className = 'level-card';
        const firstPlayer = getPlayerInfo(level.players[0].id, players);

        const position = index + 1;

        const videoId = level.players[0].video_link.split('v=')[1];
        const previewUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;

        levelCard.innerHTML = `
            <div>
                <h2>#${position} - ${level.name}</h2>
                <p>First victor: ${firstPlayer.nickname}</p>
            </div>
            <div class="preview">
                <img src="${previewUrl}" alt="Preview">
            </div>
        `;
        levelCard.addEventListener('click', () => {
            window.location.href = `level.html?id=${position}`;
        });
        levelsList.appendChild(levelCard);
    });
}

async function loadLevelDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('id');
    const levels = await fetchData('levels.json');
    const players = await fetchData('players.json');
    const level = levels[levelId - 1]; // Используем индекс массива для поиска уровня
    const levelDetails = document.getElementById('level-details');

    if (level) {
        document.title = `${level.name} | Cherti Team List`;
        const firstPlayer = getPlayerInfo(level.players[0].id, players);

        // Получаем ссылку на видео из первого игрока
        const videoLink = level.players[0].video_link;

        // Преобразуем ссылку на видео в формат для встраивания (embed)
        const videoId = videoLink.split('v=')[1]; // Извлекаем ID видео
        const embedVideoLink = `https://www.youtube.com/embed/${videoId}`;

        levelDetails.innerHTML = `
            <h2>#${levelId} - ${level.name}</h2>
            <div class="level-info">
                <p><span>ID:</span> ${level.id}</p> <!-- Новое поле: ID -->
                <p><span>Фаза:</span> ${level.phase}</p>
                <p><span>GGDL:</span> ${level.ggdl_phase}</p>
                <p><span>Скилл-сеты:</span> ${level.skill_sets.join(', ')}</p>
                <p><span>Звезды:</span> ${level.points}</p>
                <p><span>LIST%:</span> ${level.list_percent}%</p>
            </div>
            <div class="video-player">
                <iframe src="${embedVideoLink}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <h3>(${level.players.length}) всего записей:</h3>
            <ul class="player-list">
                ${level.players.map(player => {
                    const playerData = getPlayerInfo(player.id, players);
                    return `
                        <li onclick="window.open('${player.video_link}', '_blank')">
                            <p class="player-name">${playerData.nickname}</p>
                            <p class="player-date">${player.date} (${player.progress}%)</p>
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    } else {
        levelDetails.innerHTML = '<p>Уровень не найден.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('level.html')) {
        loadLevelDetails();
    } else {
        loadLevels();
    }
});

async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

function getPlayerInfo(playerId, players) {
    return players.find(player => player.id === playerId);
}

async function loadArchive(type) {
    const levels = await fetchData('levels.json');
    const players = await fetchData('players.json');
    const archiveList = document.getElementById('archive-list');
    archiveList.innerHTML = '';

    levels.forEach((level, index) => {
        level.archives.forEach(archive => {
            if (archive.type === type) {
                const firstPlayer = getPlayerInfo(level.players[0].id, players);
                const archiveCard = document.createElement('div');
                archiveCard.className = 'archive-level-card';
                archiveCard.innerHTML = `
                    <h2>${level.name}</h2>
                    <p>First victor: ${firstPlayer.nickname}</p>
                    <p>Phases: ${level.phase}</p>
                    <p>GGDL: ${level.ggdl_phase}</p>
                    <p>Skill-sets: ${level.skill_sets.join(', ')}</p>
                    <p>Stars: ${level.points}</p>
                    <p>LIST%: ${level.list_percent}%</p>
                    <div class="archive-dates">
                        <p>Начало: ${archive.date_start}</p>
                        <p>Конец: ${archive.date_end}</p>
                        <p>Дней на первом месте: ${archive.duration_days}</p>
                    </div>
                `;

                archiveCard.addEventListener('click', () => {
                    window.location.href = `level.html?id=${index + 1}`;
                });

                archiveList.appendChild(archiveCard);
            }
        });
    });
}

document.getElementById('actual-archive').addEventListener('click', () => {
    document.getElementById('actual-archive').classList.add('active');
    document.getElementById('official-archive').classList.remove('active');
    loadArchive('actual');
});

document.getElementById('official-archive').addEventListener('click', () => {
    document.getElementById('official-archive').classList.add('active');
    document.getElementById('actual-archive').classList.remove('active');
    loadArchive('official');
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('archive.html')) {
        loadArchive('actual');
    }
});
