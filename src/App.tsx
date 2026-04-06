import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2,
  ArrowUp,
  ArrowDown,
  Activity,
  ChevronRight,
  Bluetooth,
  BluetoothOff,
  Info,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Edit3,
  LayoutGrid,
  User,
  Heart,
  LogOut,
  Download,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---
interface KillTimePoint {
  id: string;
  rpm: number;
  ms: number;
}

interface QSSettings {
  threshold: number;
  minRpm: number;
  killTimes: KillTimePoint[];
  enabled: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Profile {
  id: string;
  name: string;
  description: string;
  settings: QSSettings;
  createdAt: number;
}

// --- Mock Data ---
const INITIAL_SETTINGS: QSSettings = {
  threshold: 45,
  minRpm: 3000,
  killTimes: [
    { id: '1', rpm: 3000, ms: 85 },
    { id: '2', rpm: 6000, ms: 75 },
    { id: '3', rpm: 9000, ms: 65 },
    { id: '4', rpm: 12000, ms: 55 },
  ],
  enabled: true,
};

const QS_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'; // Quick Shifter Service UUID
const QS_SETTINGS_CHAR_UUID = '0000ff01-0000-1000-8000-00805f9b34fb'; // Settings Characteristic UUID

// --- Components ---

const Card = ({ children, className, title, icon: Icon, subtitle, action }: { children: React.ReactNode, className?: string, title?: string, icon?: any, subtitle?: string, action?: React.ReactNode }) => (
  <div className={cn("bg-surface-800 border border-surface-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden", className)}>
    {title && (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            {Icon && <Icon className="w-4 h-4 text-brand-primary" />}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h3>
            {subtitle && <p className="text-[10px] text-gray-500 font-medium">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

const Slider = ({ label, value, min, max, step = 1, unit = "", onChange, hint }: { label: string, value: number, min: number, max: number, step?: number, unit?: string, onChange: (val: number) => void, hint?: string }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-end">
      <div className="space-y-1">
        <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          {label}
          {hint && (
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-gray-600 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface-900 border border-surface-700 rounded-lg text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                {hint}
              </div>
            </div>
          )}
        </span>
      </div>
      <span className="font-mono text-brand-primary font-black text-lg">{value}{unit}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-brand-primary hover:accent-brand-primary/80 transition-all"
    />
  </div>
);

export default function App() {
  const [settings, setSettings] = useState<QSSettings>(INITIAL_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [liveRpm, setLiveRpm] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('qs_user_name') || "");
  const [showSplash, setShowSplash] = useState(true);
  const [tempName, setTempName] = useState("");
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);
  const [settingsCharacteristic, setSettingsCharacteristic] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStage, setConnectionStage] = useState<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('qs_profiles');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'default-street',
        name: 'Street Mode',
        description: 'Smooth shifting for daily commuting.',
        settings: INITIAL_SETTINGS,
        createdAt: Date.now()
      },
      {
        id: 'default-track',
        name: 'Track Day',
        description: 'Aggressive kill times for circuit use.',
        settings: {
          ...INITIAL_SETTINGS,
          killTimes: INITIAL_SETTINGS.killTimes.map(p => ({ ...p, ms: p.ms - 10 }))
        },
        createdAt: Date.now()
      }
    ];
  });
  const [activeProfileId, setActiveProfileId] = useState<string>(profiles[0]?.id || '');
  const [isEditingProfile, setIsEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  useEffect(() => {
    localStorage.setItem('qs_profiles', JSON.stringify(profiles));
  }, [profiles]);

  // Real-time Sync to Bluetooth Device
  useEffect(() => {
    const sync = async () => {
      if (bluetoothDevice && settingsCharacteristic) {
        try {
          const encoder = new TextEncoder();
          // Compact format for BLE transmission
          const payload = JSON.stringify({
            t: settings.threshold,
            m: settings.minRpm,
            e: settings.enabled,
            k: settings.killTimes.map(p => [p.rpm, p.ms])
          });
          await settingsCharacteristic.writeValue(encoder.encode(payload));
        } catch (err) {
          console.error("Sync error:", err);
        }
      }
    };

    const timeoutId = setTimeout(sync, 500); // Debounce sync
    return () => clearTimeout(timeoutId);
  }, [settings, bluetoothDevice, settingsCharacteristic]);

  // Splash Screen Timer
  useEffect(() => {
    if (userName && showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userName, showSplash]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserName(tempName.trim());
      localStorage.setItem('qs_user_name', tempName.trim());
    }
  };

  const handleExit = () => {
    setUserName("");
    localStorage.removeItem('qs_user_name');
    setShowSplash(true);
    setTempName("");
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Simulate Live Data (Demo Mode) - Disabled by default to prevent "demo mode" behavior
  useEffect(() => {
    // Only simulate if not connected and if we wanted a demo mode
    // For now, we disable it as requested by the user
    /*
    const interval = setInterval(() => {
      setLiveRpm(prev => {
        const target = Math.random() > 0.8 ? 12000 : 4000 + Math.random() * 4000;
        const nextRpm = Math.floor(prev + (target - prev) * 0.1);
        // Simulate speed based on RPM (roughly)
        setLiveSpeed(Math.floor(nextRpm / 65));
        return nextRpm;
      });
    }, 100);
    return () => clearInterval(interval);
    */
    setLiveRpm(0);
    setLiveSpeed(0);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast("Configuration applied successfully!", "success");
    }, 1200);
  };

  const connectBluetooth = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      addToast("Bluetooth not supported in this browser.", "error");
      return;
    }

    setIsConnecting(true);
    setConnectionStage("Scanning...");
    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [QS_SERVICE_UUID] }],
        optionalServices: ['battery_service', QS_SERVICE_UUID]
      });
      
      device.addEventListener('gattserverdisconnected', () => {
        setBluetoothDevice(null);
        setConnectionStage("Disconnected");
        addToast("Device disconnected", "info");
      });

      setConnectionStage("Connecting...");
      const server = await device.gatt.connect();
      
      setConnectionStage("Service Discovery...");
      const service = await server.getPrimaryService(QS_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(QS_SETTINGS_CHAR_UUID);
      
      setSettingsCharacteristic(characteristic);
      setBluetoothDevice(device);
      setConnectionStage("Connected");
      addToast(`Connected to ${device.name || 'QS Device'}`, "success");
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Failed to connect.";
      if (msg.includes("Permissions Policy")) {
        msg = "Permission denied. Open in a new tab for Bluetooth access.";
      }
      addToast(msg, "error");
      setConnectionStage(`Error: ${msg.substring(0, 30)}${msg.length > 30 ? '...' : ''}`);
      setBluetoothDevice(null);
      
      // Reset after a delay so user can see the error but then try again
      setTimeout(() => {
        setConnectionStage("");
        setIsConnecting(false);
      }, 4000);
      return;
    }
    setIsConnecting(false);
  };

  const disconnectBluetooth = () => {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
      bluetoothDevice.gatt.disconnect();
    }
    setBluetoothDevice(null);
    setSettingsCharacteristic(null);
  };

  const updatePoint = (id: string, field: 'rpm' | 'ms', value: number) => {
    setSettings(prev => ({
      ...prev,
      killTimes: prev.killTimes.map(p => p.id === id ? { ...p, [field]: value } : p)
        .sort((a, b) => a.rpm - b.rpm)
    }));
  };

  const addPoint = () => {
    const lastPoint = settings.killTimes[settings.killTimes.length - 1];
    const newRpm = lastPoint ? lastPoint.rpm + 1000 : 3000;
    if (newRpm > 15000) {
      addToast("Maximum RPM limit reached", "error");
      return;
    }
    const newPoint: KillTimePoint = {
      id: Math.random().toString(36).substr(2, 9),
      rpm: newRpm,
      ms: 60
    };
    setSettings(prev => ({
      ...prev,
      killTimes: [...prev.killTimes, newPoint].sort((a, b) => a.rpm - b.rpm)
    }));
    addToast("New RPM point added", "info");
  };

  const removePoint = (id: string) => {
    if (settings.killTimes.length <= 2) {
      addToast("Minimum 2 points required for mapping", "error");
      return;
    }
    setSettings(prev => ({
      ...prev,
      killTimes: prev.killTimes.filter(p => p.id !== id)
    }));
    addToast("Point removed", "info");
  };

  const saveNewProfile = () => {
    const newProfile: Profile = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New Profile ${profiles.length + 1}`,
      description: 'Custom configuration profile.',
      settings: JSON.parse(JSON.stringify(settings)),
      createdAt: Date.now()
    };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    addToast("New profile created", "success");
  };

  const loadProfile = (profile: Profile) => {
    setSettings(JSON.parse(JSON.stringify(profile.settings)));
    setActiveProfileId(profile.id);
    addToast(`Loaded ${profile.name}`, "info");
  };

  const deleteProfile = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;

    if (profiles.length <= 1) {
      addToast("Cannot delete the last profile", "error");
      return;
    }
    setProfileToDelete(profile);
  };

  const confirmDelete = () => {
    if (!profileToDelete) return;
    
    const id = profileToDelete.id;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(profiles.find(p => p.id !== id)?.id || '');
    }
    setProfileToDelete(null);
    addToast("Profile deleted", "info");
  };

  const updateProfileInfo = (id: string, name: string, description: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, name, description } : p));
    setIsEditingProfile(null);
    setEditName("");
    setEditDesc("");
    addToast("Profile updated", "success");
  };

  const startEditing = (profile: Profile) => {
    setIsEditingProfile(profile.id);
    setEditName(profile.name);
    setEditDesc(profile.description);
  };

  const cancelEditing = () => {
    setIsEditingProfile(null);
    setEditName("");
    setEditDesc("");
  };

  const overwriteProfile = (id: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, settings: JSON.parse(JSON.stringify(settings)) } : p));
    addToast("Profile settings updated", "success");
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white font-sans p-4 md:p-8 selection:bg-brand-primary/30">
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-surface-900 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="bg-brand-primary/10 p-8 rounded-[2.5rem] border border-brand-primary/20 shadow-[0_0_50px_rgba(0,255,136,0.15)] relative">
                <Zap className="w-20 h-20 text-brand-primary fill-brand-primary/20" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-brand-primary/20 blur-3xl rounded-full -z-10"
                />
              </div>
            </motion.div>

            {!userName ? (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="max-w-md w-full space-y-8"
              >
                <div>
                  <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-2 leading-[0.85]">
                    Quick Shifter<br />
                    <span className="text-brand-primary">Antasena</span>
                  </h1>
                  <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Your Performance Partner</p>
                </div>

                <form onSubmit={handleNameSubmit} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                    <input 
                      type="text" 
                      placeholder="What should I call you?"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full bg-surface-800 border-2 border-surface-700 rounded-2xl py-5 pl-12 pr-6 text-white font-bold focus:outline-none focus:border-brand-primary transition-all placeholder:text-gray-700"
                      autoFocus
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!tempName.trim()}
                    className="w-full bg-brand-primary text-surface-900 py-5 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-[0_10px_30px_rgba(0,255,136,0.2)] disabled:opacity-50"
                  >
                    Let's Ride
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h2 className="text-3xl font-black tracking-tight text-white">
                    Welcome back, <span className="text-brand-primary">{userName}</span>!
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-gray-500 font-bold uppercase tracking-widest text-xs">
                    <Heart className="w-4 h-4 text-red-500 animate-pulse" />
                    Ready for a new adventure?
                  </div>
                </div>

                <div className="mt-8">
                  <RefreshCw className="w-6 h-6 text-brand-primary animate-spin mx-auto" />
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-4">Initializing Systems...</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Toast System */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border min-w-[280px]",
                toast.type === 'success' ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" :
                toast.type === 'error' ? "bg-red-500/10 border-red-500/30 text-red-500" :
                "bg-blue-500/10 border-blue-500/30 text-blue-500"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
               toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
               <Info className="w-5 h-5" />}
              <span className="text-sm font-bold tracking-tight">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {profileToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileToDelete(null)}
              className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-surface-800 border border-surface-700 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-500/10 rounded-2xl">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Confirm Deletion</h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-300 leading-relaxed mb-8">
                Are you sure you want to delete <span className="text-white font-bold">"{profileToDelete.name}"</span>? 
                All custom settings for this profile will be permanently removed.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setProfileToDelete(null)}
                  className="py-4 px-6 rounded-2xl bg-surface-700/50 text-gray-300 font-black text-xs uppercase tracking-widest hover:bg-surface-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="py-4 px-6 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1 flex justify-between items-center w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="bg-brand-primary/10 p-3 sm:p-4 rounded-2xl border border-brand-primary/20 shadow-[0_0_30px_rgba(0,255,136,0.1)] shrink-0">
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-brand-primary fill-brand-primary/20" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic leading-none">
                  <span className="block text-white mb-0.5 sm:mb-1">Quick Shifter</span>
                  <div className="flex items-center gap-2 text-brand-primary">
                    <span className="truncate">Antasena</span>
                    <span className="bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded text-[8px] font-black tracking-tighter uppercase border border-brand-primary/20 not-italic shrink-0">Pro</span>
                  </div>
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 sm:mt-2">
                  <div className="flex items-center gap-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full", settings.enabled ? "bg-brand-primary animate-pulse" : "bg-red-500")} />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">
                      {settings.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <span className="text-gray-700 text-[8px] hidden xs:inline">•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Antasena Pro</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exit Button - Aligned with Title on the Right */}
            <button 
              onClick={handleExit}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 hover:bg-red-500/20 transition-all group shadow-lg shrink-0"
              title="Exit / Change User"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Exit</span>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {deferredPrompt && (
              <button 
                onClick={handleInstall}
                className="flex items-center justify-center gap-2 bg-brand-primary text-surface-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg animate-pulse"
              >
                <Download className="w-3 h-3" /> Instal Aplikasi
              </button>
            )}
            
            {bluetoothDevice ? (
              <button 
                onClick={disconnectBluetooth}
                className="flex-1 lg:w-56 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-500 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                <BluetoothOff className="w-4 h-4" /> Disconnect
              </button>
            ) : (
              <button 
                onClick={connectBluetooth}
                disabled={isConnecting}
                className="flex-1 lg:w-56 flex items-center justify-center gap-2 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary/20 transition-all disabled:opacity-50"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
                {isConnecting ? connectionStage : "Connect Bluetooth"}
              </button>
            )}

            <button 
              onClick={() => {
                setSettings({...settings, enabled: !settings.enabled});
                addToast(settings.enabled ? "System Disabled" : "System Enabled", settings.enabled ? "error" : "success");
              }}
              className={cn(
                "flex-1 lg:w-56 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border",
                settings.enabled 
                  ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20" 
                  : "bg-brand-primary/10 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20"
              )}
            >
              {settings.enabled ? "Kill System" : "Ignite System"}
            </button>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Telemetry & General Config */}
          <div className="lg:col-span-4 space-y-8">
            <Card title="Configuration Profiles" icon={LayoutGrid} subtitle="Save and load presets">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {profiles.map(profile => (
                    <div 
                      key={profile.id}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all group relative",
                        activeProfileId === profile.id 
                          ? "bg-brand-primary/10 border-brand-primary/50 shadow-[0_0_20px_rgba(0,255,136,0.05)]" 
                          : "bg-surface-700/20 border-surface-700 hover:border-surface-600"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 cursor-pointer" onClick={() => loadProfile(profile)}>
                          <h4 className={cn("text-xs font-black uppercase tracking-widest", activeProfileId === profile.id ? "text-brand-primary" : "text-white")}>
                            {profile.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-medium mt-1 line-clamp-1">{profile.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => startEditing(profile)}
                            className="p-1.5 text-gray-500 hover:text-white transition-colors"
                            title="Edit Profile Info"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => overwriteProfile(profile.id)}
                            className="p-1.5 text-gray-500 hover:text-brand-primary transition-colors"
                            title="Overwrite with current settings"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => deleteProfile(profile.id)}
                            className="p-1.5 text-red-500/50 hover:text-red-500 transition-colors"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {isEditingProfile === profile.id && (
                        <div className="mt-4 pt-4 border-t border-surface-700 space-y-3">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary"
                            placeholder="Profile Name"
                          />
                          <textarea 
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary h-16 resize-none"
                            placeholder="Description"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={cancelEditing}
                              className="flex-1 py-2 rounded-lg bg-surface-700 text-gray-300 font-bold text-[10px] uppercase tracking-widest hover:bg-surface-600 transition-all"
                            >
                              Batal
                            </button>
                            <button 
                              onClick={() => updateProfileInfo(profile.id, editName, editDesc)}
                              className="flex-1 py-2 rounded-lg bg-brand-primary text-surface-900 font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all"
                            >
                              Oke
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={saveNewProfile}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-700 rounded-xl text-gray-500 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all font-black uppercase text-[10px] tracking-widest"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Profile
                </button>
              </div>
            </Card>

            <Card title="Dashboard Monitor" icon={Activity} subtitle="Real-time engine data">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-black font-mono text-brand-primary leading-none tracking-tighter">
                    {liveRpm.toLocaleString()}
                  </span>
                  <span className="text-gray-600 font-black text-sm mb-1 ml-1 uppercase tracking-widest">RPM</span>
                </div>
                
                <div className="flex items-end gap-2 border-l-0 sm:border-l border-surface-700 sm:pl-6 h-12">
                  <span className="text-4xl font-black font-mono text-white leading-none tracking-tighter">
                    {liveSpeed}
                  </span>
                  <span className="text-gray-600 font-black text-xs mb-0.5 ml-1 uppercase tracking-widest">KM/H</span>
                </div>
              </div>
              
              {/* Dynamic Segmented Sporty RPM Bar */}
              <div className="flex gap-1.5 h-6 w-full">
                {Array.from({ length: 30 }).map((_, i) => {
                  const maxDisplayRpm = 15000;
                  const segmentRpm = (i / 30) * maxDisplayRpm;
                  const currentPercentage = (liveRpm / maxDisplayRpm) * 100;
                  const isActive = (i / 30) * 100 <= currentPercentage;
                  
                  const sortedPoints = [...settings.killTimes].sort((a, b) => a.rpm - b.rpm);
                  const lastPoint = sortedPoints[sortedPoints.length - 1];
                  const secondLastPoint = sortedPoints[sortedPoints.length - 2];
                  
                  let activeColor = "bg-brand-primary";
                  let glowColor = "rgba(0,255,136,0.4)";
                  
                  if (lastPoint && segmentRpm >= lastPoint.rpm) {
                    activeColor = "bg-red-500";
                    glowColor = "rgba(239,68,68,0.4)";
                  } else if (secondLastPoint && segmentRpm >= secondLastPoint.rpm) {
                    activeColor = "bg-yellow-400";
                    glowColor = "rgba(250,204,21,0.4)";
                  }
                  
                  return (
                    <div 
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm transition-all duration-150",
                        isActive 
                          ? cn(activeColor, `shadow-[0_0_15px_${glowColor}] scale-y-125`) 
                          : cn(activeColor, "opacity-10")
                      )}
                    />
                  );
                })}
              </div>
            </Card>

            <Card title="General Config" icon={ChevronRight} subtitle="Core system behavior">
              <div className="space-y-10">
                <Slider 
                  label="Sensor Sensitivity" 
                  value={settings.threshold} 
                  min={5} 
                  max={100} 
                  unit="%" 
                  hint="How much force is needed on the shift lever to trigger the kill."
                  onChange={(val) => setSettings({...settings, threshold: val})} 
                />
                <Slider 
                  label="Min Activation RPM" 
                  value={settings.minRpm} 
                  min={1000} 
                  max={8000} 
                  step={100} 
                  unit=" RPM" 
                  hint="The system will not trigger below this engine speed."
                  onChange={(val) => setSettings({...settings, minRpm: val})} 
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Table */}
          <div className="lg:col-span-8 space-y-8">
            <Card 
              title="RPM Mapping Table" 
              icon={RefreshCw} 
              subtitle="Precise control points"
              action={
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 bg-brand-primary text-surface-900 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
                >
                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {isSaving ? "Writing..." : "Write"}
                </button>
              }
            >
              <div className="w-full">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-black">
                      <th className="px-2 pb-1">RPM Point</th>
                      <th className="px-2 pb-1">Kill Time</th>
                      <th className="px-2 pb-1 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {settings.killTimes.map((point, index) => {
                        const isLast = index === settings.killTimes.length - 1;
                        const isSecondLast = index === settings.killTimes.length - 2;
                        let dotColor = "bg-brand-primary";
                        if (isLast) dotColor = "bg-red-500";
                        else if (isSecondLast) dotColor = "bg-yellow-400";

                        return (
                          <motion.tr 
                            key={point.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="group bg-surface-700/10 hover:bg-surface-700/20 transition-all rounded-xl overflow-hidden"
                          >
                            <td className="py-2 px-2 first:rounded-l-xl">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-1 h-6 rounded-full", dotColor)} />
                                <div className="relative flex-1 min-w-0">
                                  <input 
                                    type="number" 
                                    value={point.rpm === 0 ? "" : point.rpm}
                                    onChange={(e) => updatePoint(point.id, 'rpm', Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-surface-800 border border-surface-600 rounded-lg pl-2 pr-8 py-2 w-full font-mono text-xs text-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-inner"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-600">RPM</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <div className="relative">
                                <input 
                                  type="number" 
                                  value={point.ms === 0 ? "" : point.ms}
                                  onChange={(e) => updatePoint(point.id, 'ms', Number(e.target.value))}
                                  onFocus={(e) => e.target.select()}
                                  className="bg-surface-800 border border-surface-600 rounded-lg pl-2 pr-7 py-2 w-full max-w-[80px] font-mono text-xs text-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-inner"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-600">ms</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right last:rounded-r-xl">
                              <button 
                                onClick={() => removePoint(point.id)}
                                className="inline-flex items-center justify-center p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Remove Point"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[8px] text-gray-600 font-bold flex items-center gap-1.5 px-1 uppercase tracking-widest">
                  <Info className="w-3 h-3" />
                  Manage points for precise mapping
                </p>
                <button 
                  onClick={addPoint}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 border-2 border-dashed border-surface-700 rounded-xl text-gray-500 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all font-black uppercase text-[9px] tracking-[0.2em]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Point
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
}

