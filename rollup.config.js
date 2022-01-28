import pkg from './package.json'
import babel from '@rollup/plugin-babel'

const banner = `/*! ${pkg.name} ${pkg.version} https://github.com/${pkg.repository} @license ${pkg.license} */`

const plugins = [
  babel({
    babelHelpers: 'bundled',
    presets: [
      [
        '@babel/preset-env',
        {
          // corejs: 3,
          // useBuiltIns: 'usage',
          targets: {
            ie: '11' // easy way to force es5
            // firefox: '52' // last supported in WinXP
          }
        }
      ]
    ],
    plugins: [
      // 'babel-plugin-transform-async-to-promises'
    ]
  })
]

export default [
  {
    input: 'src/index.mjs',
    output: { format: 'umd', name: 'BKV', file: 'dist/bkv.js', banner },
    plugins
  },
  {
    input: 'src/index.mjs',
    output: { format: 'esm', file: 'dist/bkv.mjs', banner },
    plugins
  }
]
