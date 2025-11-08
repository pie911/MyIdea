## Repo quick orientation

This repository is a small Blazor/WebAssembly image-analysis example composed of three cooperating projects:

- `MyIdea/` (root Blazor WebAssembly app, targets net9.0)
- `MyIdea/ImageAnalysisBlazor/` (Blazor client helper + JS interop, targets net8.0)
- `MyIdea/ImageAnalysisWasm/` (WASM host / module loader, net8.0, uses Uno.Wasm.Bootstrap)

Key files to read first:

- `MyIdea/ImageAnalysis.cs` — the primary image-analysis logic and DTOs (entropy, color, composition, lighting). Offers the canonical shape of `ImageAnalysisResult` used across the codebase.
- `MyIdea/ImageAnalysisBlazor/ImageAnalysisService.cs` — Blazor-side service that calls JS via [JSImport] and deserializes JSON to `ImageAnalysisResult`.
- `MyIdea/ImageAnalysisBlazor/wwwroot/imageAnalysis.js` — JS-side bridge exposing `imageAnalysis.analyzeImage(...)` (currently returns a mock JSON).
- `MyIdea/ImageAnalysisWasm/main.js` — WASM loader that loads a `.wasm` artifact and exposes `.analyzeImage(...)` to the page.

Architecture & integration notes (what an agent needs to know)

- The app is a Blazor WebAssembly frontend that relies on JavaScript interop and a separate WASM loader to perform image analysis. Blazor calls into JS using `[JSImport("analyzeImage","imageAnalysis")]` in `ImageAnalysisService`.
- JS modules:
  - `imageAnalysis.js` is the expected module named `imageAnalysis` with an exported `analyzeImage` function.
  - `main.js` (WASM loader) loads a `.wasm` file and exposes a `AnalyzeImageAsync`-like export; the JS wrapper returns/consumes JSON.
- DTO duplication: `ImageAnalysis.cs` defines a full `ImageAnalysisResult`; `ImageAnalysisBlazor` contains a smaller local `ImageAnalysisResult` class. When modifying results, update both places or move DTOs to a shared package.
- Platform mismatch: `MyIdea` targets net9.0 while `ImageAnalysisBlazor` and `ImageAnalysisWasm` are net8.0—be conscious when changing target frameworks or using APIs introduced in later .NET versions.

Developer workflows (commands & tips)

- Build solution: `dotnet build MyIdea.sln`
- Run Blazor dev server (from `MyIdea` project): `dotnet run --project MyIdea\MyIdea.csproj` or open solution in Visual Studio and F5 the web project.
- Run WASM loader (if testing ImageAnalysisWasm standalone): `dotnet run --project MyIdea\MyIdea\ImageAnalysisWasm\ImageAnalysisWasm.csproj`
- When testing JS interop, open the browser console — `imageAnalysis` and `ImageAnalysisWASM` objects are created on the window and log useful load/error messages.

Project-specific conventions and gotchas

- JS interop naming: `[JSImport("FUNCTION_NAME","MODULE_NAME")]` maps to `window.MODULE_NAME.FUNCTION_NAME` (see `ImageAnalysisService.cs` -> `imageAnalysis.analyzeImage`). Keep these names in sync.
- Mock-first implementation: `imageAnalysis.js` returns a mocked JSON result. For real analysis, replace this with a call to the WASM loader or remote AI service and preserve the result JSON contract.
- Native imports: `ImageAnalysis.cs` references `DllImport("canvas", ...)` — in WASM contexts these are expected imports or shimmed functions; ensure the WASM runtime provides `getImageData`/`createImageData` if calling those code paths.
- Error handling: services return fallback/default `ImageAnalysisResult` on exceptions. Tests and UI expect fields like `Title`, `Description`, `Tags` to always exist.

Where to make common changes

- Add/modify JS bridge functions: `MyIdea/ImageAnalysisBlazor/wwwroot/imageAnalysis.js`
- Update canonical image analysis logic: `MyIdea/ImageAnalysis.cs`
- Update Blazor wiring and DI: `MyIdea/Program.cs` and `MyIdea/ImageAnalysisBlazor/ImageAnalysisService.cs`

Examples (explicit patterns an agent can follow)

- To add a new JS-exposed helper, add the function to `imageAnalysis.js` and add a matching `[JSImport("newFn","imageAnalysis")]` partial in `ImageAnalysisService.cs`.
- To change the JSON contract, update `ImageAnalysis.cs` (canonical), then update the client-side DTO in `ImageAnalysisBlazor` and any JS that serializes the response.

What not to change without coordination

- Project target frameworks (net8.0/net9.0 split) — changing targets affects all projects and CI/dev workflow.
- The JSON contract between WASM/JS and Blazor; it is treated as stable by UI code.

Quick checklist for PRs touching analysis paths

1. Update `ImageAnalysis.cs` (core logic) and run unit/manual tests.
2. Update `imageAnalysis.js` or `main.js` if the JSON contract changes.
3. Update `ImageAnalysisBlazor/ImageAnalysisService.cs` DTOs and `[JSImport]` signatures.
4. Run `dotnet build MyIdea.sln` and spot-check the Blazor app in browser; verify console logs from `imageAnalysis` or `ImageAnalysisWASM`.

If anything above is incomplete or unclear, tell me which area you want expanded (build steps, debugging, DTO mapping, or JS/WASM wiring) and I'll iterate.
