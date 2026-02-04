import React, { useState, useRef } from 'react';
import { BookOpen, Youtube, Flame, Coffee, Sun, Moon, Clock, Check, Plus, Trash2, StickyNote, PenSquare, X, ChevronDown, ChevronUp, ShoppingBag, Edit3, Save, Camera, Image as ImageIcon, Loader2, Sparkles, FileText, CalendarDays, Wand2, IceCream, Package, Circle, PieChart, ChefHat } from 'lucide-react';
import { MealPlan, CheckItem, User, Ingredient } from '../types';
import { parseMenuItinerary, generateDishRecipe } from '../services/geminiService';

interface MenuSectionProps {
  mealPlans: MealPlan[];
  setMealPlans: React.Dispatch<React.SetStateAction<MealPlan[]>>;
  members: User[];
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  currentUser: User;
}

const MenuSection: React.FC<MenuSectionProps> = ({ mealPlans, setMealPlans, members, ingredients, setIngredients, currentUser }) => {
  // Default to empty object ensures all plans are collapsed initially
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  const [addModalState, setAddModalState] = useState<{isOpen: boolean, context: { dayLabel: string, mealType: any } | null}>({ isOpen: false, context: null });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pastedMenuText, setPastedMenuText] = useState('');
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});

  // Edit Plan Name State
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editPlanName, setEditPlanName] = useState('');

  const toggleExpand = (planId: number | string) => {
    const idStr = String(planId);
    setExpandedPlans(prev => ({ ...prev, [idStr]: !prev[idStr] }));
  };

  const startEditingPlan = (plan: MealPlan) => {
      setEditingPlanId(plan.id);
      setEditPlanName(plan.menuName);
  };

  const saveEditingPlan = (planId: number) => {
      if (editPlanName.trim()) {
          setMealPlans(prev => prev.map(p => p.id === planId ? { ...p, menuName: editPlanName } : p));
      }
      setEditingPlanId(null);
  };

  // Helper for Distinct Meal Colors (Backgrounds & Text)
  const getMealTheme = (type: string) => {
    switch(type) {
      case 'breakfast': 
        return { 
            bg: 'bg-orange-100', 
            border: 'border-orange-200',
            iconBg: 'bg-orange-500', 
            iconText: 'text-white',
            badge: 'bg-orange-500 text-white',
            icon: <Coffee size={18} className="text-white" />
        };
      case 'lunch': 
        return { 
            bg: 'bg-yellow-100', 
            border: 'border-yellow-200',
            iconBg: 'bg-yellow-500', 
            iconText: 'text-white',
            badge: 'bg-yellow-500 text-white',
            icon: <Sun size={18} className="text-white" />
        };
      case 'dinner': 
        return { 
            bg: 'bg-teal-100', 
            border: 'border-teal-200',
            iconBg: 'bg-teal-600', 
            iconText: 'text-white',
            badge: 'bg-teal-600 text-white',
            icon: <Moon size={18} className="text-white" />
        };
      case 'snack': 
        return { 
            bg: 'bg-pink-100', 
            border: 'border-pink-200',
            iconBg: 'bg-pink-500', 
            iconText: 'text-white',
            badge: 'bg-pink-500 text-white',
            icon: <IceCream size={18} className="text-white" />
        };
      default: 
        return { 
            bg: 'bg-gray-50', 
            border: 'border-gray-200',
            iconBg: 'bg-gray-400', 
            iconText: 'text-white',
            badge: 'bg-gray-500 text-white',
            icon: <Clock size={18} className="text-white" />
        };
    }
  };

  const getMealLabel = (type: string) => {
      if (type === 'breakfast') return '早餐';
      if (type === 'lunch') return '午餐';
      if (type === 'dinner') return '晚餐';
      if (type === 'snack') return '點心';
      return '餐點';
  };

  const groupedByDay = mealPlans.reduce((acc, plan) => {
    // Determine group key. Snacks always go to '點心飲料庫', ignoring dayLabel to satisfy "不用分天".
    const day = plan.mealType === 'snack' ? '點心飲料庫' : (plan.dayLabel || '其他安排');
    if (!acc[day]) acc[day] = [];
    acc[day].push(plan);
    return acc;
  }, {} as Record<string, MealPlan[]>);

  const sortedDays = Object.keys(groupedByDay).sort((a, b) => {
      if (a === '點心飲料庫') return 1;
      if (b === '點心飲料庫') return -1;
      return a.localeCompare(b, 'zh-TW');
  });

  const handleClaimPlan = (planId: number | string) => {
    const plan = mealPlans.find(p => String(p.id) === String(planId));
    if (!plan) return;
    const isMine = plan.checklist.length > 0 && plan.checklist.every(i => i.owner?.name === currentUser.name);
    
    const newOwner = isMine ? null : { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar };

    setMealPlans(prev => prev.map(p => {
        if (String(p.id) !== String(planId)) return p;
        return { 
            ...p, 
            checklist: p.checklist.map(i => ({ 
                ...i, 
                owner: newOwner ? { name: newOwner.name, avatar: newOwner.avatar } : null 
            })) 
        };
    }));

    const ingredientIdsToUpdate = plan.checklist.map(i => i.sourceIngredientId).filter(id => id !== null);
    if (ingredientIdsToUpdate.length > 0) {
        setIngredients(prev => prev.map(ing => {
            if (ingredientIdsToUpdate.includes(ing.id)) {
                return { ...ing, owner: newOwner };
            }
            return ing;
        }));
    }
  };

  const handleAIImport = async () => {
    if(!pastedMenuText.trim()) return;
    setIsAnalyzing(true);
    try {
        const items = await parseMenuItinerary(pastedMenuText, 'text');
        
        const newIngredientsToAdd: Ingredient[] = [];
        const newPlans: MealPlan[] = [];

        let globalIngIdCounter = Date.now();

        items.forEach((item, idx) => {
            const planId = globalIngIdCounter + idx * 100;
            
            const checklistItems: CheckItem[] = item.ingredients.map((ingName, i) => {
                const ingId = globalIngIdCounter + idx * 100 + i + 1;
                
                newIngredientsToAdd.push({
                    id: ingId,
                    name: ingName,
                    quantity: '',
                    selected: false,
                    usedInPlanId: planId,
                    owner: null
                });

                return {
                    id: `chk-${ingId}`,
                    name: ingName,
                    checked: false,
                    owner: null,
                    sourceIngredientId: ingId
                };
            });

            newPlans.push({
                id: planId,
                dayLabel: item.dayLabel,
                mealType: item.mealType as any,
                title: item.menuName,
                menuName: item.menuName,
                reason: item.reason,
                checklist: checklistItems,
                notes: '',
                recipe: {
                    steps: item.steps,
                    videoQuery: item.videoQuery
                }
            });
        });
        
        if(newPlans.length > 0) {
            setIngredients(prev => [...prev, ...newIngredientsToAdd]); 
            setMealPlans(prev => [...newPlans, ...prev]);
            setAddModalState({ isOpen: false, context: null });
            setPastedMenuText('');
        } else {
            alert("AI 無法識別內容，請嘗試更詳細的描述，或使用手動新增。");
        }
    } catch(e) {
        console.error(e);
        alert("AI 分析失敗，請稍後再試。");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleManualAdd = () => {
      if(!pastedMenuText.trim()) return;
      const newPlanId = Date.now();
      
      const newPlan: MealPlan = { 
          id: newPlanId, 
          dayLabel: addModalState.context?.dayLabel || '第一天', 
          mealType: addModalState.context?.mealType || 'dinner', 
          title: '自訂餐點', 
          menuName: pastedMenuText.split('\n')[0], 
          reason: '', 
          checklist: [], 
          notes: '', 
          recipe: { steps: [], videoQuery: '' } 
      };
      setMealPlans([newPlan, ...mealPlans]);
      setAddModalState({ isOpen: false, context: null });
      setPastedMenuText('');
  };

  const handleAddItemToPlan = (plan: MealPlan, name: string) => {
      if (!name) return;
      
      const newIngId = Date.now();
      const newIng: Ingredient = {
          id: newIngId,
          name: name,
          quantity: '',
          selected: false,
          usedInPlanId: plan.id,
          owner: null
      };
      
      setIngredients(prev => [...prev, newIng]);

      const newItem: CheckItem = { 
          id: `item-${newIngId}`, 
          name, 
          checked: false, 
          owner: null, 
          sourceIngredientId: newIngId 
      };

      setMealPlans(prev => prev.map(p => p.id === plan.id ? { ...p, checklist: [...p.checklist, newItem] } : p));
      setNewItemNames(prev => ({ ...prev, [String(plan.id)]: '' }));
  };

  const renderPlanCard = (plan: MealPlan) => {
    const isSnack = plan.mealType === 'snack';
    const isExpanded = expandedPlans[String(plan.id)];
    const isEditing = editingPlanId === plan.id;
    const theme = getMealTheme(plan.mealType);
    
    const uniqueOwners = Array.from(new Set(plan.checklist.map(i => i.owner?.name).filter(Boolean)));
    const ownerName = uniqueOwners.length === 1 ? uniqueOwners[0] : (uniqueOwners.length > 1 ? '多人' : null);
    const ownerAvatar = uniqueOwners.length === 1 ? plan.checklist.find(i => i.owner)?.owner?.avatar : (uniqueOwners.length > 1 ? '👥' : null);
    const isMine = ownerName === currentUser.name;

    const totalItems = plan.checklist.length;
    const claimedItems = plan.checklist.filter(i => !!i.owner).length;
    const progressPercent = totalItems > 0 ? Math.round((claimedItems / totalItems) * 100) : 0;

    return (
        <div key={plan.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all ${theme.border}`}>
            <div className={`flex items-center p-3 transition-colors ${isExpanded ? 'bg-[#F9F7F2]' : ''}`}>
                <div className={`w-12 h-12 rounded-full border-2 ${theme.border} flex items-center justify-center ${theme.iconBg} overflow-hidden shrink-0 relative shadow-sm`}>
                    {ownerAvatar ? <span className="text-2xl bg-white w-full h-full flex items-center justify-center">{ownerAvatar}</span> : theme.icon}
                    
                    {totalItems > 0 && ownerAvatar && (
                         <div className="absolute bottom-0 left-0 w-full h-1 bg-black/10">
                             <div className={`h-full bg-green-500`} style={{width: `${progressPercent}%`}}></div>
                         </div>
                    )}
                </div>
                <div className="ml-3 flex-1 min-w-0" onClick={() => !isEditing && toggleExpand(plan.id)}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shadow-sm ${theme.badge}`}>
                            {plan.dayLabel} {getMealLabel(plan.mealType)}
                        </span>
                        {totalItems > 0 && (
                            <span className={`text-[10px] font-bold text-[#8C7B65]`}>
                                整備 {claimedItems}/{totalItems}
                            </span>
                        )}
                    </div>
                    
                    {/* Editable Title */}
                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                            <input 
                                type="text"
                                value={editPlanName}
                                onChange={(e) => setEditPlanName(e.target.value)}
                                className="flex-1 bg-white border border-[#7BC64F] rounded-md px-2 py-1 text-sm font-bold text-[#5D4632] outline-none"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && saveEditingPlan(plan.id)}
                            />
                            <button onClick={() => saveEditingPlan(plan.id)} className="bg-[#7BC64F] text-white p-1 rounded-md"><Check size={14}/></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h2 className="font-bold text-[#5D4632] text-lg truncate leading-tight">{plan.menuName}</h2>
                            <button 
                                onClick={(e) => { e.stopPropagation(); startEditingPlan(plan); }} 
                                className="opacity-0 group-hover:opacity-100 p-1 text-[#E0D8C0] hover:text-[#7BC64F] transition-opacity"
                            >
                                <Edit3 size={12}/>
                            </button>
                        </div>
                    )}

                    {ownerName ? (
                        <span className="text-[10px] text-[#8C7B65] mt-1 block">由 {ownerName} 等人負責食材</span>
                    ) : (
                         totalItems > 0 ? <span className="text-[10px] text-[#E76F51] mt-1 block font-bold">⚠️ 食材尚未認領</span> : <span className="text-[10px] text-[#8C7B65] mt-1 block opacity-60">尚未列出食材</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isSnack && (
                        <button onClick={() => handleClaimPlan(plan.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm active:scale-95 ${isMine ? 'bg-white border-2 border-[#7BC64F] text-[#7BC64F]' : 'bg-[#F4A261] text-white'}`}>
                            {isMine ? '取消' : '我帶'}
                        </button>
                    )}
                    <button onClick={() => {
                        const idsToDelete = plan.checklist.map(i => i.sourceIngredientId);
                        setIngredients(prev => prev.filter(ing => !idsToDelete.includes(ing.id)));
                        setMealPlans(prev => prev.filter(p => String(p.id) !== String(plan.id)));
                    }} className="p-2 text-[#E0D8C0] hover:text-[#E76F51]"><Trash2 size={16} /></button>
                    <button onClick={() => toggleExpand(plan.id)} className="p-2 text-[#8C7B65]">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 bg-white/50 border-t border-[#E0D8C0]/40">
                    
                    {/* 1. Checklist Items (First) */}
                    <div className="space-y-2 mb-4">
                        {plan.checklist.map((item) => {
                            const isItemMine = item.owner?.name === currentUser.name;
                            return (
                                <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-[#E0D8C0]/30 shadow-sm">
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="w-6 h-6 rounded-full border border-[#E0D8C0] flex items-center justify-center text-xs bg-[#F9F7F2]">{item.owner?.avatar || <Package size={12} className="text-[#8C7B65]" />}</div>
                                        <span className="text-sm font-bold text-[#5D4632]">{item.name}</span>
                                        {item.quantity && <span className="text-[10px] text-[#8C7B65] font-mono">({item.quantity})</span>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {!isSnack && (
                                            <button 
                                                onClick={() => {
                                                     const newOwner = isItemMine ? null : { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar };
                                                     setMealPlans(prev => prev.map(p => p.id === plan.id ? { ...p, checklist: p.checklist.map(i => i.id === item.id ? { ...i, owner: newOwner ? { name: newOwner.name, avatar: newOwner.avatar } : null } : i) } : p));
                                                     if (item.sourceIngredientId) {
                                                         setIngredients(prev => prev.map(ing => ing.id === item.sourceIngredientId ? { ...ing, owner: newOwner } : ing));
                                                     }
                                                }}
                                                className={`px-2 py-1 rounded-md text-[10px] font-bold ${isItemMine ? 'bg-[#7BC64F] text-white' : 'bg-[#F9F7F2] text-[#8C7B65]'}`}
                                            >
                                                {item.owner ? item.owner.name : '認領'}
                                            </button>
                                        )}
                                        <button onClick={() => {
                                            setMealPlans(prev => prev.map(p => p.id === plan.id ? { ...p, checklist: p.checklist.filter(i => i.id !== item.id) } : p));
                                            if (item.sourceIngredientId) {
                                                setIngredients(prev => prev.filter(ing => ing.id !== item.sourceIngredientId));
                                            }
                                        }} className="p-1 text-[#E0D8C0] hover:text-[#E76F51]"><X size={12}/></button>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex gap-2 mt-2">
                            <input type="text" value={newItemNames[String(plan.id)] || ''} onChange={(e) => setNewItemNames(prev => ({...prev, [String(plan.id)]: e.target.value}))} placeholder="新增食材..." className="flex-1 bg-white border border-[#E0D8C0] rounded-lg px-3 py-1 text-xs outline-none focus:border-[#7BC64F]"/>
                            <button onClick={() => handleAddItemToPlan(plan, newItemNames[String(plan.id)])} className="bg-[#7BC64F] text-white p-1 rounded-lg"><Plus size={16}/></button>
                        </div>
                    </div>

                    {/* 2. Recipe Display (Below Checklist) */}
                    {(plan.recipe?.steps?.length > 0 || plan.recipe?.videoQuery) && (
                        <div className="bg-[#F9F7F2] p-4 rounded-xl border border-[#E0D8C0] shadow-sm">
                            <h4 className="font-bold text-[#5D4632] text-sm mb-3 flex items-center gap-2 border-b border-[#E0D8C0]/50 pb-2">
                                <Sparkles size={16} className="text-[#F4A261]"/> AI 料理指南
                            </h4>
                            
                            {plan.recipe.steps.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {plan.recipe.steps.map((step, idx) => (
                                        <div key={idx} className="text-xs text-[#5D4632] flex gap-2 leading-relaxed">
                                            <span className="font-bold text-[#2A9D8F] shrink-0">{idx+1}.</span>
                                            <span>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {plan.recipe.videoQuery && (
                                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(plan.recipe.videoQuery)}`} target="_blank" rel="noreferrer" className="bg-white border border-[#E0D8C0] text-xs text-[#FF0000] font-bold flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-[#FF0000]/5 transition-colors">
                                    <Youtube size={16}/> 觀看「{plan.recipe.videoQuery}」教學影片
                                </a>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="bg-[#FFFEF5] p-5 rounded-3xl border border-[#E0D8C0] flex justify-between items-center shadow-sm">
        <div><h3 className="font-bold text-[#5D4632] flex items-center gap-2 text-lg"><BookOpen size={20} className="text-[#E76F51]" />露營食譜</h3></div>
        <div className="flex gap-2">
            <button onClick={() => setAddModalState({ isOpen: true, context: { dayLabel: '行程通用', mealType: 'snack' } })} className="bg-[#2A9D8F] text-white px-3 py-1.5 rounded-full font-bold text-xs">新增點心</button>
            <button onClick={() => setAddModalState({ isOpen: true, context: null })} className="bg-[#E76F51] text-white px-3 py-1.5 rounded-full font-bold text-xs">新增料理</button>
        </div>
      </div>
      {sortedDays.map(dayLabel => {
        // Filter plans for this day/group
        const dayPlans = groupedByDay[dayLabel];
        
        // Calculate Progress Fraction for this Day
        const totalDayItems = dayPlans.reduce((sum, p) => sum + p.checklist.length, 0);
        const claimedDayItems = dayPlans.reduce((sum, p) => sum + p.checklist.filter(i => !!i.owner).length, 0);

        // Sort plans to ensure Breakfast -> Lunch -> Dinner -> Snack order
        const sortedPlans = [...dayPlans].sort((a, b) => {
             const order: Record<string, number> = { 'breakfast': 1, 'lunch': 2, 'dinner': 3, 'snack': 4 };
             const pa = order[a.mealType] || 99;
             const pb = order[b.mealType] || 99;
             return pa - pb;
        });

        return (
            <div key={dayLabel} className="space-y-3 mt-6">
                <div className="flex items-center gap-2 px-2">
                    <div className={`px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${dayLabel === '點心飲料庫' ? 'bg-[#E76F51] text-white' : 'bg-[#5D4632] text-[#F2CC8F]'}`}>
                        {dayLabel}
                        {/* Display fraction progress for the day */}
                        <span className={`bg-black/20 px-1.5 py-0.5 rounded-md text-[10px] ${totalDayItems === 0 ? 'opacity-0' : 'opacity-100'}`}>
                           整備 {claimedDayItems}/{totalDayItems}
                        </span>
                    </div>
                    <div className="h-px flex-1 bg-[#E0D8C0]"></div>
                </div>
                <div className="grid grid-cols-1 gap-3 px-2">
                    {sortedPlans.map((plan, index) => {
                         const nextPlan = sortedPlans[index + 1];
                         // Check if next plan exists AND has a different meal type
                         const showSeparator = nextPlan && nextPlan.mealType !== plan.mealType;

                         return (
                            <React.Fragment key={plan.id}>
                                {renderPlanCard(plan)}
                                {showSeparator && (
                                     <div className="flex items-center gap-2 py-3 opacity-70">
                                         <div className="h-px bg-[#E0D8C0] flex-1 border-t border-dashed"></div>
                                         <div className="text-[10px] font-bold text-[#8C7B65] flex items-center gap-1 bg-[#F9F7F2] px-2 py-1 rounded-full border border-[#E0D8C0]">
                                             <Clock size={10} /> 
                                             接下來是：{getMealLabel(nextPlan.mealType)}
                                         </div>
                                         <div className="h-px bg-[#E0D8C0] flex-1 border-t border-dashed"></div>
                                     </div>
                                )}
                            </React.Fragment>
                         );
                    })}
                </div>
            </div>
        );
      })}
      {addModalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#FFFEF5] w-full max-w-sm rounded-3xl shadow-xl overflow-hidden border-4 border-[#E0D8C0] p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">新增餐點項目</h3>
                    <button onClick={() => setAddModalState({ isOpen: false, context: null })}><X size={24} /></button>
                </div>
                
                <textarea 
                    value={pastedMenuText} 
                    onChange={(e) => setPastedMenuText(e.target.value)} 
                    placeholder="例如：&#10;第一天晚餐：火鍋 (要買肉片、青菜)&#10;第二天早餐：蛋餅、咖啡" 
                    className="w-full h-32 bg-white border border-[#E0D8C0] rounded-xl p-3 text-sm mb-4 outline-none focus:border-[#7BC64F] placeholder:text-gray-300"
                />
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleAIImport}
                        disabled={isAnalyzing || !pastedMenuText.trim()} 
                        className="w-full bg-[#2A9D8F] text-white py-3 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 hover:bg-[#21867a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} 
                        AI 智慧解析 (同步建立食材)
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <div className="h-px bg-[#E0D8C0] flex-1"></div>
                        <span className="text-[10px] text-[#8C7B65]">或</span>
                        <div className="h-px bg-[#E0D8C0] flex-1"></div>
                    </div>

                    <button 
                        onClick={handleManualAdd}
                        disabled={isAnalyzing || !pastedMenuText.trim()} 
                        className="w-full bg-white text-[#5D4632] border-2 border-[#E0D8C0] py-3 rounded-xl font-bold hover:bg-[#F9F7F2] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                         <Plus size={18}/> 直接新增單項
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MenuSection;