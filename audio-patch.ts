let isMuted = false;
if (typeof window !== 'undefined') {
  isMuted = localStorage.getItem('fantasia_muted') === 'true';
  window.addEventListener('storage', (e) => {
    if (e.key === 'fantasia_muted') {
      isMuted = e.newValue === 'true';
    }
  });
}
