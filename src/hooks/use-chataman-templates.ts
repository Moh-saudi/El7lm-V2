import { useState, useEffect } from 'react';
import { ChatAmanService, ChatAmanTemplate } from '@/lib/services/chataman-service';

// Global cache to avoid redundant fetches across pages
let templatesCache: ChatAmanTemplate[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useChatAmanTemplates = (autoLoad = true) => {
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>(templatesCache || []);
  const [loading, setLoading] = useState(autoLoad && !templatesCache);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async (force = false) => {
    // Check cache
    const now = Date.now();
    if (!force && templatesCache && (now - lastFetchTime < CACHE_DURATION)) {
      setTemplates(templatesCache);
      setLoading(false);
      return templatesCache;
    }

    setLoading(true);
    setError(null);
    try {
      const fetched = await ChatAmanService.getTemplates();
      templatesCache = fetched;
      lastFetchTime = now;
      setTemplates(fetched);
      return fetched;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad && (!templatesCache || Date.now() - lastFetchTime >= CACHE_DURATION)) {
      fetchTemplates();
    }
  }, [autoLoad]);

  const getVariableCount = (template: ChatAmanTemplate | null): number => {
    if (!template || !template.body) return 0;
    const matches = template.body.match(/\{\{(\d+)\}\}/g) || [];
    const numbers = matches.map(m => parseInt(m.replace(/\D/g, ''), 10));
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  };

  return {
    templates,
    loading,
    error,
    getVariableCount,
    reloadTemplates: () => fetchTemplates(true)
  };
};
