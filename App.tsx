import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Utensils, 
  BookOpen, 
  ClipboardList, 
  Wallet, 
  Leaf, 
  MapPin, 
  Shield, 
  Settings,
  LogOut,
  RefreshCw,
  Backpack,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';
import { 
  INITIAL_GEAR, 
  INITIAL_INGREDIENTS, 
  INITIAL_BILLS, 
  INITIAL_MEMBERS, 
  TRIP_INFO as DEFAULT_TRIP_INFO
} from './constants';
import { TabType, TripInfo, User } from './types';
import { fetchFromCloud, saveToCloud, getGasUrl, AppData, archiveTrip } from './services/storage';

// Components
import LoginScreen from './components/LoginScreen';
import GearSection from './components/GearSection';
import KitchenSection from './components/KitchenSection';
import MenuSection from './components/MenuSection';
import SelfCheckSection from './components/SelfCheckSection';
import BillSection from './components/BillSection';
import AlbumSection from './components/AlbumSection';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('gear'); 
  
  const [gearList, setGearList] = useState(INITIAL_GEAR);
  const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [bills, setBills] = useState(INITIAL_BILLS); 
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [tripInfo, setTripInfo] = useState<TripInfo>(DEFAULT_TRIP_INFO);

  const [checkedDeparture, setCheckedDeparture] = useState<Record<string, boolean>>({});
  const [checkedReturn, setCheckedReturn] = useState<Record<string, boolean>>({});

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  const loadData = async () => {
      setIsLoading(true);
      const gasUrl = getGasUrl();
      if (!gasUrl) {
        setIsLoading(false);
        return;
      }

      try {
        const cloudData = await fetchFromCloud();
        if (cloudData) {
          setGearList(cloudData.gearList || []);
          setIngredients(cloudData.ingredients || []);
          setMealPlans(cloudData.mealPlans || []);
          setBills(cloudData.bills || []);
          let loadedMembers = cloudData.members || [];
          loadedMembers = loadedMembers.map(m => m.id === 'admin_tanuki' ? { ...m, isAdmin: true } : m);
          const hasAdmin = loadedMembers.some(m => m.id === 'admin_tanuki');
          if (!hasAdmin) {
              const defaultAdmin = INITIAL_MEMBERS.find(m => m.isAdmin);
              if (defaultAdmin) loadedMembers = [defaultAdmin, ...loadedMembers];
          }
          setMembers(loadedMembers);
          setTripInfo({ ...DEFAULT_TRIP_INFO, ...cloudData.tripInfo });
          setCheckedDeparture(cloudData.checkedDeparture || {});
          setCheckedReturn(cloudData.checkedReturn || {});
        }
        setSyncError(false);
      } catch (e) {
        setSyncError(true);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualSave = async () => {
    if (!getGasUrl()) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSyncing(true);
    const dataToSave: AppData = { gearList, ingredients, mealPlans, bills, members, tripInfo, checkedDeparture, checkedReturn, lastUpdated: Date.now() };
    try {
      await saveToCloud(dataToSave);
      setSyncError(false);
    } catch (e) {
      setSyncError(true);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isFirstLoad.current || isLoading) {
      isFirstLoad.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!getGasUrl()) return;
      setIsSyncing(true);
      const dataToSave: AppData = { gearList, ingredients, mealPlans, bills, members, tripInfo, checkedDeparture, checkedReturn, lastUpdated: Date.now() };
      try {
        await saveToCloud(dataToSave);
        setSyncError(false);
      } catch (e) {
        setSyncError(true);
      } finally {
        setIsSyncing(false);
      }
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [gearList, ingredients, mealPlans, bills, members, tripInfo, checkedDeparture, checkedReturn]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E9F5D8] flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-[#7BC64F] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#5D4632] font-bold">正在讀取雲端資料...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen members={members} onLogin={(user) => setCurrentUser(user)} />;
  }

  const progress = (() => {
    const myPublicGear = gearList.filter(g => g.category === 'public' && g.owner?.id === currentUser.id);
    const myPersonalGear = gearList.filter(g => g.category === 'personal');
    const myIngredients = ingredients.filter(item => item.owner && item.owner.id === currentUser.id);
    const total = myPublicGear.length + myPersonalGear.length + myIngredients.length;
    if (total === 0) return 0;
    const checkedCount = [...myPublicGear, ...myPersonalGear].filter(item => checkedDeparture[`gear-${item.id}`]).length + 
    myIngredients.filter(item => checkedDeparture[`food-${item.id}`]).length;
    return Math.round((checkedCount / total) * 100);
  })();

  return (
    <div className="min-h-screen bg-[#E9F5D8] font-sans text-[#5D4632] pb-24">
      {syncError && (
          <div className="bg-[#E76F51] text-white p-3 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50">
              <AlertTriangle size={16} /> <span>同步失敗，請檢查網路連線。</span>
          </div>
      )}
      <div className="bg-[#7BC64F] text-white p-6 pb-12 shadow-sm relative overflow-hidden rounded-b-[40px]">
        <div className="relative z-10 w-full max-w-lg md:max-w-3xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div className="text-xs bg-[#5da135] px-3 py-1 rounded-full text-white font-bold">{tripInfo.date}</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                {members.slice(0, 4).map((m, i) => (
                  <div key={i} className={`relative flex items-center justify-center rounded-full shadow-sm ${m.id === currentUser.id ? 'w-12 h-12 text-2xl bg-white border-4 border-[#F4A261] z-10' : 'w-8 h-8 text-xs bg-[#E9F5D8] border-2 border-[#7BC64F]'}`} title={m.name}>{m.avatar}</div>
                ))}
              </div>
              <button onClick={() => setIsSettingsModalOpen(true)} className="bg-[#5da135] p-2 rounded-full text-[#F2CC8F]"><Settings size={18} /></button>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><Leaf size={24} className="text-[#F7DC6F]" fill="currentColor" />{tripInfo.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tripInfo.location)}`, '_blank')} className="bg-white/10 px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1"><MapPin size={10} />{tripInfo.location}</button>
            <div className="bg-[#F4A261] px-2.5 py-1 rounded-full text-[10px] font-bold">備 {progress}%</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg md:max-w-3xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-[#FFFEF5] rounded-3xl p-1.5 shadow-md flex mb-6 border border-[#E0D8C0] sticky top-4 z-40">
          <button onClick={() => setActiveTab('gear')} className={`flex-1 py-3 text-xs font-bold rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'gear' ? 'bg-[#F4A261] text-white' : 'text-[#8C7B65]'}`}><CheckSquare size={18} />裝備</button>
          <button onClick={() => setActiveTab('kitchen')} className={`flex-1 py-3 text-xs font-bold rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'kitchen' ? 'bg-[#7BC64F] text-white' : 'text-[#8C7B65]'}`}><Utensils size={18} />廚房</button>
          <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 text-xs font-bold rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'menu' ? 'bg-[#E76F51] text-white' : 'text-[#8C7B65]'}`}><BookOpen size={18} />菜單</button>
          <button onClick={() => setActiveTab('check')} className={`flex-1 py-3 text-xs font-bold rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'check' ? 'bg-[#8ECAE6] text-[#5D4632]' : 'text-[#8C7B65]'}`}><ClipboardList size={18} />清單</button>
          <button onClick={() => tripInfo.albumUrl ? window.open(tripInfo.albumUrl, '_blank') : setActiveTab('album')} className={`flex-1 py-3 text-xs font-bold rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'album' ? 'bg-[#9D8189] text-white' : 'text-[#8C7B65]'}`}><ImageIcon size={18} />相本</button>
          <button onClick={() => setActiveTab('bill')} className={`flex-1 py-3 text-xs font-bold rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'bill' ? 'bg-[#F2CC8F] text-[#5D4632]' : 'text-[#8C7B65]'}`}><Wallet size={18} />分帳</button>
        </div>

        {activeTab === 'gear' && <GearSection gearList={gearList} setGearList={setGearList} currentUser={currentUser} members={members} tripInfo={tripInfo} />}
        {activeTab === 'kitchen' && <KitchenSection ingredients={ingredients} setIngredients={setIngredients} mealPlans={mealPlans} setMealPlans={setMealPlans} currentUser={currentUser} members={members} />}
        {activeTab === 'menu' && <MenuSection mealPlans={mealPlans} setMealPlans={setMealPlans} members={members} ingredients={ingredients} setIngredients={setIngredients} currentUser={currentUser} />}
        {activeTab === 'check' && <SelfCheckSection gearList={gearList} ingredients={ingredients} mealPlans={mealPlans} currentUser={currentUser} checkedDeparture={checkedDeparture} setCheckedDeparture={setCheckedDeparture} checkedReturn={checkedReturn} setCheckedReturn={setCheckedReturn} />}
        {activeTab === 'album' && <AlbumSection tripInfo={tripInfo} setTripInfo={setTripInfo} />}
        {activeTab === 'bill' && <BillSection bills={bills} setBills={setBills} members={members} currentUser={currentUser} />}
      </div>
      
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} members={members} setMembers={setMembers} tripInfo={tripInfo} setTripInfo={setTripInfo} currentUser={currentUser} onManualSave={handleManualSave} onRefreshData={loadData} />

      <div className="text-center mt-8 pb-10 text-[10px] text-[#8C7B65] font-bold flex flex-col items-center gap-2">
        <span>目前登入: {currentUser.name} {currentUser.avatar}</span>
        <button onClick={() => setCurrentUser(null)} className="flex items-center gap-1 text-[#E76F51] bg-white px-4 py-1.5 rounded-full shadow-sm"><LogOut size={12} /> 切換使用者</button>
      </div>
    </div>
  );
}