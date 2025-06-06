const FileUpload = (() => {
    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const cameraCanvas = document.getElementById('camera-canvas');
                    cameraCanvas.width = img.width;
                    cameraCanvas.height = img.height;
                    const context = cameraCanvas.getContext('2d');
                    context.drawImage(img, 0, 0, cameraCanvas.width, cameraCanvas.height);

                    // Сохраняем данные изображения
                    window.capturedImageURL = cameraCanvas.toDataURL('image/jpeg');
                    document.getElementById('photo-menu').style.display = 'none';
                    document.getElementById('solve-form-section').style.display = 'block';
                    document.getElementById('task-input-group').style.display = 'none';
                    document.getElementById('task-number-group').style.display = 'block';

                    const fileReader = new FileReader();
                    fileReader.onload = () => {
                        window.fileUri = fileReader.result.split(',')[1];
                        window.fileType = file.type || 'image/jpeg';
                    };
                    fileReader.readAsDataURL(file);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Пожалуйста, выберите или перетащите файл изображения.');
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function init() {
        await sleep(200)
        const importOptionButton = document.getElementById('import-option');
        const fileInput = document.getElementById('file-input');
        const filedropSection = document.getElementById('filedrop-section');

        importOptionButton.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            handleFile(file);
        });

        // Обработчики drag & drop
        document.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            filedropSection.style.display = 'flex';
        });
        document.addEventListener('dragleave', () => {
            filedropSection.style.display = 'none';
        });
        document.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            filedropSection.style.display = 'none';
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });
    }

    return { init, handleFile };
})();
