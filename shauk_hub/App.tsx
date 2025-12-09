import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import NavBar from './components/NavBar';
import Login from './pages/Login';
import Register from './pages/Register';
import Lobby from './pages/Lobby';
import HobbyGroups from './pages/HobbyGroups';
import ChatRoom from './pages/ChatRoom';
import { getCurrentUser, logoutUser } from './services/storageService';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  if (loading) return null;

  return (
    <HashRouter>
      <Layout>
        <NavBar user={user} onLogout={handleLogout} />
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/lobby" /> : <Login onLogin={setUser} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/lobby" /> : <Register onLogin={setUser} />} 
          />
          <Route 
            path="/lobby" 
            element={user ? <Lobby user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/hobby/:hobbyId" 
            element={user ? <HobbyGroups user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/chat/:hobbyId/:groupId" 
            element={user ? <ChatRoom user={user} /> : <Navigate to="/" />} 
          />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;