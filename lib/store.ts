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
    description?: string;
  }[];
}

interface Quest {
  id: string;
  name: string;
  description: string;
  reward: number;
  image: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface OtherPlayer {
  id: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  action: 'idle' | 'run';
  userId?: number;
  username?: string;
  mapId?: string;
}

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: number;
}

interface User {
  id: number;
  username: string;
  sessionId: string;
  gold: number;
  level: number;
}

interface GameState {
  currentMapId: string;
  setCurrentMapId: (mapId: string) => void;
  playerPosition: { x: number; y: number };
  setPlayerPosition: (x: number, y: number) => void;
  playerDirection: 'up' | 'down' | 'left' | 'right';
  setPlayerDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  playerAction: 'idle' | 'run';
  setPlayerAction: (action: 'idle' | 'run') => void;
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
  activeMenu: { npcId: string; menu: MenuItem[]; quests?: Quest[] } | null;
  setActiveMenu: (menu: { npcId: string; menu: MenuItem[]; quests?: Quest[] } | null) => void;
  notification: Notification | null;
  setNotification: (notification: Notification | null) => void;
  targetPosition: { x: number; y: number } | null;
  setTargetPosition: (position: { x: number; y: number } | null) => void;

  // Multiplayer
  socket: any;
  setSocket: (socket: any) => void;
  currentChannel: number | null;
  setCurrentChannel: (channel: number | null) => void;
  otherPlayers: Map<string, OtherPlayer>;
  setOtherPlayers: (players: Map<string, OtherPlayer>) => void;
  updateOtherPlayer: (id: string, data: Partial<OtherPlayer>) => void;
  removeOtherPlayer: (id: string) => void;

  // User authentication
  user: User | null;
  setUser: (user: User | null) => void;

  // Chat messages
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentMapId: 'map1',
  setCurrentMapId: (mapId) => {
    set({ currentMapId: mapId });
    // Lưu map hiện tại vào localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('tutien2d_currentMap', mapId);
    }
  },
  playerPosition: { x: 400, y: 300 },
  setPlayerPosition: (x, y) => {
    set({ playerPosition: { x, y } });
    // Lưu vị trí người chơi vào localStorage (throttled)
    // Sử dụng debounce để tránh lưu quá nhiều
    if (typeof window !== 'undefined') {
      if ((window as any).savePositionTimeout) {
        clearTimeout((window as any).savePositionTimeout);
      }
      (window as any).savePositionTimeout = setTimeout(() => {
        localStorage.setItem('tutien2d_playerPosition', JSON.stringify({ x, y }));
      }, 1000); // Lưu sau 1 giây không di chuyển
    }
  },
  playerDirection: 'down',
  setPlayerDirection: (direction) => set({ playerDirection: direction }),
  playerAction: 'idle',
  setPlayerAction: (action) => set({ playerAction: action }),
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

  // Multiplayer
  socket: null,
  setSocket: (socket) => set({ socket }),
  currentChannel: null,
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  otherPlayers: new Map(),
  setOtherPlayers: (players) => set({ otherPlayers: players }),
  updateOtherPlayer: (id, data) => set((state) => {
    const newPlayers = new Map(state.otherPlayers);
    const player = newPlayers.get(id);
    if (player) {
      newPlayers.set(id, { ...player, ...data });
    } else if (data.x !== undefined && data.y !== undefined) {
      newPlayers.set(id, data as OtherPlayer);
    }
    return { otherPlayers: newPlayers };
  }),
  removeOtherPlayer: (id) => set((state) => {
    const newPlayers = new Map(state.otherPlayers);
    newPlayers.delete(id);
    return { otherPlayers: newPlayers };
  }),

  // User authentication
  user: null,
  setUser: (user) => {
    set({ user });
    // Lưu vào localStorage
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('tutien2d_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('tutien2d_user');
      }
    }
  },

  // Chat messages
  chatMessages: [],
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
}));

// Khôi phục dữ liệu từ localStorage khi khởi động
if (typeof window !== 'undefined') {
  // Khôi phục user
  const savedUser = localStorage.getItem('tutien2d_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      useGameStore.setState({ user });
    } catch (e) {
      console.error('Failed to parse saved user:', e);
      localStorage.removeItem('tutien2d_user');
    }
  }

  // Khôi phục map hiện tại
  const savedMap = localStorage.getItem('tutien2d_currentMap');
  if (savedMap) {
    useGameStore.setState({ currentMapId: savedMap });
  }

  // Khôi phục vị trí người chơi
  const savedPosition = localStorage.getItem('tutien2d_playerPosition');
  if (savedPosition) {
    try {
      const position = JSON.parse(savedPosition);
      useGameStore.setState({ playerPosition: position });
    } catch (e) {
      console.error('Failed to parse saved position:', e);
      localStorage.removeItem('tutien2d_playerPosition');
    }
  }
}
