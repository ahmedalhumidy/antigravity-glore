import { useRef, useState, useCallback } from 'react';

interface SwipeGestureOptions {
  threshold?: number;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
}

export function useSwipeGesture({
  threshold = 80,
  onSwipeRight,
  onSwipeLeft,
  onLongPress,
  longPressDelay = 500,
}: SwipeGestureOptions) {
  const [swipeOffset, setSwipeOffset] = useState(0);
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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isSwiping.current = false;
    didLongPress.current = false;
    setSwipeOffset(0);

    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        onLongPress();
        if (navigator.vibrate) navigator.vibrate(10);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // If vertical movement is dominant, don't swipe
    if (!isSwiping.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      clearLongPress();
      return;
    }

    if (Math.abs(dx) > 10) {
      isSwiping.current = true;
      clearLongPress();
      setSwipeOffset(dx);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    clearLongPress();

    if (didLongPress.current) {
      setSwipeOffset(0);
      return;
    }

    if (isSwiping.current) {
      if (swipeOffset > threshold && onSwipeRight) {
        onSwipeRight();
      } else if (swipeOffset < -threshold && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    isSwiping.current = false;
    setSwipeOffset(0);
  }, [swipeOffset, threshold, onSwipeRight, onSwipeLeft]);

  return { swipeOffset, onTouchStart, onTouchMove, onTouchEnd };
}
