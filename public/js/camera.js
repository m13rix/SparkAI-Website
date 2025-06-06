const Camera = (() => {
    let cameraStream = null;
    const cameraPreview = document.getElementById('camera-preview');
    const photoMenu = document.getElementById('photo-menu');
    const solveFormSection = document.getElementById('solve-form-section');
    const taskInputGroup = document.getElementById('task-input-group');
    const taskNumberGroup = document.getElementById('task-number-group');

    async function startCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            cameraPreview.srcObject = cameraStream;
        } catch (error) {
            console.error('Ошибка при доступе к камере:', error);
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraPreview.srcObject = null;
        }
    }

    function captureImage() {
        const cameraCanvas = document.getElementById('camera-canvas');
        const captureButton = document.getElementById('capture-button');
        captureButton.addEventListener('click', () => {
            const context = cameraCanvas.getContext('2d');
            cameraCanvas.width = cameraPreview.videoWidth;
            cameraCanvas.height = cameraPreview.videoHeight;
            context.drawImage(cameraPreview, 0, 0, cameraCanvas.width, cameraCanvas.height);

            // Конвертация canvas в base64
            const imageBase64 = cameraCanvas.toDataURL('image/jpeg', 0.8);
            // Сохраняем данные глобально или в общем состоянии приложения
            window.fileUri = imageBase64.split(',')[1];
            window.fileType = 'image/jpeg';

            stopCamera();
            photoMenu.style.display = 'none';
            solveFormSection.style.display = 'block';
            taskInputGroup.style.display = 'none';
            taskNumberGroup.style.display = 'block';
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function init() {
        await sleep(200);
        const photoOptionButton = document.getElementById('photo-option');
        const photoMenuBackButton = document.getElementById('photo-menu-back');
        const cameraInput = document.getElementById('custom-camera-button');

        photoOptionButton.addEventListener('click', () => {
            solveFormSection.style.display = 'none';
            photoMenu.style.display = 'flex';
            startCamera();
        });

        cameraInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                FileUpload.handleFile(file)
            }
        });

        photoMenuBackButton.addEventListener('click', () => {
            stopCamera();
            photoMenu.style.display = 'none';
            solveFormSection.style.display = 'block';
            taskInputGroup.style.display = 'block';
            taskNumberGroup.style.display = 'none';
        });

        captureImage();
    }

    return { init, startCamera, stopCamera };
})();
