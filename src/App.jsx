import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
      setError('');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setError('');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message);
    }
  };

  const loginView = (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center overflow-hidden relative font-sans">
      {/* --- Floating Decorative Elements --- */}
      <div className="absolute top-10 left-10 animate-bounce text-4xl">🐰</div>
      <div className="absolute top-20 right-20 animate-pulse text-3xl">☁️</div>
      <div className="absolute bottom-20 left-1/4 animate-bounce delay-700 text-4xl">🥕</div>
      <div className="absolute bottom-10 right-10 animate-pulse text-4xl">🌸</div>

      {/* --- Login Card --- */}
      <div className="bg-white/80 backdrop-blur-md p-10 rounded-[40px] shadow-2xl border-4 border-pink-200 text-center z-10 max-w-lg w-full mx-4">
        {/* Bunny Icon Area */}
        <div className="bg-pink-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-inner">
          <span className="text-5xl">🐰</span>
        </div>

        <h1 className="text-3xl font-black text-pink-500 mb-2 font-display">Welcome!</h1>
        <p className="text-pink-400 mb-8 font-medium font-reader">Ready to track your hours, bunny?</p>

        {error && (
          <p className="text-sm font-bold text-red-400 font-reader my-10">{error}</p>
        )}

        <div className="space-y-4">
          {/* --- Email/Password Form --- */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              className="font-reader w-full px-4 py-3 rounded-2xl border-2 border-pink-100 focus:border-pink-300 outline-none transition-all text-sm"
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="font-reader w-full px-4 py-3 rounded-2xl border-2 border-pink-100 focus:border-pink-300 outline-none transition-all text-sm"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300 hover:text-pink-500 transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
              </button>
            </div>

            <button
              type="submit"
              className="font-display w-full bg-pink-400 text-white font-medium py-3 rounded-2xl hover:bg-pink-500 transition-all shadow-md active:scale-95 font-brand cursor-pointer"
            >
              Login
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-pink-300 font-bold font-reader">Hop in and start your journey! ✨</p>
      </div>

      {/* --- Background Decorative Circles --- */}
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={loginView} />
      <Route
        path="/dashboard"
        element={
          user ? (
            <Dashboard
              user={user}
              onLogout={() => auth.signOut().then(() => setUser(null))}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;