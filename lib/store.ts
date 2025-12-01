import { create } from 'zustand';

interface NPCMessage {
  npcId: string;
  message: string;
  timestamp: number;
}

interface MenuItem {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    price: number;
    image?: string;
  }[];
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface GameState {
  playerPosition: { x: number; y: number };
  setPlayerPosition: (x: number, y: number) => void;
  cameraOffset: { x: number; y: number };
  setCameraOffset: (x: number, y: number) => void;
  nearbyNPCId: string | null;
  setNearbyNPCId: (npcId: string | null) => void;
  isInteracting: boolean;
  setIsInteracting: (isInteracting: boolean) => void;
  joystickDirection: { x: number; y: number } | null;
  setJoystickDirection: (direction: { x: number; y: number } | null) => void;
  npcMessages: NPCMessage[];
  addNPCMessage: (npcId: string, message: string) => void;
  clearNPCMessage: (npcId: string) => void;
  activeMenu: { npcId: string; menu: MenuItem[] } | null;
  setActiveMenu: (menu: { npcId: string; menu: MenuItem[] } | null) => void;
  notification: Notification | null;
  setNotification: (notification: Notification | null) => void;
  targetPosition: { x: number; y: number } | null;
  setTargetPosition: (position: { x: number; y: number } | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerPosition: { x: 400, y: 300 },
  setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),
  cameraOffset: { x: 0, y: 0 },
  setCameraOffset: (x, y) => set({ cameraOffset: { x, y } }),
  nearbyNPCId: null,
  setNearbyNPCId: (npcId) => set({ nearbyNPCId: npcId }),
  isInteracting: false,
  setIsInteracting: (isInteracting) => set({ isInteracting }),
  joystickDirection: null,
  setJoystickDirection: (direction) => set({ joystickDirection: direction }),
  npcMessages: [],
  addNPCMessage: (npcId, message) =>
    set((state) => ({
      npcMessages: [
        ...state.npcMessages.filter(m => m.npcId !== npcId),
        { npcId, message, timestamp: Date.now() }
      ]
    })),
  clearNPCMessage: (npcId) =>
    set((state) => ({
      npcMessages: state.npcMessages.filter(m => m.npcId !== npcId)
    })),
  activeMenu: null,
  setActiveMenu: (menu) => set({ activeMenu: menu }),
  notification: null,
  setNotification: (notification) => set({ notification }),
  targetPosition: null,
  setTargetPosition: (position) => set({ targetPosition: position }),
}));
