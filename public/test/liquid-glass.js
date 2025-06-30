/**
 * Класс для создания эффекта "Liquid Glass" на любом HTML-элементе.
 * Он заменяет фон элемента на WebGL canvas, симулирующий искажающее стекло.
 */
class LiquidGlassFX {
    constructor(element) {
        if (!element) {
            console.error("LiquidGlassFX: Целевой элемент не найден.");
            return;
        }
        this.element = element;
        this.init();
    }

    async init() {
        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });

        if (!this.gl) {
            console.error("LiquidGlassFX: WebGL не поддерживается.");
            return;
        }

        // Вставляем canvas в DOM перед элементом, чтобы он был на заднем плане
        this.element.parentNode.insertBefore(this.canvas, this.element);
        this.canvas.style.position = 'absolute';
        this.canvas.style.zIndex = getComputedStyle(this.element).zIndex - 1 || -1;
        this.element.style.background = 'none'; // Скрываем оригинальный фон
        this.element.style.border = 'none'; // Скрываем оригинальную рамку

        this.program = this.createProgram(this.vertexShaderSource, this.fragmentShaderSource);
        this.gl.useProgram(this.program);

        this.locations = this.getLocations();
        this.createGeometry();

        try {
            this.backgroundTexture = await this.loadBackgroundTexture();
        } catch (error) {
            console.error("LiquidGlassFX: Не удалось загрузить фоновую текстуру.", error);
            return;
        }

        this.setupObservers();
        this.render();
    }

    // ------------------ Шейдеры ------------------

    // Вершинный шейдер просто позиционирует вершины прямоугольника
    vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    // Фрагментный шейдер - здесь происходит вся магия
    fragmentShaderSource = `
        precision highp float;

        uniform vec2 u_resolution;      // Разрешение canvas (размер элемента)
        uniform vec4 u_elementRect;     // Позиция и размер элемента на странице (x, y, width, height)
        uniform vec2 u_backgroundResolution; // Разрешение фонового изображения
        uniform float u_borderRadius;   // Радиус скругления углов
        uniform sampler2D u_backgroundTexture;

        // Функция для вычисления расстояния до края скругленного прямоугольника (SDF)
        // Возвращает отрицательное значение внутри, положительное снаружи, 0 на границе
        float sdfRoundedBox(vec2 p, vec2 b, float r) {
            vec2 q = abs(p) - b + r;
            return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        void main() {
            // 1. КООРДИНАТЫ
            // uv - координаты внутри элемента (от 0.0 до 1.0)
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            
            // 2. ФОРМА И ГРАНИЦЫ
            // Нормализуем координаты, чтобы центр был в (0,0) для SDF
            vec2 p = (uv - 0.5) * u_resolution;
            // Половина размера элемента, с учетом радиуса
            vec2 b = (u_resolution / 2.0) - u_borderRadius;
            
            // Вычисляем расстояние до границы. Это основа для маски и каустики.
            float dist = sdfRoundedBox(p, b, u_borderRadius);

            // Если пиксель за пределами скругленного прямоугольника, отбрасываем его
            if (dist > 0.0) {
                discard;
            }

            // 3. ОПТИЧЕСКОЕ ИСКАЖЕНИЕ (ЛИНЗИРОВАНИЕ)
            // Координаты от центра элемента (от -0.5 до 0.5)
            vec2 centerOffset = uv - 0.5;
            // Сила искажения зависит от расстояния до центра, создавая эффект выпуклости
            float lensPower = length(centerOffset);
            // Формула искажения: сдвигаем координаты выборки из текстуры к центру
            vec2 distortedUvOffset = centerOffset * pow(lensPower, 1.5) * -0.1; // -0.1 - сила искажения
            
            // Конечные координаты для сэмплирования фоновой текстуры
            vec2 background_uv = (u_elementRect.xy + (uv + distortedUvOffset) * u_elementRect.zw) / u_backgroundResolution;
            vec4 backgroundColor = texture2D(u_backgroundTexture, background_uv);


            // 4. ОБЪЕМ И ГЛУБИНА
            vec3 finalColor = backgroundColor.rgb;
            
            // --- Мягкий блик (Sheen) ---
            // Градиент сверху, более выраженный у края
            float sheen = pow(max(0.0, 1.0 - uv.y * 1.2), 4.0) * 0.4;
            // Блик адаптируется к цвету фона, становясь чуть теплее или холоднее
            vec3 sheenColor = mix(vec3(1.0), backgroundColor.rgb, 0.2);
            finalColor += sheen * sheenColor;

            // --- Едва заметная внутренняя тень ---
            // Градиент снизу, очень резкий у края для имитации толщины
            float innerShadow = pow(max(0.0, (uv.y - 0.7) * 3.33), 6.0) * 0.35;
            finalColor *= (1.0 - innerShadow);

            // 5. СВЕТОВАЯ ГРАНИЦА (КАУСТИКА)
            // Создаем яркую линию точно по краю с помощью SDF
            // smoothstep создает плавную границу в 1.5 пикселя
            float causticGlow = 1.0 - smoothstep(0.0, 1.5, abs(dist));
            finalColor += causticGlow * 0.25; // 0.25 - яркость каустики

            // 6. АДАПТАЦИЯ К ЯРКОСТИ ФОНА
            // Вычисляем яркость фона под пикселем
            float luma = dot(backgroundColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            // Слегка сдвигаем итоговую яркость к 0.5 для улучшения контраста
            // На темном фоне элемент станет чуть светлее, на светлом - чуть темнее.
            float contrastFactor = (0.5 - luma) * 0.15;
            finalColor += contrastFactor;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    // ------------------ WebGL Утилиты ------------------

    createProgram(vertexSource, fragmentSource) {
        const program = this.gl.createProgram();
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error("Не удалось слинковать программу: ", this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        return program;
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(`Ошибка компиляции шейдера: ${type}`, this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    getLocations() {
        return {
            position: this.gl.getAttribLocation(this.program, "a_position"),
            resolution: this.gl.getUniformLocation(this.program, "u_resolution"),
            elementRect: this.gl.getUniformLocation(this.program, "u_elementRect"),
            backgroundResolution: this.gl.getUniformLocation(this.program, "u_backgroundResolution"),
            borderRadius: this.gl.getUniformLocation(this.program, "u_borderRadius"),
            backgroundTexture: this.gl.getUniformLocation(this.program, "u_backgroundTexture"),
        };
    }

    createGeometry() {
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.locations.position);
        this.gl.vertexAttribPointer(this.locations.position, 2, this.gl.FLOAT, false, 0, 0);
    }

    loadBackgroundTexture() {
        return new Promise((resolve, reject) => {
            const bodyStyle = getComputedStyle(document.body);
            const imageUrlMatch = bodyStyle.backgroundImage.match(/url\("?(.+?)"?\)/);
            if (!imageUrlMatch) {
                reject("Не найдено фоновое изображение на body.");
                return;
            }
            const imageUrl = imageUrlMatch[1];

            const texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            // Заглушка 1x1 пиксель, пока изображение грузится
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

            const image = new Image();
            image.crossOrigin = "anonymous"; // Важно для загрузки с других доменов (например, unsplash)
            image.onload = () => {
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this.backgroundTexture.image = image;
                this.render(); // Перерисовываем с загруженной текстурой
                resolve(texture);
            };
            image.onerror = reject;
            image.src = imageUrl;
            this.backgroundTexture = { texture, image: null };
        });
    }

    setupObservers() {
        // Следим за изменением размера элемента, чтобы обновить canvas
        this.resizeObserver = new ResizeObserver(() => this.render());
        this.resizeObserver.observe(this.element);

        // Следим за прокруткой, чтобы обновлять позицию
        document.addEventListener('scroll', () => this.render(), { passive: true });
    }

    // ------------------ Рендеринг ------------------

    render() {
        if (!this.gl || !this.program || !this.backgroundTexture.image) return;

        const rect = this.element.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Обновляем размер и позицию canvas
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.canvas.style.left = `${rect.left}px`;
        this.canvas.style.top = `${rect.top}px`;

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Передаем данные (uniforms) в шейдер
        this.gl.uniform2f(this.locations.resolution, this.gl.canvas.width, this.gl.canvas.height);

        // Позиция элемента относительно всего документа (с учетом прокрутки)
        const elementRectX = rect.left + window.scrollX;
        const elementRectY = rect.top + window.scrollY;
        this.gl.uniform4f(this.locations.elementRect, elementRectX * dpr, elementRectY * dpr, rect.width * dpr, rect.height * dpr);

        const bgImage = this.backgroundTexture.image;
        this.gl.uniform2f(this.locations.backgroundResolution, bgImage.naturalWidth, bgImage.naturalHeight);

        const borderRadius = parseFloat(getComputedStyle(this.element).borderRadius);
        this.gl.uniform1f(this.locations.borderRadius, borderRadius * dpr);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.backgroundTexture.texture);
        this.gl.uniform1i(this.locations.backgroundTexture, 0);

        // Рисуем прямоугольник (2 треугольника)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}

// Применяем эффект к элементу после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const glassCard = document.querySelector('.glass-card');
    new LiquidGlassFX(glassCard);
});
