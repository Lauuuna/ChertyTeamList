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
                <div class="level-header">
                    <h2>#${position} - ${level.name}</h2>
                    <span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span>
                </div>
                <div class="level-content">
                    <div class="level-info">
                        <p><strong>Verified by:</strong> ${firstPlayer.nickname}</p>
                        <p><strong>Stars:</strong> ${level.points}</p>
                        <p><strong>Skill-sets:</strong> ${level.skill_sets.join(', ')}</p>
                    </div>
                    <div class="preview">
                        ${previewUrl ? `<img src="${previewUrl}" alt="Preview" onerror="this.onerror=null; this.parentElement.innerHTML='<p class=\\'no-preview\\'></p>';" />` : '<p class="no-preview"></p>'}
                    </div>
                </div>
            `;
            levelCard.addEventListener('click', () => {
                window.location.href = `level.html?id=${level.id}`;
            });
            levelsList.appendChild(levelCard);
        });
    } catch (error) {
        console.error('Ошибка при загрузке:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadLevels();

        document.getElementById('search-input').addEventListener('input', loadLevels);
        document.getElementById('phase-filter').addEventListener('change', loadLevels);
        document.getElementById('position-filter').addEventListener('input', loadLevels);
    }
});

//function calculateAverageEnjoyment(enjoymentData) {
    //const ratings = Object.values(enjoymentData);
    //if (ratings.length === 0) return 0;
    //const total = ratings.reduce((sum, rating) => sum + rating, 0);
    //return (total / ratings.length).toFixed(1);
//}

//function calculateAverageEnjoyment(enjoymentData) {
    //const ratings = Object.values(enjoymentData);
    //if (ratings.length === 0) return 0;
    //const total = ratings.reduce((sum, rating) => sum + rating, 0);
    //return (total / ratings.length).toFixed(1);
//}

//function calculateAverageEnjoyment(enjoymentData) {
    //const ratings = Object.values(enjoymentData);
    //if (ratings.length === 0) return 0;
    //const total = ratings.reduce((sum, rating) => sum + rating, 0);
    //return (total / ratings.length).toFixed(1);
//}

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
    const enjoymentBlock = document.getElementById('enjoyment');
    const modal = document.getElementById('enjoyment-modal');
    const closeModal = document.querySelector('.close');

    if (enjoymentBlock) {
        enjoymentBlock.addEventListener('click', async () => {
            const enjoymentData = await fetchData('enjoyment.json');
            const levelId = new URLSearchParams(window.location.search).get('id');
            const levelEnjoyment = enjoymentData[levelId];
            const enjoymentList = document.getElementById('enjoyment-list');

            let content = '';
            if (levelEnjoyment) {
                content += Object.entries(levelEnjoyment).map(([playerId, rating]) => {
                    const player = players.find(p => p.id === parseInt(playerId));
                    return `<p><strong>${player?.nickname || 'Unknown Player'}:</strong> ${rating}</p>`;
                }).join('');
            } else {
                content += `<p>There are no opinions.</p>`;
            }

            enjoymentList.innerHTML = content;
            modal.style.display = 'flex';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

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
                window.location.href = `level.html?id=${level.id}`; 
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
        const level = levels.find(l => l.id === parseInt(levelId));
        const levelDetails = document.getElementById('level-details');

        if (!levelDetails) return;

        if (level) {
            const levelPosition = levels.indexOf(level) + 1;

            document.title = `${level.name} | Cherti List`;
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
                <h2>#${levelPosition} - ${level.name} <span class="phase-badge phase-${level.phase}">Phase ${level.phase}</span></h2>
                <div class="level-info">
                    <div class="info-card">
                        <h3>ID</h3>
                        <p>${level.id}</p>
                    </div>
                    <div class="info-card">
                        <h3>GGDL</h3>
                        <p>${level.ggdl_phase}</p>
                    </div>
                    <div class="info-card">
                        <h3>Skill-sets</h3>
                        <p>${level.skill_sets.join(', ')}</p>
                    </div>
                    <div class="info-card">
                        <h3>Stars</h3>
                        <p>${level.points}</p>
                    </div>
                    <div class="info-card">
                        <h3>LIST%</h3>
                        <p>${level.list_percent}%</p>
                    </div>
                    <div class="info-card">
                        <h3>Verified by</h3>
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
                                    <p class="player-date">${player.date} (${player.progress}%)</p>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
                <button class="enjoyment-button" id="enjoyment-button">View Enjoyment</button>
            `;

            const enjoymentButton = document.getElementById('enjoyment-button');
            enjoymentButton.addEventListener('click', async () => {
                const enjoymentData = await fetchData('enjoyment.json');
                const levelEnjoyment = enjoymentData[level.id];
                const modal = document.getElementById('enjoyment-modal');
                const enjoymentList = document.getElementById('enjoyment-list');

                const totalEnjoyment = level.enjoyment || (levelEnjoyment ? calculateAverageEnjoyment(levelEnjoyment) : null);

                let content = '';
                if (totalEnjoyment !== null) {
                    content += `<p><strong>Enjoyment:</strong> ${totalEnjoyment}</p>`;
                }
                if (levelEnjoyment) {
                    content += Object.entries(levelEnjoyment).map(([playerId, rating]) => {
                        const player = players.find(p => p.id === parseInt(playerId));
                        return `<p><strong>${player?.nickname || 'Unknown Player'}:</strong> ${rating}</p>`;
                    }).join('');
                } else {
                    content += `<p>There are no opinions.</p>`;
                }

                content += `<button id="send-opinion" class="send-opinion-button">Send Opinion</button>`;

                enjoymentList.innerHTML = content;

                const sendOpinionButton = document.getElementById('send-opinion');
                sendOpinionButton.addEventListener('click', () => {
                    window.open('https://forms.gle/ASiLaXuWrrsHcDga9', '_blank');
                });

                modal.style.display = 'flex';
            });

            const closeModal = document.querySelector('.close');
            closeModal.addEventListener('click', () => {
                const modal = document.getElementById('enjoyment-modal');
                modal.style.display = 'none';
            });
        } else {
            levelDetails.innerHTML = '<p>Level not found.</p>';
        }
    } catch (error) {
        console.error('Error loading:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('level.html')) {
        loadLevelDetails();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadLevels(); 

        document.getElementById('search-input').addEventListener('input', loadLevels);
        document.getElementById('phase-filter').addEventListener('change', loadLevels);
        document.getElementById('position-filter').addEventListener('input', loadLevels);
    }

    if (window.location.pathname.includes('level.html')) {
        loadLevelDetails();
    }
});
