function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function init(){
    await sleep(200)
    var navBtns = document.querySelectorAll(".buttons");

    if (!window.matchMedia('(max-width: 600px)').matches) {
        navBtns.forEach((btn) => {
            btn.querySelector("#circle").style.pointerEvents = "none";
            let circle = btn.querySelector("#circle");

            gsap.set(circle, {
                scale: 0.2,
                opacity: 0
            });

            let tl = gsap.timeline({paused: true});
            tl.to(btn, {
                duration: 0.2,
                scale: 0.95,
                ease: "quad.out"
            }).to(circle, {
                scale: 2,
                opacity: 1
            });

            function setPosition(e) {
                var bounds = e.target.getBoundingClientRect();
                var x = e.clientX - bounds.left;
                var y = e.clientY - bounds.top;

                console.log(x, y);

                gsap.set(circle, {
                    left: `${x}px`,
                    top: `${y}px`
                });
            }

            // Apply our listeners
            btn.addEventListener("mouseenter", (e) => {
                setPosition(e);
                tl.play();
            });
            btn.addEventListener("mousemove", (e) => {
                setPosition(e);
            });
            btn.addEventListener("mouseout", (e) => {
                setPosition(e);
                tl.reverse();
            });
        });
    }
    await sleep(200)
    var sidebarToggle = document.querySelector('#toggle-sidebar');
    var sidebar = document.querySelector('.sidebar');
    var header = document.querySelector('header');
    var main = document.querySelector('main');
    var footer = document.querySelector('#footer-container');

    const animation = gsap.to(sidebar, {
        width: '0',
        opacity: 0,
        duration: 0.4,
        filter: 'blur(16px)',
        ease: 'power2.inOut',
        paused: true
    });

    const animation2 = gsap.to(header, {
        left: 0,
        width: '100%',
        ease: 'power2.inOut',
        paused: true
    });

    const animationMobile1 = gsap.to(main, {
        display: 'none',
        opacity: 0,
        duration: 0.4,
        filter: 'blur(16px)',
        ease: 'power2.inOut',
        paused: true
    });
    const animationMobile2 = gsap.to(footer, {
        display: 'none',
        opacity: 0,
        duration: 0.4,
        filter: 'blur(16px)',
        ease: 'power2.inOut',
        paused: true
    });

// Закрываем sidebar по умолчанию на мобильных устройствах
    if (window.matchMedia('(max-width: 600px)').matches) {
        animation.progress(1); // Устанавливаем анимацию в конечное состояние
        animation2.progress(1); // Устанавливаем анимацию в конечное состояние
        sidebarToggle.classList.add('collapsed'); // Добавляем класс collapsed если нужно
    }

    sidebarToggle.addEventListener('click', () => {
        sidebarToggle.classList.toggle('collapsed');
        if (animation.progress() === 0) {
            animation.play();
            animation2.play();
            if (window.matchMedia('(max-width: 600px)').matches) {
                animationMobile1.reverse();
                animationMobile2.reverse();
            }
        } else {
            animation.reverse();
            animation2.reverse();
            if (window.matchMedia('(max-width: 600px)').matches) {
                animationMobile1.play();
                animationMobile2.play();
            }
        }
    });
}

init()
