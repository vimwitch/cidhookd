require('events').defaultMaxListeners = 20;

const fs = require('fs');
const express = require('express');
const app = express();

const ipfsClient = require('ipfs-http-client');
const goIPFS = ipfsClient('localhost', '5001', { protocol: 'http' });
const jsIPFS = ipfsClient('localhost', '5002', { protocol: 'http' });

const { CIDHOOK_SECRET_PATH } = process.env;
if (CIDHOOK_SECRET_PATH && !fs.existsSync(CIDHOOK_SECRET_PATH)) {
  console.log(`Invalid CIDHOOK_SECRET_PATH supplied: ${CIDHOOK_SECRET_PATH}`);
  process.exit(1);
}
if (CIDHOOK_SECRET_PATH && !process.env.CIDHOOK_SECRET) {
  const secret = fs.readFileSync(CIDHOOK_SECRET_PATH, 'utf8');
  process.env.CIDHOOK_SECRET = secret.trim();
}
const { CIDHOOK_SECRET } = process.env;

app.use((req, res, next) => {
  if (!CIDHOOK_SECRET) return next();
  const auth = req.get('Authorization');
  if (auth !== CIDHOOK_SECRET) {
    res.statusCode = 401;
    next(new Error(`Invalid Authorization supplied: ${auth}`));
  } else {
    next();
  }
});

app.post('/:cid', async (req, res) => {
  try {
    console.log(`Pinning cid ${req.params.cid}`);
    await jsIPFS.pin.add(req.params.cid);
    await goIPFS.pin.add(req.params.cid);
    res.status(204).end();
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

app.delete('/:cid', async (req, res) => {
  try {
    console.log(`Unpinning cid ${req.params.cid}`);
    await jsIPFS.pin.rm(req.params.cid);
    await goIPFS.pin.rm(req.params.cid);
  } catch (_) {
  } finally {
    res.status(204).end();
  }
});

app
  .listen(3000, () => console.log(`cidhookd listening on port 3000!`))
  .setTimeout(1800 * 1000);
