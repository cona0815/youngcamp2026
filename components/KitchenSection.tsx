import React, { useState, useRef } from 'react';
import { 
  Package, Lock, Check, Trash2, Plus, Users, Minus, Coffee, Sun, Moon, Clock, Sparkles, ChefHat, Camera, Loader2, Image as ImageIcon, X, Edit2, Soup, IceCream, Calendar, ShoppingBag, ChevronDown, ChevronUp, Ban, PenSquare
} from 'lucide-react';
import { Ingredient, MealPlan, CheckItem, User } from '../types';
import { generateCampMeal, identifyIngredientsFromImage, generateLeftoverRecipe } from '../services/geminiService';

interface KitchenSectionProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  mealPlans: MealPlan[];
  setMealPlans: React.Dispatch<React.SetStateAction<MealPlan[]>>;
  currentUser: User;
  members: User[];
}

const KitchenSection: React.FC<KitchenSectionProps> = ({ ingredients, setIngredients, mealPlans, setMealPlans, currentUser, members }) => {
  const [newIngName, setNewIngName] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner'); 
  const [day, setDay] = useState(1); 
  const [adults, setAdults] = useState(4);
  const [children, setChildren] = useState(2);
  const [status, setStatus] = useState<'idle' | 'loading' | 'analyzing' | 'rescuing'>('idle'); 
  const [assigningIngredientId, setAssigningIngredientId] = useState<string | null>(null);

  // Editing State
  const [editingIngId, setEditingIngId] = useState<number | null>(null);
  const [editIngName, setEditIngName] = useState('');

  const handleAddIngredient = () => {
    if (!newIngName.trim()) return;
    const newItem: Ingredient = { id: Date.now(), name: newIngName, quantity: '', selected: true, usedInPlanId: null, owner: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar } };
    setIngredients([...ingredients, newItem]);
    setNewIngName('');
  };

  const handleClaimIngredient = (id: number | string, assignedUser?: {id: string, name: string, avatar: string} | null) => {
    setIngredients(prev => prev.map(ing => {
        if (String(ing.id) !== String(id)) return ing;
        let newOwner = ing.owner;
        if (currentUser.isAdmin && assignedUser !== undefined) newOwner = assignedUser;
        else if (currentUser.isAdmin) newOwner = ing.owner ? null : { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar };
        else newOwner = (ing.owner?.id === currentUser.id) ? null : { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar };
        
        // Sync to MealPlan checklist if linked
        if (ing.usedInPlanId) {
            setMealPlans(plans => plans.map(p => {
                if (p.id === ing.usedInPlanId) {
                    return {
                        ...p,
                        checklist: p.checklist.map(i => i.sourceIngredientId === ing.id ? { ...i, owner: newOwner ? { name: newOwner.name, avatar: newOwner.avatar } : null } : i)
                    };
                }
                return p;
            }));
        }

        return { ...ing, owner: newOwner };
    }));
    if (assignedUser !== undefined) setAssigningIngredientId(null);
  };

  // Editing Logic
  const startEditing = (ing: Ingredient) => {
      setEditingIngId(ing.id);
      setEditIngName(ing.name);
  };

  const saveEditing = (id: number) => {
      if (editIngName.trim()) {
          // Update Ingredients
          setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, name: editIngName } : ing));
          
          // Update MealPlans (Sync name change to menu)
          setMealPlans(prev => prev.map(plan => ({
              ...plan,
              checklist: plan.checklist.map(item => 
                  item.sourceIngredientId === id 
                      ? { ...item, name: editIngName }
                      : item
              )
          })));
      }
      setEditingIngId(null);
  };

  const getMealLabel = (type: string) => {
      if (type === 'breakfast') return '早餐';
      if (type === 'lunch') return '午餐';
      if (type === 'dinner') return '晚餐';
      if (type === 'snack') return '點心';
      return type;
  };

  const getMealColor = (type: string) => {
      switch(type) {
        case 'breakfast': return 'text-[#F4A261] bg-[#F4A261]/10';
        case 'lunch': return 'text-[#F2CC8F] bg-[#F2CC8F]/10';
        case 'dinner': return 'text-[#2A9D8F] bg-[#2A9D8F]/10';
        case 'snack': return 'text-[#E76F51] bg-[#E76F51]/10';
        default: return 'text-[#8C7B65] bg-[#E0D8C0]/20';
      }
  };

  const totalIngredients = ingredients.length;
  const claimedIngredients = ingredients.filter(i => !!i.owner).length;
  const progressPercent = totalIngredients > 0 ? Math.round((claimedIngredients / totalIngredients) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-[#FFFEF5] rounded-3xl shadow-sm border border-[#E0D8C0] overflow-hidden">
        <div className="bg-[#7BC64F]/20 px-5 py-4 border-b border-[#E0D8C0] flex justify-between items-center">
            <h3 className="font-bold text-[#5D4632] flex items-center gap-2 text-base"><Package size={18} className="text-[#7BC64F]" />共享冰箱</h3>
            <span className="text-[10px] font-bold text-[#5D4632]">{claimedIngredients}/{totalIngredients} ({progressPercent}%)</span>
        </div>
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
          {ingredients.map(ing => {
            const isMine = ing.owner?.id === currentUser.id;
            const isAssigning = String(assigningIngredientId) === String(ing.id);
            const isEditing = editingIngId === ing.id;
            const plan = mealPlans.find(p => p.id === ing.usedInPlanId);

            return (
              <div key={ing.id} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all bg-white ${ing.selected ? 'border-[#7BC64F] shadow-sm' : 'border-[#E0D8C0]/30'}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => !isEditing && setIngredients(prev => prev.map(i => i.id === ing.id ? {...i, selected: !i.selected} : i))}>
                    <div className="w-8 h-8 rounded-full border border-[#E0D8C0] flex items-center justify-center bg-[#F9F7F2] shrink-0">{ing.owner?.avatar || <ShoppingBag size={14} className="text-[#E76F51]" />}</div>
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate text-[#5D4632] flex items-center gap-2">
                             {isEditing ? (
                                <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                                    <input 
                                        value={editIngName} 
                                        onChange={e => setEditIngName(e.target.value)}
                                        className="w-full bg-[#F9F7F2] border border-[#7BC64F] rounded px-1 py-0.5 outline-none"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && saveEditing(ing.id)}
                                    />
                                    <button onClick={() => saveEditing(ing.id)} className="bg-[#7BC64F] text-white p-1 rounded"><Check size={12}/></button>
                                </div>
                             ) : (
                                <>
                                    <span>{ing.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); startEditing(ing); }} className="text-[#E0D8C0] hover:text-[#7BC64F] p-0.5"><Edit2 size={10} /></button>
                                </>
                             )}
                             
                             {!isEditing && plan && (
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap ${getMealColor(plan.mealType)}`}>
                                     {plan.dayLabel} {getMealLabel(plan.mealType)}
                                 </span>
                             )}
                        </div>
                        <div className="flex gap-2 text-[10px] font-bold mt-0.5 items-center">
                            <span className="text-[#8C7B65]">{ing.owner ? ing.owner.name : '需採買'}</span>
                            {plan && <span className="text-[#2A9D8F] bg-[#2A9D8F]/5 px-1 rounded truncate max-w-[100px]">{plan.menuName}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAssigning ? (
                         <div className="absolute right-2 bg-white shadow-xl border-2 border-[#E76F51] rounded-xl p-2 z-20 flex gap-2 overflow-x-auto max-w-[200px]">
                            {members.map(m => ( <button key={m.id} onClick={() => handleClaimIngredient(ing.id, { id: m.id, name: m.name, avatar: m.avatar })} className="w-8 h-8 rounded-full bg-[#E9F5D8] border border-[#7BC64F] text-sm shrink-0">{m.avatar}</button> ))}
                            <button onClick={() => setAssigningIngredientId(null)}><X size={16}/></button>
                         </div>
                    ) : (
                        <button onClick={() => currentUser.isAdmin ? setAssigningIngredientId(String(ing.id)) : handleClaimIngredient(ing.id)} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${isMine ? 'bg-[#E9F5D8] text-[#38661d] border-2 border-[#7BC64F]' : 'bg-[#F4A261] text-white'}`}>{isMine ? '取消' : '我帶'}</button>
                    )}
                    <button onClick={() => setIngredients(ingredients.filter(i => i.id !== ing.id))} className="text-[#E0D8C0] hover:text-[#E76F51]"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-3 bg-white border-t border-[#E0D8C0] flex items-center gap-2">
          <input type="text" value={newIngName} onChange={(e) => setNewIngName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()} placeholder="輸入食材..." className="flex-1 bg-[#F9F7F2] border-2 border-[#E0D8C0] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#7BC64F]"/>
          <button onClick={handleAddIngredient} className="bg-[#7BC64F] text-white p-2.5 rounded-full"><Plus size={20} /></button>
        </div>
      </div>

      <div className="bg-[#FFFEF5] p-5 rounded-3xl border border-[#E0D8C0] space-y-4">
        <h4 className="font-bold text-[#5D4632] text-sm mb-2 flex items-center gap-2"><Sparkles size={16} className="text-[#2A9D8F]"/> AI 食譜生成設定</h4>
        
        <div className="flex gap-2">
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-[#8C7B65] mb-1 block">哪一天</label>
                 <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-full bg-white border border-[#E0D8C0] rounded-xl px-2 py-2 text-xs font-bold text-[#5D4632] outline-none">
                     {[1,2,3,4,5].map(d => <option key={d} value={d}>第 {d} 天</option>)}
                 </select>
             </div>
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-[#8C7B65] mb-1 block">哪一餐</label>
                 <select value={mealType} onChange={(e) => setMealType(e.target.value as any)} className="w-full bg-white border border-[#E0D8C0] rounded-xl px-2 py-2 text-xs font-bold text-[#5D4632] outline-none">
                     <option value="breakfast">早餐</option>
                     <option value="lunch">午餐</option>
                     <option value="dinner">晚餐</option>
                     <option value="snack">點心/宵夜</option>
                 </select>
             </div>
        </div>

        <div className="flex gap-2">
             <div className="flex-1 flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-[#E0D8C0]">
               <span className="text-xs font-bold text-[#5D4632]">大人</span>
               <div className="flex items-center gap-2">
                 <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-6 h-6 rounded-full bg-[#E0D8C0] flex items-center justify-center"><Minus size={14}/></button><span className="text-sm font-bold w-4 text-center">{adults}</span><button onClick={() => setAdults(adults + 1)} className="w-6 h-6 rounded-full bg-[#E0D8C0] flex items-center justify-center"><Plus size={14}/></button>
               </div>
             </div>
             <div className="flex-1 flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-[#E0D8C0]">
               <span className="text-xs font-bold text-[#5D4632]">小孩</span>
               <div className="flex items-center gap-2">
                 <button onClick={() => setChildren(Math.max(0, children - 1))} className="w-6 h-6 rounded-full bg-[#E0D8C0] flex items-center justify-center"><Minus size={14}/></button><span className="text-sm font-bold w-4 text-center">{children}</span><button onClick={() => setChildren(children + 1)} className="w-6 h-6 rounded-full bg-[#E0D8C0] flex items-center justify-center"><Plus size={14}/></button>
               </div>
             </div>
        </div>

        <button onClick={async () => {
            const selectedItems = ingredients.filter(i => i.selected);
            if(selectedItems.length === 0) { alert("請先從上方冰箱選擇要使用的食材"); return; }
            setStatus('loading');
            try {
                const generatedDishes = await generateCampMeal(selectedItems.map(i => i.name), mealType, adults, children, "");
                
                const newIngredientsToAdd: Ingredient[] = [];
                const newPlans: MealPlan[] = generatedDishes.map((dish, idx) => {
                    const planId = Date.now() + idx;
                    
                    const checklist = dish.shoppingList.map((s, si) => {
                        const ingId = Date.now() + idx * 100 + si;
                        
                        // Add to global ingredients
                        newIngredientsToAdd.push({
                            id: ingId,
                            name: s.name,
                            quantity: s.need || s.buy || '',
                            selected: false,
                            usedInPlanId: planId,
                            owner: null
                        });

                        return { 
                            id: `s-${ingId}`, 
                            name: s.name, 
                            quantity: s.need,
                            checked: false, 
                            owner: null, 
                            sourceIngredientId: ingId 
                        };
                    });

                    return {
                        id: planId,
                        dayLabel: `第 ${day} 天`,
                        mealType,
                        title: dish.menuName,
                        menuName: dish.menuName,
                        reason: dish.reason,
                        checklist,
                        notes: '',
                        recipe: dish.recipe
                    };
                });
                
                // Update selected ingredients to mark them as used (optional, or just keep them)
                const usedIngIds = selectedItems.map(i => i.id);
                setIngredients(prev => {
                    // Deselect used items
                    const afterDeselect = prev.map(ing => usedIngIds.includes(ing.id) ? { ...ing, selected: false } : ing);
                    return [...afterDeselect, ...newIngredientsToAdd];
                });

                setMealPlans(prev => [...newPlans, ...prev]);

                alert("AI 菜單已產生！相關食材已同步至冰箱與清單。");
            } catch(e) {
                console.error(e);
                alert("AI 生成失敗，請重試");
            } finally { setStatus('idle'); }
        }} disabled={status !== 'idle'} className="w-full bg-[#2A9D8F] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 active:scale-95 transition-transform">{status === 'loading' ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} 確認食材，請 AI 設計食譜</button>
      </div>
    </div>
  );
};

export default KitchenSection;