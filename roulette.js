document.addEventListener('DOMContentLoaded', () => {
    const levelName = document.getElementById('level-name');
    const levelPhase = document.getElementById('level-phase');
    const levelPoints = document.getElementById('level-points');
    const progressValue = document.getElementById('progress-value');
    const doneButton = document.getElementById('done-button');
    const progressFill = document.getElementById('progress-fill');
    const saveCodeInput = document.getElementById('save-code');
    const copyButton = document.getElementById('copy-button');
    const loadButton = document.getElementById('load-button');
    const historyList = document.getElementById('history-list');

    let currentLevelIndex = 0;
    let levels = [];
    let currentPercent = 1;
    let history = [];

    function generateSaveCode() {
        const indices = levels.map((level, index) => index);
        const code = btoa(JSON.stringify({
            indices: indices,
            currentLevelIndex: currentLevelIndex,
            currentPercent: currentPercent,
        }));
        saveCodeInput.value = code;
    }

    async function fetchLevels() {
        const response = await fetch('levels.json');
        return await response.json();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function updateProgressBar() {
        progressFill.style.width = `${currentPercent}%`; 
    }

    function loadNextLevel() {
        if (currentLevelIndex >= levels.length) {
            alert('Roulette completed!');
            return;
        }

        const level = levels[currentLevelIndex];
        levelName.textContent = level.name;
        levelPhase.textContent = `Phase: ${level.phase}`;
        levelPoints.textContent = `Points: ${level.points}`;
        progressValue.textContent = `${currentPercent}%`;
        updateProgressBar();

        history.push(level);
        updateHistory();
    }

    function updateHistory() {
        historyList.innerHTML = history
            .map((level, index) => `
                <li>
                    <span>${index + 1}.</span>
                    <span>${level.name}</span>
                    <span>(${index + 1}%)</span>
                </li>
            `)
            .join('');
    }

    function loadSaveCode() {
        const code = saveCodeInput.value;
        if (!code) return;
    
        try {
            const data = JSON.parse(atob(code));
            levels = data.indices.map(index => levels[index]);
            currentLevelIndex = data.currentLevelIndex;
            currentPercent = data.currentPercent;
            history = levels.slice(0, currentLevelIndex); 
            loadNextLevel();
        } catch (error) {
            alert('Код неверный.');
        }
    }

    doneButton.addEventListener('click', () => {
        if (currentLevelIndex < levels.length) {
            currentLevelIndex++;
            currentPercent++;
            loadNextLevel();
            generateSaveCode();
        }
    });

    copyButton.addEventListener('click', () => {
        saveCodeInput.select();
        document.execCommand('copy');
        alert('Code copied to clipboard!');
    });

    loadButton.addEventListener('click', loadSaveCode);

    async function init() {
        const allLevels = await fetchLevels();
        levels = shuffleArray(allLevels).slice(0, 100);
        generateSaveCode();
        loadNextLevel();
    }

    init();
});