function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация модулей
    await sleep(200)
    Chat.init();
    Animation.initProgressBar();
    FileUpload.init();
    Camera.init();
    uiHandler.init();

    const params = new URLSearchParams(window.location.search);
    const qValue = params.get('q');
    console.log('Значение параметра q:', qValue);
});
