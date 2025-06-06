const https = require('https');
const http = require('http');
const urlModule = require("url");
const {convert} = require("html-to-text");


let blackList = ['reshak.ru', "class.rambler.ru", "znanija.com", "gdz.ru", "pomogalka.me", "resh.skysmart.ru", "otvetkin.info", "euroki.org"];

function removeTextInBrackets(str) {
    if (typeof str !== 'string') {
        return "Входящий аргумент должен быть строкой.";
    }

    return str.replace(/\[.*?\]/g, '');
}

async function fetchPageText(url) {
    console.log("getting text from the page ", url);
    return new Promise((resolve, reject) => {
        for (const el of blackList){
            if (url.includes(el)) {
                console.log("url blocked")
                resolve("Похожая строка не найдена");
                return;
            }
        }
        const parsedUrl = urlModule.parse(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.path,
            method: 'GET',
        };

        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const maxDataLength = 5 * 1024 * 1024; // 5MB
        let data = '';

        const req = protocol.request(options, (res) => {
            res.on('data', (chunk) => {
                if (data.length + chunk.length > maxDataLength) {
                    req.abort();
                    resolve("Данные превысили лимит размера");
                    return;
                }
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const text = convert(data, {
                            wordwrap: false, // Отключаем wordwrap
                            limits: {
                                maxInputLength: maxDataLength // Ограничиваем длину
                            }
                        });
                        const cleanedText = removeTextInBrackets(text);
                        resolve(cleanedText.includes("�")
                            ? "Похожая строка не найдена"
                            : cleanedText);
                    } catch (error) {
                        console.error("Conversion error:", error);
                        resolve("Ошибка обработки содержимого");
                    }
                } else {
                    resolve("Похожая строка не найдена");
                }
            });
        });

        req.on('error', (error) => {
            resolve("Похожая строка не найдена");
        });

        // **Добавляем таймаут здесь**
        const timeoutMs = 5000; // Например, 5 секунд таймаут
        const timeout = setTimeout(() => {
            console.log(`Request to ${url} timed out after ${timeoutMs}ms`);
            req.abort(); // Прерываем запрос
            resolve("Похожая строка не найдена"); // Резолвим промис с сообщением об ошибке
        }, timeoutMs);

        req.on('socket', (socket) => {
            socket.on('connect', () => {
                socket.setTimeout(timeoutMs); // Устанавливаем таймаут на сокет (опционально, но полезно)
            });
            socket.on('timeout', () => {
                console.log(`Socket timeout for ${url} after ${timeoutMs}ms`);
                req.abort(); // Прерываем запрос
                resolve("Похожая строка не найдена"); // Резолвим промис с сообщением об ошибке
            });
        });


        req.end();

        req.on('close', () => {
            clearTimeout(timeout); // Очищаем таймаут, если запрос завершился успешно или с ошибкой до таймаута
        });
    });
}

const extractJsonFields = (inputString) => {
    try {
        // Попытка найти блок JSON, заключенный в ```json ... ```
        const jsonBlockMatch = inputString.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
            return JSON.parse(jsonBlockMatch[1]);
        }

        // Если ```json не найден, попробуем найти первый корректный JSON блок
        const firstOpeningBracket = inputString.indexOf('{');
        const firstOpeningSquareBracket = inputString.indexOf('[');

        let startIndex = -1;
        if (firstOpeningBracket !== -1 && (firstOpeningSquareBracket === -1 || firstOpeningBracket < firstOpeningSquareBracket)) {
            startIndex = firstOpeningBracket;
        } else if (firstOpeningSquareBracket !== -1) {
            startIndex = firstOpeningSquareBracket;
        }

        if (startIndex !== -1) {
            let openCount = 0;
            let endIndex = -1;
            for (let i = startIndex; i < inputString.length; i++) {
                if (inputString[i] === '{' || inputString[i] === '[') {
                    openCount++;
                } else if (inputString[i] === '}' || inputString[i] === ']') {
                    openCount--;
                }

                if (openCount === 0) {
                    endIndex = i;
                    break;
                }
            }

            if (endIndex !== -1) {
                const jsonString = inputString.substring(startIndex, endIndex + 1);
                return JSON.parse(jsonString);
            }
        }
    } catch (error) {
        console.error("Ошибка при извлечении JSON:", error);
        return null; // Или можно вернуть пустой объект {}, в зависимости от требований
    }
    return null; // Если JSON не найден
};

module.exports = {
    fetchPageText,
    extractJsonFields
};
