import React, { useState, useEffect } from 'react';
import { Users, X, UserPlus, UserMinus, MapPin, Calendar, Type, Settings, Key, Database, Save, CheckCircle, Shield, Image as ImageIcon, ArrowRight, Edit2, Wifi, Minus, Plus, Loader2, Check, PenSquare } from 'lucide-react';
import { User, TripInfo } from '../types';
import { AVATAR_POOL } from '../constants';
import { getGasUrl, setGasUrl, testConnection } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  tripInfo: TripInfo;
  setTripInfo: React.Dispatch<React.SetStateAction<TripInfo>>;
  currentUser: User;
  onManualSave: () => Promise<void>;
  onRefreshData: () => Promise<void>; 
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, members, setMembers, tripInfo, setTripInfo, currentUser, onManualSave, onRefreshData }) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'system'>('info');
  const [apiKey, setApiKey] = useState('');
  const [gasUrl, setGasUrlState] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  const [pickingAvatarForId, setPickingAvatarForId] = useState<string | null>(null);

  // Rename State
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editNameVal, setEditNameVal] = useState('');

  useEffect(() => {
    if (isOpen) {
        setApiKey(localStorage.getItem('tanuki_gemini_key') || '');
        setGasUrlState(getGasUrl());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin = currentUser.isAdmin;

  const startEditing = (member: User) => {
      setEditingMemberId(member.id);
      setEditNameVal(member.name);
  };

  const saveEditing = (id: string) => {
      if (!editNameVal.trim()) return;
      setMembers(prev => prev.map(m => m.id === id ? { ...m, name: editNameVal } : m));
      setEditingMemberId(null);
      setEditNameVal('');
  };

  const cancelEditing = () => {
      setEditingMemberId(null);
      setEditNameVal('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#FFFEF5] w-full max-w-md rounded-3xl shadow-xl overflow-hidden border-4 border-[#E0D8C0] flex flex-col max-h-[90vh]">
        {pickingAvatarForId && (
            <div className="absolute inset-0 z-50 bg-[#FFFEF5] flex flex-col">
                <div className="bg-[#E76F51] p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold text-lg">選擇頭像</h3>
                    <button onClick={() => setPickingAvatarForId(null)}><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-5 gap-3">
                    {AVATAR_POOL.map((avatar, idx) => (
                        <button key={idx} onClick={() => { setMembers(prev => prev.map(m => m.id === pickingAvatarForId ? { ...m, avatar } : m)); setPickingAvatarForId(null); }} className="text-3xl p-2 rounded-xl hover:bg-gray-100">{avatar}</button>
                    ))}
                </div>
            </div>
        )}

        <div className="bg-[#7BC64F] p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20} /> 設定</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className="flex border-b border-[#E0D8C0] bg-white">
          <button onClick={() => setActiveTab('info')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'info' ? 'text-[#7BC64F] border-b-2 border-[#7BC64F]' : 'text-[#8C7B65]'}`}>活動</button>
          <button onClick={() => setActiveTab('members')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'members' ? 'text-[#7BC64F] border-b-2 border-[#7BC64F]' : 'text-[#8C7B65]'}`}>成員</button>
          <button onClick={() => setActiveTab('system')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'system' ? 'text-[#7BC64F] border-b-2 border-[#7BC64F]' : 'text-[#8C7B65]'}`}>系統</button>
        </div>
        
        <div className="p-5 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-[#8C7B65] mb-1">活動名稱</label><input type="text" value={tripInfo.title} onChange={(e) => setTripInfo({...tripInfo, title: e.target.value})} disabled={!isAdmin} className="w-full bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-xl px-3 py-2 text-sm"/></div>
              <div><label className="block text-xs font-bold text-[#8C7B65] mb-1">日期</label><input type="text" value={tripInfo.date} onChange={(e) => setTripInfo({...tripInfo, date: e.target.value})} disabled={!isAdmin} className="w-full bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-xl px-3 py-2 text-sm"/></div>
              <div><label className="block text-xs font-bold text-[#8C7B65] mb-1">地點</label><input type="text" value={tripInfo.location} onChange={(e) => setTripInfo({...tripInfo, location: e.target.value})} disabled={!isAdmin} className="w-full bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-xl px-3 py-2 text-sm"/></div>
              <div><label className="block text-xs font-bold text-[#8C7B65] mb-1">相簿連結</label><input type="text" value={tripInfo.albumUrl || ''} onChange={(e) => setTripInfo({...tripInfo, albumUrl: e.target.value})} disabled={!isAdmin} className="w-full bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-xl px-3 py-2 text-sm"/></div>
              {isAdmin && <button onClick={onManualSave} className="w-full bg-[#7BC64F] text-white py-3 rounded-xl font-bold mt-4">儲存活動資訊</button>}
            </div>
          )}
          
          {activeTab === 'members' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex gap-2 mb-4"><input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="新成員名字" className="flex-1 bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-full px-4 py-2 text-sm"/><button onClick={() => { if(!newMemberName) return; setMembers([...members, { id: `u-${Date.now()}`, name: newMemberName, avatar: '👤', headcount: 1 }]); setNewMemberName(''); }} className="bg-[#7BC64F] text-white p-2.5 rounded-full"><Plus size={20}/></button></div>
              )}
              {members.map(member => (
                <div key={member.id} className="p-3 bg-white border border-[#E0D8C0] rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <button onClick={() => isAdmin && setPickingAvatarForId(member.id)} className="w-10 h-10 bg-[#E9F5D8] rounded-full flex items-center justify-center border border-[#7BC64F] text-xl shrink-0">{member.avatar}</button>
                        
                        {editingMemberId === member.id ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input 
                                    type="text" 
                                    value={editNameVal} 
                                    onChange={(e) => setEditNameVal(e.target.value)}
                                    className="w-full bg-[#F9F7F2] border border-[#E0D8C0] rounded-lg px-2 py-1 text-sm outline-none focus:border-[#7BC64F]"
                                    autoFocus
                                />
                                <button onClick={() => saveEditing(member.id)} className="p-1.5 bg-[#7BC64F] text-white rounded-lg"><Check size={14}/></button>
                                <button onClick={cancelEditing} className="p-1.5 bg-[#E0D8C0] text-white rounded-lg"><X size={14}/></button>
                            </div>
                        ) : (
                            <span className="font-bold text-sm text-[#5D4632]">{member.name}</span>
                        )}
                    </div>
                    
                    {isAdmin && editingMemberId !== member.id && (
                        <div className="flex items-center gap-1">
                            <button onClick={() => startEditing(member)} className="p-2 text-[#E0D8C0] hover:text-[#F4A261] hover:bg-[#F9F7F2] rounded-full transition-colors"><PenSquare size={18}/></button>
                            {member.id !== currentUser.id && (
                                <button onClick={() => setMembers(members.filter(m => m.id !== member.id))} className="p-2 text-[#E0D8C0] hover:text-[#E76F51] hover:bg-[#F9F7F2] rounded-full transition-colors"><UserMinus size={18}/></button>
                            )}
                        </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-[#8C7B65] mb-1">Gemini API Key</label><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-xl px-3 py-2 text-sm"/></div>
              <div><label className="block text-xs font-bold text-[#8C7B65] mb-1">雲端資料庫網址</label><input type="text" value={gasUrl} onChange={(e) => setGasUrlState(e.target.value)} className="w-full bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-xl px-3 py-2 text-sm"/></div>
              <button onClick={() => { localStorage.setItem('tanuki_gemini_key', apiKey); setGasUrl(gasUrl); onRefreshData(); alert("設定已儲存"); }} className="w-full bg-[#F4A261] text-white py-3 rounded-xl font-bold shadow-md">儲存設定</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;