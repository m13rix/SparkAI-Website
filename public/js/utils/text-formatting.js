import { renderKaTeXInElement } from './katex-renderer';

export const formatText = (text) => {
    const parsedHTML = marked.parse(text);

    // Создаем временный элемент для работы с HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedHTML;

    // Находим все элементы <p>
    const pElements = tempDiv.querySelectorAll('p');

    // Заменяем каждый <p> на <div>
    pElements.forEach(p => {
        const div = document.createElement('div');
        // Копируем все атрибуты из <p> в <div>
        p.getAttributeNames().forEach(attrName => {
            div.setAttribute(attrName, p.getAttribute(attrName));
        });
        // Копируем все дочерние узлы из <p> в <div>
        while (p.firstChild) {
            div.appendChild(p.firstChild);
        }
        // Заменяем <p> на <div> в HTML
        p.parentNode.replaceChild(div, p);
    });

    // Рендерим формулы KaTeX после форматирования HTML
    renderKaTeXInElement(tempDiv);

    return tempDiv.innerHTML; // Возвращаем модифицированный HTML с KaTeX
};
