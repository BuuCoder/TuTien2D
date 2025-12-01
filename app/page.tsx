import GameMap from '@/components/GameMap';
import Instructions from '@/components/UI';
import Joystick from '@/components/Joystick';
import InteractButton from '@/components/InteractButton';
import MenuPopup from '@/components/MenuPopup';
import NotificationPopup from '@/components/NotificationPopup';
import TargetIndicator from '@/components/TargetIndicator';

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
      <GameMap />
      <Instructions />
      <Joystick />
      <InteractButton />
      <MenuPopup />
      <NotificationPopup />
      <TargetIndicator />
    </main>
  );
}
