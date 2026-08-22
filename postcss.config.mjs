/**
 * Defining this file disables Next's default PostCSS pipeline entirely
 * (including autoprefixer). Turbopack's Lightning CSS applies the browser
 * targets from the `browserslist` key in package.json instead.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
