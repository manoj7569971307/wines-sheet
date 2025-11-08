'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, LogOut, Save, FileSpreadsheet, Eye, EyeOff, Calendar, Clock, FileText, Upload, CheckCircle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { sampleWinesData } from "@/app/PriceList";

// Firebase Configuration
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
    packSize?: string;
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
    trnIn?: number;
    trnOut?: number;
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

interface InvoiceItem {
    brandNumber: string;
    brandName: string;
    totalQuantity: number;
    unitRate: number;
    matched: boolean;
    matchedWine?: Wine;
}

// Constants
const HEADERS = ["Particulars", "Pack Size", "Opening Stock", "Receipt", "TRN In", "TRN Out", "Total", "Closing Stock", "Sales", "Rate", "Amount"];
const INITIAL_SHOPS: Shop[] = [
    { id: 'shop_1', name: 'Downtown Wine Shop', adminId: 'admin_1' },
    { id: 'shop_2', name: 'Northside Liquor Store', adminId: 'admin_2' },
    { id: 'shop_3', name: 'Eastview Wine Mart', adminId: 'admin_3' },
];

const Home: React.FC = () => {
    // State Management
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [wines, setWines] = useState<Wine[]>([]);
    const [shops] = useState<Shop[]>(INITIAL_SHOPS);
    const [inventory, setInventory] = useState<InventoryMap>({});
    const [activeShop, setActiveShop] = useState<string | null>(null);
    const [showWineForm, setShowWineForm] = useState(false);
    const [editingWine, setEditingWine] = useState<Wine | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [savedDates, setSavedDates] = useState<SavedDate[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [notes, setNotes] = useState('');
    const [loginType, setLoginType] = useState<'main' | 'sub' | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showInvoiceUpload, setShowInvoiceUpload] = useState(false);
    const [invoicePDF, setInvoicePDF] = useState<File | null>(null);
    const [extractedInvoiceData, setExtractedInvoiceData] = useState<InvoiceItem[]>([]);
    const [isProcessingPDF, setIsProcessingPDF] = useState(false);

    // Effects
    useEffect(() => {
        loadWinesFromFirebase();
    }, []);

    useEffect(() => {
        if (activeShop) loadSavedDates();
    }, [activeShop]);

    useEffect(() => {
        if (activeShop && selectedDate) loadInventoryForDate(selectedDate);
    }, [selectedDate, activeShop]);

    // Firebase Operations
    const loadWinesFromFirebase = async () => {
        try {
            const winesDocRef = doc(db, 'wines', 'global');
            const docSnap = await getDoc(winesDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setWines(data.wines ?? []);
            } else {
                await setDoc(winesDocRef, {
                    wines: sampleWinesData,
                    lastUpdated: new Date().toISOString()
                });
                setWines(sampleWinesData);
            }
        } catch (error) {
            console.error('Error loading wines:', error);
            setWines(sampleWinesData);
        }
        setIsLoading(false);
    };

    const loadSavedDates = async () => {
        try {
            const historyDocRef = doc(db, 'inventory-history', activeShop!);
            const docSnap = await getDoc(historyDocRef);
            setSavedDates(docSnap.exists() ? docSnap.data().dates || [] : []);
        } catch (error) {
            console.error('Error loading saved dates:', error);
            setSavedDates([]);
        }
    };

    const loadInventoryForDate = async (date: string) => {
        if (!activeShop) return;

        try {
            const inventoryDocRef = doc(db, `inventories/${activeShop}/dates`, date);
            const docSnap = await getDoc(inventoryDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setInventory(data.inventory || {});
                setNotes(data.notes || '');
            } else {
                await loadPreviousInventory(date);
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            setInventory({});
            setNotes('');
        }
    };

    const loadPreviousInventory = async (currentDate: string) => {
        const prevDate = await findMostRecentInventoryDate(currentDate);

        if (prevDate) {
            const prevDocRef = doc(db, `inventories/${activeShop}/dates`, prevDate);
            const prevSnap = await getDoc(prevDocRef);

            if (prevSnap.exists()) {
                const prevInventory = prevSnap.data().inventory || {};
                const newInv: InventoryMap = {};

                Object.entries(prevInventory).forEach(([key, item]) => {
                    const prevItem = item as InventoryItem;
                    newInv[key] = {
                        shopId: prevItem.shopId,
                        wineId: prevItem.wineId,
                        openingStock: (prevItem.closingStock ?? prevItem.openingStock) || 0,
                        purchased: 0,
                        trnIn: 0,
                        trnOut: 0,
                        closingStock: undefined,
                    };
                });
                setInventory(newInv);
                setNotes('');
            }
        } else {
            setInventory({});
            setNotes('');
        }
    };

    const findMostRecentInventoryDate = async (currentDate: string): Promise<string | null> => {
        for (let i = 1; i <= 30; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);
            const checkDate = date.toISOString().split('T')[0];

            try {
                const docRef = doc(db, `inventories/${activeShop}/dates`, checkDate);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) return checkDate;
            } catch (error) {
                console.error('Error checking date:', checkDate, error);
            }
        }
        return null;
    };

    // Calculations
    const calculateTotal = (shopId: string, wineId: string): number => {
        const data = inventory[`${shopId}_${wineId}`] || {};
        return (data.openingStock || 0) + (data.purchased || 0) + (data.trnIn || 0) - (data.trnOut || 0);
    };

    const calculateSales = (shopId: string, wineId: string): number => {
        const data = inventory[`${shopId}_${wineId}`] || {};
        const closingStock = data.closingStock || 0;
        return closingStock > 0 ? calculateTotal(shopId, wineId) - closingStock : 0;
    };

    const calculateTotals = useMemo(() => {
        let totalQuantity = 0;
        let totalAmount = 0;
        let totalClosingStockValue = 0;

        wines.forEach(wine => {
            const data = inventory[`${activeShop}_${wine.id}`] || {};
            const closingStock = data.closingStock || 0;
            const sales = calculateSales(activeShop!, wine.id);

            totalQuantity += sales;
            totalAmount += sales * wine.price;
            totalClosingStockValue += closingStock * wine.price;
        });

        return { totalQuantity, totalAmount, totalClosingStockValue };
    }, [wines, inventory, activeShop]);

    // Inventory Operations
    const updateInventory = (shopId: string, wineId: string, field: keyof InventoryItem, value: string) => {
        const key = `${shopId}_${wineId}`;
        const currentData = inventory[key] || {};
        const parsedValue = value === '' ? 0 : parseInt(value, 10) || 0;

        const updates: Partial<InventoryItem> = { [field]: parsedValue };
        if (field === 'purchased' && parsedValue > 0 && !currentData.receiptDate) {
            updates.receiptDate = selectedDate;
        }

        setInventory(prev => ({
            ...prev,
            [key]: { ...prev[key], shopId, wineId, ...updates },
        }));
    };

    const saveInventory = async () => {
        if (!activeShop) {
            alert('Please select a shop first');
            return;
        }

        setIsSyncing(true);

        try {
            const updatedInventory: InventoryMap = {};
            wines.forEach(wine => {
                const key = `${activeShop}_${wine.id}`;
                updatedInventory[key] = inventory[key] || {
                    shopId: activeShop,
                    wineId: wine.id,
                    openingStock: 0,
                    purchased: 0,
                    trnIn: 0,
                    trnOut: 0,
                    closingStock: undefined
                };
            });

            const shop = shops.find(s => s.id === activeShop);

            await setDoc(doc(db, `inventories/${activeShop}/dates`, selectedDate), {
                inventory: updatedInventory,
                notes,
                date: selectedDate,
                shopName: shop?.name || '',
                lastUpdated: new Date().toISOString()
            });

            const historyDocRef = doc(db, 'inventory-history', activeShop);
            const historySnap = await getDoc(historyDocRef);
            const existingDates: SavedDate[] = historySnap.exists() ? historySnap.data().dates || [] : [];

            if (!existingDates.some(d => d.date === selectedDate)) {
                existingDates.push({
                    date: selectedDate,
                    timestamp: new Date().toISOString(),
                    shopName: shop?.name || ''
                });
                existingDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }

            await setDoc(historyDocRef, {
                dates: existingDates,
                lastUpdated: new Date().toISOString()
            });

            await uploadExcelToFirebase(updatedInventory);
            setInventory(updatedInventory);

            alert('Inventory saved successfully!');
        } catch (error) {
            console.error('Error saving inventory:', error);
            alert('Error saving inventory. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    // Invoice PDF Processing
    const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setInvoicePDF(file);
            setExtractedInvoiceData([]);
        } else {
            alert('Please upload a valid PDF file');
        }
    };

    const processInvoicePDF = async () => {
        if (!invoicePDF) {
            alert('Please select a PDF file first');
            return;
        }

        setIsProcessingPDF(true);

        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(invoicePDF);
            });

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 4000,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "document",
                                    source: {
                                        type: "base64",
                                        media_type: "application/pdf",
                                        data: base64Data
                                    }
                                },
                                {
                                    type: "text",
                                    text: `Extract all wine/liquor items from this invoice PDF. Look for columns like brand number, item name, quantity (cases and bottles), pack size, rate/price.

Return ONLY a valid JSON array with no markdown formatting or explanation. Format:
[{"brandNumber":"123","brandName":"Wine Name","totalQuantity":144,"unitRate":500}]

If you see pack quantity and cases, multiply them and add loose bottles to get totalQuantity.`
                                }
                            ]
                        }
                    ],
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'API error');
            }

            const textContent = data.content?.find((c: any) => c.type === 'text')?.text || '';

            if (!textContent) {
                throw new Error('No text content in response');
            }

            // Try to extract JSON from response
            let invoiceItems = [];
            const jsonMatch = textContent.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                try {
                    invoiceItems = JSON.parse(jsonMatch[0]);
                } catch (parseError) {
                    throw new Error('Failed to parse extracted data');
                }
            } else {
                throw new Error('No invoice data found in PDF');
            }

            if (!Array.isArray(invoiceItems) || invoiceItems.length === 0) {
                throw new Error('No items extracted from invoice');
            }

            const matchedItems: InvoiceItem[] = invoiceItems.map((item: any) => {
                const matchedWine = wines.find(w =>
                    w.id === item.brandNumber ||
                    w.name.toLowerCase().includes(item.brandName.toLowerCase()) ||
                    item.brandName.toLowerCase().includes(w.name.toLowerCase())
                );

                return {
                    brandNumber: item.brandNumber || 'N/A',
                    brandName: item.brandName || 'Unknown',
                    totalQuantity: Number(item.totalQuantity) || 0,
                    unitRate: Number(item.unitRate) || 0,
                    matched: !!matchedWine,
                    matchedWine: matchedWine
                };
            });

            setExtractedInvoiceData(matchedItems);
            alert(`Extracted ${matchedItems.length} items from invoice. ${matchedItems.filter(i => i.matched).length} matched with existing wines.`);
        } catch (error: any) {
            console.error('Error processing PDF:', error);
            alert(`Error processing PDF: ${error.message || 'Please check the PDF format and try again.'}`);
        } finally {
            setIsProcessingPDF(false);
        }
    };

    const applyInvoiceToInventory = () => {
        if (!activeShop) {
            alert('Please select a shop first');
            return;
        }

        const newInventory = { ...inventory };

        extractedInvoiceData.forEach(item => {
            if (item.matched && item.matchedWine) {
                const key = `${activeShop}_${item.matchedWine.id}`;
                const currentData = newInventory[key] || {
                    shopId: activeShop,
                    wineId: item.matchedWine.id,
                    openingStock: 0,
                    purchased: 0,
                    trnIn: 0,
                    trnOut: 0,
                    closingStock: undefined
                };

                newInventory[key] = {
                    ...currentData,
                    purchased: (currentData.purchased || 0) + item.totalQuantity,
                    receiptDate: selectedDate
                };
            }
        });

        setInventory(newInventory);
        setShowInvoiceUpload(false);
        setInvoicePDF(null);
        setExtractedInvoiceData([]);
        alert('Invoice data applied to inventory successfully!');
    };

    // Export Functions
    const generateExportData = () => {
        const shop = shops.find(s => s.id === activeShop);
        const data: (string | number)[][] = [
            ['SHOP NAME', '', shop?.name || '', '', '', '', '', '', '', '', '', 'DATE', selectedDate],
            HEADERS
        ];

        wines.forEach(wine => {
            const key = `${activeShop}_${wine.id}`;
            const invData = inventory[key] || {};
            const openingStock = invData.openingStock || 0;
            const purchased = invData.purchased || 0;
            const trnIn = invData.trnIn || 0;
            const trnOut = invData.trnOut || 0;
            const total = calculateTotal(activeShop!, wine.id);
            const closingStock = invData.closingStock || 0;
            const sales = calculateSales(activeShop!, wine.id);

            data.push([
                wine.name,
                wine.packSize || '-',
                openingStock,
                purchased,
                trnIn,
                trnOut,
                total,
                closingStock,
                sales,
                wine.price,
                sales * wine.price
            ]);
        });

        data.push(
            [],
            ['', '', '', '', '', '', '', '', '', 'Total Quantity:', calculateTotals.totalQuantity],
            ['', '', '', '', '', '', '', '', '', 'Total Closing Stock Value:', calculateTotals.totalClosingStockValue],
            ['', '', '', '', '', '', '', '', '', 'Total Amount:', calculateTotals.totalAmount]
        );

        if (notes) {
            data.push([], ['Notes:', notes]);
        }

        return data;
    };

    const uploadExcelToFirebase = async (inventoryData: InventoryMap) => {
        try {
            const data = generateExportData();
            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = Array(11).fill({ wch: 12 });
            ws['!cols'][0] = { wch: 25 };

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const storageRef = ref(storage, `inventory-sheets/${activeShop}/${activeShop}_${selectedDate}.xlsx`);
            await uploadBytes(storageRef, blob);
        } catch (error) {
            console.error('Error uploading Excel:', error);
        }
    };

    const exportToExcel = () => {
        if (!activeShop) {
            alert('Please select a shop first');
            return;
        }

        const data = generateExportData();
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = Array(11).fill({ wch: 12 });
        ws['!cols'][0] = { wch: 25 };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

        const shop = shops.find(s => s.id === activeShop);
        XLSX.writeFile(wb, `${shop?.name || 'Shop'}_${selectedDate}.xlsx`);
    };

    const exportToPDF = () => {
        if (!activeShop) {
            alert('Please select a shop first');
            return;
        }

        const shop = shops.find(s => s.id === activeShop);
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { text-align: center; color: #7c3aed; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #7c3aed; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                    .totals { margin-top: 20px; font-weight: bold; }
                    .notes { margin-top: 20px; padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; }
                </style>
            </head>
            <body>
                <h1>Wine Inventory Report</h1>
                <div class="header">
                    <div><strong>Shop Name:</strong> ${shop?.name || ''}</div>
                    <div><strong>Date:</strong> ${selectedDate}</div>
                </div>
                <table><thead><tr>${HEADERS.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
        `;

        wines.forEach(wine => {
            const key = `${activeShop}_${wine.id}`;
            const invData = inventory[key] || {};
            const total = calculateTotal(activeShop!, wine.id);
            const sales = calculateSales(activeShop!, wine.id);

            htmlContent += `
                <tr>
                    <td>${wine.name}</td>
                    <td>${wine.packSize || '-'}</td>
                    <td>${invData.openingStock || 0}</td>
                    <td>${invData.purchased || 0}</td>
                    <td>${invData.trnIn || 0}</td>
                    <td>${invData.trnOut || 0}</td>
                    <td>${total}</td>
                    <td>${invData.closingStock || 0}</td>
                    <td>${sales}</td>
                    <td>₹${wine.price}</td>
                    <td>₹${(sales * wine.price).toLocaleString()}</td>
                </tr>
            `;
        });

        htmlContent += `
                </tbody></table>
                <div class="totals">
                    <p>Total Quantity: ${calculateTotals.totalQuantity}</p>
                    <p>Total Closing Stock Value: ₹${calculateTotals.totalClosingStockValue.toLocaleString()}</p>
                    <p>Total Amount: ₹${calculateTotals.totalAmount.toLocaleString()}</p>
                </div>
                ${notes ? `<div class="notes"><strong>Notes:</strong><br/>${notes.replace(/\n/g, '<br/>')}</div>` : ''}
            </body>
            </html>
        `;

        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 250);
        }
    };

    // Wine Management
    const addOrUpdateWine = async (wineData: Omit<Wine, 'id'>) => {
        const updatedWines = editingWine
            ? wines.map(w => w.id === editingWine.id ? { ...wineData, id: editingWine.id } : w)
            : [...wines, { ...wineData, id: Date.now().toString() }];

        try {
            await setDoc(doc(db, 'wines', 'global'), {
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
        if (!window.confirm('Are you sure you want to delete this wine?')) return;

        const updatedWines = wines.filter(w => w.id !== wineId);

        try {
            await setDoc(doc(db, 'wines', 'global'), {
                wines: updatedWines,
                lastUpdated: new Date().toISOString()
            });
            setWines(updatedWines);
        } catch (error) {
            console.error('Error deleting wine:', error);
            alert('Error deleting wine. Please try again.');
        }
    };

    // Authentication
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
            const shop = shops.find(s => s.id === password);
            if (shop) {
                setCurrentUser({ type: 'sub', name: shop.name, shopId: shop.id });
                setActiveShop(shop.id);
                setPassword('');
            } else {
                setLoginError('Incorrect password. Use your shop ID (e.g., shop_1)');
            }
        }
    };

    // Components
    const WineForm: React.FC<{ wine: Wine | null; onSave: (data: Omit<Wine, 'id'>) => void; onCancel: () => void; }> = ({ wine, onSave, onCancel }) => {
        const [formData, setFormData] = useState<Omit<Wine, 'id'>>(wine || { name: '', price: 0, packSize: '' });

        const handleSave = () => {
            if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
                alert('Please enter a valid price');
                return;
            }
            onSave({ ...formData, price: Number(formData.price) });
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
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                        />
                        <input
                            type="text"
                            placeholder="Pack Size (e.g., 750ml)"
                            value={formData.packSize || ''}
                            onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                        />
                        <input
                            type="number"
                            placeholder="Price (₹)"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSave} className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">Save</button>
                            <button onClick={onCancel} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Invoice Upload Modal
    const InvoiceUploadModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold mb-4 text-black">Upload Invoice PDF</h3>

                <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleInvoiceUpload}
                            className="hidden"
                            id="invoice-upload"
                        />
                        <label htmlFor="invoice-upload" className="cursor-pointer">
                            <Upload size={48} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-600">Click to upload invoice PDF</p>
                            {invoicePDF && <p className="text-green-600 mt-2 font-semibold">{invoicePDF.name}</p>}
                        </label>
                    </div>

                    {invoicePDF && !extractedInvoiceData.length && (
                        <button
                            onClick={processInvoicePDF}
                            disabled={isProcessingPDF}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            {isProcessingPDF ? 'Processing...' : 'Process PDF & Extract Data'}
                        </button>
                    )}

                    {extractedInvoiceData.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg font-bold text-black mb-3">Extracted Invoice Data</h4>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Brand #</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Brand Name</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Quantity</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Unit Rate</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Matched Wine</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {extractedInvoiceData.map((item, idx) => (
                                        <tr key={idx} className={`border-t ${item.matched ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <td className="px-4 py-2">
                                                {item.matched ? (
                                                    <CheckCircle size={20} className="text-green-600" />
                                                ) : (
                                                    <XCircle size={20} className="text-red-600" />
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-black">{item.brandNumber}</td>
                                            <td className="px-4 py-2 text-sm text-black">{item.brandName}</td>
                                            <td className="px-4 py-2 text-sm text-black">{item.totalQuantity}</td>
                                            <td className="px-4 py-2 text-sm text-black">₹{item.unitRate}</td>
                                            <td className="px-4 py-2 text-sm text-black">
                                                {item.matched && item.matchedWine ? (
                                                    <span className="text-green-700 font-medium">
                                                            {item.matchedWine.name} ({item.matchedWine.packSize})
                                                        </span>
                                                ) : (
                                                    <span className="text-red-700">No match found</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Summary:</strong> {extractedInvoiceData.filter(i => i.matched).length} of {extractedInvoiceData.length} items matched with existing wines.
                                    {extractedInvoiceData.some(i => !i.matched) && ' Unmatched items will be skipped.'}
                                </p>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={applyInvoiceToInventory}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
                                >
                                    Apply to Inventory
                                </button>
                                <button
                                    onClick={() => {
                                        setShowInvoiceUpload(false);
                                        setInvoicePDF(null);
                                        setExtractedInvoiceData([]);
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {!extractedInvoiceData.length && (
                        <button
                            onClick={() => {
                                setShowInvoiceUpload(false);
                                setInvoicePDF(null);
                            }}
                            className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    // Render Logic
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
                            <button onClick={() => setLoginType('main')} className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700">
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
                            <button onClick={() => setLoginType('sub')} className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700">
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
                                    {loginType === 'main' ? 'Password: admin' : 'Enter shop ID (e.g., shop_1, shop_2, shop_3)'}
                                </p>
                            </div>
                            <div className="relative text-black">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-12"
                                />
                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {loginError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{loginError}</div>}
                            <div className="flex gap-2">
                                <button onClick={handleLogin} className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700">Login</button>
                                <button onClick={() => { setLoginType(null); setPassword(''); setLoginError(''); }} className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400">Back</button>
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
                    <button onClick={() => { setCurrentUser(null); setActiveShop(null); }} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-lg">
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {currentUser.type === 'main' && (
                    <>
                        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">Wine Management</h2>
                                <button onClick={() => setShowWineForm(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                                    <Plus size={20} /> Add Wine
                                </button>
                            </div>
                            <div className="grid gap-4 max-h-96 overflow-y-auto">
                                {wines.map((wine) => (
                                    <div key={wine.id} className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300">
                                        <div>
                                            <h3 className="font-semibold text-lg text-black">{wine.name}</h3>
                                            <p className="text-gray-600">₹{wine.price} • {wine.packSize || 'N/A'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingWine(wine); setShowWineForm(true); }} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => deleteWine(wine.id)} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">View Shop Inventory</h2>
                            <select value={activeShop || ''} onChange={(e) => setActiveShop(e.target.value)} className="w-full border-2 text-black border-gray-300 rounded-lg px-4 py-3">
                                <option value="">Select a shop to view inventory</option>
                                {shops.map((shop) => (
                                    <option key={shop.id} value={shop.id}>{shop.name} ({shop.id})</option>
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
                                {currentUser.type === 'sub' && (
                                    <button
                                        onClick={() => setShowInvoiceUpload(true)}
                                        className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                                    >
                                        <Upload size={20} /> Upload Invoice
                                    </button>
                                )}
                                <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                                    <Calendar size={20} /> History
                                </button>
                                <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                                    <Clock size={20} /> Today
                                </button>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="border-2 text-black border-gray-300 rounded-lg px-4 py-2"
                                />
                                <button onClick={saveInventory} disabled={isSyncing} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                    <Save size={20} /> {isSyncing ? 'Syncing...' : 'Save'}
                                </button>
                                <button onClick={exportToExcel} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                    <FileSpreadsheet size={20} /> Excel
                                </button>
                                <button onClick={exportToPDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                                    <FileText size={20} /> PDF
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
                                            onClick={() => { setSelectedDate(saved.date); setShowHistory(false); }}
                                            className={`p-3 rounded-lg border-2 transition ${
                                                selectedDate === saved.date
                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                    : 'bg-white text-gray-800 border-gray-300 hover:border-purple-400'
                                            }`}
                                        >
                                            <div className="text-sm font-semibold">{saved.date}</div>
                                            <div className="text-xs opacity-75">{new Date(saved.timestamp).toLocaleTimeString()}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-purple-100 sticky top-0">
                                <tr>
                                    {HEADERS.map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {wines.map((wine) => {
                                    const key = `${activeShop}_${wine.id}`;
                                    const data = inventory[key] || {};
                                    const total = calculateTotal(activeShop, wine.id);
                                    const sales = calculateSales(activeShop, wine.id);
                                    const canEditAll = currentUser.type === 'main';
                                    const canEditClosing = currentUser.type === 'sub' && currentUser.shopId === activeShop;

                                    // Skip rows with no opening stock and no receipt
                                    const hasOpeningStock = (data.openingStock || 0) > 0;
                                    const hasReceipt = (data.purchased || 0) > 0;

                                    if (!hasOpeningStock && !hasReceipt) {
                                        return null;
                                    }

                                    return (
                                        <tr key={wine.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-black">{wine.name}</td>
                                            <td className="px-4 py-3 text-black">{wine.packSize || '-'}</td>
                                            {['openingStock', 'purchased', 'trnIn', 'trnOut'].map(field => (
                                                <td key={field} className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={data[field as keyof InventoryItem] || 0}
                                                        onChange={(e) => updateInventory(activeShop, wine.id, field as keyof InventoryItem, e.target.value)}
                                                        disabled={!canEditAll}
                                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-black disabled:bg-gray-100"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-indigo-600">{total}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={data.closingStock || 0}
                                                    onChange={(e) => updateInventory(activeShop, wine.id, 'closingStock', e.target.value)}
                                                    disabled={!canEditClosing && !canEditAll}
                                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-purple-600 font-semibold disabled:bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-blue-600">{sales}</span>
                                            </td>
                                            <td className="px-4 py-3 text-black">₹{wine.price}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-green-600">₹{(sales * wine.price).toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 bg-purple-50 rounded-lg p-4">
                            <div className="flex justify-end gap-8 text-lg font-bold flex-wrap">
                                <div className="text-gray-800">
                                    Total Quantity: <span className="text-purple-600">{calculateTotals.totalQuantity}</span>
                                </div>
                                <div className="text-gray-800">
                                    Total Closing Stock Value: <span className="text-blue-600">₹{calculateTotals.totalClosingStockValue.toLocaleString()}</span>
                                </div>
                                <div className="text-gray-800">
                                    Total Amount: <span className="text-green-600">₹{calculateTotals.totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {currentUser.type === 'sub' && (
                            <div className="mt-6">
                                <label className="block text-gray-800 font-semibold mb-2">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes or comments here..."
                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-black min-h-32 resize-y"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showWineForm && (
                <WineForm
                    wine={editingWine}
                    onSave={addOrUpdateWine}
                    onCancel={() => { setShowWineForm(false); setEditingWine(null); }}
                />
            )}

            {showInvoiceUpload && <InvoiceUploadModal />}
        </div>
    );
};

export default Home;
