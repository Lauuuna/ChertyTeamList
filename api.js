const API_BASE = 'https://cherti-list.launa-fic.workers.dev/api';

class API {
    constructor() {
        this.cache = new Map();
    }

    async fetchWithCache(endpoint) {
        if (this.cache.has(endpoint)) {
            return this.cache.get(endpoint);
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                this.cache.set(endpoint, data.data);
                return data.data;
            }
            
            throw new Error(data.error || 'API request failed');
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    async getLeaderboard() {
        try {
            const response = await fetch(`${API_BASE}/leaderboard`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            return null;
        }
    }

    async getLevel(levelId) {
        return this.fetchWithCache(`/levels/${levelId}`);
    }

    async getLevelsBatch(levelIds) {
        try {
            const promises = levelIds.map(id => this.getLevel(id));
            const results = await Promise.allSettled(promises);
            
            const levels = [];
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                if (result.status === 'fulfilled') {
                    levels.push({
                        id: levelIds[i],
                        data: result.value
                    });
                } else {
                    console.warn(`Failed to load level ${levelIds[i]}:`, result.reason);
                }
            }
            
            return levels;
        } catch (error) {
            console.error('Failed to load levels batch:', error);
            return [];
        }
    }
}

const api = new API();