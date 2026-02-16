export function useHaptics() {
  const lightHaptic = () => {
    try {
      if (navigator.vibrate) navigator.vibrate(10);
    } catch {}
  };

  const strongHaptic = () => {
    try {
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } catch {}
  };

  return { lightHaptic, strongHaptic };
}
