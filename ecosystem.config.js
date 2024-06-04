module.exports = {
    apps: [
      {
        name: "webapi",
        script: "dist/app.js",
        instances: "max",
        exec_mode: "cluster",
        env: {
          NODE_ENV: "production",
        },
      },
    ],
  };
  