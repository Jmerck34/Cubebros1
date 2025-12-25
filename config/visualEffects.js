/**
 * Visual Effects Configuration
 * Toggle features on/off to diagnose issues
 */
export const VISUAL_EFFECTS_CONFIG = {
    // Lighting
    enableLighting: true,           // Static ambient + directional lights (very safe)

    // Shaders
    enableSkyShader: false,         // Animated sky gradient (DISABLED - may cause issues)
    enableCloudShader: false,       // Cloud glow shader (DISABLED - may cause issues)

    // Particles
    enableGPUParticles: false,      // 500 ambient particles (DISABLED - may cause issues)
    enableInteractiveParticles: false, // Landing/jump dust (DISABLED - may cause issues)

    // Post-processing
    enableBloom: false              // Bloom glow effect (DISABLED - may cause issues)
};
