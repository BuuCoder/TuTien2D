'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { saveGameState } from '@/lib/saveGameState';
import GameMap from './GameMap';
import ProfileMenu from './ProfileMenu';
import MapName from './MapName';
import Joystick from './Joystick';
import InteractButton from './InteractButton';
import MenuPopup from './MenuPopup';
import NotificationPopup from './NotificationPopup';
import TargetIndicator from './TargetIndicator';
import MultiplayerManager from './MultiplayerManager';
import LoginPage from './LoginPage';
import ChatBox from './ChatBox';
import FriendRequestPopup from './FriendRequestPopup';
import CombatUI from './CombatUI';
import CombatManager from './CombatManager';
import PKRequestPopup from './PKRequestPopup';
import MonsterManager from './MonsterManager';
import AutoSaveStats from './AutoSaveStats';
import TokenExpiredNotice from './TokenExpiredNotice';
import PKMapChangeDetector from './PKMapChangeDetector';

const GameContent = () => {
    const { user, currentMapId } = useGameStore();
    const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

    // Check auth on mount
    useEffect(() => {
        // Give time for store to restore user from localStorage
        const timer = setTimeout(() => {
            setIsCheckingAuth(false);
        }, 100); // Very short delay, just enough for sync restore
        
        return () => clearTimeout(timer);
    }, []);

    // Lưu game state khi chuyển map
    useEffect(() => {
        if (user) {
            saveGameState();
        }
    }, [currentMapId, user]);

    // Show nothing while checking (prevents flash)
    if (isCheckingAuth) {
        return null;
    }

    if (!user) {
        return <LoginPage />;
    }

    return (
        <>
            {/* TokenExpiredNotice chỉ hiện khi token thực sự expired */}
            {!user && <TokenExpiredNotice />}
            <GameMap />
            <ProfileMenu />
            <MapName />
            <Joystick />
            <InteractButton />
            <MenuPopup />
            <NotificationPopup />
            <TargetIndicator />
            <MultiplayerManager />
            <ChatBox />
            <FriendRequestPopup />
            <PKRequestPopup />
            <CombatUI />
            <CombatManager />
            <MonsterManager />
            <AutoSaveStats />
            <PKMapChangeDetector />
        </>
    );
};

export default GameContent;
