import React, { useState } from 'react';
import { CarFront, Home, ClipboardList, Tent, Package, Check, Printer, Backpack, Coffee, Sun, Moon, Clock, IceCream } from 'lucide-react';
import { GearItem, Ingredient, User, MealPlan } from '../types';
import { TRIP_INFO } from '../constants';

interface SelfCheckSectionProps {
  gearList: GearItem[];
  ingredients: Ingredient[];
  mealPlans: MealPlan[]; 
  currentUser: User;
  checkedDeparture: Record<string, boolean>;
  setCheckedDeparture: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  checkedReturn: Record<string, boolean>;
  setCheckedReturn: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const SelfCheckSection: React.FC<SelfCheckSectionProps> = ({ 
  gearList, 
  ingredients, 
  mealPlans, 
  currentUser,
  checkedDeparture,
  setCheckedDeparture,
  checkedReturn,
  setCheckedReturn
}) => {
  const [mode, setMode] = useState<'departure' | 'return'>('departure'); 

  const checkedItems = mode === 'departure' ? checkedDeparture : checkedReturn;
  const setCheckedItems = mode === 'departure' ? setCheckedDeparture : setCheckedReturn;

  // Split Gear by Category & Filter for Current User Only
  // The user wants the checklist to be PERSONAL. 
  // So for Public Gear, only show items claimed by the current user.
  const myPublicGear = gearList.filter(item => item.category === 'public' && item.owner?.id === currentUser.id);

  // Personal Gear is strictly filtered to current user in GearSection, so we trust it here too.
  const myPersonalGear = gearList.filter(item => item.category === 'personal' && item.owner?.id === currentUser.id);
   
  // Filter ingredients owned by current user
  const myIngredients = ingredients.filter(item => item.owner && item.owner.id === currentUser.id);
   
  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalItems = myPublicGear.length + myPersonalGear.length + myIngredients.length;
  
  const checkedCount = [
        ...myPublicGear,
        ...myPersonalGear
    ].filter(item => checkedItems[`gear-${item.id}`]).length + 
    myIngredients.filter(item => checkedItems[`food-${item.id}`]).length;

  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const getMealLabel = (type: string) => {
      if (type === 'breakfast') return '早餐';
      if (type === 'lunch') return '午餐';
      if (type === 'dinner') return '晚餐';
      if (type === 'snack') return '點心';
      return '餐點';
  };

  const getMealColor = (type: string) => {
      switch(type) {
        case 'breakfast': return 'bg-[#F4A261] text-white';
        case 'lunch': return 'bg-[#F2CC8F] text-[#5D4632]';
        case 'dinner': return 'bg-[#2A9D8F] text-white';
        case 'snack': return 'bg-[#E76F51] text-white';
        default: return 'bg-[#E0D8C0] text-[#5D4632]';
      }
  };

  const isDeparture = mode === 'departure';

  // PDF / Print Generation Logic (Simplified for brevity, logic remains similar)
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#FFFEF5] p-2 rounded-full shadow-sm border border-[#E0D8C0] flex gap-2 sticky top-0 z-10">
        <button 
          onClick={() => setMode('departure')}
          className={`flex-1 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
            mode === 'departure' ? 'bg-[#8ECAE6] text-[#5D4632] shadow-md' : 'text-[#8C7B65] hover:bg-[#F2F7E6]'
          }`}
        >
          <CarFront size={18} />
          出發前
        </button>
        <button 
          onClick={() => setMode('return')}
          className={`flex-1 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
            mode === 'return' ? 'bg-[#F4A261] text-white shadow-md' : 'text-[#8C7B65] hover:bg-[#F2F7E6]'
          }`}
        >
          <Home size={18} />
          撤收時
        </button>
      </div>

      <div className={`bg-[#FFFEF5] p-5 rounded-3xl shadow-sm border border-[#E0D8C0]`}>
        <div className="flex justify-between items-end mb-3">
          <h3 className={`font-bold flex items-center gap-2 ${isDeparture ? 'text-[#219EBC]' : 'text-[#E76F51]'}`}>
            <ClipboardList size={20} />
            {isDeparture ? '出發裝載進度' : '撤收檢查進度'}
          </h3>
          <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${isDeparture ? 'text-[#219EBC]' : 'text-[#E76F51]'}`}>{progressPercent}%</span>
              <span className="text-sm font-bold text-[#8C7B65]">({checkedCount}/{totalItems})</span>
          </div>
        </div>
        <div className="w-full bg-[#E0D8C0]/30 rounded-full h-4 overflow-hidden">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ease-out ${isDeparture ? 'bg-[#8ECAE6]' : 'bg-[#F4A261]'}`} 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* 1. 公用裝備區塊 (只顯示我自己負責的) */}
      <div className="bg-[#FFFEF5] rounded-3xl shadow-sm border border-[#E0D8C0] overflow-hidden">
        <div className="bg-[#8ECAE6]/20 px-5 py-4 border-b border-[#E0D8C0]">
          <h4 className="font-bold text-[#5D4632] flex items-center gap-2 text-lg">
            <Tent size={20} className="text-[#219EBC]" />
            我負責的公用裝備 ({myPublicGear.length})
          </h4>
        </div>
        <div className="divide-y divide-[#E0D8C0]">
          {myPublicGear.length > 0 ? myPublicGear.map(item => {
            const isMine = true; // Filtered to current user
            const isChecked = checkedItems[`gear-${item.id}`];
            
            return (
              <div 
                key={`gear-${item.id}`} 
                onClick={() => toggleCheck(`gear-${item.id}`)}
                className={`p-4 flex items-center gap-3 transition-colors cursor-pointer active:bg-[#E0D8C0]/30 hover:bg-[#F9F7F2] ${isChecked ? 'bg-[#E0D8C0]/20' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isChecked ? (isDeparture ? 'bg-[#219EBC] border-[#219EBC]' : 'bg-[#E76F51] border-[#E76F51]') : 'border-[#E0D8C0] bg-white'}`}>
                  {isChecked && <Check size={18} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-base flex items-center gap-2 ${isChecked ? 'text-[#8C7B65] line-through' : 'text-[#5D4632]'}`}>
                    {item.name}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 bg-[#8ECAE6]/30 text-[#219EBC] font-bold`}>
                        我負責
                    </span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="p-8 text-center text-[#8C7B65] text-sm">沒有需要您負責的公用裝備。</div>
          )}
        </div>
      </div>

      {/* 2. 個人裝備區塊 */}
      <div className="bg-[#FFFEF5] rounded-3xl shadow-sm border border-[#E0D8C0] overflow-hidden">
        <div className="bg-[#F4A261]/20 px-5 py-4 border-b border-[#E0D8C0]">
          <h4 className="font-bold text-[#5D4632] flex items-center gap-2 text-lg">
            <Backpack size={20} className="text-[#E76F51]" />
            個人裝備 ({myPersonalGear.length})
          </h4>
        </div>
        <div className="divide-y divide-[#E0D8C0]">
          {myPersonalGear.length > 0 ? myPersonalGear.map(item => {
             const isChecked = checkedItems[`gear-${item.id}`];
             return (
              <div key={`gear-${item.id}`} onClick={() => toggleCheck(`gear-${item.id}`)} className={`p-4 flex items-center gap-3 cursor-pointer transition-colors active:bg-[#E0D8C0]/30 ${isChecked ? 'bg-[#E0D8C0]/20' : 'hover:bg-[#F9F7F2]'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isChecked ? (isDeparture ? 'bg-[#219EBC] border-[#219EBC]' : 'bg-[#E76F51] border-[#E76F51]') : 'border-[#E0D8C0] bg-white'}`}>
                  {isChecked && <Check size={18} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-base ${isChecked ? 'text-[#8C7B65] line-through' : 'text-[#5D4632]'}`}>{item.name}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDeparture ? 'bg-[#8ECAE6]/30 text-[#219EBC]' : 'bg-[#F4A261]/20 text-[#E76F51]'}`}>我的專屬裝備</span>
                </div>
              </div>
            );
          }) : (
            <div className="p-8 text-center text-[#8C7B65] text-sm">無個人裝備項目，請至裝備頁新增。</div>
          )}
        </div>
      </div>

      {/* 3. 我的食材 */}
      <div className="bg-[#FFFEF5] rounded-3xl shadow-sm border border-[#E0D8C0] overflow-hidden">
        <div className="bg-[#7BC64F]/20 px-5 py-4 border-b border-[#E0D8C0]">
          <h4 className="font-bold text-[#5D4632] flex items-center gap-2 text-lg">
            <Package size={20} className="text-[#7BC64F]" />
            我要帶的食材 ({myIngredients.length})
          </h4>
        </div>
        <div className="divide-y divide-[#E0D8C0]">
          {myIngredients.length > 0 ? myIngredients.map(item => {
            const plan = mealPlans.find(p => String(p.id) === String(item.usedInPlanId));
            const isChecked = checkedItems[`food-${item.id}`];
            
            return (
            <div key={`food-${item.id}`} onClick={() => toggleCheck(`food-${item.id}`)} className={`p-4 flex items-center gap-3 cursor-pointer transition-colors active:bg-[#E0D8C0]/30 ${isChecked ? 'bg-[#E0D8C0]/20' : 'hover:bg-[#F9F7F2]'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isChecked ? (isDeparture ? 'bg-[#219EBC] border-[#219EBC]' : 'bg-[#E76F51] border-[#E76F51]') : 'border-[#E0D8C0] bg-white'}`}>
                {isChecked && <Check size={18} className="text-white" />}
              </div>
              <div className="flex-1">
                <div className={`font-bold text-base ${isChecked ? 'text-[#8C7B65] line-through' : 'text-[#5D4632]'}`}>{item.name}</div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-[10px] bg-[#7BC64F]/20 text-[#5D4632] px-2 py-0.5 rounded-full whitespace-nowrap">
                        {isDeparture ? '食材庫提供' : '容器回收'}
                    </span>
                    {plan && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex items-center gap-1 shadow-sm ${getMealColor(plan.mealType)}`}>
                            {plan.dayLabel} {getMealLabel(plan.mealType)}：{plan.menuName}
                        </span>
                    )}
                </div>
              </div>
            </div>
          )}) : (
            <div className="p-8 text-center text-[#8C7B65] text-sm">您這次露營不用準備食材，等著吃就好！😋</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelfCheckSection;