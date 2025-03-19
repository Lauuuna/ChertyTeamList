async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки данных : ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при загрузке.', error);
        return [];
    }
}

function getPlayerInfo(playerId, players) {
    return players.find(player => player.id === playerId);
}

function filterLevels(levels, searchText, phaseFilter, positionFilter) {
    return levels.filter((level, index) => {
        const matchesSearch = level.name.toLowerCase().includes(searchText.toLowerCase());
        const matchesPhase = !phaseFilter || level.phase === phaseFilter;
        const matchesPosition = !positionFilter || (index + 1) === parseInt(positionFilter);
        return matchesSearch && matchesPhase && matchesPosition;
    });
}

async function loadLevels() {
    try {
        const levels = await fetchData('levels.json');
        const players = await fetchData('players.json');
        const levelsList = document.getElementById('levels-list');
        if (!levelsList) return;
        levelsList.innerHTML = '';

        const searchText = document.getElementById('search-input').value;
        const phaseFilter = document.getElementById('phase-filter').value;
        const positionFilter = document.getElementById('position-filter').value;

        const filteredLevels = filterLevels(levels, searchText, phaseFilter, positionFilter);

        filteredLevels.forEach((level, index) => {
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            const firstPlayer = getPlayerInfo(level.players[0].id, players);
            const position = levels.indexOf(level) + 1;
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
                    <h2>#${position} - ${level.name} ${level.show_we_icon ? '<img src="icons/we-icon.png" class="we-icon" alt="WE Icon">' : ''} <span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span></h2>
                    <p>${firstPlayer.nickname}</p>
                </div>
                <div class="preview">
                    ${previewUrl ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class=\\'no-preview\\'></p>';" />` : '<p class="no-preview"></p>'}
                </div>
            `;

            levelCard.addEventListener('click', () => {
                window.location.href = `level.html?id=${position}`;
            });
            levelsList.appendChild(levelCard);
        });
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
    }
}

async function loadLevelDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const levelId = urlParams.get('id');
        const levels = await fetchData('levels.json');
        const players = await fetchData('players.json');
        const level = levels[levelId - 1];
        const levelDetails = document.getElementById('level-details');

        if (!levelDetails) return;

        if (level) {
            document.title = `${level.name} | Cherti Team List`;
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
                <h2>#${levelId} - ${level.name} ${level.show_we_icon ? '<img src="icons/we-icon.png" class="we-icon" alt="WE Icon">' : ''} <span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span></h2>
                <div class="level-info">
                    <p><span>ID:</span> ${level.id}</p>
                    <p><span>Phase:</span> ${level.phase}</p>
                    <p><span>GGDL:</span> ${level.ggdl_phase}</p>
                    <p><span>Skill-sets:</span> ${level.skill_sets.join(', ')}</p>
                    <p><span>Stars:</span> ${level.points}</p>
                    <p><span>LIST%:</span> ${level.list_percent}%</p>
                    <p><span>Игрок:</span> ${firstPlayer.nickname}</p>
                </div>
                <div class="video-player">
                    ${embedVideoLink ? `
                        <iframe src="${embedVideoLink}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    ` : `
                        <p class="video-error">Видео недоступно.</p>
                    `}
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
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

window.addEventListener('scroll', () => {
    const scrollToTopButton = document.getElementById('scroll-to-top');
    if (window.scrollY > 300) {
        scrollToTopButton.classList.add('show');
    } else {
        scrollToTopButton.classList.remove('show');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const scrollToTopButton = document.getElementById('scroll-to-top');
    if (scrollToTopButton) {
        scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('level.html')) {
        loadLevelDetails();
    } else if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadLevels();

        document.getElementById('search-input').addEventListener('input', loadLevels);
        document.getElementById('phase-filter').addEventListener('change', loadLevels);
        document.getElementById('position-filter').addEventListener('input', loadLevels);
    }
});