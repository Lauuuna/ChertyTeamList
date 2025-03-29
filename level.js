const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const playersCache = new Map();

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error loading data: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

async function getPlayerInfo(playerId) {
    if (playersCache.has(playerId)) {
        return playersCache.get(playerId);
    }

    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('nickname')
            .eq('id', playerId)
            .single();
        
        if (error) throw error;
        
        const nickname = data?.nickname || 'Unknown';
        playersCache.set(playerId, nickname);
        return nickname;
    } catch (error) {
        console.error('Error fetching player:', error);
        return 'Unknown';
    }
}

async function loadLevelDetails() {
    try {
        const levelId = new URLSearchParams(window.location.search).get('id');
        const levels = await fetchData('levels.json');
        const level = levels.find(l => l.id === parseInt(levelId));
        const levelDetails = document.getElementById('level-details');
        
        if (!level) {
            levelDetails.innerHTML = '<div class="error-message">Level not found</div>';
            return;
        }

        const position = levels.indexOf(level) + 1;
        const verifierNickname = await getPlayerInfo(level.players[0]?.id);
        
        const weIcon = level.show_we_icon ? '<img src="icons/we-icon.png" class="we-icon" alt="WE Icon" title="Weekly Extreme">' : '';
        const newIcon = level.show_new_icon ? '<img src="icons/new.png" class="new-icon" alt="NEW Icon" title="New Level">' : '';
        
        let videoId = '';
        if (level.players[0]?.video_link) {
            const videoLink = level.players[0].video_link;
            if (videoLink.includes('youtube.com')) {
                videoId = videoLink.split('v=')[1]?.split('&')[0];
            } else if (videoLink.includes('youtu.be')) {
                videoId = videoLink.split('/').pop();
            }
        }

        const playerRecords = await Promise.all(level.players.slice(1).map(async player => {
            const nickname = await getPlayerInfo(player.id);
            return { ...player, nickname };
        }));

        levelDetails.innerHTML = `
            <div class="level-header">
                <div class="level-position">#${position}</div>
                <div class="level-title">
                    <h1 class="level-name">${level.name}${weIcon}${newIcon}</h1>
                    <span class="level-phase phase-${level.phase}">Phase ${level.phase}</span>
                </div>
            </div>
            
            <div class="level-info-grid">
                <div class="info-card">
                    <h3>ID</h3>
                    <p>${level.id || 'N/A'}</p>
                </div>
                ${level.ggdl_phase ? `
                <div class="info-card">
                    <h3>GGDL</h3>
                    <p>${level.ggdl_phase}</p>
                </div>
                ` : ''}
                <div class="info-card">
                    <h3>Skill-sets</h3>
                    <p>${level.skill_sets?.join(', ') || 'N/A'}</p>
                </div>
                <div class="info-card">
                    <h3>Stars</h3>
                    <p>${level.points || '0'}</p>
                </div>
                ${level.list_percent ? `
                <div class="info-card">
                    <h3>LIST%</h3>
                    <p>${level.list_percent}%</p>
                </div>
                ` : ''}
                <div class="info-card">
                    <h3>Verified by</h3>
                    <p>${verifierNickname}</p>
                </div>
            </div>
            
            ${videoId ? `
            <div class="video-container">
                <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            ` : '<div class="video-error">Video unavailable</div>'}
            
            <div class="records-section">
                <h2 class="section-title">Total Records (${playerRecords.length})</h2>
                <ul class="player-list">
                    ${playerRecords.map(player => `
                        <li ${player.video_link ? `onclick="window.open('${player.video_link}', '_blank')"` : ''}>
                            <p class="player-name">${player.nickname}</p>
                            <p class="player-date">${player.date || 'N/A'} (${player.progress || '0'}%)</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <button class="enjoyment-button" id="enjoyment-button">
                <i class="fas fa-star"></i> View Enjoyment Ratings
            </button>
        `;

        document.getElementById('enjoyment-button')?.addEventListener('click', async () => {
            const enjoymentData = await fetchData('enjoyment.json');
            const levelEnjoyment = enjoymentData[level.id] || {};
            const modal = document.getElementById('enjoyment-modal');
            const enjoymentList = document.getElementById('enjoyment-list');
            
            const ratings = [];
            const opinions = [];
            
            Object.entries(levelEnjoyment).forEach(([playerId, opinion]) => {
                const match = opinion.match(/enjoyment - (\d+)/);
                if (match) {
                    ratings.push(parseInt(match[1]));
                    opinions.push({ playerId, rating: match[1], text: opinion });
                }
            });
            
            const averageRating = ratings.length > 0 
                ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                : null;
            
            let content = '<div class="enjoyment-container">';
            
            if (averageRating) {
                content += `
                    <div class="enjoyment-header">
                        <h3>Average Enjoyment</h3>
                        <div class="enjoyment-rating">
                            <span class="rating-value">${averageRating}</span>
                        </div>
                    </div>
                `;
            }
            
            if (opinions.length > 0) {
                content += `
                    <div class="enjoyment-divider"></div>
                    <h3 class="individual-ratings-title">Individual Ratings</h3>
                    <div class="enjoyment-ratings">
                `;
                
                const ratingsContent = await Promise.all(opinions.map(async ({ playerId, rating, text }) => {
                    const nickname = await getPlayerInfo(playerId);
                    return `
                        <div class="enjoyment-item">
                            <div class="player-rating-header">
                                <span class="player-name">${nickname || `Player ${playerId}`}</span>
                                <span class="rating-value">${rating}</span>
                            </div>
                            <p class="player-opinion">${text.replace(/enjoyment - \d+, /, '')}</p>
                        </div>
                    `;
                }));
                
                content += ratingsContent.join('') + '</div>';
            } else {
                content += '<p class="no-ratings">There are no opinions yet.</p>';
            }
            
            content += `
                </div>
                <button id="send-opinion" class="send-opinion-button">
                    <i class="fas fa-paper-plane"></i> Submit Your Opinion
                </button>
            `;
            
            enjoymentList.innerHTML = content;
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            document.getElementById('send-opinion')?.addEventListener('click', () => {
                window.open('https://forms.gle/ASiLaXuWrrsHcDga9', '_blank');
            });
        });

        const closeModal = document.querySelector('.close');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                const modal = document.getElementById('enjoyment-modal');
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('enjoyment-modal')) {
                const modal = document.getElementById('enjoyment-modal');
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    } catch (error) {
        console.error('Error loading level details:', error);
        document.getElementById('level-details').innerHTML = '<div class="error-message">Error loading level details</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('level.html')) {
        loadLevelDetails();
    }
});