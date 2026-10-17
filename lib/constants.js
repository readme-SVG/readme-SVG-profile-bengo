const W = 495;
const H = 195;

const LC = {
  JavaScript:'#f7df1e',TypeScript:'#3178c6',Python:'#3572A5',Go:'#00add8',
  Rust:'#dea584',C:'#555555','C++':'#f34b7d',Ruby:'#701516',Java:'#b07219',
  PHP:'#4F5D95',Swift:'#f05138',Kotlin:'#A97BFF',Shell:'#89e051',
  HTML:'#e34c26',CSS:'#563d7c',Vue:'#41b883',Svelte:'#ff3e00',Dart:'#00b4ab',
  Scala:'#c22d40',Elixir:'#6e4a7e',Haskell:'#5e5086',Lua:'#000080',R:'#198CE7',
  Nix:'#7e7eff',Dockerfile:'#384d54',
  'C#':'#178600','F#':'#b845fc','Objective-C':'#438eff','Jupyter Notebook':'#DA5B0B',
  PowerShell:'#012456',SCSS:'#c6538c',Sass:'#a53b70',Less:'#1d365d',Zig:'#ec915c',
  Clojure:'#db5855',Perl:'#0298c3','Vim Script':'#199f4b',TeX:'#3D6117',
  Makefile:'#427819',CMake:'#DA3434',Julia:'#a270ba',MATLAB:'#e16737',
  Assembly:'#6E4C13',Elm:'#60B5CC',Erlang:'#B83998',OCaml:'#ef7a08',
  Groovy:'#4298b8',HCL:'#844FBA',Solidity:'#AA6746',Astro:'#ff5a03',MDX:'#fcb32c',
  CoffeeScript:'#244776',Nim:'#ffc200',GDScript:'#355570',Batchfile:'#C1F12E',
  'Visual Basic .NET':'#945db7',Fortran:'#4d41b1',Haxe:'#df7900',V:'#4f87c4',
  Gleam:'#ffaff3',Racket:'#3c5caa',Scheme:'#1e4aec','Emacs Lisp':'#c065db',
  'Common Lisp':'#3fb68b',Handlebars:'#f7931e',Pug:'#a86454',WebAssembly:'#04133b',
  Cuda:'#3A4E3A',GLSL:'#5686a5',HLSL:'#aace60',ShaderLab:'#222c37',
  AutoHotkey:'#6594b9',Apex:'#1797c0',Blade:'#f7523f',Twig:'#c1d026',
  Prolog:'#74283c',Pascal:'#E3F171',Mojo:'#ff4c1f',Odin:'#60AFFE',
};

// `bg: null` keeps the card transparent so it blends into the README page.
const THEMES = {
  dark: {
    scheme:'dark', bg:null,
    text:'#e6edf3', sec:'#8b949e', mut:'#6e7681',
    border:'#30363d', card:'rgba(22,27,34,0.85)',
    blue:'#58a6ff', green:'#3fb950', yellow:'#d29922',
    orange:'#db6d28', red:'#f85149', purple:'#bc8cff', pink:'#ff7b72',
  },
  light: {
    scheme:'light', bg:null,
    text:'#1f2328', sec:'#59636e', mut:'#818b98',
    border:'#d1d9e0', card:'rgba(246,248,250,0.85)',
    blue:'#0969da', green:'#1a7f37', yellow:'#9a6700',
    orange:'#bc4c00', red:'#d1242f', purple:'#8250df', pink:'#bf3989',
  },
  github_dark: {
    scheme:'dark', bg:'#0d1117',
    text:'#e6edf3', sec:'#8b949e', mut:'#6e7681',
    border:'#30363d', card:'#161b22',
    blue:'#58a6ff', green:'#3fb950', yellow:'#d29922',
    orange:'#db6d28', red:'#f85149', purple:'#bc8cff', pink:'#ff7b72',
  },
  github_light: {
    scheme:'light', bg:'#ffffff',
    text:'#1f2328', sec:'#59636e', mut:'#818b98',
    border:'#d1d9e0', card:'#f6f8fa',
    blue:'#0969da', green:'#1a7f37', yellow:'#9a6700',
    orange:'#bc4c00', red:'#d1242f', purple:'#8250df', pink:'#bf3989',
  },
  dracula: {
    scheme:'dark', bg:'#282a36',
    text:'#f8f8f2', sec:'#c0c4d8', mut:'#7b88b8',
    border:'#44475a', card:'#313343',
    blue:'#8be9fd', green:'#50fa7b', yellow:'#f1fa8c',
    orange:'#ffb86c', red:'#ff5555', purple:'#bd93f9', pink:'#ff79c6',
  },
  nord: {
    scheme:'dark', bg:'#2e3440',
    text:'#eceff4', sec:'#d8dee9', mut:'#8f9bb3',
    border:'#4c566a', card:'#3b4252',
    blue:'#88c0d0', green:'#a3be8c', yellow:'#ebcb8b',
    orange:'#d08770', red:'#bf616a', purple:'#b48ead', pink:'#d6a4c8',
  },
  tokyonight: {
    scheme:'dark', bg:'#1a1b26',
    text:'#c0caf5', sec:'#a9b1d6', mut:'#646c99',
    border:'#2f3549', card:'#24283b',
    blue:'#7aa2f7', green:'#9ece6a', yellow:'#e0af68',
    orange:'#ff9e64', red:'#f7768e', purple:'#bb9af7', pink:'#ff7eb6',
  },
  gruvbox: {
    scheme:'dark', bg:'#282828',
    text:'#ebdbb2', sec:'#bdae93', mut:'#928374',
    border:'#504945', card:'#32302f',
    blue:'#83a598', green:'#b8bb26', yellow:'#fabd2f',
    orange:'#fe8019', red:'#fb4934', purple:'#d3869b', pink:'#e396b0',
  },
  onedark: {
    scheme:'dark', bg:'#282c34',
    text:'#dcdfe4', sec:'#9da5b4', mut:'#6b7383',
    border:'#3e4451', card:'#2f343f',
    blue:'#61afef', green:'#98c379', yellow:'#e5c07b',
    orange:'#d19a66', red:'#e06c75', purple:'#c678dd', pink:'#f290b8',
  },
  catppuccin: {
    scheme:'dark', bg:'#1e1e2e',
    text:'#cdd6f4', sec:'#bac2de', mut:'#7f849c',
    border:'#45475a', card:'#29293c',
    blue:'#89b4fa', green:'#a6e3a1', yellow:'#f9e2af',
    orange:'#fab387', red:'#f38ba8', purple:'#cba6f7', pink:'#f5c2e7',
  },
  solarized_light: {
    scheme:'light', bg:'#fdf6e3',
    text:'#073642', sec:'#586e75', mut:'#839496',
    border:'#d9cfb3', card:'#f3ecd7',
    blue:'#268bd2', green:'#859900', yellow:'#b58900',
    orange:'#cb4b16', red:'#dc322f', purple:'#6c71c4', pink:'#d33682',
  },
};

const DEFAULT_THEME = 'dark';

// kept for modules that still want the default palette directly
const GH = THEMES[DEFAULT_THEME];

function getTheme(name) {
  const key = String(name || '').trim().toLowerCase().replace(/-/g, '_');
  return Object.prototype.hasOwnProperty.call(THEMES, key) ? THEMES[key] : THEMES[DEFAULT_THEME];
}

module.exports = { W, H, LC, GH, THEMES, DEFAULT_THEME, getTheme };
