export const renderKaTeXInElement = (element) => {
    // Обновлённое регулярное выражение для захвата \boxed{}
    const formulaRegex = /\[[\s\S]*?\]|\([\s\S]*?\)|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\boxed\{[\s\S]*?\}/g;

    element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            let match;
            let newHTML = "";
            let lastIndex = 0;

            while ((match = formulaRegex.exec(text)) !== null) {
                const formula = match[0];
                let formulaContent;
                let displayMode;

                // Обработка \boxed{}
                if (formula.startsWith('\\boxed{') && formula.endsWith('}')) {
                    const content = formula.slice(7, -1); // Извлекаем содержимое внутри {}
                    formulaContent = `\\boxed{${content}}`;
                    displayMode = true; // Рендерить в display режиме
                } else {
                    // Стандартная обработка других формул
                    formulaContent = formula.slice(1, formula.length - 1);
                    displayMode = formula.startsWith('[') ||
                        (formula.startsWith('(') && (formula.endsWith(')') || formula.endsWith(']'))) ||
                        formula.startsWith('$$');
                }

                newHTML += text.substring(lastIndex, match.index);
                try {
                    const katexHTML = katex.renderToString(formulaContent.trim(), {
                        displayMode: displayMode,
                        output: "htmlAndMathml",
                        // throwOnError: false
                    });
                    newHTML += katexHTML;
                } catch (error) {
                    console.error("KaTeX error:", error, "in formula:", formula);
                    newHTML += formula;
                }
                lastIndex = formulaRegex.lastIndex;
            }
            newHTML += text.substring(lastIndex);

            if (newHTML !== text) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newHTML;
                node.replaceWith(...tempDiv.childNodes);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            renderKaTeXInElement(node);
        }
    });
};

export const renderKaTeXInElements = () => {
    const elements = document.querySelectorAll('div');
    elements.forEach(renderKaTeXInElement);
};