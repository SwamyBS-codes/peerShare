const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());

// Load application routers
app.use(routes);

// Serve static assets bundled from Vite in production environment
const clientDistDir = path.resolve(__dirname, '../../client/dist');
const hasClientDist = fs.existsSync(clientDistDir);

if (hasClientDist) {
  app.use(express.static(clientDistDir));

  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ ok: false, message: 'API Route Not Found' });
      return;
    }

    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

module.exports = app;
