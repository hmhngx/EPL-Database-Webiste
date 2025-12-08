import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Standings from './pages/Standings.jsx';
import Matches from './pages/Matches.jsx';
import Clubs from './pages/Clubs.jsx';
import ClubDetail from './pages/ClubDetail.jsx';
import Players from './pages/Players.jsx';
import MatchDetail from './components/MatchDetail.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="standings" element={<Standings />} />
          <Route path="matches" element={<Matches />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="clubs/:id" element={<ClubDetail />} />
          <Route path="players" element={<Players />} />
          <Route path="match/:id" element={<MatchDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);