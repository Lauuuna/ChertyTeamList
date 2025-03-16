document.addEventListener('DOMContentLoaded', () => {
    const audio = new Audio('sounds/discord-notification.mp3');
    if (discordLink) {
        let isPlaying = false;
        discordLink.addEventListener('click', (event) => {
            event.preventDefault();
            if (!isPlaying) {
                isPlaying = true;
                const audio = new Audio('discord-notification.mp3');
                audio.play();
                setTimeout(() => {
                    window.location.href = discordLink.href;
                    isPlaying = false;
                }, 500);
            }
        });
    }
});