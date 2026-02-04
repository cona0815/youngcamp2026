import { GearItem, Ingredient, MealPlan, Bill, User, TripInfo } from '../types';

export interface AppData {
  gearList: GearItem[];
  ingredients: Ingredient[];
  mealPlans: MealPlan[];
  bills: Bill[];
  members: User[];
  tripInfo: TripInfo;
  checkedDeparture?: Record<string, boolean>;
  checkedReturn?: Record<string, boolean>;
  lastUpdated: number;
}

const STORAGE_KEY_GAS_URL = 'tanuki_gas_url';
const STORAGE_KEY_LOCAL_DATA = 'tanuki_local_data';

// Hardcoded family URL provided by user
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzlMOChRe44h9iSLGl54dLvTYX3-2uMam-C_nt4LZQu3EkV1yZWNQbBwtFt8fOFpIiKdA/exec';

export const getGasUrl = (): string => localStorage.getItem(STORAGE_KEY_GAS_URL) || DEFAULT_URL;
export const setGasUrl = (url: string) => localStorage.setItem(STORAGE_KEY_GAS_URL, url);

export const saveToLocal = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY_LOCAL_DATA, JSON.stringify(data));
};

export const loadFromLocal = (): AppData | null => {
  const data = localStorage.getItem(STORAGE_KEY_LOCAL_DATA);
  return data ? JSON.parse(data) : null;
};

// Test connection to GAS
export const testConnection = async (url: string): Promise<{ success: boolean; message: string }> => {
    if (!url) return { success: false, message: "網址為空" };
    if (!url.includes('/exec')) return { success: false, message: "網址格式錯誤：結尾必須是 /exec" };

    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
            redirect: 'follow'
        });
        if (!response.ok) return { success: false, message: `HTTP 錯誤: ${response.status}` };
        const text = await response.text();
        if (text.trim().startsWith("<") || text.includes("<!DOCTYPE html>")) {
            return { success: false, message: "權限不足：請確認 GAS 部署設定為「任何人 (Anyone)」" };
        }
        try {
            const json = JSON.parse(text);
            if (json.status === 'error') return { success: false, message: `GAS 錯誤: ${json.message}` };
            return { success: true, message: "連線成功！" };
        } catch (e) {
            return { success: false, message: "回傳格式錯誤 (非 JSON)" };
        }
    } catch (error) {
        return { success: false, message: "網路請求失敗" };
    }
};

export const fetchFromCloud = async (): Promise<AppData | null> => {
  const url = getGasUrl();
  if (!url) return null;

  try {
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'follow'
    });
    const text = await response.text();
    if (text.trim().startsWith("<") || text.includes("<!DOCTYPE html>")) {
        throw new Error("權限錯誤：無法讀取資料。");
    }
    const json = JSON.parse(text);
    if (json.status === 'empty') return null;
    
    let publicGear: GearItem[] = [];
    let personalGear: GearItem[] = [];
    let ingredients: Ingredient[] = [];
    let mealPlans: MealPlan[] = [];
    let bills: Bill[] = [];

    Object.keys(json).forEach(key => {
        if (key.startsWith('gear_public_item_')) publicGear.push(json[key]);
        else if (key.startsWith('gear_personal_item_')) personalGear.push(json[key]);
        else if (key.startsWith('ingredients_item_')) ingredients.push(json[key]);
        else if (key.startsWith('mealPlans_item_')) mealPlans.push(json[key]);
        else if (key.startsWith('bills_item_')) bills.push(json[key]);
    });

    if (publicGear.length === 0 && json.gear_public) publicGear = json.gear_public;
    if (personalGear.length === 0 && json.gear_personal) personalGear = json.gear_personal;
    if (ingredients.length === 0 && json.ingredients) ingredients = json.ingredients;
    if (mealPlans.length === 0 && json.mealPlans) mealPlans = json.mealPlans;
    if (bills.length === 0 && json.bills) bills = json.bills;

    return {
        gearList: [...publicGear, ...personalGear],
        ingredients,
        mealPlans,
        bills,
        members: json.members || [],
        tripInfo: json.tripInfo || {},
        checkedDeparture: json.checkedDeparture || {},
        checkedReturn: json.checkedReturn || {},
        lastUpdated: json.lastUpdated || Date.now()
    };
  } catch (error) {
    throw error;
  }
};

export const archiveTrip = async (archiveName: string): Promise<void> => {
    const url = getGasUrl();
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'archive', archiveName }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        credentials: 'omit',
        redirect: 'follow'
    });
};

export const saveToCloud = async (data: AppData): Promise<void> => {
  const url = getGasUrl();
  const payload = {
      ...data,
      gear_public: data.gearList.filter(item => item.category === 'public'),
      gear_personal: data.gearList.filter(item => item.category === 'personal'),
      gearList: null
  };
  await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    credentials: 'omit',
    redirect: 'follow'
  });
};