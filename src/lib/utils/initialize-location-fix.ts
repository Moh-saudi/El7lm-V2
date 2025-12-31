import { initializeLocationFix } from './location-fix';

if (typeof window !== 'undefined') {
  initializeLocationFix();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocationFix);
  } else {
    initializeLocationFix();
  }

  window.addEventListener('load', initializeLocationFix);

  console.debug('🔧 Location fix initialized');
}

export default initializeLocationFix;
