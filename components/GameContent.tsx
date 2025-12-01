'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { saveGameState } from '@/lib/saveGameState';
import GameMap from './GameMap';
import Instructions from './UI';
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

const GameContent = () => {
    const { user, currentMapId } = useGameStore();

    // Lưu game state khi chuyển map
    useEffect(() => {
        if (user) {
            saveGameState();
        }
    }, [currentMapId, user]);

    if (!user) {
        return <LoginPage />;
    }

    return (
        <>
            <GameMap />
            <Instructions />
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
        </>
    );
};

export default GameContent;
