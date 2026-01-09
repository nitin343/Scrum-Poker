import { useCallback, useState, useEffect, useRef } from 'react';

export const useLocalStorage = (key: string, initialValue?: any) => {
    const getStoredValue = useCallback(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading from localStorage: ${key}`, error);
            return initialValue;
        }
    }, [key, initialValue]);

    const setValue = useCallback((value: any) => {
        try {
            const valueToStore = value instanceof Function ? value(getStoredValue()) : value;
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error writing to localStorage: ${key}`, error);
        }
    }, [key, getStoredValue]);

    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from localStorage: ${key}`, error);
        }
    }, [key]);

    return [getStoredValue(), setValue, removeValue] as const;
};

export const useAsync = (asyncFunction: () => Promise<any>, immediate = true) => {
    const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<Error | null>(null);

    const execute = useCallback(async () => {
        setStatus('pending');
        setData(null);
        setError(null);

        try {
            const response = await asyncFunction();
            setData(response);
            setStatus('success');
            return response;
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setStatus('error');
        }
    }, [asyncFunction]);

    useEffect(() => {
        if (immediate) execute();
    }, [execute, immediate]);

    return { execute, status, data, error };
};

export const useDebounce = (value: any, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

export const useThrottle = (value: any, interval: number) => {
    const [throttledValue, setThrottledValue] = useState(value);
    const lastUpdated = useRef<number | null>(null);

    useEffect(() => {
        const now = Date.now();
        if (lastUpdated.current === null || now >= (lastUpdated.current + interval)) {
            lastUpdated.current = now;
            setThrottledValue(value);
        }
    }, [value, interval]);

    return throttledValue;
};
