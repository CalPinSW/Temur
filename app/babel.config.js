module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/hooks': './src/hooks',
            '@/services': './src/services',
            '@/store': './src/store',
            '@/types': './src/types',
            '@/utils': './src/utils',
          },
        },
      ],
    ],
  };
};
