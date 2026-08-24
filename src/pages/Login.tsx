import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
  const { login, loginWithGoogle, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGoogleClick = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Google login failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 transform rotate-3">
            <span className="text-white font-bold text-2xl -rotate-3">Rx</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MdiCare</h1>
          <p className="text-slate-400 text-sm mt-1">Pharmacy Management System</p>
        </div>

        <div className="w-full bg-[#1e293b]/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
          <div className="flex flex-col space-y-6">
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl text-center animate-in fade-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs text-blue-500 hover:text-blue-400 font-medium">Forgot?</a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    required
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-11 pr-11 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                      rememberMe ? "bg-blue-500" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                        rememberMe ? "translate-x-5" : "translate-x-1"
                      )}
                    />
                  </button>
                  <span className="text-sm text-slate-400 select-none cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                    Remember me
                  </span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Or continue with</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl transition-all shadow-sm border border-slate-200"
              >
                <Chrome className="w-5 h-5 text-blue-500" />
                Google Account
              </button>
            </div>
            
            <div className="w-full border-t border-slate-800 pt-6">
              <p className="text-center text-sm text-slate-400">
                New to MdiCare? <Link to="/signup" className="text-blue-500 hover:text-blue-400 font-semibold">Create account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-12 flex flex-col items-center gap-4 relative z-10">
        <p className="text-xs text-slate-500">© 2024 MdiCare Pro. All rights reserved.</p>
        <div className="flex gap-6 text-xs text-slate-500">
          <a href="#" className="hover:text-slate-300 transition-colors">Help</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
}
