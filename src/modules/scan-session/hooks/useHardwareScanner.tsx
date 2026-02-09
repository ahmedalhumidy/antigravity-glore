import { useState, useEffect, useRef, useCallback } from 'react';

interface UseHardwareScannerOptions {
  enabled: boolean;
  onScan: (barcode: string) => void | Promise<void>;
}

/**
 * Captures keyboard-wedge / Bluetooth scanner input.
 * Accumulates characters and fires onScan when Enter is detected.
 */
export function useHardwareScanner({ enabled, onScan }: UseHardwareScannerOptions) {
  const [isListening, setIsListening] = useState(false);
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  // Handle hidden input for mobile hardware scanners
  const handleHiddenInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value.length > 2) {
      onScan(value);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [onScan]);

  useEffect(() => {
    if (!enabled) {
      setIsListening(false);
      return;
    }

    setIsListening(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a visible input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' &&
        !(target as HTMLInputElement).dataset.hardwareScanner
      ) return;
      if (target.tagName === 'TEXTAREA') return;
      if (target.isContentEditable) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const barcode = bufferRef.current.trim();
        if (barcode.length > 2) {
          onScan(barcode);
        }
        clearBuffer();
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      // Only accumulate printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        // Auto-clear buffer after 100ms of no input (human typing is slower)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(clearBuffer, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, onScan, clearBuffer]);

  return {
    isListening,
    inputRef,
    handleHiddenInput,
    HiddenInput: enabled ? (
      <input
        ref={inputRef}
        data-hardware-scanner="true"
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        onChange={handleHiddenInput as any}
        aria-label="Hardware scanner input"
      />
    ) : null,
  };
}
