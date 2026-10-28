const https = require('https');
const fs = require('fs');
const path = require('path');

const sounds = [
  {
    name: 'rain.mp3',
    url: 'https://archive.org/download/GOLD_TAPE_46_Thunderstorm_Rain/G46-01-Light%20Rain%20and%20Natural%20Thunder.mp3',
  },
  {
    name: 'waves.mp3',
    url: 'https://archive.org/download/SSE_Library_WATER/SURF%2FWATRSurf_Surf%3B%20medium%20distance%3B%20loopable_CS_USC.mp3',
  },
  {
    name: 'brown_noise.mp3',
    url: 'https://archive.org/download/WhiteNoise_41/Simplynoise.com-BrownNoise.mp3',
  },
  {
    name: 'white_noise.mp3',
    url: 'https://archive.org/download/GOLD_TAPE_39_Miscellaneous/G39-28-13%20White%20Noise%20Effects.mp3',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Segue redirects (status 301, 302, 303, 307)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', reject);
  });
}

async function run() {
  const targetDir = path.join(__dirname, '..', 'assets', 'sounds');
  for (const s of sounds) {
    const dest = path.join(targetDir, s.name);
    console.log(`Baixando ${s.name} de ${s.url}...`);
    await download(s.url, dest);
    const stat = fs.statSync(dest);
    console.log(`-> Salvo: ${s.name} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

run().catch(console.error);
