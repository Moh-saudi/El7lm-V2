import fs from 'fs';
import path from 'path';

import { DEFAULT_CLIENTS, StoredTournamentClient } from './tournament-clients-constants';

export type { StoredTournamentClient };
export { DEFAULT_CLIENTS };


const STORE_PATH = path.join(process.cwd(), '.next', 'dev_tournament_clients.json');

let memoryStore: StoredTournamentClient[] | null = null;

function loadFromFile(): StoredTournamentClient[] {
    try {
        if (fs.existsSync(STORE_PATH)) {
            const content = fs.readFileSync(STORE_PATH, 'utf-8');
            const data = JSON.parse(content);
            if (Array.isArray(data) && data.length > 0) {
                // Ensure default clients exist with passwords
                const map = new Map<string, StoredTournamentClient>();
                for (const d of DEFAULT_CLIENTS) map.set(d.email.toLowerCase(), d);
                for (const item of data) {
                    const existing = map.get(item.email?.toLowerCase());
                    if (existing) {
                        map.set(item.email.toLowerCase(), { ...existing, ...item });
                    } else {
                        map.set(item.email.toLowerCase(), item);
                    }
                }
                return Array.from(map.values());
            }
        }
    } catch {}
    return [...DEFAULT_CLIENTS];
}

function saveToFile(data: StoredTournamentClient[]) {
    try {
        const dir = path.dirname(STORE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
}

export function getLocalTournamentClients(): StoredTournamentClient[] {
    if (!memoryStore) {
        memoryStore = loadFromFile();
    }
    return [...memoryStore];
}

export function addLocalTournamentClient(client: StoredTournamentClient): StoredTournamentClient {
    const list = getLocalTournamentClients();
    const updated = [client, ...list.filter(c => c.id !== client.id && c.email.toLowerCase() !== client.email.toLowerCase())];
    memoryStore = updated;
    saveToFile(updated);
    return client;
}

export function toggleLocalTournamentClient(id: string, is_active: boolean): boolean {
    const list = getLocalTournamentClients();
    const updated = list.map(c => c.id === id ? { ...c, is_active } : c);
    memoryStore = updated;
    saveToFile(updated);
    return true;
}

export function deleteLocalTournamentClient(id: string): boolean {
    const list = getLocalTournamentClients();
    const updated = list.filter(c => c.id !== id);
    memoryStore = updated;
    saveToFile(updated);
    return true;
}
