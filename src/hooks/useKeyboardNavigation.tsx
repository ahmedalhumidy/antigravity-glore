import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard navigation shortcuts.
 * 
 * G → D = Dashboard
 * G → P = Products
 * G → M = Movements  
 * G → R = Reports
 * G → S = Settings
 * N = New product (triggers callback)
 * S = Scan (triggers callback)
 * T = Transfer (triggers callback)
 */
export function useKeyboardNavigation({
    onNewProduct,
    onScan,
    onTransfer,
}: {
    onNewProduct?: () => void;
    onScan?: () => void;
    onTransfer?: () => void;
} = {}) {
    const navigate = useNavigate();
    const pendingKey = useRef<string | null>(null);
    const pendingTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't trigger in inputs
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Don't trigger with modifiers (except for Ctrl+K handled elsewhere)
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const key = e.key.toLowerCase();

            // Two-key navigation: G → <key>
            if (pendingKey.current === 'g') {
                pendingKey.current = null;
                if (pendingTimer.current) clearTimeout(pendingTimer.current);

                switch (key) {
                    case 'd':
                        e.preventDefault();
                        navigate('/');
                        break;
                    case 'p':
                        e.preventDefault();
                        navigate('/products');
                        break;
                    case 'm':
                        e.preventDefault();
                        navigate('/movements');
                        break;
                    case 'r':
                        e.preventDefault();
                        navigate('/reports');
                        break;
                    case 's':
                        e.preventDefault();
                        navigate('/settings');
                        break;
                }
                return;
            }

            // Start pending for G
            if (key === 'g') {
                pendingKey.current = 'g';
                // Auto-clear after 1 second
                pendingTimer.current = setTimeout(() => {
                    pendingKey.current = null;
                }, 1000);
                return;
            }

            // Single-key shortcuts
            switch (key) {
                case 'n':
                    e.preventDefault();
                    onNewProduct?.();
                    break;
                case 's':
                    e.preventDefault();
                    onScan?.();
                    break;
                case 't':
                    e.preventDefault();
                    onTransfer?.();
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
            if (pendingTimer.current) clearTimeout(pendingTimer.current);
        };
    }, [navigate, onNewProduct, onScan, onTransfer]);
}
