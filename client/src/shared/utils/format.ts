export const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString();
};

export const truncateString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

export const calculateAverage = (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
};

export const calculateAgreement = (votes: number[]): number => {
    if (votes.length === 0) return 0;
    const uniqueVotes = new Set(votes).size;
    return (1 - (uniqueVotes - 1) / (votes.length - 1 || 1)) * 100;
};

export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};
