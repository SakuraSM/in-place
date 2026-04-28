const appJson = require('./app.json');

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  extra: {
    ...config.extra,
    ...appJson.expo.extra,
    eas: process.env.EXPO_PROJECT_ID
      ? {
          projectId: process.env.EXPO_PROJECT_ID,
        }
      : appJson.expo.extra?.eas,
  },
});
