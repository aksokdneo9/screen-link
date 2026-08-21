(() => {
  const qr = document.querySelector('#qr');
  const state = document.querySelector('#state');
  let peer;

  const validTarget = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' && /^(?:\d{1,3}-){3}\d{1,3}\.sslip\.io$/.test(url.hostname)
        && url.port === '9090' && url.searchParams.get('token')?.length >= 20;
    } catch (_) { return false; }
  };

  function start() {
    if (!window.Peer || !window.QRCode) {
      state.className = 'error';
      return;
    }
    state.className = 'connecting';
    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    const viewerId = `screen-link-viewer-${Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')}`;
    peer = new Peer(viewerId);
    peer.on('open', id => {
      qr.replaceChildren();
      new QRCode(qr, {
        text: `screenlink://connect?peer=${encodeURIComponent(id)}`,
        width: 256,
        height: 256,
        colorDark: '#171a20',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      state.className = 'ready';
    });
    peer.on('connection', connection => {
      connection.on('data', message => {
        if (message?.type === 'screen-link' && validTarget(message.url)) {
          state.className = 'connected';
          const target = new URL(message.url);
          target.searchParams.set('return', location.href);
          location.assign(target.href);
        } else {
          state.className = 'error';
        }
      });
      connection.on('error', () => { state.className = 'error'; });
    });
    peer.on('error', () => { state.className = 'error'; });
  }

  start();
})();
