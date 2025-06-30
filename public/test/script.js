// Импортируем ogl из CDN для простоты. В реальном проекте используйте npm.
import { Renderer, Camera, Transform, Program, Mesh, Plane, Vec2 } from 'https://esm.sh/ogl@0.0.75';
/**
 * ======================================================================
 *                             СИСТЕМА LIQUID GLASS
 * ======================================================================
 * Ведущий специалист по GPU-графике.
 * Эталонная реализация физически достоверного UI-материала.
 *
 * Архитектура:
 * 1. OGL (Open Graphics Library): Легковесная WebGL-обертка.
 * 2. Единый рендер-цикл: Фон и все "линзы" рисуются в одном WebGL-контексте.
 * 3. Динамический фон: Фон - это полноэкранный меш с процедурным анимированным шейдером.
 * 4. "Линзы": Каждый HTML-элемент `.liquid-glass-target` получает соответствующий
 *    WebGL-меш, который синхронизируется с ним по положению и размеру.
 * 5. Шейдер "Линзы": Фрагментный шейдер в реальном времени:
 *    - Получает экранные координаты (gl_FragCoord).
 *    - Вычисляет искажение (рефракцию) на основе этих координат.
 *    - Сэмплирует (читает) цвет из фоновой текстуры со смещением.
 *    - Добавляет каустику, блики и адаптивную яркость.
 *    - Отрисовывает финальный пиксель.
 * ======================================================================
 */

// -- ШЕЙДЕРЫ --

// 1. Шейдер для динамического фона
const backgroundVertex = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const backgroundFragment = `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // Функция шума для создания органических паттернов
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= uResolution.x / uResolution.y;

        float time = uTime * 0.1;
        float noise = snoise(p * 2.0 + time * 0.5);
        noise = mix(noise, snoise(p * 4.0 + time), 0.5);

        vec3 color1 = vec3(0.1, 0.05, 0.2); // --bg-color-1
        vec3 color2 = vec3(0.4, 0.1, 0.5); // --bg-color-2 with more saturation

        vec3 color = mix(color1, color2, smoothstep(-0.2, 0.2, noise));

        gl_FragColor.rgb = color;
        gl_FragColor.a = 1.0;
    }
`;

// 2. Шейдер для "Линзы" Liquid Glass - здесь вся магия
const liquidVertex = `
    attribute vec2 uv;
    attribute vec3 position;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const liquidFragment = `
    precision highp float;
    
    // Uniforms - переменные, которые мы передаем из JS
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse; // Позиция мыши (0..1)
    uniform float uInteraction; // Сила взаимодействия (0..1)
    uniform sampler2D tBackground; // Текстура фона
    
    varying vec2 vUv; // Координаты текстуры на нашем меше (0..1)

    // Константы для настройки эффекта
    const float IOR = 0.85; // Index of Refraction (Индекс Преломления). Чем меньше, тем сильнее искажение.
    const float CAUSTIC_BRIGHTNESS = 2.5;
    const float HIGHLIGHT_SHARPNESS = 40.0;

    void main() {
        // --- 1. ЛИНЗИРОВАНИЕ (LENSING) ---
        // Создаем карту нормалей для симуляции выпуклой поверхности
        // vUv - 0.5 -> вектор из центра. length() -> расстояние от центра
        vec2 fromCenter = vUv - 0.5;
        float distanceFromCenter = length(fromCenter);

        // Сила взаимодействия "вдавливает" центр линзы
        float pushEffect = 1.0 - smoothstep(0.0, 0.4, distanceFromCenter) * uInteraction * 0.8;

        // Симулируем нормаль поверхности: z-компонента основана на расстоянии от центра
        // Это создает иллюзию выпуклости.
        vec3 normal = vec3(fromCenter * -2.0, 1.0 - pow(distanceFromCenter, 2.0) * 1.5 * pushEffect);
        normal = normalize(normal);

        // Вычисляем смещение для эффекта рефракции, используя нормаль.
        // Это физически корректный подход (упрощенный).
        vec2 refractionOffset = normal.xy * (1.0 - IOR);

        // Экранные UV: gl_FragCoord.xy / uResolution.xy
        // Это координаты текущего пикселя на всем экране.
        // Мы применяем смещение к ним, чтобы "заглянуть" в фон с искажением.
        vec2 distortedBgUv = gl_FragCoord.xy / uResolution + refractionOffset * 0.1;
        vec4 bg = texture2D(tBackground, distortedBgUv);


        // --- 2. АДАПТАЦИЯ ОСВЕЩЕНИЯ ---
        // Анализируем яркость фона под линзой
        float bgLuminance = dot(bg.rgb, vec3(0.299, 0.587, 0.114));
        // Чем темнее фон, тем ярче будет эффект (каустика и блики)
        float lightAdaptation = smoothstep(0.0, 0.4, bgLuminance);
        float darknessAdaptation = 1.0 - lightAdaptation;


        // --- 3. КАУСТИЧЕСКАЯ ГРАНИЦА (CAUSTIC EDGE) ---
        // Создаем яркую границу, где свет концентрируется
        float causticFactor = smoothstep(0.4, 0.5, distanceFromCenter) - smoothstep(0.5, 0.51, distanceFromCenter);
        vec3 caustic = vec3(causticFactor) * CAUSTIC_BRIGHTNESS * darknessAdaptation;
        

        // --- 4. АДАПТИВНЫЕ БЛИКИ (HIGHLIGHTS) ---
        // Симулируем отражение от источника света (управляемого мышью)
        vec3 lightDir = normalize(vec3(uMouse - vUv, 0.5));
        float highlight = pow(max(0.0, dot(normal, lightDir)), HIGHLIGHT_SHARPNESS);
        vec3 highlightColor = vec3(highlight) * (0.8 + 0.2 * darknessAdaptation);

        
        // --- 5. ФИНАЛЬНАЯ СБОРКА ---
        // Смешиваем все компоненты:
        // Искаженный фон + каустика + блик
        vec3 finalColor = bg.rgb + caustic + highlightColor;
        
        // Маска, чтобы обрезать эффект по границе круга/формы
        float alpha = smoothstep(0.5, 0.49, distanceFromCenter);

        gl_FragColor = vec4(finalColor, alpha);
    }
`;


// -- КЛАСС СИСТЕМЫ --

class LiquidGlassEffect {
    constructor({ element, renderer, camera, program, backgroundTexture }) {
        this.element = element;
        this.renderer = renderer;
        this.camera = camera;
        this.program = program;
        this.backgroundTexture = backgroundTexture;

        // Физика пружины для интерактивности
        this.interaction = {
            current: 0,
            target: 0,
            velocity: 0,
            stiffness: 0.08,
            damping: 0.9,
        };

        this.init();
        this.addEventListeners();
    }

    init() {
        const geometry = new Plane(this.renderer.gl, { width: 1, height: 1 });
        this.mesh = new Mesh(this.renderer.gl, { geometry, program: this.program });
        this.mesh.setParent(this.camera); // Добавляем в сцену
    }

    addEventListeners() {
        this.element.addEventListener('pointerenter', this.onPointerEnter, false);
        this.element.addEventListener('pointerleave', this.onPointerLeave, false);
    }

    onPointerEnter = () => {
        this.interaction.target = 1.0;
    };

    onPointerLeave = () => {
        this.interaction.target = 0.0;
    };

    update(uniforms) {
        // Обновление физики пружины
        const force = (this.interaction.target - this.interaction.current) * this.interaction.stiffness;
        this.interaction.velocity += force;
        this.interaction.velocity *= this.interaction.damping;
        this.interaction.current += this.interaction.velocity;

        // Получаем актуальные размеры и позицию HTML-элемента
        const rect = this.element.getBoundingClientRect();

        // Прячем HTML-элемент, чтобы он не перекрывал WebGL-рендер
        this.element.style.opacity = '0.01'; // Не 0, чтобы события работали

        // Синхронизируем WebGL-меш с HTML-элементом
        this.mesh.scale.x = rect.width;
        this.mesh.scale.y = rect.height;

        // Позиция в WebGL-координатах (центр экрана = 0,0)
        const x = rect.left + rect.width / 2 - window.innerWidth / 2;
        const y = -(rect.top + rect.height / 2) + window.innerHeight / 2;
        this.mesh.position.set(x, y, 0);

        // Обновляем uniform-переменные для этого конкретного меша
        this.mesh.program.uniforms.uInteraction.value = this.interaction.current;

        // Копируем глобальные uniforms
        this.mesh.program.uniforms.uTime.value = uniforms.uTime.value;
        this.mesh.program.uniforms.uMouse.value.copy(uniforms.uMouse.value);
    }
}


// -- ГЛАВНЫЙ СКРИПТ УПРАВЛЕНИЯ --

class App {
    constructor() {
        this.renderer = new Renderer({ canvas: document.getElementById('gl-canvas'), dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
        this.gl = this.renderer.gl;

        this.camera = new Camera(this.gl, { fov: 45 });
        // Важно: начальное положение камеры должно быть таким, чтобы размер холста
        // соответствовал пикселям. При fov=45 и z=1, высота видимой области будет ~0.82.
        // Чтобы сделать 1 WebGL-юнит = 1 пиксель, мы используем ортографическую камеру или вычисляем z.
        // Простой способ - вычислить z так, чтобы высота вьюпорта совпадала с высотой холста.
        const fovInRadians = this.camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fovInRadians / 2) * this.camera.position.z;
        this.camera.position.z = window.innerHeight / 2 / Math.tan(fovInRadians / 2);

        this.scene = new Transform();
        this.effects = [];
        this.mouse = new Vec2(0.5, 0.5);

        // =======================================================
        //                  ИСПРАВЛЕННЫЙ ПОРЯДОК
        // =======================================================

        // 1. Сначала ИНИЦИАЛИЗИРУЕМ все компоненты
        this.initBackground();
        this.initLiquidEffects();

        // 2. Затем ВЫЗЫВАЕМ методы, которые их используют
        this.onResize();
        this.addEventListeners();

        // 3. Запускаем цикл обновления
        requestAnimationFrame(this.update);
    }
    initBackground() {
        // Создаем текстуру, в которую будем рендерить фон
        // Важно: создаем пустой Framebuffer (target)
        this.backgroundTarget = this.renderer.createRenderTarget();
        this.backgroundTexture = this.backgroundTarget.texture;

        // Программа для рендеринга фона
        const program = new Program(this.gl, {
            vertex: backgroundVertex,
            fragment: backgroundFragment,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new Vec2(this.gl.canvas.width, this.gl.canvas.height) },
            },
        });

        // Полноэкранный меш для фона
        const geometry = new Plane(this.gl);
        this.backgroundMesh = new Mesh(this.gl, { geometry, program });
    }

    initLiquidEffects() {
        const liquidProgram = new Program(this.gl, {
            vertex: liquidVertex,
            fragment: liquidFragment,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new Vec2(this.gl.canvas.width, this.gl.canvas.height) },
                uMouse: { value: this.mouse },
                uInteraction: { value: 0 },
                tBackground: { value: this.backgroundTexture },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });

        const targets = document.querySelectorAll('.liquid-glass-target');
        targets.forEach(el => {
            const effect = new LiquidGlassEffect({
                element: el,
                renderer: this.renderer,
                camera: this.camera,
                program: liquidProgram,
                backgroundTexture: this.backgroundTexture
            });
            this.effects.push(effect);
        });
    }

    addEventListeners() {
        window.addEventListener('resize', this.onResize, false);
        window.addEventListener('mousemove', this.onMouseMove, false);
    }

    onResize = () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.perspective({ aspect: this.gl.canvas.width / this.gl.canvas.height });

        // Обновляем разрешение в uniform-переменных
        const res = new Vec2(this.gl.canvas.width, this.gl.canvas.height);
        this.backgroundMesh.program.uniforms.uResolution.value = res;
        this.effects.forEach(e => e.program.uniforms.uResolution.value = res);
    };

    onMouseMove = (e) => {
        // Обновляем позицию мыши в нормализованных координатах (0..1)
        this.mouse.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };

    update = (t) => {
        requestAnimationFrame(this.update);
        const time = t * 0.001;

        // --- Главный Цикл Рендеринга ---

        // 1. Обновляем глобальные uniforms
        const globalUniforms = {
            uTime: { value: time },
            uMouse: { value: this.mouse }
        };
        this.backgroundMesh.program.uniforms.uTime.value = time;

        // 2. Рендерим фон в текстуру
        this.renderer.render({ scene: this.backgroundMesh, target: this.backgroundTexture });

        // 3. Обновляем состояние и uniforms для каждого эффекта
        this.effects.forEach(effect => effect.update(globalUniforms));

        // 4. Отрисовываем всю сцену на экран (фон + линзы)
        this.renderer.render({ scene: this.camera });
    };
}

// Запускаем приложение
new App();
