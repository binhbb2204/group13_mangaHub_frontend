const CACHE_KEY = 'backend_discovery';
const CACHE_TTL = 600000;
const DISCOVERY_TIMEOUT = 1000;
const LAN_SCAN_TIMEOUT = 500;

async function tryDiscovery(baseUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT);

    try {
        const response = await fetch(`${baseUrl}/announce`, {
            signal: controller.signal,
            method: 'GET',
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        clearTimeout(timeoutId);
    }
    return null;
}

async function scanLAN() {
    const subnets = ['192.168.100', '192.168.1', '192.168.0', '10.0.0'];

    for (const subnet of subnets) {
        const promises = [];
        for (let i = 1; i <= 254; i++) {
            const ip = `${subnet}.${i}`;
            promises.push(tryDiscoveryQuick(`http://${ip}:8080`));
        }

        const results = await Promise.race([
            Promise.all(promises),
            new Promise(resolve => setTimeout(() => resolve([]), 5000))
        ]);

        const found = results.find(r => r !== null);
        if (found) return found;
    }

    return null;
}

async function tryDiscoveryQuick(baseUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LAN_SCAN_TIMEOUT);

    try {
        const response = await fetch(`${baseUrl}/announce`, {
            signal: controller.signal,
            method: 'GET',
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch {
        clearTimeout(timeoutId);
    }
    return null;
}

function getSubnet() {
    const ip = window.location.hostname;
    if (ip === 'localhost' || ip === '127.0.0.1') {
        return '192.168.1';
    }
    const parts = ip.split('.');
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return '192.168.1';
}

export function getLastKnownBackend() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

export function setLastKnownBackend(discoveryData) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: discoveryData,
            timestamp: Date.now(),
        }));
    } catch { }
}

export function clearBackendCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch { }
}

export async function discoverBackend() {
    const cached = getLastKnownBackend();
    if (cached && cached.services && cached.services.api) {
        const verified = await tryDiscovery(cached.services.api);
        if (verified) {
            return cached;
        }
        clearBackendCache();
    }

    const localhostResult = await tryDiscovery('http://localhost:8080');
    if (localhostResult) {
        setLastKnownBackend(localhostResult);
        return localhostResult;
    }

    const lanResult = await scanLAN();
    if (lanResult) {
        setLastKnownBackend(lanResult);
        return lanResult;
    }

    return null;
}
