# Debug Information - Background Enhancements

## If the game doesn't load past character select, check these:

### 1. Check Browser Console
Open DevTools (F12) and look for JavaScript errors. Common issues:

- **Module import errors**: Make sure all files exist in the correct locations
- **Three.js CDN issues**: Check if CDN is accessible
- **Shader compilation errors**: Look for WebGL warnings

### 2. Files Created (verify they exist):
```
world/shaders/SkyGradient.js
world/shaders/CloudGlow.js
world/shaders/SimpleBloom.js
world/GPUParticles.js
world/InteractiveParticles.js
```

### 3. Modified Files:
```
main_hero_select.js - Added bloom setup with error handling
world/Environment.js - Integrated shaders and GPU particles
player/Player.js - Added landing particle detection
player/playerPhysics.js - Returns jump state
```

### 4. Quick Fixes:

**If bloom is causing issues:**
The code already has fallback - bloom will be disabled automatically if it fails.

**If shaders are causing issues:**
Comment out these lines in `Environment.js`:
- Lines 2-4 (shader imports)
- Lines 47-59 (sky shader usage - revert to MeshBasicMaterial)
- Lines 144 (cloud shader - revert to MeshBasicMaterial)

**If GPU particles are causing issues:**
Comment out in `Environment.js`:
- Line 4 (GPUParticles import)
- Lines 78-79 (GPU particle creation)
- Lines 250-252 (GPU particle update)

### 5. Disable Individual Features:

To disable bloom entirely:
```javascript
// In main_hero_select.js line 62-69, comment out:
// composer = setupBloom(renderer, scene, camera);
```

To disable interactive particles:
```javascript
// In main_hero_select.js line 87, comment out:
// interactiveParticles = new InteractiveParticles(scene);
```

### 6. Test Incrementally:
1. First verify base game works without any changes
2. Add lighting only (should work)
3. Add shaders (if this fails, check shader compilation)
4. Add particles (if this fails, check InstancedMesh support)
5. Add bloom (if this fails, it will auto-fallback)

### 7. Browser Compatibility:
Requires:
- WebGL 2.0 support
- ES6 modules support
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

### 8. Local Server:
Make sure you're running from a local server, not file:// protocol
```bash
python3 -m http.server 8000
# Then open http://localhost:8000/index.html
```
