(() => {
  const qr = document.querySelector('#qr');
  const state = document.querySelector('#state');
  let peer;
  let completed = false;
  let recoveryTimer;

  const messages = {
    connecting: 'Verbindung wird aufgebaut …',
    ready: 'Code mit dem Handy scannen',
    handshake: 'Handy gefunden – Adresse wird geprüft …',
    opening: 'Bildschirm wird geöffnet …',
    retry: 'Diese Adresse hat nicht geantwortet – nächste wird versucht.',
    error: 'Keine Verbindung. Es wird weiter versucht …'
  };
  const show = (name, message) => {
    state.className = name;
    state.textContent = message ?? messages[name] ?? '';
  };

  const validHost = hostname => {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname.split('.').every(part => Number(part) <= 255);
    }
    if (hostname.startsWith('[') && hostname.endsWith(']')) return /^[0-9a-f:]+$/.test(hostname.slice(1, -1));
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
      return url.protocol === 'http:' && validHost(url.hostname)
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

  const { viewerId, pairingKey } = pairingCredentials();

  // Addresses that were opened but never came back. A phone can be reachable on
  // several of its addresses and unreachable on the rest, and only the browser
  // finds out which, so every dead end is remembered and reported to the phone.
  const failedKey = `screen-link-failed-${viewerId}`;
  const failed = (() => {
    try { return new Set(JSON.parse(sessionStorage.getItem(failedKey) || '[]')); } catch (_) { return new Set(); }
  })();
  const rememberFailure = url => {
    failed.add(url);
    try { sessionStorage.setItem(failedKey, JSON.stringify([...failed].slice(-12))); } catch (_) {}
  };

  // A target that opened successfully keeps the page alive for as long as the
  // session lasts. Coming straight back means the address never answered.
  const pendingKey = 'screen-link-pending';
  const returned = (() => {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch (_) {}
    try { sessionStorage.removeItem(pendingKey); } catch (_) {}
    const worked = location.hash === '#ok';
    if (worked) history.replaceState(null, '', location.pathname + location.search);
    if (!pending?.url) return false;
    if (worked) {
      failed.delete(pending.url);
      try { sessionStorage.setItem(failedKey, JSON.stringify([...failed])); } catch (_) {}
      return false;
    }
    if (Date.now() - pending.at > 30_000) return false;
    rememberFailure(pending.url);
    return true;
  })();

  const acceptTarget = async (encrypted) => {
    const message = await decryptTarget(encrypted, pairingKey);
    if (completed || message?.type !== 'screen-link') return false;
    const offered = (Array.isArray(message.urls) ? message.urls : [message.url]).filter(validTarget);
    if (!offered.length) return false;
    if (offered.every(url => failed.has(url))) {
      offered.forEach(url => failed.delete(url));
      try { sessionStorage.setItem(failedKey, JSON.stringify([...failed])); } catch (_) {}
    }
    const target = offered.find(url => !failed.has(url)) || offered[0];
    completed = true;
    show('opening');
    const destination = new URL(target);
    destination.searchParams.set('return', location.href);
    try { sessionStorage.setItem(pendingKey, JSON.stringify({ url: target, at: Date.now() })); } catch (_) {}
    location.assign(destination.href);
    return true;
  };

  function start() {
    clearTimeout(recoveryTimer);
    try { peer?.destroy(); } catch (_) {}
    if (!window.Peer || !window.QRCode) {
      show('error', 'Diese Seite konnte nicht vollständig geladen werden.');
      return;
    }
    show(returned ? 'retry' : 'connecting', returned ? messages.retry : undefined);
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
      if (!returned) show('ready');
    });
    peer.on('connection', connection => {
      connection.on('open', () => {
        show('handshake');
        connection.send({ type: 'viewer-ready', failed: [...failed] });
      });
      connection.on('data', async message => {
        const accepted = await acceptTarget(message);
        if (!completed && !accepted) show('error');
      });
      connection.on('error', () => { if (!completed) show('error'); });
    });
    const recover = (fresh = false) => {
      if (completed) return;
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
