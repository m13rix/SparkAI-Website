// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDCZ7J_xlddmGR_gzSLKono5xVMUGGUFUs",
    authDomain: "source-410210.firebaseapp.com",
    projectId: "source-410210",
    storageBucket: "source-410210.appspot.com",
    messagingSenderId: "1035067375237",
    appId: "1:1035067375237:web:4351de43ccd9ba1e7233ec",
    measurementId: "G-2GHL3F1W1F"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(TextPlugin)
    gsap.ticker.lagSmoothing(0)
    // Cursor customization
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    document.addEventListener('mousemove', (e) => {
        gsap.to(cursor, { x: e.clientX, y: e.clientY });
        gsap.to(cursorFollower, { x: e.clientX, y: e.clientY });
    });
    document.querySelectorAll('a, button, input[type="submit"], .auth-button').forEach(item => {
        item.addEventListener('mouseenter', () => {
            gsap.to(cursor, { scale: 2, borderColor: '#ccf', backgroundColor: 'rgba(204, 204, 255, 0.3)' });
            gsap.to(cursorFollower, { scale: 2.5, borderColor: '#ccf', backgroundColor: 'rgba(204, 204, 255, 0.1)' });
        });
        item.addEventListener('mouseleave', () => {
            gsap.to(cursor, { scale: 1, borderColor: '#99ddff', backgroundColor: '#99ddff' });
            gsap.to(cursorFollower, { scale: 1, borderColor: '#99ddff', backgroundColor: 'rgba(153, 221, 255, 0.2)' });
        });
    });

    // ----- GSAP Animations -----
    const authContainer = document.querySelector('.auth-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const successMessage = document.getElementById('success-message');
    const authTitle = document.getElementById('auth-title');
    gsap.from(authContainer, { duration: 1.2, opacity: 0, scale: 0.95, ease: "power2.out", delay: 0.3 });
    gsap.to([loginForm, registerForm, successMessage], { duration: 0.8, opacity: 1, y: 0, stagger: 0.1, ease: "power2.out", delay: 0.6 });

    // ----- Формы и переключение -----
    const switchToRegisterBtn = document.getElementById('switch-to-register');
    const switchToLoginBtn = document.getElementById('switch-to-login');
    switchToRegisterBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        gsap.to(authTitle, {duration: 0.6, text: "Регистрация в SparkAI", ease: "power2.out"});
        await gsap.to(loginForm, {duration: 0.5, opacity: 0, y: 20, display: 'none', ease: "power1.in"});
        registerForm.classList.remove("hidden")
        gsap.to(registerForm, {duration: 0.5, opacity: 1, y: 0, display: 'flex', ease: "power1.out", delay: 0.4});
    });
    switchToLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        gsap.to(registerForm, {duration: 0.5, opacity: 0, y: 20, display: 'none', ease: "power1.in"});
        gsap.to(loginForm, {duration: 0.5, opacity: 1, y: 0, display: 'flex', ease: "power1.out", delay: 0.4});
        gsap.to(authTitle, {duration: 0.6, text: "Вход в SparkAI", ease: "power2.out"});
    });

    // ----- Обработка ошибок и успеха (симуляция) -----
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');

    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerPasswordConfirmInput = document.getElementById('register-password-confirm');

    // Добавляем переменные для полей username и phone
    const registerUsernameInput = document.getElementById('register-username');
    const registerPhoneInput = document.getElementById('register-phone');

    const loginEmailError = document.getElementById('login-email-error');
    const loginPasswordError = document.getElementById('login-password-error');
    const registerEmailError = document.getElementById('register-email-error');
    const registerPasswordError = document.getElementById('register-password-error');
    const registerPasswordConfirmError = document.getElementById('register-password-confirm-error');

    function showError(element, message) {
        element.textContent = message;
        element.classList.add('active');
    }

    function hideError(element) {
        element.textContent = '';
        element.classList.remove('active');
    }

    function resetErrors() {
        hideError(loginEmailError);
        hideError(loginPasswordError);
        hideError(registerEmailError);
        hideError(registerPasswordError);
        hideError(registerPasswordConfirmError);
    }

    loginButton.addEventListener('click', () => {
        resetErrors();
        let isValid = true;

        if (!loginEmailInput.value) {
            showError(loginEmailError, 'Введите email');
            isValid = false;
        } else if (!isValidEmail(loginEmailInput.value)) {
            showError(loginEmailError, 'Неверный формат email');
            isValid = false;
        }

        if (!loginPasswordInput.value) {
            showError(loginPasswordError, 'Введите пароль');
            isValid = false;
        }

        if (isValid) {
            loginWithFirebase(loginEmailInput.value, loginPasswordInput.value); // Используем Firebase функцию для входа
        }
    });

    registerButton.addEventListener('click', async () => {
        resetErrors();
        let isValid = true;

        if (!registerUsernameInput.value) {
            showError(document.querySelector("#username-error"), 'Введите имя пользователя');
            isValid = false;
        }

        if (!registerPhoneInput.value) {
            showError(document.querySelector("#phone-error"), 'Введите номер телефона');
            isValid = false;
        }

        if (!document.querySelector("#agreement").checked) {
            showError(document.querySelector("#agreement-error"), 'Вы должны согласиться');
            isValid = false;
        }

        if (!registerEmailInput.value) {
            showError(registerEmailError, 'Введите email');
            isValid = false;
        } else if (!isValidEmail(registerEmailInput.value)) {
            showError(registerEmailError, 'Неверный формат email');
            isValid = false;
        }

        if (!registerPasswordInput.value) {
            showError(registerPasswordError, 'Введите пароль');
            isValid = false;
        } else if (registerPasswordInput.value.length < 8) {
            showError(registerPasswordError, 'Пароль должен быть не менее 8 символов');
            isValid = false;
        } else if (!/\d/.test(registerPasswordInput.value)) {
            showError(registerPasswordError, 'Пароль должен содержать хотя бы одну цифру');
            isValid = false;
        }

        if (registerPasswordConfirmInput.value !== registerPasswordInput.value) {
            showError(registerPasswordConfirmError, 'Пароли не совпадают');
            isValid = false;
        }

        if (isValid) {
            console.log(await registerWithFirebase(
                registerEmailInput.value,
                registerPasswordInput.value,
                registerUsernameInput.value,
                registerPhoneInput.value
            )); // Используем Firebase функцию для регистрации)
        }
    });

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async function registerWithFirebase(email, password, username, phone) {
        const button = registerButton;

        button.textContent = 'Загрузка...';
        button.disabled = true;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;

                // Отправка письма для подтверждения email
                return user.sendEmailVerification({ url: "https://www.spark-ai.ru/" });
            })
            .then(async () => {
                // Сохранение дополнительных данных пользователя в Firestore
                const user = auth.currentUser; // Получаем текущего пользователя после регистрации
                await userHandler.setCurrentUID(user.uid);
                await userHandler.updateUser(user.uid, {
                    username: username,
                    email: email,
                    phone: phone,
                    photoURL: "https://images.icon-icons.com/1458/PNG/512/questionmark_99738.png"
                })
                showSuccess('register', email);
            })
            .then(() => {
                button.textContent = 'Зарегистрироваться';
                button.disabled = false;
                showSuccess('register', email);
            })
            .catch((error) => {
                button.textContent = 'Зарегистрироваться';
                button.disabled = false;
                console.log(error)
                showAuthError('register', error);
            });
    }

    async function loginWithFirebase(email, password) {
        const button = loginButton;

        button.textContent = 'Загрузка...';
        button.disabled = true;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                if (user.emailVerified){
                    button.textContent = 'Войти';
                    button.disabled = false;
                    showSuccess('login', email);
                    userHandler.setCurrentUID(user.uid).then(async r => {
                        await userHandler.setCurrentUID(user.uid);
                        window.location.href = "/";
                    })
                } else {
                    button.textContent = 'Войти';
                    button.disabled = false;
                    showAuthError('login', "email-not-verified");
                }
            })
            .catch((error) => {
                button.textContent = 'Войти';
                button.disabled = false;
                showAuthError('login', error);
            });
    }

    const successTitle = document.getElementById('success-title');
    const successText = document.getElementById('success-text');

    async function showSuccess(type, email) {
        const form = (type === 'login') ? loginForm : registerForm;

        gsap.to(form, {duration: 0.5, opacity: 0, y: 20, display: 'none', ease: "power1.in"});
        gsap.to(successMessage, {
            duration: 0.5,
            opacity: 1,
            y: 0,
            display: 'flex',
            ease: "power1.out",
            delay: 0.4
        });
        await gsap.to(authTitle, {duration: 0.6, text: "Успех!", ease: "power2.out"});
        successMessage.classList.remove("hidden")
        successTitle.textContent = (type === 'login') ? 'Вход выполнен! Подождите...' : 'Регистрация успешна!';
        successText.textContent = (type === 'login') ? 'Подождите...' : 'Для окончательной регистрации подтвердите почту в отправленном вам письме. Обратите внимание на то, что из-за трафика оно может доходить до 5 минут.';
    }

    function showAuthError(type, error) {
        const errorElement = (type === 'login') ? loginPasswordError : registerPasswordError;
        if (type === 'login'){
            if (error === "email-not-verified"){
                showError(errorElement, 'Пожалуйста подтвердите почту в отправленном вам письме');
            } else {
                showError(errorElement, 'Неверный логин или пароль. Попробуйте ещё раз.');
            }
        }
        else {
            showError(errorElement, 'Ошибка аутентификации. Попробуйте еще раз.');
        }
        if (type === 'login') {
            loginPasswordInput.value = ''; // Очистка пароля при ошибке входа
        } else {
            registerPasswordInput.value = '';
            registerPasswordConfirmInput.value = '';
        }
    }

    document.getElementById('google-sign-in').addEventListener('click', function() {
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).then(async function (result) {
            // Пользователь успешно вошел
            var user = result.user;
            showSuccess('login');
            await userHandler.setCurrentUID(user.uid);
            await userHandler.updateUser(user.uid, { username: user.displayName, email: user.email, photoURL: user.photoURL });
            window.location.href = "/";
            // Здесь можно обновить интерфейс, показать информацию о пользователе и т.д.
        }).catch(function(error) {
            // Обработка ошибок
            console.error("Ошибка при входе через Google: ", error);
        });
    });
});
