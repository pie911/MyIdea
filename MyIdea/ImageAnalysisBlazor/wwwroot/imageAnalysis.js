// Minimal JS bridge used by ImageAnalysisBlazor.ImageAnalysisService
window.imageAnalysis = (function () {
    async function analyzeImage(dataUrl, width, height) {
        // Very small mock implementation; the real app can replace this with a WASM loader
        try {
            return JSON.stringify({
                Title: "Captured Moment",
                Description: "A beautiful image that captures a moment in time.",
                Story: "This image tells a story of creativity and human expression.",
                Tags: ["art", "creativity"],
                AstrologyInfluence: "Creative and intuitive energies",
                UserMood: "Inspired and contemplative"
            });
        }
        catch (err) {
            console.error('imageAnalysis.analyzeImage error', err);
            return JSON.stringify({ Title: "Analysis Unavailable", Description: "Unable to analyze the image." });
        }
    }

    return { analyzeImage };
})();
