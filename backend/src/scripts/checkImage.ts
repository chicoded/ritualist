async function checkImage() {
  const url = 'http://localhost:5000/uploads/siggy/photo_17_2026-01-01_22-15-17.jpg';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`Status for ${url}: ${res.status}`);
  } catch (e) {
    console.error('Error fetching image:', e);
  }
}
checkImage();
