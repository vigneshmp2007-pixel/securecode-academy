import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Lesson from './pages/Lesson.jsx';
import Login from './pages/Login.jsx';
import Module from './pages/Module.jsx';
import Team from './pages/Team.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Booting terminal…</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/modules/:slug" element={<Protected><Module /></Protected>} />
      <Route path="/lessons/:id" element={<Protected><Lesson /></Protected>} />
      <Route path="/team" element={<Protected><Team /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
