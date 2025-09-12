const nativeWindPreset = require("nativewind/preset");

module.exports = {
  presets: [nativeWindPreset], // Assign to a variable first
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
