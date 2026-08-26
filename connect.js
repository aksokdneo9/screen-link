(() => {
  const qr = document.querySelector('#qr');
  const state = document.querySelector('#state');
  let peer;
  let completed = false;
  let recoveryTimer;

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
        && url.port === '9090' && new URLSearchParams(url.hash.slice(1)).get('token')?.length >= 20;
    } catch (_) { return false; }
  };

  const fromBase64Url = value => Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)),
    char => char.charCodeAt(0)
  );

  const decryptTarget = async (message, pairingKey) => {
    if (message?.type !== 'screen-link-encrypted') return null;
    try {
      const key = await crypto.subtle.importKey('raw', fromBase64Url(pairingKey), 'AES-GCM', false, ['decrypt']);
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64Url(message.iv) },
        key,
        fromBase64Url(message.ciphertext)
      );
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch (_) { return null; }
  };

  const acceptTarget = async (encrypted, pairingKey) => {
    const message = await decryptTarget(encrypted, pairingKey);
    if (completed || message?.type !== 'screen-link' || !validTarget(message.url)) return false;
    completed = true;
    state.className = 'connected';
    const target = new URL(message.url);
    target.searchParams.set('return', location.href);
    location.assign(target.href);
    return true;
  };

  const pairingCredentials = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('screen-link-pairing') || 'null');
      if (saved?.viewerId && saved?.pairingKey && Date.now() - saved.createdAt < 30 * 60 * 1000) return saved;
    } catch (_) {}
    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const created = {
      viewerId: `screen-link-viewer-${Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')}`,
      pairingKey: btoa(String.fromCharCode(...keyBytes))
        .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''),
      createdAt: Date.now()
    };
    sessionStorage.setItem('screen-link-pairing', JSON.stringify(created));
    return created;
  };

  function start() {
    clearTimeout(recoveryTimer);
    try { peer?.destroy(); } catch (_) {}
    if (!window.Peer || !window.QRCode) {
      state.className = 'error';
      return;
    }
    state.className = 'connecting';
    const { viewerId, pairingKey } = pairingCredentials();
    peer = new Peer(viewerId);
    peer.on('open', id => {
      qr.replaceChildren();
      new QRCode(qr, {
        text: `screenlink://connect?peer=${encodeURIComponent(id)}&key=${encodeURIComponent(pairingKey)}`,
        width: 256,
        height: 256,
        colorDark: '#171a20',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      state.className = 'ready';
    });
    peer.on('connection', connection => {
      connection.on('open', () => connection.send({ type: 'viewer-ready' }));
      connection.on('data', async message => {
        const accepted = await acceptTarget(message, pairingKey);
        if (!completed && !accepted) state.className = 'error';
      });
      connection.on('error', () => { state.className = 'error'; });
    });
    const recover = (fresh = false) => {
      if (completed) return;
      state.className = 'connecting';
      clearTimeout(recoveryTimer);
      recoveryTimer = setTimeout(() => {
        try {
          if (fresh || peer?.destroyed) start();
          else if (peer?.disconnected) peer.reconnect();
        } catch (_) { start(); }
      }, 900);
    };
    peer.on('disconnected', () => recover(false));
    peer.on('close', () => recover(true));
    peer.on('error', error => {
      const fresh = ['unavailable-id', 'invalid-id', 'invalid-key'].includes(error?.type);
      recover(fresh);
    });
    window.ononline = () => recover(false);
    document.onvisibilitychange = () => {
      if (!document.hidden && peer?.disconnected) recover(false);
    };
  }

  start();
})();
