import { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { SequenceViewer } from './components/sequence/SequenceViewer';
import { useThemeStore } from './store/useThemeStore';

function App() {
  const resolved = useThemeStore(s => s.resolved);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.classList.toggle('light', resolved === 'light');
  }, [resolved]);

  return (
    <AppLayout>
      <SequenceViewer />
    </AppLayout>
  );
}

export default App;
