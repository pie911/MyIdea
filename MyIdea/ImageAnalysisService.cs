using System;
using System.Threading.Tasks;
using MyIdea;

namespace MyIdea.Services
{
    // Local fallback service used only by the main project when needed.
    // Renamed to avoid conflicts with the ImageAnalysisBlazor library's ImageAnalysisService type.
    public class LocalImageAnalysisService
    {
        public Task<ImageAnalysisResult> AnalyzeImageAsync(byte[] imageData, int width, int height)
        {
            try
            {
                var result = ImageAnalysis.AnalyzeImage(imageData, width, height);
                return Task.FromResult(result ?? new ImageAnalysisResult());
            }
            catch (Exception)
            {
                return Task.FromResult(new ImageAnalysisResult
                {
                    Title = "Captured Moment",
                    Description = "A beautiful image that captures a moment in time.",
                    Story = "This image tells a story of creativity and human expression.",
                    Tags = new[] { "art", "creativity" },
                    AstrologyInfluence = "Creative and intuitive energies",
                    UserMood = "Inspired and contemplative"
                });
            }
        }
    }
}
