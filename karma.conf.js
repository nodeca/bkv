if (!process.env.GITHUB_ACTIONS) {
  process.env.CHROME_BIN = 'chromium'
}


module.exports = function (config) {
  config.set({
    frameworks: ['mocha', 'chai'],

    // list of files / patterns to load in the browser
    files: [
      'dist/bkv.js',
      'test/**/*.js'
    ],

    preprocessors: {
      'dist/bkv.js': 'coverage'
    },

    reporters: ['progress', 'coverage'],

    coverageReporter: {
      type: 'html',
      dir: 'coverage/'
    },

    autoWatch: true,

    browsers: ['ChromeHeadless']
  })
}
