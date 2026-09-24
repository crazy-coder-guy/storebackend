module.exports = {
  getAuth: () => ({
    verifyIdToken: () => {
      throw new Error('Firebase Auth is mocked out in tests');
    },
  }),
};
