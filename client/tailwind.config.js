/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#f7f3ec',
        surface: '#ffffff',
        ink: '#241a17',
        muted: '#79695f',
        faint: '#a9998c',
        line: '#e6dcc9',
        lineSoft: '#f0e8d8',
        wash: '#f3ecdd',

        side: '#2b1114',
        sideSoft: '#3d191d',
        sideLine: 'rgba(255,255,255,0.09)',
        sideText: '#ecdfd8',
        sideMuted: '#b79b93',

        brand: '#7a2331',
        brandTint: '#f4dbdd',
        gold: '#a8791f',
        goldTint: '#f6ecd3',
        amber: '#b8862e',
        amberTint: '#f7ecd6',
        rose: '#c0475a',
        roseTint: '#f8dee2',
        blue: '#3a6a94',
        blueTint: '#dfe8ef',
        violet: '#71578f',
        violetTint: '#e9e2f0',
        teal: '#3c7d68',
        tealTint: '#dcece5',
        green: '#3f7a3a',
        greenTint: '#e1ecdd',
      },
    },
  },
  plugins: [],
};
