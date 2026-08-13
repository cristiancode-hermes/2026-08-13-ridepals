const path = require('path');
const fs = require('fs');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');

// Build script: compiles Tailwind v4 CSS from source into the file Angular consumes.
// Usage: node scripts/build-css.cjs <output-path>
const out = process.argv[2] || 'src/styles.css';
const src = out.replace(/\.css$/, '.source.css');
const SRC = path.resolve(__dirname, '..', src);
const OUT = path.resolve(__dirname, '..', out);

async function main() {
  const css = fs.readFileSync(SRC, 'utf8');
  const result = await postcss([tailwindcss()]).process(css, { from: SRC });
  fs.writeFileSync(OUT, result.css);
  console.log(`✅ CSS compiled: ${src} → ${out} (${result.css.length} bytes)`);
}

main().catch((err) => {
  console.error('❌ CSS build failed:', err);
  process.exit(1);
});
