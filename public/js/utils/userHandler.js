const userHandler = (() => {
    const base = 'https://spark-uni-homework-helper.up.railway.app/user';

    async function getUser(id) {
        const res = await fetch(`${base}/${id}`);
        return res.ok ? JSON.stringify(await res.json(), null, 2) : res.statusText;
    }

    async function getCurrentUID(){
        return localStorage.getItem("UID");
    }

    async function setCurrentUID(id){
        localStorage.setItem("UID", id)
    }

    async function updateUser(id, body = {}) {
        console.log("Получен объект для отправки:", body); // Логируем объект, как и раньше

        const res = await fetch(`${base}/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Accept: 'application/json' // Хорошей практикой будет также указать, какой ответ вы ожидаете
            },
            // Преобразуем объект в JSON строку перед отправкой
            body: JSON.stringify(body)
        });

        // Небольшое улучшение обработки ответа:
        if (!res.ok) {
            // Если сервер вернул ошибку, лучше вернуть текст ошибки или выбросить исключение
            const errorText = await res.text(); // Попробуем получить текст ошибки
            console.error(`Ошибка ${res.status}: ${res.statusText}`, errorText);
            // Можно вернуть статус или текст, или выбросить ошибку
            return `Ошибка: ${res.status} ${res.statusText}`;
            // throw new Error(`Ошибка ${res.status}: ${res.statusText}`);
        }

        try {
            // Если ответ успешный (res.ok === true) и Content-Type правильный, парсим JSON
            const responseData = await res.json();
            // Если вам нужно вернуть именно красивую строку для логов/отладки:
            // return JSON.stringify(responseData, null, 2);
            // Но чаще всего из API-функции лучше вернуть сам объект данных:
            return responseData;
        } catch (error) {
            // Обработка случая, когда ответ res.ok, но тело не является валидным JSON
            console.error("Не удалось распарсить JSON ответа:", error);
            return "Ошибка парсинга ответа от сервера";
        }
    }

    async function deleteUser(id) {
        const res = await fetch(`${base}/${id}`, { method: 'DELETE' });
        return res.ok ? 'Успешно удалено' : res.statusText;
    }


    return { getUser, updateUser, deleteUser, setCurrentUID, getCurrentUID };
})();
