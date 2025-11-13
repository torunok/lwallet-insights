export async function preloadImages(urls = []) {
  await Promise.all(urls.map(src => new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = img.onerror = () => res();
    img.src = src;
  })));
}

export function safeAvatar(src, alt = '') {
  const s = src ? String(src) : '';
  const escAlt = String(alt).replaceAll('"','&quot;');
  return `<span class="avatar">${s ? `<img src="${s}" alt="${escAlt}" crossorigin="anonymous">` : ''}</span>`;
}
