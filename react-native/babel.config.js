module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      '@tamagui/babel-plugin',
      {
        config: '../shared/src/tamagui.config.js',
        components: ['tamagui'],
        logTimings: true,
      },
    ],
  ],
};
