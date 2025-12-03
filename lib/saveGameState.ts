// Utility để lưu trạng thái game
export const saveGameState = () => {
  if (typeof window === 'undefined') return;

  const { useGameStore } = require('./store');
  const state = useGameStore.getState();

  // Lưu map và vị trí hiện tại
  localStorage.setItem('tutien2d_currentMap', state.currentMapId);
  localStorage.setItem('tutien2d_playerPosition', JSON.stringify(state.playerPosition));
};

// Lưu khi người dùng thoát trang
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', saveGameState);
  
  // Lưu định kỳ mỗi 30 giây
  setInterval(saveGameState, 30000);
}
