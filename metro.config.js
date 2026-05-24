const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force CJS bundle for supabase to avoid dynamic import(variable) in .mjs
  if (moduleName === '@supabase/supabase-js') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@supabase/supabase-js/dist/index.cjs'),
      type: 'sourceFile',
    };
  }
  // Stub out OpenTelemetry — not needed in React Native
  if (moduleName === '@opentelemetry/api') {
    return {
      filePath: path.resolve(__dirname, 'mocks/opentelemetry-api.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
