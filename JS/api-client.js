const GBAI_API_BASE = 'https://gbai-rai-backend-x.vercel.app/api';
const GBAI_CACHE_PREFIX = 'gbai-rai-cache:';
const GBAI_CACHE_TTL = 30000;
const gbaiPendingRequests = new Map();

function gbaiReadCache(path) {
    try {
        const cached = JSON.parse(sessionStorage.getItem(`${GBAI_CACHE_PREFIX}${path}`));
        if (cached && Date.now() - cached.savedAt < GBAI_CACHE_TTL) return cached.data;
    } catch (error) {
        console.warn('Cache API indisponible:', error);
    }
    return null;
}

function gbaiWriteCache(path, data) {
    try {
        sessionStorage.setItem(`${GBAI_CACHE_PREFIX}${path}`, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (error) {
        console.warn('Impossible de mettre en cache la réponse:', error);
    }
}

function gbaiAuthHeaders() {
    const token = localStorage.getItem('gbai_admin_session_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function gbaiRequest(path, options = {}, cache = true) {
    const url = `${GBAI_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    const method = (options.method || 'GET').toUpperCase();
    const baseHeaders = {
        ...(options.headers || {}),
        ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        ...gbaiAuthHeaders(),
    };
    const requestOptions = { ...options, headers: baseHeaders };

    if (method === 'GET' && cache) {
        const cached = gbaiReadCache(path);
        if (cached !== null) {
            void gbaiRequest(path, { ...requestOptions, headers: { ...baseHeaders, 'Cache-Control': 'no-cache' } }, false);
            return cached;
        }
        if (gbaiPendingRequests.has(path)) return gbaiPendingRequests.get(path);
    }

    const request = fetch(url, requestOptions).then(async response => {
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = text ? JSON.parse(text) : null;
        if (method === 'GET' && cache) gbaiWriteCache(path, data);
        return data;
    }).finally(() => gbaiPendingRequests.delete(path));

    if (method === 'GET' && cache) gbaiPendingRequests.set(path, request);
    return request;
}

function gbaiPrefetch(paths) {
    return Promise.allSettled(paths.map(path => gbaiRequest(path)));
}

function gbaiInvalidateCache(...paths) {
    paths.forEach(path => {
        try { sessionStorage.removeItem(`${GBAI_CACHE_PREFIX}${path}`); } catch (error) { /* stockage facultatif */ }
    });
}

function gbaiStartPolling(load, interval = 15000) {
    let running = false;
    const refresh = async () => {
        if (running || document.hidden) return;
        running = true;
        try { await load(true); } finally { running = false; }
    };
    const timer = window.setInterval(refresh, interval);
    document.addEventListener('visibilitychange', refresh);
    return () => {
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', refresh);
    };
}
