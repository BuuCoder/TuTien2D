import GameMap from '@/components/GameMap';
import Instructions from '@/components/UI';
import Joystick from '@/components/Joystick';
import InteractButton from '@/components/InteractButton';
import MenuPopup from '@/components/MenuPopup';
import NotificationPopup from '@/components/NotificationPopup';
import TargetIndicator from '@/components/TargetIndicator';
import LoginPage from '@/components/LoginPage';
import MultiplayerManager from '@/components/MultiplayerManager';
import GameContent from '@/components/GameContent';
import PinchZoom from '@/components/PinchZoom';

export default function Home() {
  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      backgroundImage: 'radial-gradient(circle at 50% 50%, #2a2a2a 0%, #1a1a1a 100%)',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden'
    }}>
      <PinchZoom minZoom={0.9} maxZoom={1.1}>
        <GameContent />
      </PinchZoom>
    </main>
  );
}
