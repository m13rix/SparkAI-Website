// script.js
document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.querySelector('.task-input');
    const aiResponseSection = document.getElementById('aiResponseSection');
    const aiSolutionContent = document.getElementById('aiSolutionContent');
    const thinkingTextElement = document.getElementById('thinkingText');
    const diagramNodes = document.querySelectorAll('.diagram-node');

    // GSAP Timeline for AI Response Animation
    const aiResponseTimeline = gsap.timeline({ paused: true });
    aiResponseTimeline.fromTo(aiResponseSection, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
    aiResponseTimeline.fromTo(aiSolutionContent, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.2 }); // Delay for staggered effect

    // GSAP for Input Focus Glow
    gsap.utils.toArray('.task-input').forEach(input => {
        input.addEventListener('focus', () => {
            gsap.to(input, { borderBottomColor: '#00F0FF', boxShadow: '0 0 32px rgba(0, 240, 255, 0.2)', duration: 0.3, ease: "power2.out" });
        });
        input.addEventListener('blur', () => {
            gsap.to(input, { borderBottomColor: 'rgba(255,255,255,0.12)', boxShadow: 'none', duration: 0.3, ease: "power2.out" });
        });
    });

    // GSAP for Button Hover and Click
    gsap.utils.toArray('.input-btn').forEach(button => {
        gsap.to(button, { duration: 0.2, ease: "power2.out", scale: 1, transformOrigin: "center", overwrite: "auto" }).pause();
        button.addEventListener('mouseenter', () => gsap.to(button.style, { scale: 1.1, duration: 0.2, ease: "power2.out" }));
        button.addEventListener('mouseleave', () => gsap.to(button.style, { scale: 1, duration: 0.2, ease: "power2.out" }));
        button.addEventListener('mousedown', () => gsap.to(button.style, { scale: 0.95, duration: 0.1, ease: "power2.out" }));
        button.addEventListener('mouseup', () => gsap.to(button.style, { scale: 1.1, duration: 0.1, ease: "power2.out" }));
    });

    // Diagram Node Interaction with GSAP
    diagramNodes.forEach(node => {
        node.addEventListener('click', () => {
            gsap.to(node, { scale: 0.98, duration: 0.1, ease: "power2.out", onComplete: () => {
                    gsap.to(node, { y: -4, scale: 1, duration: 0.3, ease: "power2.out" });
                }});
        });
    });

    // Simulate AI Response on Input (for demo purposes)
    taskInput.addEventListener('input', () => {
        if (taskInput.value.length > 3) { // Show response after some input
            if (aiResponseSection.classList.contains('hidden')) {
                aiResponseSection.classList.remove('hidden');
                aiResponseTimeline.restart(); // Play the AI response animation
                aiSolutionContent.classList.remove('hidden-content'); // Show solution content
                thinkingTextElement.textContent = "Решение DeepSeek R1"; // Change thinking text to solution title
            }
        } else {
            if (!aiResponseSection.classList.contains('hidden')) {
                aiResponseTimeline.reverse(); // Reverse animation to hide
                aiSolutionContent.classList.add('hidden-content'); // Hide solution content
                thinkingTextElement.textContent = "Глубокий анализ задачи"; // Reset thinking text
                aiResponseTimeline.eventCallback("onReverseComplete", () => { // After reverse animation
                    aiResponseSection.classList.add('hidden'); // Fully hide section after reverse animation
                    aiResponseTimeline.eventCallback("onReverseComplete", null); // Remove callback after first execution
                });
            }
        }
    });
});
