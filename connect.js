(() => {
  const qr = document.querySelector('#qr');
  const state = document.querySelector('#state');
  let peer;
  let completed = false;

  const validSslipHost = hostname => {
    if (/^(?:\d{1,3}-){3}\d{1,3}\.sslip\.io$/.test(hostname)) return true;
    if (!hostname.endsWith('.sslip.io')) return false;
    const embedded = hostname.slice(0, -'.sslip.io'.length);
    if (!/^[0-9a-f-]+$/.test(embedded)) return false;
    try {
      const parsed = new URL(`http://[${embedded.replaceAll('-', ':')}]`);
      return parsed.hostname.startsWith('[') && parsed.hostname.endsWith(']');
    } catch (_) {
      return false;
    }
  };

  const validTarget = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' && validSslipHost(url.hostname)
        && url.port === '9090' && url.searchParams.get('token')?.length >= 20;
    } catch (_) { return false; }
  };

  const acceptTarget = message => {
    if (completed || message?.type !== 'screen-link' || !validTarget(message.url)) return false;
    completed = true;
    state.className = 'connected';
    const target = new URL(message.url);
    target.searchParams.set('return', location.href);
    location.assign(target.href);
    return true;
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
      // Metadata arrives with the PeerJS signaling offer, before WebRTC/ICE completes.
      if (acceptTarget(connection.metadata)) return;
      connection.on('data', message => {
        if (!acceptTarget(message)) state.className = 'error';
      });
      connection.on('error', () => { state.className = 'error'; });
    });
    peer.on('error', () => { state.className = 'error'; });
  }

  start();
})();
