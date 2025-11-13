let subscribers = [];

export function initRouter() {
  if (!location.hash) location.hash = '#/page-1';
  window.addEventListener('hashchange', () => {
    const route = getRoute();
    subscribers.forEach((fn) => fn(route));
  });
}

export function getRoute() {
  const hash = location.hash.replace('#/', '') || 'page-1';
  return hash;
}

export function onRouteChange(cb) {
  subscribers.push(cb);
}
