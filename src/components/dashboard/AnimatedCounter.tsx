import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    locale?: string;
    className?: string;
    prefix?: string;
    suffix?: string;
}

export function AnimatedCounter({
    value,
    duration = 1200,
    locale = 'tr-TR',
    className = '',
    prefix = '',
    suffix = '',
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const prefersReducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const startValue = prevValueRef.current;
        const endValue = value;

        if (prefersReducedMotion || duration <= 0) {
            setDisplayValue(endValue);
            prevValueRef.current = endValue;
            return;
        }

        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Cubic ease-out for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (endValue - startValue) * eased);

            setDisplayValue(current);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                prevValueRef.current = endValue;
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [value, duration]);

    const formatted = displayValue.toLocaleString(locale);

    return (
        <span className={className}>
            {prefix}{formatted}{suffix}
        </span>
    );
}
