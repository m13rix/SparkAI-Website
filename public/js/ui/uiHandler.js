const uiHandler = (() => {
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let currentUserData;
    let avatarDropdown; // Ссылка на DOM элемент меню
    let avatarButton;   // Ссылка на DOM элемент аватара
    let isDropdownOpen = false; // Состояние меню

    async function init(){
        if (await userHandler.getCurrentUID()){
            console.log(await userHandler.getCurrentUID())
            currentUserData = JSON.parse(await userHandler.getUser(await userHandler.getCurrentUID()))
        }
        if (currentUserData){
            console.log("Используемый URL аватара:", currentUserData.photoURL); // Добавьте эту строку
            document.getElementById("login-button").style.display = "none";
            const avatarDiv = document.getElementById("avatar");
            const avatarImage = avatarDiv.querySelector('img'); // Лучше найти существующий img
            if (avatarImage) {
                avatarImage.src = currentUserData.photoURL;
                avatarImage.alt = "Avatar"; // Установить alt здесь
                avatarDiv.style.display = "block";
            } else {
                // Если img нет, можно создать
                avatarDiv.innerHTML = `<img src="${currentUserData.photoURL}" alt="Avatar">`;
                avatarDiv.style.display = "block";
            }
            setupDropdown();
            setupMenuActions();
        }
    }

    // Функция настройки Dropdown
    function setupDropdown() {
        avatarButton = document.getElementById('avatar');
        avatarDropdown = document.getElementById('avatar-dropdown');

        if (!avatarButton || !avatarDropdown) {
            console.error("Элементы аватара или dropdown не найдены!");
            return;
        }

        // Предустановка стилей GSAP (чтобы избежать "прыжка" при первой анимации)
        gsap.set(avatarDropdown, {
            opacity: 0,
            visibility: 'hidden',
            y: -10, // Начальное смещение вверх
            scale: 0.95,
            transformOrigin: 'top right'
        });

        avatarButton.addEventListener('click', toggleDropdown);
        // Добавляем возможность открытия по Enter/Space для доступности
        avatarButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); // Предотвращаем стандартное действие (прокрутку для Space)
                toggleDropdown();
            }
        });

        // Закрытие меню при клике вне его
        document.addEventListener('click', handleOutsideClick);
        // Закрытие меню по клавише Escape
        document.addEventListener('keydown', handleEscapeKey);
    }

    // Функция переключения состояния меню
    function toggleDropdown() {
        if (isDropdownOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    // Функция открытия меню
    function openDropdown() {
        if (isDropdownOpen) return; // Не открывать, если уже открыто
        isDropdownOpen = true;
        avatarButton.setAttribute('aria-expanded', 'true');
        avatarDropdown.style.display = 'block'; // Сделать видимым перед анимацией

        gsap.to(avatarDropdown, {
            duration: 0.3, // Скорость анимации
            opacity: 1,
            y: 0, // Возвращаем на место
            scale: 1,
            visibility: 'visible',
            ease: 'power2.out' // Эффект анимации
        });
    }

    // Функция закрытия меню
    function closeDropdown() {
        if (!isDropdownOpen) return; // Не закрывать, если уже закрыто
        isDropdownOpen = false;
        avatarButton.setAttribute('aria-expanded', 'false');

        gsap.to(avatarDropdown, {
            duration: 0.25, // Чуть быстрее закрываем
            opacity: 0,
            y: -10, // Смещаем обратно вверх
            scale: 0.95,
            visibility: 'hidden',
            ease: 'power1.in', // Другой эффект для закрытия
            onComplete: () => {
                // Можно снова скрыть через display none после анимации, если нужно
                avatarDropdown.style.display = 'none';
            }
        });
    }

    // Обработчик клика вне меню
    function handleOutsideClick(event) {
        // Закрываем, если клик был НЕ по кнопке аватара И НЕ внутри самого дропдауна
        if (isDropdownOpen && !avatarButton.contains(event.target) && !avatarDropdown.contains(event.target)) {
            closeDropdown();
        }
    }

    // Обработчик нажатия Escape
    function handleEscapeKey(event) {
        if (isDropdownOpen && event.key === 'Escape') {
            closeDropdown();
        }
    }
    function setupMenuActions() {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault(); // Предотвращаем переход по #
                console.log("Нажата кнопка Выйти");
                // Здесь будет твоя логика выхода из аккаунта
                await userHandler.setCurrentUID(null); // Например
                window.location.reload(); // Перезагрузка страницы
                closeDropdown(); // Закрыть меню после действия
            });
        }
        // Аналогично добавить обработчики для "Настройки" и "Подписка"
    }

    return { init };
})();
