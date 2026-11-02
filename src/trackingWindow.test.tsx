import {it,expect} from 'vitest';
import {indiaTimeToUtc,historyBounds} from './trackingWindow';
it('converts IST explicitly across UTC day boundaries',()=>{
 expect(indiaTimeToUtc('2026-10-20T00:00')).toBe('2026-10-19T18:30:00.000Z');
 expect(indiaTimeToUtc('2026-10-20T17:30')).toBe('2026-10-20T12:00:00.000Z');
});
it('rejects normalized impossible dates, malformed input and oversized windows',()=>{
 for(const value of ['2026-02-29T12:00','2026-04-31T12:00','2026-10-20T24:01','2026-10-20T12:60','2026-10-20','bad','2026-10-20T12:00Z'])expect(indiaTimeToUtc(value)).toBeNull();
 expect(indiaTimeToUtc('2024-02-29T12:00')).not.toBeNull();
 expect(historyBounds('2026-10-20T12:00','2026-10-20T18:00')).not.toBeNull();
 expect(historyBounds('2026-10-20T12:00','2026-10-20T18:01')).toBeNull();
 expect(historyBounds('2026-10-20T12:00','2026-10-20T12:00')).toBeNull();
 expect(historyBounds('2026-10-20T12:00','2026-10-19T12:00')).toBeNull();
});
