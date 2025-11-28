import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth } from '../utils/firebaseConfig';
import { Pyramid, Mail, Lock } from './Icons';
import { AUTH_TEXT } from '../utils/constants';

const LoginScreen = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };



    const handleAnonymousSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            await signInAnonymously(auth);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0a0e17] flex items-center justify-center">
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}></div>

            <div className="relative z-10 w-full max-w-md p-8">
                {/* Title */}
                <div className="text-center mb-8">
                    <Pyramid className="w-16 h-16 mx-auto mb-4 text-cyan-400 drop-shadow-glow-cyan" />
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">{AUTH_TEXT.TITLE}</h1>
                    <p className="text-slate-400 font-mono text-sm tracking-widest">{AUTH_TEXT.SUBTITLE}</p>
                </div>

                {/* Auth Form */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-slate-400 mb-2 tracking-widest">{AUTH_TEXT.EMAIL_LABEL}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:shadow-glow-cyan transition-colors"
                                    placeholder={AUTH_TEXT.EMAIL_PLACEHOLDER}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-slate-400 mb-2 tracking-widest">{AUTH_TEXT.PASSWORD_LABEL}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:shadow-glow-cyan transition-colors"
                                    placeholder={AUTH_TEXT.PASSWORD_PLACEHOLDER}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-900/50 border border-red-500/50 rounded p-3 text-red-200 text-sm font-mono">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded transition-all transform hover:scale-105 shadow-glow-cyan uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? AUTH_TEXT.LOADING : (isSignUp ? AUTH_TEXT.SIGN_UP : AUTH_TEXT.SIGN_IN)}
                        </button>
                    </form>

                    {/* Toggle Sign Up / Sign In */}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="w-full text-center text-sm text-slate-400 hover:text-cyan-400 transition-colors mt-4 font-mono"
                    >
                        {isSignUp ? AUTH_TEXT.SWITCH_TO_SIGN_IN : AUTH_TEXT.SWITCH_TO_SIGN_UP}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-slate-900 text-slate-500 font-mono">{AUTH_TEXT.OR}</span>
                        </div>
                    </div>



                    {/* Guest Sign In */}
                    <button
                        onClick={handleAnonymousSignIn}
                        disabled={loading}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded transition-all border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {AUTH_TEXT.GUEST_LOGIN}
                    </button>
                </div>

                <p className="text-center text-xs text-slate-500 mt-6 font-mono">
                    {AUTH_TEXT.TOS}
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;
