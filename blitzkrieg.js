let currentSession = {
    name: 'Default',
    positions: [25, 50, 75],
    completed: {}
};

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate-blitzkrieg').addEventListener('click', generateBlitzkrieg);
    document.getElementById('save-blitzkrieg').addEventListener('click', saveSession);
    document.getElementById('manage-sessions').addEventListener('click', showSessionsModal);
    document.getElementById('close-modal').addEventListener('click', hideSessionsModal);
    
    loadSessions();
    generateBlitzkrieg();
});

function generateBlitzkrieg() {
    const input = document.getElementById('start-positions').value;
    let positions = input.split(',')
        .map(pos => parseFloat(pos.trim()))
        .filter(pos => !isNaN(pos) && pos > 0 && pos < 100)
        .sort((a, b) => a - b);
    
    if (positions.length === 0) {
        positions = [25, 50, 75];
        document.getElementById('start-positions').value = positions.join(',');
    }
    
    positions.unshift(0);
    positions.push(100);
    
    currentSession.positions = positions;
    const positionsKey = positions.join(',');
    
    if (!currentSession.completed[positionsKey]) {
        currentSession.completed[positionsKey] = {};
    }
    
    const resultsContainer = document.getElementById('blitzkrieg-results');
    resultsContainer.innerHTML = '';
    
    const maxStage = positions.length - 1;
    
    for (let stage = 1; stage <= maxStage; stage++) {
        const stageDiv = document.createElement('div');
        stageDiv.className = 'blitzkrieg-stage';
        
        const stageHeader = document.createElement('h2');
        stageHeader.textContent = `Stage ${stage}`;
        stageDiv.appendChild(stageHeader);
        
        const runsList = document.createElement('ul');
        runsList.className = 'blitzkrieg-runs';
        
        for (let i = 0; i <= positions.length - 1 - stage; i++) {
            const startPos = positions[i];
            const endPos = positions[i + stage];
            const runKey = `${startPos}-${endPos}`;
            
            const runItem = document.createElement('li');
            runItem.className = 'blitzkrieg-run';
            if (currentSession.completed[positionsKey][runKey]) {
                runItem.classList.add('completed');
            }
            runItem.dataset.runKey = runKey;
            
            const runText = document.createElement('span');
            runText.textContent = `${startPos}% → ${endPos}%`;
            runItem.appendChild(runText);
            
            const completeButton = document.createElement('button');
            completeButton.className = 'complete-button';
            completeButton.innerHTML = currentSession.completed[positionsKey][runKey] ? 
                '<i class="fas fa-check-circle"></i>' : '<i class="far fa-circle"></i>';
            completeButton.addEventListener('click', function() {
                toggleComplete(runKey, runItem, completeButton);
            });
            runItem.appendChild(completeButton);
            
            runsList.appendChild(runItem);
        }
        
        stageDiv.appendChild(runsList);
        resultsContainer.appendChild(stageDiv);
    }
}

function toggleComplete(runKey, runItem, button) {
    const positionsKey = currentSession.positions.join(',');
    currentSession.completed[positionsKey][runKey] = !currentSession.completed[positionsKey][runKey];
    
    if (currentSession.completed[positionsKey][runKey]) {
        runItem.classList.add('completed');
        button.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else {
        runItem.classList.remove('completed');
        button.innerHTML = '<i class="far fa-circle"></i>';
    }
    
    saveSessions();
}

function saveSession() {
    const sessionName = prompt('Enter session name:', currentSession.name);
    if (sessionName) {
        updateCurrentSession();
        currentSession.name = sessionName;
        saveSessions();
        alert(`<3`);
    }
}

function updateCurrentSession() {
    const positionsKey = currentSession.positions.join(',');
    currentSession.completed[positionsKey] = {};
    
    document.querySelectorAll('.blitzkrieg-run').forEach(run => {
        const runKey = run.dataset.runKey;
        if (run.classList.contains('completed')) {
            currentSession.completed[positionsKey][runKey] = true;
        }
    });
}

function showSessionsModal() {
    const modal = document.getElementById('sessions-modal');
    const sessionsList = document.getElementById('sessions-list');
    sessionsList.innerHTML = '';
    
    const saved = localStorage.getItem('blitzkriegSessions');
    if (saved) {
        const sessions = JSON.parse(saved);
        
        if (Object.keys(sessions).length === 0) {
            sessionsList.innerHTML = '<p>No saved sessions found</p>';
        } else {
            Object.keys(sessions).forEach(name => {
                const sessionDiv = document.createElement('div');
                sessionDiv.className = 'session-item';
                
                const sessionName = document.createElement('span');
                sessionName.textContent = name;
                sessionDiv.appendChild(sessionName);
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'session-actions';
                
                const loadBtn = document.createElement('button');
                loadBtn.className = 'session-button';
                loadBtn.innerHTML = '<i class="fas fa-play"></i>';
                loadBtn.addEventListener('click', () => loadSession(name, sessions[name]));
                actionsDiv.appendChild(loadBtn);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'session-button danger';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.addEventListener('click', () => deleteSession(name));
                actionsDiv.appendChild(deleteBtn);
                
                sessionDiv.appendChild(actionsDiv);
                sessionsList.appendChild(sessionDiv);
            });
        }
    } else {
        sessionsList.innerHTML = '<p>No saved sessions found</p>';
    }
    
    modal.style.display = 'flex';
}

function hideSessionsModal() {
    document.getElementById('sessions-modal').style.display = 'none';
}

function loadSession(name, session) {
    currentSession = JSON.parse(JSON.stringify(session));
    document.getElementById('start-positions').value = session.positions.slice(1, -1).join(',');
    generateBlitzkrieg();
    hideSessionsModal();
}

function deleteSession(name) {
    if (confirm(`Delete session "${name}"?`)) {
        const saved = localStorage.getItem('blitzkriegSessions');
        if (saved) {
            const sessions = JSON.parse(saved);
            delete sessions[name];
            localStorage.setItem('blitzkriegSessions', JSON.stringify(sessions));
        }
        showSessionsModal();
    }
}

function loadSessions() {
    const saved = localStorage.getItem('blitzkriegSessions');
    if (saved) {
        const sessions = JSON.parse(saved);
        if (sessions[currentSession.name]) {
            currentSession = JSON.parse(JSON.stringify(sessions[currentSession.name]));
            document.getElementById('start-positions').value = currentSession.positions.slice(1, -1).join(',');
        }
    }
}

function saveSessions() {
    const saved = localStorage.getItem('blitzkriegSessions');
    let sessions = saved ? JSON.parse(saved) : {};
    
    updateCurrentSession();
    
    sessions[currentSession.name] = JSON.parse(JSON.stringify(currentSession));
    localStorage.setItem('blitzkriegSessions', JSON.stringify(sessions));
}