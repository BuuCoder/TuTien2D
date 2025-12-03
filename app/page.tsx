import GameContent from '@/components/GameContent';

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
      <GameContent />
    </main>
  );
}
