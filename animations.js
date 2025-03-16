document.addEventListener('DOMContentLoaded', () => {
    const betaIcon = document.querySelector('.beta');
    if (betaIcon) {
        betaIcon.addEventListener('click', () => {
            betaIcon.style.animation = 'none';
            setTimeout(() => {
                betaIcon.style.animation = 'bounce 0.3s ease-in-out';
            }, 10);
        });
    }
});