/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@scalar/express-api-reference$': '<rootDir>/tests/__mocks__/scalarExpressApiReference.js',
    '^firebase-admin/app$': '<rootDir>/tests/__mocks__/firebaseAdminApp.js',
    '^firebase-admin/auth$': '<rootDir>/tests/__mocks__/firebaseAdminAuth.js',
  },
};
