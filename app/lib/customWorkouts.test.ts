import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COOLDOWN_PLAN,
  DEFAULT_WARMUP_PLAN,
  normalizeCustomSession,
  sanitizeDayAssignments,
  sanitizePhaseItems,
} from './customWorkouts';

describe('custom workout phase normalization', () => {
  it('fills missing warmup/cooldown for legacy sessions', () => {
    const normalized = normalizeCustomSession({
      id: 'legacy-session',
      name: 'Legacy Push',
      exercises: [
        {
          id: 'legacy-ex',
          name: 'Bench Press',
          emoji: '🏋️',
          sets: 3,
          repRange: '6-8',
          rest: '120s',
          targetMuscle: 'Chest',
          tip: 'Keep tension.',
        },
      ],
    });

    expect(normalized.warmup).toEqual(DEFAULT_WARMUP_PLAN);
    expect(normalized.cooldown).toEqual(DEFAULT_COOLDOWN_PLAN);
  });

  it('sanitizes phase arrays and avoids fallback aliasing', () => {
    const cleaned = sanitizePhaseItems(['  Jump rope  ', '', 'Band pull-aparts', 24], DEFAULT_WARMUP_PLAN);
    expect(cleaned).toEqual(['Jump rope', 'Band pull-aparts']);

    expect(sanitizePhaseItems([], DEFAULT_COOLDOWN_PLAN)).toEqual([]);

    const fallback = sanitizePhaseItems(undefined, DEFAULT_WARMUP_PLAN);
    expect(fallback).toEqual(DEFAULT_WARMUP_PLAN);
    expect(fallback).not.toBe(DEFAULT_WARMUP_PLAN);
  });

  it('sanitizes malformed day assignments without changing payload shape', () => {
    expect(
      sanitizeDayAssignments({
        0: 'pushA',
        1: '',
        2: 123,
        7: 'out-of-range',
        foo: 'bad-key',
        3: null,
      })
    ).toEqual({
      0: 'pushA',
      2: '123',
    });

    expect(sanitizeDayAssignments(['pullA', null, ' custom_abc ', '', 'legsA'])).toEqual({
      0: 'pullA',
      2: 'custom_abc',
      4: 'legsA',
    });
  });
});
