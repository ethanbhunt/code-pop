const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure resolver for web platform support
if (config.resolver) {
  // Ensure web platform is included in resolution
  config.resolver.platforms = ['ios', 'android', 'native', 'web'];
  
  // Prioritize web-compatible entry points
  config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
  
  // Add web source extensions
  config.resolver.sourceExts = [
    ...(config.resolver.sourceExts || []),
    'web.js',
    'web.jsx',
    'web.ts',
    'web.tsx',
  ];
  
  // Custom resolver to handle React Native internal module resolution on web
  const originalResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, realModuleName, platform, moduleName) => {
    // On web, intercept React Native internal relative imports BEFORE default resolver
    if (platform === 'web') {
      const originPath = context.originModulePath || '';
      
      // Check if this is a relative import (../ or ./) from react-native package
      const isRelativeImport = realModuleName && (realModuleName.startsWith('../') || realModuleName.startsWith('./'));
      if (isRelativeImport && originPath.includes('node_modules/react-native/')) {
        // Map Utilities/Platform to react-native-web's Platform (special case)
        if (realModuleName.includes('Utilities/Platform') || realModuleName.endsWith('Utilities/Platform')) {
          const platformPath = path.resolve(
            __dirname,
            'node_modules/react-native-web/dist/vendor/react-native/Utilities/Platform.js'
          );
          // Verify file exists
          try {
            fs.accessSync(platformPath);
            return {
              type: 'sourceFile',
              filePath: platformPath,
            };
          } catch (e) {
            // File doesn't exist, return empty as fallback
            return { type: 'empty' };
          }
        }
        
        // For ALL other relative imports from react-native on web, return empty module
        // This includes: BaseViewConfig, PlatformColorValueTypes, AccessibilityInfo, etc.
        // These are native-only internals that don't have web equivalents
        return { type: 'empty' };
      }
    }
    
    // Use default resolver for everything else
    if (originalResolveRequest) {
      try {
        return originalResolveRequest(context, realModuleName, platform, moduleName);
      } catch (error) {
        // If default resolver fails on web for React Native internals, provide empty module
        if (platform === 'web') {
          const originPath = context.originModulePath || '';
          const isRelativeImport = realModuleName && (realModuleName.startsWith('../') || realModuleName.startsWith('./'));
          if (isRelativeImport && originPath.includes('node_modules/react-native/')) {
            return { type: 'empty' };
          }
        }
        throw error;
      }
    }
    
    // Fallback
    return context.resolveRequest(context, realModuleName, platform);
  };
}

module.exports = config;
