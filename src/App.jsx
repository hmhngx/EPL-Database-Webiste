import { lazy, Suspense, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import './styles/App.css';

// Lazy load all page components for optimal performance
const Home = lazy(() => import('./pages/Home'));
const Standings = lazy(() => import('./pages/Standings'));
const Matches = lazy(() => import('./pages/Matches'));
const Clubs = lazy(() => import('./pages/Clubs'));
const ClubDetail = lazy(() => import('./pages/ClubDetail'));
const Players = lazy(() => import('./pages/Players'));
const PlayerDetail = lazy(() => import('./pages/PlayerDetail'));
const PlayerComparison = lazy(() => import('./pages/PlayerComparison'));
const MatchDetail = lazy(() => import('./components/MatchDetail'));
const H2HComparison = lazy(() => import('./components/H2HComparison'));
const StatsHub = lazy(() => import('./pages/StatsHub'));
const BestXI = lazy(() => import('./pages/BestXI'));
const Predictor = lazy(() => import('./pages/Predictor'));
const Scout = lazy(() => import('./pages/Scout'));
const Archive = lazy(() => import('./pages/Archive'));

// Loading fallback component with smooth animation
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-accent mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400 text-lg font-body">
        Loading...
      </p>
    </div>
  </div>
);

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
            />
          }
        >
          <Route index element={<Home />} />
          <Route path="standings" element={<Standings />} />
          <Route path="matches" element={<Matches />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="teams/:id" element={<ClubDetail />} />
          <Route path="players" element={<Players />} />
          <Route path="players/:id" element={<PlayerDetail />} />
          <Route path="compare" element={<PlayerComparison />} />
          <Route path="stats" element={<StatsHub />} />
          <Route path="bestxi" element={<BestXI />} />
          <Route path="predictor" element={<Predictor />} />
          <Route path="scout" element={<Scout />} />
          <Route path="archive" element={<Archive />} />
          <Route path="match/:id" element={<MatchDetail />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
