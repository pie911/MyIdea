// WebAssembly Image Analysis Module Loader
class ImageAnalysisWASM {
    constructor() {
        this.module = null;
        this.isLoaded = false;
    }

    async load() {
        if (this.isLoaded) return;

        try {
            // Load the WebAssembly module
            const response = await fetch('./ImageAnalysisWasm.wasm');
            const buffer = await response.arrayBuffer();

            // Instantiate the module
            const { instance } = await WebAssembly.instantiate(buffer, {
                env: {
                    memory: new WebAssembly.Memory({ initial: 256 }),
                    table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' })
                }
            });

            this.module = instance;
            this.isLoaded = true;
            console.log('ImageAnalysis WASM module loaded successfully');
        } catch (error) {
            console.error('Failed to load ImageAnalysis WASM module:', error);
            throw error;
        }
    }

    async analyzeImage(imageData, width, height) {
        if (!this.isLoaded) await this.load();

        try {
            // Convert image data to the format expected by WASM
            const base64Data = await this.imageDataToBase64(imageData);

            // Call the WASM function
            const resultJson = this.module.exports.AnalyzeImageAsync(base64Data, width, height);

            // Parse the result
            return JSON.parse(resultJson);
        } catch (error) {
            console.error('Image analysis failed:', error);
            return this.getFallbackAnalysis();
        }
    }

    async imageDataToBase64(imageData) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        });
    }

    getFallbackAnalysis() {
        return {
            title: "Captured Moment",
            description: "A beautiful image that captures a moment in time.",
            story: "This image tells a story of creativity and human expression.",
            tags: ['art', 'creativity'],
            astrologyInfluence: "Creative and intuitive energies",
            userMood: "Inspired and contemplative"
        };
    }
}

// Export for use in main app
window.ImageAnalysisWASM = new ImageAnalysisWASM();
