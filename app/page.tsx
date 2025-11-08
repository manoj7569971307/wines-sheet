'use client'

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, LogOut, Save, FileSpreadsheet, Eye, EyeOff, Calendar, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {sampleWinesData} from "@/app/sampleWines";

const firebaseConfig = {
    apiKey: "AIzaSyBf-dvyFjMttuLD43V4MBBRbuvfbwBRKsI",
    authDomain: "wines-sheet.firebaseapp.com",
    projectId: "wines-sheet",
    storageBucket: "wines-sheet.firebasestorage.app",
    messagingSenderId: "313820033015",
    appId: "1:313820033015:web:75cc4ccf84217324bf08f2",
    measurementId: "G-C8JCT3DNNH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Types
interface Wine {
    id: string;
    name: string;
    price: number;
    category: string;
}

interface Shop {
    id: string;
    name: string;
    adminId: string;
}

interface InventoryItem {
    shopId?: string;
    wineId?: string;
    openingStock?: number;
    purchased?: number;
    sold?: number;
    closingStock?: number;
    receiptDate?: string;
}

interface InventoryMap {
    [key: string]: InventoryItem;
}

interface SavedDate {
    date: string;
    timestamp: string;
    shopName: string;
}

interface User {
    type: 'main' | 'sub';
    name: string;
    shopId?: string;
}

const Home: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [wines, setWines] = useState<Wine[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [inventory, setInventory] = useState<InventoryMap>({});
    const [activeShop, setActiveShop] = useState<string | null>(null);
    const [showWineForm, setShowWineForm] = useState(false);
    const [editingWine, setEditingWine] = useState<Wine | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [savedDates, setSavedDates] = useState<SavedDate[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const categories = ["Whisky", "Vodka", "Rum", "Brandy", "Beer", "Wine"];

    // Login state
    const [loginType, setLoginType] = useState<'main' | 'sub' | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');

    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initializeData();
        loadWinesFromFirebase();
    }, []);

    // Load saved dates history for active shop
    useEffect(() => {
        if (!activeShop) return;

        const loadSavedDates = async () => {
            try {
                const historyDocRef = doc(db, 'inventory-history', activeShop);
                const docSnap = await getDoc(historyDocRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setSavedDates(data.dates || []);
                } else {
                    setSavedDates([]);
                }
            } catch (error) {
                console.error('Error loading saved dates:', error);
                setSavedDates([]);
            }
        };

        loadSavedDates();

        // Real-time listener for history
        const historyDocRef = doc(db, 'inventory-history', activeShop);
        const unsubscribe = onSnapshot(historyDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setSavedDates(data.dates || []);
            }
        });

        return () => unsubscribe();
    }, [activeShop]);

    // Load inventory for selected date
    useEffect(() => {
        if (activeShop && selectedDate) {
            loadInventoryForDate(selectedDate);
        }
    }, [selectedDate, activeShop]);

    // Real-time sync for wines
    useEffect(() => {
        const loadInitialWines = async () => {
            try {
                const winesDocRef = doc(db, 'wines', 'global');
                const docSnap = await getDoc(winesDocRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.wines && data.wines.length > 0) {
                        setWines(data.wines);
                    } else {
                        await initializeSampleWines();
                    }
                } else {
                    await initializeSampleWines();
                }
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading initial wines:', error);
                setIsLoading(false);
            }
        };

        loadInitialWines();

        const winesDocRef = doc(db, 'wines', 'global');
        const unsubscribe = onSnapshot(winesDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                if (data.wines) {
                    setWines(data.wines);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const initializeData = () => {
        const initialShops: Shop[] = [
            { id: 'shop_1', name: 'Downtown Wine Shop', adminId: 'admin_1' },
            { id: 'shop_2', name: 'Northside Liquor Store', adminId: 'admin_2' },
            { id: 'shop_3', name: 'Eastview Wine Mart', adminId: 'admin_3' },
        ];
        setShops(initialShops);
    };

    const loadWinesFromFirebase = async () => {
        try {
            const winesDocRef = doc(db, 'wines', 'global');
            const docSnap = await getDoc(winesDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.wines && data.wines.length > 0) {
                    setWines(data.wines);
                } else {
                    await initializeSampleWines();
                }
            } else {
                await initializeSampleWines();
            }
        } catch (error) {
            console.error('Error loading wines from Firebase:', error);
            await initializeSampleWines();
        }
    };

    const initializeSampleWines = async () => {
        console.log('manoj', sampleWinesData)
        const sampleWines: Wine[] = sampleWinesData

        try {
            const winesDocRef = doc(db, 'wines', 'global');
            await setDoc(winesDocRef, {
                wines: sampleWines,
                lastUpdated: new Date().toISOString()
            });
            setWines(sampleWines);
        } catch (error) {
            console.error('Error initializing sample wines:', error);
            setWines(sampleWines);
        }
    };

    const loadInventoryForDate = async (date: string) => {
        if (!activeShop) return;

        try {
            // Load specific date inventory
            const inventoryDocRef = doc(db, `inventories/${activeShop}/dates`, date);
            const docSnap = await getDoc(inventoryDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setInventory(data.inventory || {});
                console.log('Loaded inventory for date:', date, data.inventory);
            } else {
                // Check previous day's closing stock
                const prevDate = getPreviousDate(date);
                const prevDocRef = doc(db, `inventories/${activeShop}/dates`, prevDate);
                const prevSnap = await getDoc(prevDocRef);

                if (prevSnap.exists()) {
                    const prevData = prevSnap.data();
                    const prevInventory = prevData.inventory || {};

                    // Create new inventory with opening stock from previous closing
                    const newInv: InventoryMap = {};
                    Object.keys(prevInventory).forEach(itemKey => {
                        const prevItem = prevInventory[itemKey];
                        newInv[itemKey] = {
                            shopId: prevItem.shopId,
                            wineId: prevItem.wineId,
                            openingStock: prevItem.closingStock || 0,
                            purchased: 0,
                            sold: 0,
                            closingStock: 0,
                        };
                    });
                    setInventory(newInv);
                    console.log('Created new inventory from previous day:', newInv);
                } else {
                    setInventory({});
                    console.log('No previous data found, starting fresh');
                }
            }
        } catch (error) {
            console.error('Error loading inventory for date:', error);
            setInventory({});
        }
    };

    const getPreviousDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    };

    const saveInventory = async () => {
        if (!activeShop) {
            alert('Please select a shop first');
            return;
        }

        setIsSyncing(true);

        try {
            // Calculate closing stock for all items
            const updatedInventory: InventoryMap = {};

            // Include all wines in inventory
            wines.forEach(wine => {
                const key = `${activeShop}_${wine.id}`;
                const item = inventory[key] || {
                    shopId: activeShop,
                    wineId: wine.id,
                    openingStock: 0,
                    purchased: 0,
                    sold: 0,
                    closingStock: 0
                };

                const opening = item.openingStock || 0;
                const purchased = item.purchased || 0;
                const manualClosing = item.closingStock;

                // If closing stock is manually entered, use it. Otherwise calculate
                const closing = (manualClosing !== undefined && manualClosing !== null)
                    ? manualClosing
                    : (opening + purchased - (item.sold || 0));

                updatedInventory[key] = {
                    ...item,
                    closingStock: closing,
                };
            });

            const shop = shops.find(s => s.id === activeShop);

            // Save to date-specific document
            const inventoryDocRef = doc(db, `inventories/${activeShop}/dates`, selectedDate);
            await setDoc(inventoryDocRef, {
                inventory: updatedInventory,
                date: selectedDate,
                shopName: shop?.name || '',
                lastUpdated: new Date().toISOString()
            });

            // Update history list
            const historyDocRef = doc(db, 'inventory-history', activeShop);
            const historySnap = await getDoc(historyDocRef);

            let existingDates: SavedDate[] = [];
            if (historySnap.exists()) {
                existingDates = historySnap.data().dates || [];
            }

            // Check if date already exists
            const dateExists = existingDates.some(d => d.date === selectedDate);
            if (!dateExists) {
                existingDates.push({
                    date: selectedDate,
                    timestamp: new Date().toISOString(),
                    shopName: shop?.name || ''
                });
            }

            // Sort dates in descending order
            existingDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            await setDoc(historyDocRef, {
                dates: existingDates,
                lastUpdated: new Date().toISOString()
            });

            // Upload Excel
            await uploadExcelToFirebase(updatedInventory);

            // Reload the saved inventory
            setInventory(updatedInventory);

            alert('Inventory saved successfully! Data synced to Firebase and Excel uploaded.');
        } catch (error) {
            console.error('Error saving inventory:', error);
            alert('Error saving inventory. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    const uploadExcelToFirebase = async (inventoryData: InventoryMap) => {
        try {
            const shop = shops.find((s) => s.id === activeShop);
            const data: (string | number)[][] = [];

            data.push(['SHOP NAME', '', shop?.name || '', '', '', '', 'DATE', selectedDate]);
            data.push([
                'Particulars',
                'Category',
                'Receipt Date',
                'Opening Stock',
                'Receipts',
                'Sales',
                'Closing Stock',
                'Rate',
                'Amount',
            ]);

            wines.forEach((wine) => {
                const key = `${activeShop}_${wine.id}`;
                const invData = inventoryData[key] || {};
                const openingStock = invData.openingStock || 0;
                const purchased = invData.purchased || 0;
                const closingStock = invData.closingStock !== undefined && invData.closingStock !== null
                    ? invData.closingStock
                    : (openingStock + purchased);
                const sales = openingStock + purchased - closingStock;
                const amount = sales * wine.price;
                const receiptDate = invData.receiptDate || '';

                data.push([
                    wine.name,
                    wine.category,
                    receiptDate,
                    openingStock,
                    purchased,
                    sales,
                    closingStock,
                    wine.price,
                    amount,
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = [
                { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
                { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const filename = `${activeShop}_${selectedDate}.xlsx`;
            const storageRef = ref(storage, `inventory-sheets/${activeShop}/${filename}`);
            await uploadBytes(storageRef, blob);

            console.log('Excel file uploaded successfully');
        } catch (error) {
            console.error('Error uploading Excel:', error);
        }
    };

    const exportToExcel = () => {
        if (!activeShop) {
            alert('Please select a shop first');
            return;
        }

        const shop = shops.find((s) => s.id === activeShop);
        const data: (string | number)[][] = [];

        data.push(['SHOP NAME', '', shop?.name || '', '', '', '', 'DATE', selectedDate]);
        data.push([
            'Particulars', 'Category', 'Receipt Date', 'Opening Stock',
            'Receipts', 'Sales', 'Closing Stock', 'Rate', 'Amount',
        ]);

        wines.forEach((wine) => {
            const key = `${activeShop}_${wine.id}`;
            const invData = inventory[key] || {};
            const openingStock = invData.openingStock || 0;
            const purchased = invData.purchased || 0;
            const closingStock = invData.closingStock !== undefined && invData.closingStock !== null
                ? invData.closingStock
                : (openingStock + purchased);
            const sales = openingStock + purchased - closingStock;
            const amount = sales * wine.price;
            const receiptDate = invData.receiptDate || '';

            data.push([
                wine.name, wine.category, receiptDate, openingStock,
                purchased, sales, closingStock, wine.price, amount,
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

        const filename = `${(shop?.name || 'Shop')}_${selectedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    const headers = [
        "Particulars", "Category", "Rate", "Receipt Date",
        "Opening Stock", "Receipts", "Sales", "Closing Stock", "Amount"
    ];

    const handleLogin = () => {
        setLoginError('');

        if (loginType === 'main') {
            if (password === 'admin') {
                setCurrentUser({ type: 'main', name: 'Main Admin' });
                setPassword('');
            } else {
                setLoginError('Incorrect password for Main Admin');
            }
        } else if (loginType === 'sub') {
            const shop = shops.find((s) => s.id === password);
            if (shop) {
                setCurrentUser({ type: 'sub', name: shop.name, shopId: shop.id });
                setActiveShop(shop.id);
                setPassword('');
            } else {
                setLoginError('Incorrect password. Use your shop ID (e.g., shop_1)');
            }
        }
    };

    const addOrUpdateWine = async (wineData: Omit<Wine, 'id'>) => {
        let updatedWines: Wine[];
        if (editingWine) {
            updatedWines = wines.map((w) => (w.id === editingWine.id ? { ...wineData, id: editingWine.id } : w));
        } else {
            const newWine: Wine = { ...wineData, id: Date.now().toString() };
            updatedWines = [...wines, newWine];
        }

        try {
            const winesDocRef = doc(db, 'wines', 'global');
            await setDoc(winesDocRef, {
                wines: updatedWines,
                lastUpdated: new Date().toISOString()
            });
            setWines(updatedWines);
        } catch (error) {
            console.error('Error saving wines:', error);
            alert('Error saving wine. Please try again.');
        }

        setShowWineForm(false);
        setEditingWine(null);
    };

    const deleteWine = async (wineId: string) => {
        if (window.confirm('Are you sure you want to delete this wine?')) {
            const updatedWines = wines.filter((w) => w.id !== wineId);

            try {
                const winesDocRef = doc(db, 'wines', 'global');
                await setDoc(winesDocRef, {
                    wines: updatedWines,
                    lastUpdated: new Date().toISOString()
                });
                setWines(updatedWines);
            } catch (error) {
                console.error('Error deleting wine:', error);
                alert('Error deleting wine. Please try again.');
            }
        }
    };

    const updateInventory = (shopId: string, wineId: string, field: keyof InventoryItem, value: string) => {
        const key = `${shopId}_${wineId}`;
        const currentData = inventory[key] || {};

        const parsedValue = value === '' ? 0 : parseInt(value, 10);
        const finalValue = isNaN(parsedValue) ? 0 : parsedValue;

        let updates: any = { [field]: finalValue };

        if (field === 'purchased' && finalValue > 0 && !currentData.receiptDate) {
            updates.receiptDate = selectedDate;
        }

        setInventory((prev) => ({
            ...prev,
            [key]: {
                ...prev[key],
                shopId,
                wineId,
                ...updates,
            },
        }));
    };

    const calculateClosingStock = (shopId: string, wineId: string): number => {
        const key = `${shopId}_${wineId}`;
        const data = inventory[key] || {};

        if (data.closingStock !== undefined && data.closingStock !== null) {
            return data.closingStock;
        }

        const opening = data.openingStock || 0;
        const purchased = data.purchased || 0;
        const sold = data.sold || 0;
        return opening + purchased - sold;
    };

    const calculateSales = (shopId: string, wineId: string): number => {
        const key = `${shopId}_${wineId}`;
        const data = inventory[key] || {};

        const opening = data.openingStock || 0;
        const purchased = data.purchased || 0;
        const closing = data.closingStock !== undefined && data.closingStock !== null
            ? data.closingStock
            : (data.sold || 0);

        return opening + purchased - closing;
    };

    const WineForm: React.FC<{
        wine: Wine | null;
        onSave: (data: Omit<Wine, 'id'>) => void;
        onCancel: () => void;
    }> = ({ wine, onSave, onCancel }) => {
        const [formData, setFormData] = useState<Omit<Wine, 'id'>>(wine || { name: '', price: 0, category: 'Whisky' });

        const handleSave = () => {
            const priceNum = Number(formData.price);
            if (isNaN(priceNum) || priceNum <= 0) {
                alert('Please enter a valid price');
                return;
            }
            onSave({ ...formData, price: priceNum });
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold mb-4 text-black">{wine ? 'Edit Wine' : 'Add New Wine'}</h3>
                    <div className="space-y-4 text-black">
                        <input
                            type="text"
                            placeholder="Wine Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <input
                            type="number"
                            placeholder="Price (₹)"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
                            >
                                Save
                            </button>
                            <button
                                onClick={onCancel}
                                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-2xl">Loading...</div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                    <h1 className="text-3xl font-bold text-purple-900 mb-6 text-center">Wine Inventory System</h1>

                    {!loginType ? (
                        <div className="space-y-4">
                            <button
                                onClick={() => setLoginType('main')}
                                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition font-semibold"
                            >
                                Login as Main Admin
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Or</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setLoginType('sub')}
                                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition font-semibold"
                            >
                                Login as Shop Owner
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-purple-100 p-3 rounded-lg mb-4">
                                <p className="text-sm text-purple-800 font-semibold">
                                    {loginType === 'main' ? 'Main Admin Login' : 'Shop Owner Login'}
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                    {loginType === 'main'
                                        ? 'Password: admin'
                                        : 'Enter your shop ID as password (e.g., shop_1, shop_2, shop_3)'}
                                </p>
                            </div>

                            <div className="relative text-black">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {loginError && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                    {loginError}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={handleLogin}
                                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition font-semibold"
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => {
                                        setLoginType(null);
                                        setPassword('');
                                        setLoginError('');
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition font-semibold"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-purple-600 text-white shadow-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Wine Inventory System</h1>
                        <p className="text-purple-200 text-sm">{currentUser.name}</p>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentUser(null);
                            setActiveShop(null);
                        }}
                        className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-lg transition"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {currentUser.type === 'main' && (
                    <>
                        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">Wine Management</h2>
                                <button
                                    onClick={() => setShowWineForm(true)}
                                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                                >
                                    <Plus size={20} />
                                    Add Wine
                                </button>
                            </div>

                            <div className="grid gap-4 max-h-96 overflow-y-auto">
                                {wines.map((wine) => (
                                    <div
                                        key={wine.id}
                                        className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-lg text-black">{wine.name}</h3>
                                            <p className="text-gray-600">₹{wine.price} - {wine.category}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingWine(wine);
                                                    setShowWineForm(true);
                                                }}
                                                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => deleteWine(wine.id)}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">View Shop Inventory</h2>
                            <select
                                value={activeShop || ''}
                                onChange={(e) => setActiveShop(e.target.value)}
                                className="w-full border-2 text-black border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="">Select a shop to view inventory</option>
                                {shops.map((shop) => (
                                    <option key={shop.id} value={shop.id}>
                                        {shop.name} ({shop.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {activeShop && (
                    <div className="bg-white rounded-xl shadow-md p-6 mt-6">
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Inventory - {shops.find((s) => s.id === activeShop)?.name}
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                                >
                                    <Calendar size={20} />
                                    History
                                </button>
                                <button
                                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                    className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                                >
                                    <Clock size={20} />
                                    Today
                                </button>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="border-2 text-black border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <button
                                    onClick={saveInventory}
                                    disabled={isSyncing}
                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    <Save size={20} />
                                    {isSyncing ? 'Syncing...' : 'Save'}
                                </button>
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    <FileSpreadsheet size={20} />
                                    Export
                                </button>
                            </div>
                        </div>

                        {showHistory && savedDates.length > 0 && (
                            <div className="mb-6 bg-purple-50 rounded-lg p-4">
                                <h3 className="font-bold text-gray-800 mb-3">Saved Inventory Dates</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {savedDates.map((saved) => (
                                        <button
                                            key={saved.date}
                                            onClick={() => {
                                                setSelectedDate(saved.date);
                                                setShowHistory(false);
                                            }}
                                            className={`p-3 rounded-lg border-2 transition ${
                                                selectedDate === saved.date
                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                    : 'bg-white text-gray-800 border-gray-300 hover:border-purple-400'
                                            }`}
                                        >
                                            <div className="text-sm font-semibold">{saved.date}</div>
                                            <div className="text-xs opacity-75">
                                                {new Date(saved.timestamp).toLocaleTimeString()}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-purple-100 sticky top-0">
                                <tr>
                                    {headers.map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {wines.map((wine) => {
                                    const key = `${activeShop}_${wine.id}`;
                                    const data = inventory[key] || {};
                                    const closingStock = calculateClosingStock(activeShop, wine.id);
                                    const sales = calculateSales(activeShop, wine.id);
                                    const amount = sales * wine.price;
                                    const canEditAll = currentUser.type === 'main';
                                    const canEditClosing = currentUser.type === 'sub' && currentUser.shopId === activeShop;

                                    const displayClosing = data.closingStock !== undefined && data.closingStock !== null
                                        ? data.closingStock
                                        : closingStock;

                                    return (
                                        <tr key={wine.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-black">{wine.name}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                                                    {wine.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-black">₹{wine.price}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {data.receiptDate || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={data.openingStock || 0}
                                                    onChange={(e) => updateInventory(activeShop, wine.id, 'openingStock', e.target.value)}
                                                    disabled={!canEditAll}
                                                    className="w-24 border border-gray-300 rounded px-2 py-1 text-black disabled:bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={data.purchased || 0}
                                                    onChange={(e) => updateInventory(activeShop, wine.id, 'purchased', e.target.value)}
                                                    disabled={!canEditAll}
                                                    className="w-24 border text-black border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-blue-600">{sales}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={displayClosing}
                                                    onChange={(e) => updateInventory(activeShop, wine.id, 'closingStock', e.target.value)}
                                                    disabled={!canEditClosing && !canEditAll}
                                                    className="w-24 border border-gray-300 rounded px-2 py-1 text-purple-600 font-semibold disabled:bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-green-600">₹{amount.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showWineForm && (
                <WineForm
                    wine={editingWine}
                    onSave={addOrUpdateWine}
                    onCancel={() => {
                        setShowWineForm(false);
                        setEditingWine(null);
                    }}
                />
            )}
        </div>
    );
};

export default Home;
