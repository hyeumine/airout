const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Zustand 5's ESM middleware uses `import.meta.env`. Expo web serves a classic
// script, so that syntax throws before React mounts. The CommonJS build uses
// `process.env.NODE_ENV` and is safe in that bundle.
const previousResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return {
      filePath: path.join(__dirname, 'node_modules', 'zustand', 'middleware.js'),
      type: 'sourceFile',
    }
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
