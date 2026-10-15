export interface CancelableTimer {
  cancel: () => void;
  endsAt: number;
}

export function startTimer(ms: number, onEnd: () => void): CancelableTimer {
  const endsAt = Date.now() + ms;
  const id = setTimeout(onEnd, ms);
  return {
    endsAt,
    cancel: () => clearTimeout(id),
  };
}
