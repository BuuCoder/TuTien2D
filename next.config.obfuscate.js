const WebpackObfuscator = require('webpack-obfuscator');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Chỉ obfuscate khi build production và client-side
    if (!dev && !isServer) {
      config.plugins.push(
        new WebpackObfuscator(
          {
            // Obfuscation options
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            debugProtection: false, // Set true để chống debug (nhưng có thể gây lỗi)
            debugProtectionInterval: 0,
            disableConsoleOutput: true, // Disable console.log trong production
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: true,
            renameGlobals: false,
            selfDefending: true, // Code tự bảo vệ, crash nếu bị format
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 2,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 4,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false
          },
          [
            // Exclude files (không obfuscate)
            'node_modules/**',
            'webpack/**'
          ]
        )
      );
    }

    return config;
  },
};

module.exports = nextConfig;
