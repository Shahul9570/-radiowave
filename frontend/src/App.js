import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WSProvider } from './context/WSContext';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import FriendsPage from './pages/FriendsPage';
import RadioPage from './pages/RadioPage';

function LoadingScreen() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--chassis)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spinner" style={{ width:32, height:32, margin:'0 auto 16px', borderWidth:3 }}/>
        <div style={{ fontFamily:'var(--font-mono)', color:'var(--amber)', fontSize:'0.85rem', letterSpacing:'0.1em' }}>
          INITIALIZING...
        </div>
      </div>
    </div>
  );
}

function PrivateLayout() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen/>;
  if (!user) return <Navigate to="/login" replace/>;
  return (
    <WSProvider>
      <ToastContainer/>
      <div style={{ display:'flex' }}>
        <Sidebar/>
        <main className="main-content">
          <Outlet/>
        </main>
      </div>
    </WSProvider>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen/>;
  if (user) return <Navigate to="/dashboard" replace/>;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"  element={<PublicRoute><LoginPage/></PublicRoute>}/>
          <Route path="/signup" element={<PublicRoute><SignupPage/></PublicRoute>}/>
          <Route element={<PrivateLayout/>}>
            <Route path="/dashboard" element={<DashboardPage/>}/>
            <Route path="/search"    element={<SearchPage/>}/>
            <Route path="/friends"   element={<FriendsPage/>}/>
            <Route path="/radio"     element={<RadioPage/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}