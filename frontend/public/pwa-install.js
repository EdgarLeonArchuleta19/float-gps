window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault();
  window.__floaInstallPrompt = event;
  window.dispatchEvent(new Event('floa:installprompt'));
});
window.addEventListener('appinstalled', function () {
  window.__floaInstallPrompt = null;
});
