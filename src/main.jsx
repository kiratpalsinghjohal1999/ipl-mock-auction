import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import TeamView from './TeamView';
import Round2 from './Round2';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<TeamView />} /> {/* 👈 default to TeamView */}
        <Route path="/admin" element={<App />} /> {/* 👈 admin-only access */}
        <Route path="/round2" element={<Round2 />} />
        <Route path="/teams" element={<TeamView />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
