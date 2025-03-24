document.addEventListener('DOMContentLoaded', () => {
    const actualArchiveButton = document.getElementById('actual-archive');
    const officialArchiveButton = document.getElementById('official-archive');
    const archiveList = document.getElementById('archive-list');

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
        archiveList.innerHTML = '';

        levels.forEach((level) => {
            const archive = level.archives ? level.archives.find(archive => archive.type === type) : null;
            if (archive) {
                const firstPlayer = getPlayerInfo(level.players[0].id, players);
                const position = levels.indexOf(level) + 1;

                const archiveLevelCard = document.createElement('div');
                archiveLevelCard.className = 'archive-level-card';
                archiveLevelCard.innerHTML = `
                    <h2>${level.name}</h2>
                    <p>${firstPlayer.nickname}</p>
                    <p class="archive-dates">${archive.date_start} - ${archive.date_end} (${archive.duration_days} дней)</p>
                `;
                archiveLevelCard.addEventListener('click', () => {
                    window.location.href = `level.html?id=${level.id}`; 
                });
                archiveList.appendChild(archiveLevelCard);
            }
        });
    }

    actualArchiveButton.addEventListener('click', () => {
        actualArchiveButton.classList.add('active');
        officialArchiveButton.classList.remove('active');
        loadArchive('actual');
    });

    officialArchiveButton.addEventListener('click', () => {
        officialArchiveButton.classList.add('active');
        actualArchiveButton.classList.remove('active');
        loadArchive('official');
    });

    loadArchive('actual');
});