// Extends app.json. Local sideload builds that talk to a dev API over plain http:// (LAN IP)
// opt in with PP_ALLOW_HTTP=1; production/EAS builds keep Android's cleartext block (HTTPS only).
module.exports = ({ config }) => {
  if (process.env.PP_ALLOW_HTTP !== '1') return config;
  return {
    ...config,
    plugins: (config.plugins ?? []).map((plugin) =>
      plugin === 'expo-build-properties'
        ? ['expo-build-properties', { android: { usesCleartextTraffic: true } }]
        : plugin,
    ),
  };
};
