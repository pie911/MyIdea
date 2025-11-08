using System;
using System.Runtime.InteropServices.JavaScript;
using System.Threading.Tasks;
using MyIdea;

namespace ImageAnalysisWasm
{
    public partial class Program  // Added 'partial' to fix SYSLIB1071
    {
        public static void Main()
        {
            Console.WriteLine("ImageAnalysis WASM module loaded");
        }

        [JSExport]
        public static string AnalyzeImageFromJS(string base64ImageData)
        {
            try
            {
                // Improved base64 parsing: Handle cases where data might not have a comma
                var base64 = base64ImageData.Contains(',') ? base64ImageData.Split(',')[1] : base64ImageData;
                var imageBytes = Convert.FromBase64String(base64);

                // Placeholders for width/height - in a real app, decode the image (e.g., via ImageSharp or similar)
                var width = 800;  // Replace with actual decoding
                var height = 600; // Replace with actual decoding

                var result = ImageAnalysis.AnalyzeImage(imageBytes, width, height);

                // Use JSON serialization for consistency (assuming System.Text.Json is available)
                return System.Text.Json.JsonSerializer.Serialize(result);
            }
            catch (Exception ex)
            {
                return System.Text.Json.JsonSerializer.Serialize(new { error = ex.Message });
            }
        }

        [JSExport]
        public static async Task<string> AnalyzeImageAsync(string imageData, int width, int height)
        {
            try
            {
                // Improved base64 parsing
                var base64 = imageData.Contains(',') ? imageData.Split(',')[1] : imageData;
                var bytes = Convert.FromBase64String(base64);

                var result = await Task.Run(() => ImageAnalysis.AnalyzeImage(bytes, width, height));  // Made async for demo

                return System.Text.Json.JsonSerializer.Serialize(result);
            }
            catch (Exception ex)
            {
                return System.Text.Json.JsonSerializer.Serialize(new { error = ex.Message });
            }
        }
    }
}
