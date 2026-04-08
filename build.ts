import { build } from 'bun';

const result = await build({
  entrypoints: ['./src/main.tsx'],
  outdir: './dist',
  naming: 'cli.js',
  target: 'bun',
  format: 'esm',
  minify: false,
  sourcemap: 'inline',
  external: [],
  // bun:bundle shim returns false for all features — disables internal Anthropic-only features
  alias: {
    'bun:bundle': './shims/bun-bundle.ts',
    '@ant/computer-use-mcp': './shims/ant/computer-use-mcp/index.ts',
    '@ant/claude-for-chrome-mcp': './shims/ant/claude-for-chrome-mcp/index.ts',
    '@ant/computer-use-swift': './shims/ant/computer-use-swift/index.ts',
    'src': './src',
  },
});

if (!result.success) {
  console.error('Build failed:');
  for (const msg of result.logs) {
    console.error(msg);
  }
  process.exit(1);
} else {
  console.log('Build succeeded:', result.outputs.map(o => o.path));
}
