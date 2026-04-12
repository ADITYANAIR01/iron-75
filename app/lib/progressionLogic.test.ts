import { describe, expect, it } from 'vitest';
import {
  DAILY_XP_CAP,
  XP_REWARDS,
  applyProgressionUpdate,
  createDefaultProgressionState,
  getLevelProgress,
  normalizeProgressionState,
} from './progressionLogic';

describe('progressionLogic', () => {
  it('provides backward-compatible defaults for missing state', () => {
    const state = normalizeProgressionState(null, '2026-04-01');
    expect(state).toEqual({
      totalXp: 0,
      level: 1,
      daily: {
        date: '2026-04-01',
        xpGained: 0,
        claimedSources: [],
      },
    });
  });

  it('awards XP idempotently when task toggles repeat', () => {
    const base = createDefaultProgressionState('2026-04-01');
    const first = applyProgressionUpdate(base, {
      date: '2026-04-01',
      completedSources: ['workout'],
      missionCompleted: false,
    });
    const second = applyProgressionUpdate(first.state, {
      date: '2026-04-01',
      completedSources: ['workout'],
      missionCompleted: false,
    });

    expect(first.awardedXp).toBe(XP_REWARDS.workout);
    expect(second.awardedXp).toBe(0);
    expect(second.state.totalXp).toBe(first.state.totalXp);
  });

  it('adds mission reward only once when mission path completes', () => {
    const base = createDefaultProgressionState('2026-04-01');
    const first = applyProgressionUpdate(base, {
      date: '2026-04-01',
      completedSources: ['workout', 'walk', 'diet'],
      missionCompleted: true,
    });
    const second = applyProgressionUpdate(first.state, {
      date: '2026-04-01',
      completedSources: ['workout', 'walk', 'diet'],
      missionCompleted: true,
    });

    expect(first.awardedXp).toBe(
      XP_REWARDS.workout + XP_REWARDS.walk + XP_REWARDS.diet + XP_REWARDS.mission_path
    );
    expect(second.awardedXp).toBe(0);
  });

  it('never removes earned XP if tasks are unchecked later', () => {
    const base = createDefaultProgressionState('2026-04-01');
    const earned = applyProgressionUpdate(base, {
      date: '2026-04-01',
      completedSources: ['reading'],
      missionCompleted: false,
    });
    const unchecked = applyProgressionUpdate(earned.state, {
      date: '2026-04-01',
      completedSources: [],
      missionCompleted: false,
    });

    expect(earned.awardedXp).toBe(XP_REWARDS.reading);
    expect(unchecked.awardedXp).toBe(0);
    expect(unchecked.state.totalXp).toBe(earned.state.totalXp);
  });

  it('respects daily XP cap', () => {
    const base = createDefaultProgressionState('2026-04-01');
    const update = applyProgressionUpdate(base, {
      date: '2026-04-01',
      completedSources: ['workout', 'walk', 'diet', 'mood', 'reading'],
      missionCompleted: true,
    });

    expect(update.state.daily.xpGained).toBe(DAILY_XP_CAP);
    expect(update.state.totalXp).toBe(DAILY_XP_CAP);
  });

  it('resets daily claims on a new day while keeping total progression', () => {
    const dayOne = applyProgressionUpdate(createDefaultProgressionState('2026-04-01'), {
      date: '2026-04-01',
      completedSources: ['workout'],
      missionCompleted: false,
    });
    const dayTwo = applyProgressionUpdate(dayOne.state, {
      date: '2026-04-02',
      completedSources: ['workout'],
      missionCompleted: false,
    });

    expect(dayTwo.awardedXp).toBe(XP_REWARDS.workout);
    expect(dayTwo.state.daily.date).toBe('2026-04-02');
    expect(dayTwo.state.daily.claimedSources).toEqual(['workout']);
  });

  it('calculates level progress from total XP', () => {
    const progress = getLevelProgress(250);
    expect(progress.level).toBe(3);
    expect(progress.xpIntoLevel).toBe(30);
    expect(progress.xpForNextLevel).toBe(140);
    expect(progress.xpToNextLevel).toBe(110);
  });
});
