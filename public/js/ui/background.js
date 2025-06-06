const canvas = document.getElementById('spectralCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawBackground();
}

function drawBackground() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height); // Очищаем canvas

    // Функция для рисования углового градиента
    function drawAngledGradient(x1, y1, x2, y2, colorStops) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        colorStops.forEach(stop => gradient.addColorStop(stop.position, stop.color));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height); // Заливаем весь canvas градиентом
    }

    // Примеры угловых градиентов (настройте значения для достижения нужного вида)
    drawAngledGradient(0, 0, width, height * 0.8, [
        { position: 0, color: 'rgba(0, 0, 0, 0.9)' }, // Почти черный
        { position: 0.2, color: 'rgba(255, 100, 0, 0.3)' }, // Оранжевый с прозрачностью
        { position: 0.5, color: 'rgba(255, 255, 0, 0.1)' }, // Желтый с прозрачностью
        { position: 1, color: 'rgba(0, 0, 0, 0.9)' }, // Почти черный
    ]);

    drawAngledGradient(0, height * 0.2, width * 0.8, height, [
        { position: 0, color: 'rgba(0, 0, 0, 0.8)' },
        { position: 0.3, color: 'rgba(0, 150, 255, 0.4)' }, // Синий
        { position: 0.7, color: 'rgba(150, 0, 255, 0.2)' }, // Фиолетовый
        { position: 1, color: 'rgba(0, 0, 0, 0.8)' },
    ]);

    drawAngledGradient(width * 0.2, 0, width, height * 0.5, [
        { position: 0, color: 'rgba(0, 0, 0, 0.7)' },
        { position: 0.3, color: 'rgba(91,88,235,0.4)' }, // Красный
        { position: 0.5, color: 'rgba(0,150,255,0.4)' }, // Красный
        { position: 0.9, color: 'rgba(187,99,255,0.3)' }, // Зеленый
        { position: 1, color: 'rgba(0, 0, 0, 0.7)' },
    ]);

    // Добавляем зернистость поверх градиентов
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const grainStrength = 50;

    for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * grainStrength;
        data[i] = Math.max(0, Math.min(255, data[i] + grain));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    }
    ctx.putImageData(imageData, 0, 0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
