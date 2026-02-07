import React from 'react';
import { X, BookOpen, User, Shield, Tent, Utensils, ClipboardList, Image as ImageIcon, Wallet, Settings, HelpCircle, AlertCircle } from 'lucide-react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const SectionTitle: React.FC<{ icon: React.ReactNode, title: string, color: string }> = ({ icon, title, color }) => (
    <h3 className={`text-lg font-extrabold flex items-center gap-2 mt-6 mb-3 border-b-2 pb-1 ${color}`}>
      {icon} {title}
    </h3>
  );

  const SubTitle: React.FC<{ title: string }> = ({ title }) => (
    <h4 className="font-bold text-[#5D4632] mt-3 mb-1 text-sm bg-[#F9F7F2] inline-block px-2 py-1 rounded-lg">
      {title}
    </h4>
  );

  const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="text-sm text-[#8C7B65] leading-relaxed ml-4 list-disc marker:text-[#E0D8C0]">
      {children}
    </li>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFEF5] w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden border-4 border-[#E0D8C0] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#8ECAE6] p-4 flex justify-between items-center text-[#5D4632] border-b border-[#E0D8C0]">
          <h3 className="font-bold text-lg flex items-center gap-2 text-white">
            <HelpCircle size={24} /> 狸克的露營計畫書 V2.0 操作手冊
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white">
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto scrollbar-hide">
          
          <div className="bg-[#E9F5D8] p-4 rounded-2xl border border-[#7BC64F]/30 mb-6">
            <h4 className="font-bold text-[#5da135] mb-2 flex items-center gap-2"><BookOpen size={18}/> 系統簡介</h4>
            <p className="text-sm text-[#5D4632] leading-relaxed">
              本系統是一個結合「動物森友會」風格的協作露營管理工具，旨在解決團體露營中<span className="font-bold">裝備認領</span>、<span className="font-bold">食材管理</span>、<span className="font-bold">菜單規劃</span>與<span className="font-bold">費用分攤</span>的痛點。並導入 Google Gemini AI，協助自動生成食譜與解析菜單。
            </p>
          </div>

          {/* 1. Login */}
          <SectionTitle icon={<User size={20}/>} title="登入與角色" color="text-[#E76F51] border-[#E76F51]/30" />
          <ul className="space-y-2">
            <ListItem>
              <span className="font-bold text-[#5D4632]">一般露營成員</span>：點擊自己的頭像即可直接登入。可編輯個人裝備、認領公用物資、記帳。
            </ListItem>
            <ListItem>
              <span className="font-bold text-[#E76F51]">營地管理員 (島主/狸克)</span>：點擊「狸克」頭像需輸入密碼（預設：<code className="bg-gray-100 px-1 rounded font-mono text-[#E76F51]">young</code>）。擁有最高權限，可強制指派、編輯活動資訊、管理成員與系統設定。
            </ListItem>
          </ul>

          {/* 2. Modules */}
          <SectionTitle icon={<ClipboardList size={20}/>} title="功能模組操作指南" color="text-[#2A9D8F] border-[#2A9D8F]/30" />
          
          <SubTitle title="🛠️ 裝備 (Gear)" />
          <ul className="space-y-1 mb-4">
            <ListItem><b>公用裝備</b>：點擊標題可展開/收合分類。點擊「我帶」完成認領。</ListItem>
            <ListItem><b>個人裝備</b>：這是私人的檢查表，新增項目只有自己看得到。</ListItem>
            <ListItem><b>新增裝備</b>：點擊下方「從裝備庫挑選」，可手動指定分類或批次新增。</ListItem>
          </ul>

          <SubTitle title="🍳 廚房 (Kitchen)" />
          <ul className="space-y-1 mb-4">
            <ListItem><b>共享冰箱</b>：列出所有食材。點擊食材旁的<b>筆型圖示</b>可修改名稱（會同步更新菜單）。</ListItem>
            <ListItem><b>AI 食譜生成</b>：勾選食材 → 設定餐別/人數 → 點擊「請 AI 設計食譜」，自動產生料理並加入菜單。</ListItem>
          </ul>

          <SubTitle title="📖 菜單 (Menu)" />
          <ul className="space-y-1 mb-4">
            <ListItem><b>料理卡片</b>：顯示餐點進度。點擊標題旁編輯按鈕可修改菜名。</ListItem>
            <ListItem><b>食材連動</b>：在此處修改或認領食材，會與「廚房」冰箱同步。</ListItem>
            <ListItem><b>AI 智慧解析</b>：點擊「新增」，貼上 LINE 討論串（如：第一天晚餐吃火鍋），AI 會自動建立料理卡片。</ListItem>
          </ul>

          <SubTitle title="📋 清單 (List)" />
          <ul className="space-y-1 mb-4">
            <ListItem><b>個人化視圖</b>：此頁面<span className="text-[#E76F51] font-bold">只顯示與您有關</span>的項目（您認領的公用裝備、個人裝備、食材）。</ListItem>
            <ListItem><b>雙模式</b>：可切換「出發前裝載」與「撤收時檢查」兩種檢核模式。</ListItem>
          </ul>

          <SubTitle title="💰 分帳 (Bill) & 🖼️ 相本" />
          <ul className="space-y-1 mb-4">
            <ListItem><b>分帳</b>：輸入誰先墊錢，系統自動計算多退少補。</ListItem>
            <ListItem><b>相本</b>：顯示活動相簿連結 (需由管理員在設定中貼上 Google Photos 連結)。</ListItem>
          </ul>

          {/* 3. Settings */}
          <SectionTitle icon={<Settings size={20}/>} title="設定與管理 (限島主)" color="text-[#5D4632] border-[#5D4632]/30" />
          <ul className="space-y-2">
            <ListItem>點擊首頁右上角的 <b>齒輪圖示</b> 進入設定。</ListItem>
            <ListItem><b>成員管理</b>：可新增成員、修改暱稱或更換頭像。</ListItem>
            <ListItem><b>系統設定</b>：設定 Gemini API Key 與 Google Apps Script 雲端資料庫連結。</ListItem>
          </ul>

          {/* 4. FAQ */}
          <SectionTitle icon={<AlertCircle size={20}/>} title="常見問題 (FAQ)" color="text-[#F4A261] border-[#F4A261]/30" />
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-xl border border-[#E0D8C0]">
              <p className="font-bold text-xs text-[#E76F51] mb-1">Q: 為什麼我新增的裝備別人看不到？</p>
              <p className="text-xs text-[#8C7B65]">A: 請確認新增時是否選到「個人」類別。個人裝備是私有的，選「公用」才會出現在大家的清單中。</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#E0D8C0]">
              <p className="font-bold text-xs text-[#E76F51] mb-1">Q: 畫面出現「同步失敗」怎麼辦？</p>
              <p className="text-xs text-[#8C7B65]">A: 請檢查網路。若持續失敗，請島主進入設定頁檢查「雲端資料庫網址」，並點擊「測試連線」。</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#E0D8C0]">
              <p className="font-bold text-xs text-[#E76F51] mb-1">Q: 點心類別為什麼沒有分日期？</p>
              <p className="text-xs text-[#8C7B65]">A: 系統設計將所有 Meal Type 為 <code>snack</code> 的項目統一歸類到「點心飲料庫」，方便管理零食飲料。</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-[#8C7B65]/60">狸克的露營計畫書 V2.0 - Have a nice trip!</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ManualModal;