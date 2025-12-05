const WebpackObfuscator = require('webpack-obfuscator');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Chỉ obfuscate khi build production và client-side
    if (!dev && !isServer) {
      config.plugins.push(
        new WebpackObfuscator(
          {
            // Obfuscation options - Safer settings for Next.js
            compact: true,
            controlFlowFlattening: false, // Tắt để tránh lỗi với getter/setter
            controlFlowFlatteningThreshold: 0,
            deadCodeInjection: false, // Tắt để tránh lỗi runtime
            deadCodeInjectionThreshold: 0,
            debugProtection: false,
            debugProtectionInterval: 0,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            log: false,
            numbersToExpressions: false, // Tắt để tránh lỗi
            renameGlobals: false,
            selfDefending: false, // Tắt để tránh crash
            simplify: true,
            splitStrings: true,
            splitStringsChunkLength: 10,
            stringArray: true,
            stringArrayCallsTransform: false, // Tắt để tránh lỗi
            stringArrayEncoding: ['base64'],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: false,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 0.5,
            transformObjectKeys: false, // QUAN TRỌNG: Tắt để tránh lỗi getter/setter
            unicodeEscapeSequence: false
          },
          [
            // Exclude files (không obfuscate)
            'node_modules/**',
            'webpack/**',
            '**/turbopack*.js',
            '**/webpack-runtime*.js',
            '**/polyfill*.js',
            '**/framework*.js',
            '**/main-app*.js'
          ]
        )
      );
    }

    return config;
  },
};

module.exports = nextConfig;
