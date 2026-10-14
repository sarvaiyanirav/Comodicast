import express from 'express';
import path from 'path';
import { handleApiRequest } from './server/apiHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// API routes dispatcher
app.use('/api', (req, res, next) => {
  handleApiRequest(req, res).then(handled => {
    if (!handled) next();
  }).catch(next);
});

// Serve static frontend files
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CommodiCast server listening on port ${PORT}`);
});
