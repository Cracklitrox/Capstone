module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text", "cobertura"],
  verbose: true,
};