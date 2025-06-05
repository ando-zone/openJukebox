module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "run dev",
      cwd: "/Users/dohyeonan/sideProjects/openJukebox/frontend",
    },
    {
      name: "backend",
      script: "/Users/dohyeonan/sideProjects/openJukebox/backend/venv/bin/python",
      args: "backend/main.py",
      cwd: "/Users/dohyeonan/sideProjects/openJukebox",
      env: {
        PYTHONPATH: "/Users/dohyeonan/sideProjects/openJukebox"
      }
    },
  ]
};
