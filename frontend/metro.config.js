const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const CONSOLE_SCREEN = /[\\/]components[\\/]console[\\/]Console(Login)?Screen\.web\.tsx$/;

const config = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });

if (process.env.FLOA_WEB_TARGET === 'client') {
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolved = (upstream || context.resolveRequest)(context, moduleName, platform);
    if (resolved.type === 'sourceFile' && CONSOLE_SCREEN.test(resolved.filePath)) {
      return { type: 'sourceFile', filePath: resolved.filePath.replace(/\.web\.tsx$/, '.tsx') };
    }
    return resolved;
  };
}

module.exports = config;
