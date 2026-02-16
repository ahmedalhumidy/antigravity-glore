import { useRef, useState, useCallback } from 'react';

interface SwipeGestureOptions {
  threshold?: number;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  lockOffset?: number;
}

export function useSwipeGesture({
  threshold = 80,
  onSwipeRight,
  onSwipeLeft,
  onLongPress,
  longPressDelay = 500,
  lockOffset = 80,
}: SwipeGestureOptions) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [lockedDirection, setLockedDirection] = useState<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setLockedDirection(null);
    isSwiping.current = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // If already locked, let the tap handler deal with it
    if (lockedDirection) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isSwiping.current = false;
    didLongPress.current = false;

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        onLongPress();
        if (navigator.vibrate) navigator.vibrate(10);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay, lockedDirection]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (lockedDirection) return;

    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (!isSwiping.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      clearLongPress();
      return;
    }

    if (Math.abs(dx) > 10) {
      isSwiping.current = true;
      clearLongPress();
      setSwipeOffset(dx);
    }
  }, [lockedDirection]);

  const onTouchEnd = useCallback(() => {
    if (lockedDirection) return;

    clearLongPress();

    if (didLongPress.current) {
      setSwipeOffset(0);
      return;
    }

    if (isSwiping.current) {
      if (swipeOffset > threshold && onSwipeRight) {
        // Lock in right-swiped position
        setSwipeOffset(lockOffset);
        setLockedDirection('right');
        return;
      } else if (swipeOffset < -threshold && onSwipeLeft) {
        // Lock in left-swiped position
        setSwipeOffset(-lockOffset);
        setLockedDirection('left');
        return;
      }
    }

    isSwiping.current = false;
    setSwipeOffset(0);
  }, [swipeOffset, threshold, onSwipeRight, onSwipeLeft, lockOffset, lockedDirection]);

  return { swipeOffset, lockedDirection, resetSwipe, onTouchStart, onTouchMove, onTouchEnd };
}
