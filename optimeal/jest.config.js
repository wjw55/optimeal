module.exports = {
  rootDir: ".",                 // stay here
  testEnvironment: "node",
  setupFiles: ["./jest.setup.js"],
  transform: {
    "^.+\\.(js|jsx|mjs|cjs|ts|tsx)$": ["babel-jest", { presets: ["react-app"] }]
  }
};
