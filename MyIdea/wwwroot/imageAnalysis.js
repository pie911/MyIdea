// imageAnalysis.js - Bridge between UI and WASM image analysis
const imageAnalysis = {
    async analyzeImage(imageData) {
        try {
            const result = await this.analyzeWithWebAssembly(imageData);
            return {
                title: result.title || "Beautiful Image",
                description: result.description || "A captivating moment captured",
                tags: result.tags || ["photo"],
                story: result.story || "Every image tells a story",
                mood: result.mood || "peaceful"
            };
        } catch (err) {
            console.error('Image analysis failed:', err);
            return {
                title: "New Image",
                description: "An uploaded image",
                tags: ["photo"],
                story: "Share your story",
                mood: "neutral"
            };
        }
    },

    async analyzeWithWebAssembly(imageData) {
        if (!window.ImageAnalysisWASM) {
            console.warn('WASM module not loaded, falling back to default analysis');
            return this._defaultAnalysis(imageData);
        }
        return window.ImageAnalysisWASM.analyzeImage(imageData);
    },

    _defaultAnalysis(imageData) {
        return {
            title: "New Image",
            description: "An uploaded image",
            tags: ["photo"],
            story: "Share your story",
            mood: "neutral"
        };
    }
};

// Export for global use
window.imageAnalysis = imageAnalysis;