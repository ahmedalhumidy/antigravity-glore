import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface PresenceUser {
    user_id: string;
    email: string;
    online_at: string;
}

export function useUserPresence() {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<PresenceUser>();
                const users: PresenceUser[] = [];
                Object.values(state).forEach((presences) => {
                    presences.forEach((p) => {
                        if (p.user_id !== user.id) {
                            users.push(p as unknown as PresenceUser);
                        }
                    });
                });
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        email: user.email || 'unknown',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return { onlineUsers };
}

interface UserPresenceIndicatorProps {
    className?: string;
    maxAvatars?: number;
}

export function UserPresenceIndicator({ className, maxAvatars = 3 }: UserPresenceIndicatorProps) {
    const { onlineUsers } = useUserPresence();

    if (onlineUsers.length === 0) return null;

    const visible = onlineUsers.slice(0, maxAvatars);
    const remaining = onlineUsers.length - maxAvatars;

    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            <div className="flex -space-x-2">
                {visible.map((u) => {
                    const initial = (u.email?.charAt(0) || '?').toUpperCase();
                    return (
                        <Tooltip key={u.user_id} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div className="relative">
                                    <div className="w-7 h-7 rounded-full bg-primary/15 border-2 border-card flex items-center justify-center cursor-default">
                                        <span className="text-[10px] font-bold text-primary">{initial}</span>
                                    </div>
                                    {/* Online dot */}
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {u.email?.split('@')[0] || 'Kullanıcı'} — Çevrimiçi
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
                {remaining > 0 && (
                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                        <span className="text-[9px] font-bold text-muted-foreground">+{remaining}</span>
                    </div>
                )}
            </div>
            <span className="text-[10px] text-muted-foreground hidden lg:inline">
                {onlineUsers.length} çevrimiçi
            </span>
        </div>
    );
}
