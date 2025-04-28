export function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return "0";
    return num.toLocaleString();
}
