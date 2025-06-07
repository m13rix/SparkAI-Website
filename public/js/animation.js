const Animation = (() => {
    let currentAnimationFrame = null;
    let lastUpdateTime = 0;
    let currentText = '';
    let targetText = '';
    let elementInstance = null;
    let animationSpeed = 1;
    let onCompleteCallback = null;

    function updateFormatting(responseArea, text, onComplete) {
        const formattedHtml = formatText(text);
        elementInstance = responseArea;
        targetText = formattedHtml;
        onCompleteCallback = onComplete;
        if (!currentAnimationFrame) {
            currentText = responseArea.innerHTML;
            lastUpdateTime = performance.now();
            animate();
        }
    }

    function animate() {
        const now = performance.now();
        const deltaTime = now - lastUpdateTime;
        lastUpdateTime = now;
        let diffIndex = 0;
        while (
            diffIndex < currentText.length &&
            diffIndex < targetText.length &&
            currentText[diffIndex] === targetText[diffIndex]
            ) {
            diffIndex++;
        }
        const maxChars = Math.floor(deltaTime * animationSpeed);
        const newIndex = Math.min(diffIndex + maxChars, targetText.length);
        if (newIndex > diffIndex) {
            const fragment = document.createRange().createContextualFragment(targetText.substring(0, newIndex));
            elementInstance.innerHTML = '';
            elementInstance.appendChild(fragment);
            currentText = targetText.substring(0, newIndex);
        }
        if (newIndex < targetText.length) {
            currentAnimationFrame = requestAnimationFrame(animate);
        } else {
            initThoughtBlocks(elementInstance);
            if (onCompleteCallback) {
                onCompleteCallback();
                onCompleteCallback = null;
            }
            currentAnimationFrame = null;
        }
    }

    function formatText(text) {
        const TEMP_MARKER = '˹˹˹TEMP˺˺˺';
        let processedText = text;
        const thinkBlocks = [];
        const thinkRegex = /<think>([\s\S]*?)(<\/think>|$)/g;
        processedText = processedText.replace(thinkRegex, (match, content, closingTag) => {
            const fullContent = closingTag ? content : content + match.slice(content.length + '<think>'.length);
            thinkBlocks.push(fullContent);
            return `${TEMP_MARKER}${thinkBlocks.length - 1}${TEMP_MARKER}`;
        });
        let parsedHtml = marked.parse(processedText);
        parsedHtml = parsedHtml.replace(new RegExp(`${TEMP_MARKER}(\\d+)${TEMP_MARKER}`, 'g'), (_, index) => {
            const blockContent = thinkBlocks[index];
            return `
        <div class="model-thought">
          <div class="model-thought-header">
            <span class="model-thought-title">Chain of Thought</span>
          </div>
          <div class="model-thought-content">
            ${marked.parse(blockContent)}
          </div>
        </div>
      `;
        });
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = parsedHtml;
        let pElements = tempDiv.querySelectorAll('p');
        if (window.matchMedia('(max-width: 768px)').matches) {
            pElements = tempDiv.querySelectorAll('p, ul, li, ol');
        }
        pElements.forEach(p => {
            const div = document.createElement('div');
            p.getAttributeNames().forEach(attrName => {
                div.setAttribute(attrName, p.getAttribute(attrName));
            });
            while (p.firstChild) {
                div.appendChild(p.firstChild);
            }
            p.parentNode.replaceChild(div, p);
        });
        return tempDiv.innerHTML;
    }

    function initThoughtBlocks(parent) {
        parent.querySelectorAll('.model-thought').forEach(block => {
            const header = block.querySelector('.model-thought-header');
            const content = block.querySelector('.model-thought-content');
            const animation = gsap.to(content, {
                height: '10px',
                opacity: 1,
                duration: 0.4,
                filter: 'blur(16px) saturate(180%)',
                ease: 'power2.inOut',
                paused: true
            });
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                if (animation.progress() === 0) {
                    animation.play();
                } else {
                    animation.reverse();
                }
            });
        });
    }

    // Логика индикатора загрузки
    let maxPercent = 0;
    let i = 0;
    const throttle = 0.7;

    function activateStep(step) {
        switch (step) {
            case 'step-query':
                maxPercent = 28;
                break;
            case 'step-select-model':
                maxPercent = 70;
                break;
            case 'step-search':
                maxPercent = 95;
                break;
            case 'step-response':
                maxPercent = 100;
                animationSpeed = 1.1820;
                break;
        }
    }

    function drawProgress() {
        const bar = document.querySelector('.progress-bar');
        if (!bar) return;
        const counter = document.querySelector('.count');
        if (i <= maxPercent) {
            const r = Math.random() / animationSpeed;
            requestAnimationFrame(drawProgress);
            bar.style.width = i + '%';
            counter.innerHTML = Math.round(i) + '%';
            if (r < throttle) {
                i = i + r;
            }
            if (animationSpeed === 1.1820) {
                i = 100;
                bar.classList.add("done");
                document.getElementById('loading-section').style.display = 'none';
                document.getElementById('solution-section').style.display = 'block';
            }
        } else {
            if (i >= 100) {
                bar.classList.add("done");
                document.getElementById('loading-section').style.display = 'none';
                document.getElementById('solution-section').style.display = 'block';
            } else {
                requestAnimationFrame(drawProgress);
            }
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function initProgressBar() {
        await sleep(200)
        drawProgress();
    }

    return {
        updateFormatting,
        formatText,
        activateStep,
        initProgressBar
    };
})();
