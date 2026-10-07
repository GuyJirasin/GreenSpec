import { describe, it, expect } from 'vitest';
import { recommendations } from './data.js';
import { aggregateImpact, selectedChanges, canAccept, needsReview, validateFile } from './model.js';

describe('material decision calculations', () => {
  it('aggregates eligible A selections against one project baseline', () => {
    expect(aggregateImpact({ 1: 'A', 2: 'A', 3: 'A' })).toEqual({ carbon: 447, savings: 1200000 });
  });
  it('counts replacement alternatives once and supports a cost increase', () => {
    expect(selectedChanges({ 1: 'B' })).toHaveLength(1);
    expect(aggregateImpact({ 1: 'B' })).toEqual({ carbon: 315, savings: -250000 });
    expect(aggregateImpact({ 1: 'B', 2: 'A', 3: 'A' })).toEqual({ carbon: 510, savings: 200000 });
  });
  it('leaves the baseline unchanged with no selections', () => {
    expect(aggregateImpact({})).toEqual({ carbon: 0, savings: 0 });
  });
  it('blocks failed engineering requirements and flags review options', () => {
    expect(canAccept(recommendations[3])).toBe(false);
    expect(needsReview(recommendations[2], 'A')).toBe(true);
    expect(needsReview(recommendations[0], 'B')).toBe(true);
    expect(needsReview(recommendations[0], 'A')).toBe(false);
  });
  it('validates document format and the file size boundary', () => {
    expect(validateFile({ name: 'tor.PDF', size: 25 * 1048576 })).toBeNull();
    expect(validateFile({ name: 'tor.pdf', size: 25 * 1048576 + 1 })).toBe('File exceeds 25 MB');
    expect(validateFile({ name: 'program.exe', size: 100 })).toBe('Unsupported file type');
  });
});
