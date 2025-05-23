import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// inside <React.StrictMode> → <Router> → somewhere at the top level:
<ToastContainer position="top-center" autoClose={3000} />

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TeamView from './TeamView';
import Admin from './admin';


////////////////////
import TeamPage from './TeamPage';
////////////////




ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
  <Router>
    <ToastContainer position="top-center" autoClose={5000} />
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="/teams" element={<TeamView />} />
      <Route path="/team/:owner" element={<TeamPage />} />

      <Route path="/" element={<TeamView />} />
      <Route path="/team/:owner" element={<TeamPage />} />
    </Routes>
  </Router>
</React.StrictMode>

);
