using System;
using System.Runtime.InteropServices.JavaScript;
using System.Threading.Tasks;

namespace ImageAnalysisBlazor
{
    [System.Runtime.Versioning.SupportedOSPlatform("browser")]
    public partial class ImageAnalysisService
    {
        [JSImport("analyzeImage", "imageAnalysis")]
        private static partial Task<string> AnalyzeImageJS(string imageData, int width, int height);

        public async Task<ImageAnalysisResult> AnalyzeImageAsync(byte[] imageData, int width, int height)
        {
            try
            {
                var base64Data = Convert.ToBase64String(imageData);
                var resultJson = await AnalyzeImageJS($"data:image/png;base64,{base64Data}", width, height);
                var result = System.Text.Json.JsonSerializer.Deserialize<ImageAnalysisResult>(resultJson);
                return result ?? new ImageAnalysisResult();
            }
            catch (Exception)
            {
                return new ImageAnalysisResult
                {
                    Title = "Captured Moment",
                    Description = "A beautiful image that captures a moment in time.",
                    Story = "This image tells a story of creativity and human expression.",
                    Tags = new[] { "art", "creativity" },
                    AstrologyInfluence = "Creative and intuitive energies",
                    UserMood = "Inspired and contemplative"
                };
            }
        }
    }

    // Local DTO: keep in this project to avoid a circular project reference
    public class ImageAnalysisResult
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Story { get; set; }
        public string[]? Tags { get; set; }
        public string? AstrologyInfluence { get; set; }
        public string? UserMood { get; set; }
    }
}
