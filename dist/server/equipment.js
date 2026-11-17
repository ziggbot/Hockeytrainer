/**
 * Builds the rink checklist for a practice.
 * Drills that run one after another reuse the same gear, so we take the max per item.
 * Station drills run at the same time, so their quantities are summed.
 */
export function aggregateEquipment(items) {
    const display = new Map();
    const sequentialMax = new Map();
    const stationSum = new Map();
    for (const it of items) {
        for (const line of it.equipment ?? []) {
            const name = line.item.trim();
            if (!name)
                continue;
            const key = name.toLocaleLowerCase('sv');
            if (!display.has(key))
                display.set(key, name);
            const qty = Math.max(0, Math.round(Number(line.qty) || 0));
            if (it.station != null) {
                stationSum.set(key, (stationSum.get(key) ?? 0) + qty);
            }
            else {
                sequentialMax.set(key, Math.max(sequentialMax.get(key) ?? 0, qty));
            }
        }
    }
    return [...display.entries()]
        .map(([key, item]) => ({ item, qty: Math.max(sequentialMax.get(key) ?? 0, stationSum.get(key) ?? 0) }))
        .sort((a, b) => a.item.localeCompare(b.item, 'sv'));
}
//# sourceMappingURL=equipment.js.map