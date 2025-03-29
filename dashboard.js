const supabaseUrl = 'https://ivriytixvxgntxkougjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cml5dGl4dnhnbnR4a291Z2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzY0NDgsImV4cCI6MjA1ODI1MjQ0OH0.hByLZ98uqgJaKLPvZ3jf6_-SnCDIkttG2S9RfgNahtE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const skillSets = [
    "wave", "cube", "ship", "ball", "ufo", 
    "memory", "dual", "nerve-control", "timings", 
    "fast-paced", "high cps", "learny", "timing", "robot", "swing", "spider", "slow-paced", "flow", "chokepoints", "gimmicky"
];

const phaseColors = {
    "0": "#aa0000",
    "1": "#aa009c",
    "2": "#0003aa",
    "3": "#00aa47",
    "4": "#9faa00",
    "5": "#5e0000",
    "6": "#5e0047",
    "7": "#09005e",
    "8": "#005e00",
    "9": "#5e5500",
    "10": "#270000",
    "11": "#270022"
};

let currentUser = null;
let currentCropper = null;
let currentUploadType = null;

document.addEventListener('DOMContentLoaded', async () => {
    const savedUser = localStorage.getItem('gdPlayer');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            const { data, error } = await supabaseClient
                .from('players')
                .select('*')
                .eq('nickname', userData.nickname)
                .single();

            if (!error && data) {
                currentUser = data;
                showProfileTab();
                loadCurrentProfileData(data);
                updateSidebarUser(data);
            }
        } catch (e) {
            localStorage.removeItem('gdPlayer');
        }
    }

    setupEventListeners();
    setupTabSwitching();
    setupColorInputs();
});

function setupEventListeners() {
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('update-profile-btn').addEventListener('click', updateProfile);
    document.getElementById('avatar-upload-btn').addEventListener('click', () => document.getElementById('avatar-upload').click());
    document.getElementById('banner-upload-btn').addEventListener('click', () => document.getElementById('banner-upload').click());
    document.getElementById('avatar-upload').addEventListener('change', (e) => handleFileUpload('avatar', e));
    document.getElementById('banner-upload').addEventListener('change', (e) => handleFileUpload('banner', e));
    document.getElementById('crop-btn').addEventListener('click', cropImage);
    document.getElementById('cancel-crop-btn').addEventListener('click', closeCropper);
    document.getElementById('rotate-left-btn').addEventListener('click', rotateLeft);
    document.getElementById('rotate-right-btn').addEventListener('click', rotateRight);
    document.getElementById('wave-tab').addEventListener('click', loadWaveData);
}

function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function showProfileTab() {
    document.querySelector('.tab-btn[data-tab="login-tab"]').classList.remove('active');
    document.querySelector('.tab-btn[data-tab="profile-tab"]').classList.add('active');
    document.getElementById('login-tab').classList.remove('active');
    document.getElementById('profile-tab').classList.add('active');
}

function setupColorInputs() {
    const primaryColorInput = document.getElementById('primary-color');
    const secondaryColorInput = document.getElementById('secondary-color');
    
    primaryColorInput.addEventListener('input', (e) => {
        document.getElementById('primary-color-value').textContent = e.target.value;
        updateColorScheme(e.target.value, document.getElementById('secondary-color').value);
    });
    
    secondaryColorInput.addEventListener('input', (e) => {
        document.getElementById('secondary-color-value').textContent = e.target.value;
        updateColorScheme(document.getElementById('primary-color').value, e.target.value);
    });
}

async function handleLogin() {
    const nickname = document.getElementById('nickname').value;
    const password = document.getElementById('password').value;

    if (!nickname || !password) {
        alert('Please enter both nickname and password');
        return;
    }

    try {
        const { data: userData, error: userError } = await supabaseClient
            .from('players')
            .select('*')
            .eq('nickname', nickname)
            .single();

        if (userError) {
            console.error('Error finding user:', userError);
            alert('User not found');
            return;
        }

        if (userData.password === password) {
            currentUser = userData;
            localStorage.setItem('gdPlayer', JSON.stringify(userData));
            showProfileTab();
            loadCurrentProfileData(userData);
            updateSidebarUser(userData);
            alert('Login successful <3');
        } else {
            alert('Invalid password </3');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed </3');
    }
}

function loadCurrentProfileData(userData) {
    document.getElementById('new-nickname').value = userData.nickname || '';
    document.getElementById('about-me').value = userData.about_me || '';
    
    const primaryColor = userData.col1 || '#5865F2';
    const secondaryColor = userData.col2 || '#57F287';
    
    document.getElementById('primary-color').value = primaryColor;
    document.getElementById('secondary-color').value = secondaryColor;
    document.getElementById('primary-color-value').textContent = primaryColor;
    document.getElementById('secondary-color-value').textContent = secondaryColor;
    
    if (userData.avatar_url) {
        document.getElementById('avatar-preview').innerHTML = `<img src="${userData.avatar_url}" alt="Avatar">`;
    }
    if (userData.banner_url) {
        document.getElementById('banner-preview').innerHTML = `<img src="${userData.banner_url}" alt="Banner">`;
    }
    
    updateColorScheme(primaryColor, secondaryColor);
}

function updateSidebarUser(userData) {
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const usernameElement = document.querySelector('.username');
    const statusElement = document.querySelector('.user-status');
    
    if (userData.avatar_url) {
        sidebarAvatar.innerHTML = `<img src="${userData.avatar_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        sidebarAvatar.innerHTML = `<i class="fas fa-user"></i>`;
    }
    
    usernameElement.textContent = userData.nickname || 'Player';
    statusElement.textContent = `#${userData.id?.toString().padStart(4, '0') || '0000'}`;
}

async function updateProfile() {
    if (!currentUser) return;

    try {
        const updateData = {
            nickname: document.getElementById('new-nickname').value.trim(),
            about_me: document.getElementById('about-me').value.trim(),
            col1: document.getElementById('primary-color').value,
            col2: document.getElementById('secondary-color').value
        };

        if (currentUser.avatar_url) updateData.avatar_url = currentUser.avatar_url;
        if (currentUser.banner_url) updateData.banner_url = currentUser.banner_url;

        const { error } = await supabaseClient
            .from('players')
            .update(updateData)
            .eq('id', currentUser.id);

        if (error) throw error;

        currentUser = { ...currentUser, ...updateData };
        localStorage.setItem('gdPlayer', JSON.stringify(currentUser));
        updateSidebarUser(currentUser);
        
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message';
        successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Profile updated successfully!';
        document.getElementById('profile-tab').appendChild(successMsg);
        
        setTimeout(() => {
            successMsg.classList.add('fade-out');
            setTimeout(() => successMsg.remove(), 500);
        }, 3000);
    } catch (error) {
        console.error('Update profile error:', error);
        alert('Failed to update profile. Please try again.');
    }
}

function handleFileUpload(type, event) {
    if (event.target.files.length > 0) {
        currentUploadType = type;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('cropper-image').src = e.target.result;
            openCropper();
        };
        reader.readAsDataURL(event.target.files[0]);
    }
}

function openCropper() {
    document.getElementById('cropper-modal').style.display = 'flex';
    const image = document.getElementById('cropper-image');
    
    if (currentCropper) {
        currentCropper.destroy();
    }
    
    const aspectRatio = currentUploadType === 'avatar' ? 1 : 4;
    currentCropper = new Cropper(image, {
        aspectRatio: aspectRatio,
        viewMode: 1,
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
        guides: false,
        center: false,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        background: false
    });
}

function closeCropper() {
    document.getElementById('cropper-modal').style.display = 'none';
    if (currentCropper) {
        currentCropper.destroy();
        currentCropper = null;
    }
    document.getElementById(`${currentUploadType}-upload`).value = '';
    currentUploadType = null;
}

function rotateLeft() {
    if (currentCropper) {
        currentCropper.rotate(-90);
    }
}

function rotateRight() {
    if (currentCropper) {
        currentCropper.rotate(90);
    }
}

async function cropImage() {
    if (!currentCropper || !currentUploadType || !currentUser) {
        alert('Please login and select an image first');
        return;
    }

    try {
        const canvas = currentCropper.getCroppedCanvas({
            width: currentUploadType === 'avatar' ? 512 : 1920,
            height: currentUploadType === 'avatar' ? 512 : 480,
            fillColor: '#fff',
            imageSmoothingQuality: 'high'
        });

        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });

        const fileName = `${currentUploadType}-${Date.now()}.jpg`;
        const filePath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from('player-assets')
            .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('player-assets')
            .getPublicUrl(filePath);

        const { error: updateError } = await supabaseClient
            .from('players')
            .update({ [`${currentUploadType}_url`]: publicUrl })
            .eq('id', currentUser.id);

        if (updateError) throw updateError;

        document.getElementById(`${currentUploadType}-preview`).innerHTML = 
            `<img src="${publicUrl}?t=${Date.now()}" alt="${currentUploadType}">`;
        
        currentUser[`${currentUploadType}_url`] = publicUrl;
        localStorage.setItem('gdPlayer', JSON.stringify(currentUser));
        
        if (currentUploadType === 'avatar') {
            updateSidebarUser(currentUser);
        }
        
        closeCropper();
        alert('Image uploaded successfully!');
        
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
    }
}

function updateColorScheme(primary, secondary) {
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);
}

let cachedLevels = null;
let animationFrameId = null;

async function loadWaveData() {
    if (!currentUser) return;
    
    try {
        if (!cachedLevels) {
            cachedLevels = await fetchData('levels.json');
        }
        const playerLevels = cachedLevels.filter(level => 
            level.players.some(p => p.id === currentUser.id)
        );
        
        updateWaveStats(playerLevels);
        updateSkillRadar(playerLevels);
        animateWave(playerLevels);
    } catch (error) {
        console.error('Error loading wave data:', error);
    }
}

function updateWaveStats(levels) {
    const totalPoints = levels.reduce((sum, level) => sum + (parseFloat(level.points) || 0), 0);
    document.getElementById('total-levels').textContent = levels.length;
    document.getElementById('total-points').textContent = totalPoints.toFixed(1);
}

function updateSkillRadar(levels) {
    const ctx = document.getElementById('skill-radar').getContext('2d');
    if (levels.length === 0) {
        if (window.skillChart) {
            window.skillChart.destroy();
            window.skillChart = null;
        }
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    const skillValues = skillSets.reduce((acc, skill) => ({...acc, [skill]: 0}), {});
    
    levels.forEach(level => {
        const points = parseFloat(level.points) || 3.5;
        (level.skill_sets || []).forEach(skill => {
            if (skillValues[skill] !== undefined) skillValues[skill] += points;
        });
    });
    
    const maxSkillValue = Math.max(...Object.values(skillValues), 1);
    const normalizedSkills = Object.entries(skillValues).reduce((acc, [skill, value]) => {
        acc[skill] = (Math.max(value, maxSkillValue * 0.1) / maxSkillValue) * 100;
        return acc;
    }, {});

    if (window.skillChart) {
        window.skillChart.data.labels = Object.keys(normalizedSkills);
        window.skillChart.data.datasets[0].data = Object.values(normalizedSkills);
        window.skillChart.update();
        return;
    }
    
    window.skillChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(normalizedSkills),
            datasets: [{
                data: Object.values(normalizedSkills),
                backgroundColor: 'rgba(87, 242, 135, 0.2)',
                borderColor: 'rgba(87, 242, 135, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(87, 242, 135, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    ticks: { display: false },
                    pointLabels: {
                        color: 'var(--text-normal)',
                        font: { size: 12 },
                        callback: value => value.length > 8 ? `${value.substring(0,7)}...` : value
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            elements: {
                line: { tension: 0.4 }
            }
        }
    });
}

function calculateBalance(skillValues) {
    const values = Object.values(skillValues).filter(v => v > 0);
    if (values.length < 2) return 100;
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const balance = 100 - Math.min(50, (stdDev / avg) * 100);
    
    return Math.round(balance);
}

function animateWave(levels) {
    const wave = document.getElementById('wave-animation');
    wave.innerHTML = '';
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    if (levels.length === 0) {
        wave.innerHTML = '<div class="no-levels">No completed levels</div>';
        return;
    }

    const MAX_PHASE_PERCENT = 40; 
    const phaseCounts = Array(11).fill(0);
    let totalLevels = levels.length;

    levels.forEach(level => {
        const phase = Math.min(10, Math.max(0, parseInt(level.phase) || 0));
        phaseCounts[phase]++;
    });

    let phaseData = phaseCounts
        .map((count, phase) => ({
            color: phaseColors[phase.toString()],
            percent: Math.min((count / totalLevels) * 100, MAX_PHASE_PERCENT)
        }))
        .filter(p => p.percent > 0);

    const totalPercent = phaseData.reduce((sum, p) => sum + p.percent, 0);
    const remainingPercent = 100 - totalPercent;
    if (remainingPercent > 0) {
        const addPerPhase = remainingPercent / phaseData.length;
        phaseData = phaseData.map(p => ({
            ...p,
            percent: p.percent + addPerPhase
        }));
    }

    phaseData.sort((a, b) => a.color.localeCompare(b.color));

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1200 800");
    svg.setAttribute("preserveAspectRatio", "none");

    const gradientId = `waveGradient-${Date.now()}`;
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("gradientTransform", "rotate(90)");

    let accumulated = 0;
    phaseData.forEach((phase, i) => {
        const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop.setAttribute("offset", `${accumulated}%`);
        stop.setAttribute("stop-color", phase.color);
        stop.setAttribute("stop-opacity", "0.7");
        gradient.appendChild(stop);
        
        accumulated += phase.percent;
        if (i < phaseData.length - 1) {
            const nextStop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            nextStop.setAttribute("offset", `${accumulated}%`);
            nextStop.setAttribute("stop-color", phase.color);
            nextStop.setAttribute("stop-opacity", "0.7");
            gradient.appendChild(nextStop);
        }
    });

    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", "waveFilter");
    filter.innerHTML = `
        <feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="2"/>
        <feDisplacementMap in="SourceGraphic" scale="30"/>
        <feGaussianBlur stdDeviation="5"/>
    `;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", `url(#${gradientId})`);
    path.setAttribute("filter", "url(#waveFilter)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke", "rgba(255,255,255,0.2)");

    let time = 0;
    const WAVE_SPEED = 0.03;
    const DETAIL = 60; 

    function smoothCurve(points) {
        let path = `M ${points[0][0]},${points[0][1]}`;
        for (let i = 1; i < points.length - 2; i++) {
            const x = (points[i][0] + points[i + 1][0]) / 2;
            const y = (points[i][1] + points[i + 1][1]) / 2;
            path += ` Q ${points[i][0]},${points[i][1]} ${x},${y}`;
        }
        path += ` L 1200 800 L 0 800 Z`;
        return path;
    }

    function updateWave() {
        const points = [];
        for (let x = 0; x <= 1200; x += 1200/DETAIL) {
            const y = 400 + 
                Math.sin(x * 0.005 + time) * 40 * Math.sin(time*0.3) + 
                Math.cos(x * 0.008 + time * 1.2) * 30 +
                Math.sin(x * 0.015 + time * 0.7) * 20;
            points.push([x, y]);
        }
        
        path.setAttribute("d", smoothCurve(points));
        time += WAVE_SPEED;
        animationFrameId = requestAnimationFrame(updateWave);
    }

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.appendChild(gradient);
    defs.appendChild(filter);
    svg.appendChild(defs);
    svg.appendChild(path);
    
    const bgPath = path.cloneNode();
    bgPath.setAttribute("fill", "rgba(255,255,255,0.05)");
    bgPath.setAttribute("filter", "none");
    svg.appendChild(bgPath);

    wave.appendChild(svg);

    const css = document.createElement('style');
    css.textContent = `
        .wave-animation {
            position: absolute;
            width: 200%;
            height: 180%;
            bottom: -80%;
            left: -10%;
            opacity: 0.9;
            mix-blend-mode: screen;
        }
        .wave-animation svg {
            width: 100%;
            height: 100%;
        }
        .wave-animation path {
            transition: all 0.5s ease;
            vector-effect: non-scaling-stroke;
        }
        .no-levels {
            color: var(--text-muted);
            font-size: 1.2em;
            text-align: center;
            padding: 20px;
        }
    `;
    document.head.appendChild(css);

    updateWave();
}


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