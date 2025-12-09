
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, saveCurrentUser, checkUserExists, generateMockOtp } from '../services/storageService';
import { User, HobbyType } from '../types';
import { COUNTRIES, HOBBIES } from '../constants';
import { UserPlus, ArrowRight, ShieldCheck, Mail, Lock, CheckCircle, RotateCw } from 'lucide-react';

interface RegisterProps {
  onLogin: (user: User) => void;
}

type RegistrationStep = 'details' | 'verification';

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  
  // Registration Flow State
  const [step, setStep] = useState<RegistrationStep>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    hobby: HobbyType.Pottery,
    customHobby: '',
    country: 'US'
  });

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username || !formData.email || !formData.password || !formData.country) {
      setError("All fields are required");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    if (formData.hobby === HobbyType.Others && !formData.customHobby?.trim()) {
      setError("Please specify your hobby");
      return;
    }

    // Check if user exists
    if (checkUserExists(formData.email, formData.username)) {
      setError("User with this email or username already exists");
      return;
    }

    // Simulate sending OTP via Backend Email Server
    setIsLoading(true);
    setTimeout(() => {
        const code = generateMockOtp();
        setGeneratedOtp(code);
        setStep('verification');
        setIsLoading(false);
        // Note: In a real app, 'code' is sent via SMTP. Here we display it in UI for demo purposes.
    }, 1500);
  };

  const handleOtpVerify = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      // Simulate network verification
      setTimeout(() => {
          if (otp === generatedOtp) {
            // Success! Create User
            const newUser: User = {
                id: Date.now().toString(),
                username: formData.username,
                email: formData.email,
                password: formData.password,
                hobby: formData.hobby,
                customHobby: formData.hobby === HobbyType.Others ? formData.customHobby : undefined,
                country: formData.country,
                isVerified: true
            };

            if (registerUser(newUser)) {
                saveCurrentUser(newUser);
                onLogin(newUser);
                navigate('/lobby');
            } else {
                setError("Registration failed during save. Please try again.");
                setIsLoading(false);
            }
          } else {
              setError("Invalid OTP. Please check your email and try again.");
              setIsLoading(false);
          }
      }, 1000);
  };

  const handleResendOtp = () => {
      setIsLoading(true);
      setError('');
      setTimeout(() => {
          const code = generateMockOtp();
          setGeneratedOtp(code);
          setIsLoading(false);
          alert(`New OTP sent to ${formData.email}`);
      }, 1000);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 space-y-6 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className={`inline-flex p-3 rounded-full mb-2 ${step === 'verification' ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-pink-600'} dark:bg-opacity-20`}>
            {step === 'verification' ? <ShieldCheck size={24} /> : <UserPlus size={24} />}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {step === 'verification' ? 'Security Verification' : 'Join HobbyHub'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {step === 'verification' 
                ? 'We sent a One-Time Password to your email' 
                : 'Connect with people who share your passion'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 text-center animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* STEP 1: Details Form */}
        {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                        type="email"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                            value={formData.confirmPassword}
                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Hobby</label>
                    <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={formData.hobby}
                    onChange={e => {
                        const newHobby = e.target.value as HobbyType;
                        setFormData({
                        ...formData, 
                        hobby: newHobby,
                        customHobby: newHobby === HobbyType.Others ? formData.customHobby : ''
                        });
                    }}
                    >
                    {HOBBIES.map(h => (
                        <option key={h.id} value={h.id}>{h.label}</option>
                    ))}
                    </select>
                </div>

                {formData.hobby === HobbyType.Others && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Specific Hobby
                    </label>
                    <input
                        type="text"
                        required={formData.hobby === HobbyType.Others}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                        placeholder="e.g. Philately, Bird Watching"
                        value={formData.customHobby}
                        onChange={e => setFormData({...formData, customHobby: e.target.value})}
                    />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
                    <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    >
                    {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-medium shadow-lg shadow-pink-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isLoading ? 'Sending OTP...' : <>Next Step: Verify <ArrowRight size={18} /></>}
                </button>

                <div className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/" className="text-pink-600 hover:text-pink-700 font-medium">
                        Login here
                    </Link>
                </div>
            </form>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 'verification' && (
            <div className="space-y-6">
                
                {/* Simulated Email Server Inbox (Because real SMTP isn't possible in browser) */}
                <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                        <Mail size={12} /> Simulated Backend Email Server
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Subject: Your HobbyHub Verification Code
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            To: {formData.email}
                        </p>
                        <div className="mt-3 text-lg font-mono font-bold text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 py-2 rounded border border-blue-100 dark:border-blue-800 border-dashed">
                            {generatedOtp}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleOtpVerify} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">
                            Enter the 6-digit code sent to your email
                        </label>
                        <input
                            type="text"
                            maxLength={6}
                            required
                            placeholder="000000"
                            className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-green-500 outline-none"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || otp.length !== 6}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-lg shadow-green-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Verifying...' : <>Verify & Create Account <CheckCircle size={18} /></>}
                    </button>
                    
                    <div className="flex justify-between items-center text-sm pt-2">
                        <button 
                            type="button" 
                            onClick={() => setStep('details')}
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                            Back to details
                        </button>
                        <button 
                            type="button" 
                            onClick={handleResendOtp}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <RotateCw size={14} /> Resend Code
                        </button>
                    </div>
                </form>
            </div>
        )}

      </div>
    </div>
  );
};

export default Register;