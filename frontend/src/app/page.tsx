'use client';
import { useAuthenticationStatus, useUserData, useSignOut, useSignInEmailPassword, useSignUpEmailPassword } from '@nhost/nextjs';
import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const user = useUserData();
  const { signOut } = useSignOut();
  const { signInEmailPassword } = useSignInEmailPassword();
  const { signUpEmailPassword } = useSignUpEmailPassword();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading Nhost Auth...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">AI Workflow Builder</h1>
          <form className="space-y-4" onSubmit={async (e) => { 
            e.preventDefault(); 
            setErrorMsg('');
            let res;
            if (isLogin) {
              res = await signInEmailPassword(email, password);
            } else {
              res = await signUpEmailPassword(email, password);
            }
            if (res.error) {
              setErrorMsg(res.error.message);
            }
          }}>
            <div>
              <label className="block text-sm font-medium text-gray-300">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring focus:ring-blue-500" required />
            </div>
            {errorMsg && <div className="text-red-400 text-sm">{errorMsg}</div>}
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <div className="text-sm text-gray-400 text-center">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:underline">
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">AI Workflow Builder</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={() => signOut()} className="text-sm py-1 px-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors">Sign Out</button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Dashboard userId={user?.id} />
      </main>
    </div>
  );
}
