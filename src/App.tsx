import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Game } from './components/Game';

type View = 'dashboard' | 'game';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  if (currentView === 'dashboard') {
    return <Dashboard onGameStart={() => setCurrentView('game')} />;
  }

  return <Game onLeave={() => setCurrentView('dashboard')} />;
}

export default App;
