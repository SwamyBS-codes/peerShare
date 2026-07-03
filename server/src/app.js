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

  // Catch-all route to fallback to index.html for SPA router support
  app.get(/.*/, (req, res) => {
    if (req.path === '/' || req.path.startsWith('/session')) {
      res.status(404).json({ ok: false, message: 'Not found' });
      return;
    }

    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

module.exports = app;
