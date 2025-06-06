const Utils = (() => {
    function extractQuotedText(str) {
        const results = [];
        let startIndex = -1;
        let quoteType = null;
        for (let i = 0; i < str.length; i++) {
            if (str.startsWith("^^^", i)) {
                if (startIndex === -1) {
                    startIndex = i + 3;
                    quoteType = "^^^";
                }
            } else if (str.startsWith('"""', i)) {
                if (startIndex === -1) {
                    startIndex = i + 3;
                    quoteType = '"""';
                }
            }
            if (startIndex !== -1) {
                if ((quoteType === "^^^" && str.startsWith("^^^", i)) && i !== startIndex - 3) {
                    results.push(str.slice(startIndex, i));
                    startIndex = i + 3;
                } else if ((quoteType === '"""' && str.startsWith('"""', i)) && i !== startIndex - 3) {
                    results.push(str.slice(startIndex, i));
                    startIndex = i + 3;
                } else if (i === str.length - 1) {
                    results.push(str.slice(startIndex));
                }
            }
        }
        return results;
    }

    return { extractQuotedText };
})();
