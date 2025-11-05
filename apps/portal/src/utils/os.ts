export type SupportedOS = 'macos' | 'windows' | 'macos-intel';

export async function detectOSFromUserAgent(): Promise<SupportedOS | null> {
  try {
    const ua = navigator.userAgent.toLowerCase();
    
    // Detect Windows
    if (ua.includes("win")) {
      return "windows";
    }
    
    // Detect macOS
    if (ua.includes("mac")) {
      // Try modern userAgentData API first (Chrome, Edge)
      if ("userAgentData" in navigator && navigator.userAgentData) {
        const data: { architecture?: string } =
          await (navigator.userAgentData as { getHighEntropyValues: (hints: string[]) => Promise<{ architecture?: string }> }).getHighEntropyValues(["architecture"]);
        
        if (data.architecture === "arm") return "macos";
        if (data.architecture === "x86") return "macos-intel";
      }
      
      // Fallback to userAgent string parsing
      if (ua.includes("arm64")) return "macos";
      if (ua.includes("intel")) return "macos-intel";
      
      // Default to macos if we can't determine architecture
      return "macos";
    }
    
    return null;
  } catch (error) {
    console.error("Error detecting OS:", error);
    return null;
  }
}