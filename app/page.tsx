'use client'

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, LogOut, Save, FileSpreadsheet, Eye, EyeOff } from 'lucide-react';
import * as XLSX from 'xlsx';

const WINES_SCHEMA_VERSION = '2025-11-06-reset-204';

// simple localStorage wrapper for JSON values
const storage = {
    get(key) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            const toStore = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
            localStorage.setItem(key, toStore);
        } catch (e) {
            console.error('storage.set error', e);
        }
    }
};

const Home = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [wines, setWines] = useState([]);
    const [shops, setShops] = useState([]);
    const [inventory, setInventory] = useState({});
    const [activeShop, setActiveShop] = useState(null);
    const [showWineForm, setShowWineForm] = useState(false);
    const [editingWine, setEditingWine] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Login state
    const [loginType, setLoginType] = useState(null);
    const [selectedShopForLogin, setSelectedShopForLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        initializeData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initializeData = async () => {
        // Initialize shops
        const initialShops = [
            { id: 'shop_1', name: 'Downtown Wine Shop', adminId: 'admin_1' },
            { id: 'shop_2', name: 'Northside Liquor Store', adminId: 'admin_2' },
            { id: 'shop_3', name: 'Eastview Wine Mart', adminId: 'admin_3' },
            { id: 'shop_4', name: 'Westgate Spirits', adminId: 'admin_4' },
            { id: 'shop_5', name: 'Central Plaza Wines', adminId: 'admin_5' },
            { id: 'shop_6', name: 'Riverside Liquor Shop', adminId: 'admin_6' },
            { id: 'shop_7', name: 'Hillside Wine Store', adminId: 'admin_7' },
            { id: 'shop_8', name: 'Market Street Wines', adminId: 'admin_8' },
            { id: 'shop_9', name: 'Garden City Liquor', adminId: 'admin_9' },
            { id: 'shop_10', name: 'Lakeside Wine Shop', adminId: 'admin_10' },
            { id: 'shop_11', name: 'Parkview Spirits', adminId: 'admin_11' },
            { id: 'shop_12', name: 'Junction Wine Mart', adminId: 'admin_12' },
            { id: 'shop_13', name: 'Broadway Liquor Store', adminId: 'admin_13' },
            { id: 'shop_14', name: 'Sunset Wine Shop', adminId: 'admin_14' },
            { id: 'shop_15', name: 'Sunrise Spirits', adminId: 'admin_15' },
            { id: 'shop_16', name: 'Valley Wine Store', adminId: 'admin_16' },
            { id: 'shop_17', name: 'Mountain View Liquor', adminId: 'admin_17' },
            { id: 'shop_18', name: 'Ocean Breeze Wines', adminId: 'admin_18' },
            { id: 'shop_19', name: 'Forest Grove Wine Shop', adminId: 'admin_19' },
            { id: 'shop_20', name: 'Meadow Spirits', adminId: 'admin_20' },
            { id: 'shop_21', name: 'Crystal Wine Mart', adminId: 'admin_21' },
            { id: 'shop_22', name: 'Golden Gate Liquor', adminId: 'admin_22' },
            { id: 'shop_23', name: 'Silver Creek Wine Shop', adminId: 'admin_23' },
            { id: 'shop_24', name: 'Maple Street Spirits', adminId: 'admin_24' },
            { id: 'shop_25', name: 'Oak Avenue Wines', adminId: 'admin_25' },
            { id: 'shop_26', name: 'Pine Ridge Liquor Store', adminId: 'admin_26' },
            { id: 'shop_27', name: 'Cedar Plaza Wine Shop', adminId: 'admin_27' },
            { id: 'shop_28', name: 'Elm Street Spirits', adminId: 'admin_28' },
            { id: 'shop_29', name: 'Birch Lane Wine Mart', adminId: 'admin_29' },
            { id: 'shop_30', name: 'Willow Way Liquor', adminId: 'admin_30' }
        ];
        setShops(initialShops);
        storage.set('shops', initialShops);

        await loadData();
    };

    const loadData = async () => {
        try {
            const winesVersion = storage.get('wines_schema_version');

            const sampleWines = [
                { id: '1', name: '100 Pipers 12y', price: 2970, category: 'Whisky' },
                { id: '2', name: '100 Pipers 8Y', price: 2880, category: 'Whisky' },
                { id: '3', name: '100 Pipers Nips', price: 540, category: 'Whisky' },
                { id: '4', name: '100 Pipers Pints', price: 1080, category: 'Whisky' },
                { id: '5', name: '100 Pipres Qrs', price: 2160, category: 'Whisky' },
                { id: '6', name: '8 Pm Whisky Nips', price: 220, category: 'Whisky' },
                { id: '7', name: '8 Pm Whisky Pints', price: 440, category: 'Whisky' },
                { id: '8', name: '8 Pm Whisky Qts', price: 880, category: 'Whisky' },
                { id: '9', name: '8 Pm 90 Ml', price: 120, category: 'Whisky' },
                { id: '10', name: 'Absoult Vodka Qts', price: 2470, category: 'Vodka' },
                { id: '11', name: 'All Season   Nips', price: 280, category: 'Brandy' },
                { id: '12', name: 'All Season Pints', price: 560, category: 'Brandy' },
                { id: '13', name: 'Allseason Qts', price: 1120, category: 'Brandy' },
                { id: '14', name: 'Antiquity Blue Nips', price: 360, category: 'Whisky' },
                { id: '15', name: 'Antiquity Blue Pints', price: 730, category: 'Whisky' },
                { id: '16', name: 'Antiquity Blue Qts', price: 1450, category: 'Whisky' },
                { id: '17', name: 'Bakardi  Rum Qts', price: 1320, category: 'Rum' },
                { id: '18', name: 'Ballantines Nips', price: 680, category: 'Whisky' },
                { id: '19', name: 'Ballantines Pints', price: 1360, category: 'Whisky' },
                { id: '20', name: 'Ballantines Qts', price: 2720, category: 'Whisky' },
                { id: '21', name: 'Black Dog 12  Qts', price: 3040, category: 'Whisky' },
                { id: '22', name: 'Black Dog Nips', price: 540, category: 'Whisky' },
                { id: '23', name: 'Black Dog Pints', price: 1090, category: 'Whisky' },
                { id: '24', name: 'Black Dog Qts', price: 2160, category: 'Whisky' },
                { id: '25', name: 'Black Lable Qts', price: 4770, category: 'Whisky' },
                { id: '26', name: 'Black & White Nips', price: 520, category: 'Whisky' },
                { id: '27', name: 'Black & White Pints', price: 1050, category: 'Whisky' },
                { id: '28', name: 'Black & White Qts', price: 2080, category: 'Whisky' },
                { id: '29', name: 'Brezer', price: 130, category: 'Beer' },
                { id: '30', name: 'Brezer Gold', price: 150, category: 'Beer' },
                { id: '31', name: 'B S P Reserve 90 ml', price: 210, category: 'Whisky' },
                { id: '32', name: 'B S P Reserve NIps', price: 390, category: 'Whisky' },
                { id: '33', name: 'B S P Reserve Pints', price: 780, category: 'Whisky' },
                { id: '34', name: 'B S P Reserve Qts', price: 1560, category: 'Whisky' },
                { id: '35', name: 'B S P 2000ML', price: 3560, category: 'Whisky' },
                { id: '36', name: 'B S P 1000 ML', price: 1790, category: 'Whisky' },
                { id: '37', name: 'B S Pride 90 ml', price: 180, category: 'Whisky' },
                { id: '38', name: 'B S Pride Nips', price: 340, category: 'Whisky' },
                { id: '39', name: 'B S Pride Pints', price: 680, category: 'Whisky' },
                { id: '40', name: 'B S Pride Qts', price: 1360, category: 'Whisky' },
                { id: '41', name: 'Budweiser Stroing', price: 260, category: 'Beer' },
                { id: '42', name: 'Bud Magnum Tin', price: 190, category: 'Beer' },
                { id: '43', name: 'Budwiser', price: 250, category: 'Beer' },
                { id: '44', name: 'Budwiser Tin', price: 190, category: 'Beer' },
                { id: '45', name: 'Carona Beer', price: 250, category: 'Beer' },
                { id: '46', name: 'Cheep 1 Ltr', price: 560, category: 'Brandy' },
                { id: '47', name: 'Cheep Nips', price: 110, category: 'Brandy' },
                { id: '48', name: 'Chivas  18 Y Qts', price: 9030, category: 'Whisky' },
                { id: '49', name: 'Chivas  12 Y Qts', price: 4580, category: 'Whisky' },
                { id: '50', name: 'CNB Nips', price: 220, category: 'Brandy' },
                { id: '51', name: 'CNB Pints', price: 440, category: 'Brandy' },
                { id: '52', name: 'CNB Qts', price: 880, category: 'Brandy' },
                { id: '53', name: 'CNB Green Qts', price: 1280, category: 'Brandy' },
                { id: '54', name: 'Dewars White Nips', price: 580, category: 'Whisky' },
                { id: '55', name: 'Dewars White Lable', price: 2320, category: 'Whisky' },
                { id: '56', name: 'Elite Shiraz Nips', price: 300, category: 'Wine' },
                { id: '57', name: 'Elite Shiraz Pints', price: 600, category: 'Wine' },
                { id: '58', name: 'Elite Shiraz Qts', price: 1200, category: 'Wine' },
                { id: '59', name: 'Golfer Shot Qts', price: 1360, category: 'Vodka' },
                { id: '60', name: 'Green Deer  ', price: 180, category: 'Beer' },
                { id: '61', name: 'Hay 5000 Beer', price: 190, category: 'Beer' },
                { id: '62', name: 'Hob Sons Qts', price: 2120, category: 'Whisky' },
                { id: '63', name: 'IB 1000 ml', price: 1010, category: 'Whisky' },
                { id: '64', name: 'I B Nips', price: 190, category: 'Whisky' },
                { id: '65', name: 'I B Pints', price: 380, category: 'Whisky' },
                { id: '66', name: 'I B Qts', price: 760, category: 'Whisky' },
                { id: '67', name: 'I B 90 ml', price: 100, category: 'Whisky' },
                { id: '68', name: 'Iconiq Nips', price: 190, category: 'Whisky' },
                { id: '69', name: 'Iconiq Pints', price: 380, category: 'Whisky' },
                { id: '70', name: 'Iconiq Qts', price: 760, category: 'Whisky' },
                { id: '71', name: 'Iconiq 90 Ml', price: 100, category: 'Whisky' },
                { id: '72', name: 'J and B Whisky', price: 2640, category: 'Whisky' },
                { id: '73', name: 'Johony Blend ', price: 3880, category: 'Whisky' },
                { id: '74', name: 'Jumpson Qts', price: 2760, category: 'Whisky' },
                { id: '75', name: 'Jumpson 200 ml', price: 770, category: 'Whisky' },
                { id: '76', name: 'Henken Lager', price: 270, category: 'Beer' },
                { id: '77', name: 'K F Lager 650 ML', price: 180, category: 'Beer' },
                { id: '78', name: 'K F Strong 650 Ml', price: 190, category: 'Beer' },
                { id: '79', name: 'K F Ultra', price: 250, category: 'Beer' },
                { id: '80', name: 'Kf Ultra Max 650 ml', price: 260, category: 'Beer' },
                { id: '81', name: 'K Out 650 Ml', price: 190, category: 'Beer' },
                { id: '82', name: 'Kyron Brandy Nips', price: 320, category: 'Brandy' },
                { id: '83', name: 'Kyron Brandy Pints', price: 640, category: 'Brandy' },
                { id: '84', name: 'Kyron Brandy Qts', price: 1280, category: 'Brandy' },
                { id: '85', name: 'Legacy nips', price: 390, category: 'Whisky' },
                { id: '86', name: 'Legacy Pints', price: 780, category: 'Whisky' },
                { id: '87', name: 'Legacy Qts', price: 1560, category: 'Whisky' },
                { id: '88', name: 'Lyka Wine Nips', price: 220, category: 'Wine' },
                { id: '89', name: 'Lyka Wine Pints', price: 440, category: 'Wine' },
                { id: '90', name: 'Lyka Wine Qts', price: 880, category: 'Wine' },
                { id: '91', name: 'M M Vodka Nips', price: 210, category: 'Vodka' },
                { id: '92', name: 'M M Vodka Pints', price: 420, category: 'Vodka' },
                { id: '93', name: 'M M Vodka Qts', price: 840, category: 'Vodka' },
                { id: '94', name: 'Majic P Wine Nips', price: 160, category: 'Wine' },
                { id: '95', name: 'Majic P Wine Pints', price: 320, category: 'Wine' },
                { id: '96', name: 'Majic P Wine Qts', price: 640, category: 'Wine' },
                { id: '97', name: 'MCP Nips', price: 210, category: 'Whisky' },
                { id: '98', name: 'M C P Pints', price: 420, category: 'Whisky' },
                { id: '99', name: 'M C P Qts', price: 840, category: 'Whisky' },
                { id: '100', name: 'Mc W 1000 Ml', price: 1010, category: 'Whisky' },
                { id: '101', name: 'M C W Nips', price: 190, category: 'Whisky' },
                { id: '102', name: 'M C W Pints', price: 380, category: 'Whisky' },
                { id: '103', name: 'M C W Qts', price: 760, category: 'Whisky' },
                { id: '104', name: 'M C W 90 Ml', price: 100, category: 'Whisky' },
                { id: '105', name: 'M H B 2 Lits', price: 2020, category: 'Whisky' },
                { id: '106', name: 'M H B 1 Lits', price: 1010, category: 'Whisky' },
                { id: '107', name: 'M H B Nips', price: 180, category: 'Whisky' },
                { id: '108', name: 'M H B Pints', price: 370, category: 'Whisky' },
                { id: '109', name: 'M H B Qts', price: 730, category: 'Whisky' },
                { id: '110', name: 'M H B 90 Ml', price: 100, category: 'Whisky' },
                { id: '111', name: 'MHB Orenge Nips', price: 220, category: 'Whisky' },
                { id: '112', name: 'MHB Orenge Pints', price: 440, category: 'Whisky' },
                { id: '113', name: 'MHB Orenge Qts', price: 880, category: 'Whisky' },
                { id: '114', name: 'M H W Nips', price: 230, category: 'Whisky' },
                { id: '115', name: 'M H W Pints', price: 450, category: 'Whisky' },
                { id: '116', name: 'M H W Qts', price: 920, category: 'Whisky' },
                { id: '117', name: 'Morphose Nips', price: 310, category: 'Whisky' },
                { id: '118', name: 'Morphose Pints', price: 620, category: 'Whisky' },
                { id: '119', name: 'Morphose Qts', price: 1240, category: 'Whisky' },
                { id: '120', name: 'O A B Nips', price: 140, category: 'Whisky' },
                { id: '121', name: 'O A B Qts', price: 560, category: 'Whisky' },
                { id: '122', name: 'O A B 90ML', price: 80, category: 'Whisky' },
                { id: '123', name: 'O A B 1000 ml', price: 760, category: 'Whisky' },
                { id: '124', name: 'Oaken Glow  Qts', price: 1280, category: 'Whisky' },
                { id: '125', name: 'Oaken Glow  Nips', price: 320, category: 'Whisky' },
                { id: '126', name: 'O C W Nips', price: 160, category: 'Whisky' },
                { id: '127', name: 'O C W Pints', price: 320, category: 'Whisky' },
                { id: '128', name: 'O C W Qts', price: 640, category: 'Whisky' },
                { id: '129', name: 'O C W 90 Ml', price: 90, category: 'Whisky' },
                { id: '130', name: 'O C W Blue Nips', price: 190, category: 'Whisky' },
                { id: '131', name: 'O C W Blue Pints', price: 380, category: 'Whisky' },
                { id: '132', name: 'O C W Blue Qts', price: 760, category: 'Whisky' },
                { id: '133', name: 'O C W Blue 90ml', price: 100, category: 'Whisky' },
                { id: '134', name: 'Oksmith G Nips', price: 370, category: 'Whisky' },
                { id: '135', name: 'Oksmith G Pints', price: 740, category: 'Whisky' },
                { id: '136', name: 'Oksmith G Qts', price: 1480, category: 'Whisky' },
                { id: '137', name: 'Oksmith S Nips', price: 260, category: 'Whisky' },
                { id: '138', name: 'Oksmith S Pints', price: 520, category: 'Whisky' },
                { id: '139', name: 'Oksmith S Qts', price: 1040, category: 'Whisky' },
                { id: '140', name: 'Old Munk rum Nips', price: 190, category: 'Rum' },
                { id: '141', name: 'Old Munk rum Pints', price: 380, category: 'Rum' },
                { id: '142', name: 'Old Munk rum Qts', price: 760, category: 'Rum' },
                { id: '143', name: 'Opera Wine Nips', price: 220, category: 'Wine' },
                { id: '144', name: 'Opera Wine Pints', price: 440, category: 'Wine' },
                { id: '145', name: 'Opera Wine Qts', price: 880, category: 'Wine' },
                { id: '146', name: 'R C Beer 650 Ml', price: 180, category: 'Beer' },
                { id: '147', name: 'Rc Blue 90 ML', price: 120, category: 'Whisky' },
                { id: '148', name: 'Rc Blended Nips', price: 220, category: 'Whisky' },
                { id: '149', name: 'Rc Blended Pints', price: 440, category: 'Whisky' },
                { id: '150', name: 'Rc Blended Qts', price: 880, category: 'Whisky' },
                { id: '151', name: 'Rcw American  Nips', price: 340, category: 'Whisky' },
                { id: '152', name: 'Rcw American  Pints', price: 680, category: 'Whisky' },
                { id: '153', name: 'Rcw American Qts', price: 1360, category: 'Whisky' },
                { id: '154', name: 'R C Whisky 2 Lits', price: 2960, category: 'Whisky' },
                { id: '155', name: 'R C Whisky 1 Lits', price: 1480, category: 'Whisky' },
                { id: '156', name: 'R C Whisky Nips', price: 300, category: 'Whisky' },
                { id: '157', name: 'R C Whisky Pints', price: 600, category: 'Whisky' },
                { id: '158', name: 'R C Whisky Qts', price: 1200, category: 'Whisky' },
                { id: '159', name: 'R C Whisky 90 Ml', price: 160, category: 'Whisky' },
                { id: '160', name: 'Red Lable Qts', price: 2610, category: 'Whisky' },
                { id: '161', name: 'Royal Green 90 ml', price: 120, category: 'Whisky' },
                { id: '162', name: 'Royal Green Nips', price: 220, category: 'Whisky' },
                { id: '163', name: 'Royal Green Pints', price: 440, category: 'Whisky' },
                { id: '164', name: 'Royal Green Qts', price: 880, category: 'Whisky' },
                { id: '165', name: 'Rock Ford Qts', price: 1460, category: 'Whisky' },
                { id: '166', name: 'Rock Ford Pints', price: 730, category: 'Whisky' },
                { id: '167', name: 'Rock Ford Nips', price: 360, category: 'Whisky' },
                { id: '168', name: 'R Stage 2 Lits', price: 2340, category: 'Whisky' },
                { id: '169', name: 'R Stage 1 Lits', price: 1180, category: 'Whisky' },
                { id: '170', name: 'R Stage Nips', price: 220, category: 'Whisky' },
                { id: '171', name: 'R Stage Pints', price: 440, category: 'Whisky' },
                { id: '172', name: 'R Stage Qts', price: 880, category: 'Whisky' },
                { id: '173', name: 'R Stage 90 Ml', price: 120, category: 'Whisky' },
                { id: '174', name: 'Signature 2 lits', price: 3510, category: 'Whisky' },
                { id: '175', name: 'Signature  1 lits', price: 1750, category: 'Whisky' },
                { id: '176', name: 'Signature Nips', price: 340, category: 'Whisky' },
                { id: '177', name: 'Signature  Pints', price: 680, category: 'Whisky' },
                { id: '178', name: 'Signature Qts', price: 1360, category: 'Whisky' },
                { id: '179', name: 'Signature 90 ml', price: 180, category: 'Whisky' },
                { id: '180', name: 'Smirnoff Nips', price: 310, category: 'Vodka' },
                { id: '181', name: 'Smirnoff Pints', price: 620, category: 'Vodka' },
                { id: '182', name: 'Smirnoff Qts', price: 1240, category: 'Vodka' },
                { id: '183', name: 'Sterling B10 Nibs', price: 350, category: 'Whisky' },
                { id: '184', name: 'Sterling B10 Pints', price: 700, category: 'Whisky' },
                { id: '185', name: 'Sterling B 10 Qts', price: 1400, category: 'Whisky' },
                { id: '186', name: 'Sterling B7 Nibs', price: 220, category: 'Whisky' },
                { id: '187', name: 'Sterling B7 Pints', price: 440, category: 'Whisky' },
                { id: '188', name: 'Sterling B7 Qts', price: 880, category: 'Whisky' },
                { id: '189', name: 'Sterling B7 90ml', price: 120, category: 'Whisky' },
                { id: '190', name: 'Sula Red Wine Nips', price: 300, category: 'Wine' },
                { id: '191', name: 'Sula Red Wine Pints', price: 600, category: 'Wine' },
                { id: '192', name: 'Sula Red Wine Qts', price: 1200, category: 'Wine' },
                { id: '193', name: 'P Stcoh Qts', price: 1450, category: 'Whisky' },
                { id: '194', name: 'Teachers 50', price: 3200, category: 'Whisky' },
                { id: '195', name: 'Teachers Nips', price: 580, category: 'Whisky' },
                { id: '196', name: 'Teachers Pints', price: 1160, category: 'Whisky' },
                { id: '197', name: 'Teachers Qts', price: 2320, category: 'Whisky' },
                { id: '198', name: 'The Glenveet 12y ', price: 7100, category: 'Whisky' },
                { id: '199', name: 'Thalisker Qts', price: 6590, category: 'Whisky' },
                { id: '200', name: 'Twntey One Plus Qts', price: 1450, category: 'Whisky' },
                { id: '201', name: 'Vat 69 Nips', price: 500, category: 'Whisky' },
                { id: '202', name: 'Vat 69 Pints', price: 1010, category: 'Whisky' },
                { id: '203', name: 'Vat 69 Qts', price: 2000, category: 'Whisky' },
                { id: '204', name: 'William Law son Qts', price: 2200, category: 'Whisky' }
            ];

            if (winesVersion !== WINES_SCHEMA_VERSION) {
                storage.set('wines', sampleWines);
                storage.set('wines_schema_version', WINES_SCHEMA_VERSION);
                setWines(sampleWines);
            } else {
                const winesResult = storage.get('wines');
                if (Array.isArray(winesResult) && winesResult.length) {
                    setWines(winesResult);
                } else {
                    setWines(sampleWines);
                    storage.set('wines', sampleWines);
                }
            }

            await loadInventoryForDate(new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const loadInventoryForDate = async (date) => {
        try {
            const inv = storage.get(`inventory_${date}`);
            setInventory(inv && typeof inv === 'object' ? inv : {});
        } catch (error) {
            console.error('Error loading inventory:', error);
            setInventory({});
        }
    };

    const saveInventory = async () => {
        try {
            storage.set(`inventory_${selectedDate}`, inventory);
            alert('Inventory saved successfully!');
        } catch (error) {
            console.error('Error saving inventory:', error);
            alert('Error saving inventory');
        }
    };

    const exportToExcel = () => {
        if (!activeShop) {
            alert('Please select a shop first');
            return;
        }

        const shop = shops.find(s => s.id === activeShop);
        const data = [];

        data.push(['SHOP NAME', '', shop?.name || '', '', '', '', 'DATE', selectedDate]);
        data.push(['Particulars', 'Qty', 'Receipts', 'Tra In', 'Total', 'Tra Out', 'Closing', 'Sales', 'Rate', 'Amount']);

        wines.forEach(wine => {
            const key = `${activeShop}_${wine.id}`;
            const invData = inventory[key] || {};
            const openingStock = invData.openingStock || 0;
            const purchased = invData.purchased || 0;
            const sold = invData.sold || 0;
            const closingStock = openingStock + purchased - sold;
            const amount = sold * wine.price;

            data.push([
                wine.name,
                '',
                purchased,
                '',
                openingStock + purchased,
                '',
                closingStock,
                sold,
                wine.price,
                amount
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [
            { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
            { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

        const filename = `${(shop?.name || 'Shop')}_${selectedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    // Login with password verification
    const handleLogin = () => {
        setLoginError('');

        if (loginType === 'main') {
            if (password === 'admin') {
                setCurrentUser({ type: 'main', name: 'Main Admin' });
                setPassword('');
            } else {
                setLoginError('Incorrect password for Main Admin');
            }
        } else if (loginType === 'sub' && selectedShopForLogin) {
            const shop = shops.find(s => s.id === selectedShopForLogin);
            if (!shop) {
                setLoginError('Please select a shop');
                return;
            }
            if (password === shop.id) {
                setCurrentUser({ type: 'sub', name: shop.name, shopId: shop.id });
                setActiveShop(shop.id);
                setPassword('');
                setSelectedShopForLogin('');
            } else {
                setLoginError('Incorrect password. Use shop ID as password.');
            }
        } else {
            setLoginError('Please select a shop');
        }
    };

    // Wine Management (Main Admin only)
    const addOrUpdateWine = async (wineData) => {
        try {
            let updatedWines;
            if (editingWine) {
                updatedWines = wines.map(w => w.id === editingWine.id ? { ...wineData, id: editingWine.id } : w);
            } else {
                const newWine = { ...wineData, id: Date.now().toString() };
                updatedWines = [...wines, newWine];
            }
            setWines(updatedWines);
            storage.set('wines', updatedWines);
            setShowWineForm(false);
            setEditingWine(null);
        } catch (error) {
            console.error('Error saving wine:', error);
        }
    };

    const deleteWine = async (wineId) => {
        if (confirm('Are you sure you want to delete this wine?')) {
            try {
                const updatedWines = wines.filter(w => w.id !== wineId);
                setWines(updatedWines);
                storage.set('wines', updatedWines);
            } catch (error) {
                console.error('Error deleting wine:', error);
            }
        }
    };

    // Inventory Management
    const updateInventory = (shopId, wineId, field, value) => {
        const key = `${shopId}_${wineId}`;
        setInventory(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                shopId,
                wineId,
                [field]: parseInt(value, 10) || 0
            }
        }));
    };

    const calculateClosingStock = (shopId, wineId) => {
        const key = `${shopId}_${wineId}`;
        const data = inventory[key] || {};
        const opening = data.openingStock || 0;
        const purchased = data.purchased || 0;
        const sold = data.sold || 0;
        return opening + purchased - sold;
    };

    // Login Screen
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
                                    {loginType === 'main' ? 'Password: admin' : 'Password: Your shop ID (e.g., shop_7)'}
                                </p>
                            </div>

                            {loginType === 'sub' && (
                                <select
                                    value={selectedShopForLogin}
                                    onChange={(e) => setSelectedShopForLogin(e.target.value)}
                                    className="w-full border-2 text-black border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">Select Your Shop</option>
                                    {shops.map(shop => (
                                        <option key={shop.id} value={shop.id}>{shop.name} ({shop.id})</option>
                                    ))}
                                </select>
                            )}

                            <div className="relative text-black">
                                <input
                                    type={showPassword ? "text" : "password"}
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
                                        setSelectedShopForLogin('');
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

    // Wine Form Component
    const WineForm = ({ wine, onSave, onCancel }) => {
        const [formData, setFormData] = useState(wine || { name: '', price: '', category: 'Whisky' });

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
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="Whisky">Whisky</option>
                            <option value="Vodka">Vodka</option>
                            <option value="Rum">Rum</option>
                            <option value="Brandy">Brandy</option>
                            <option value="Beer">Beer</option>
                            <option value="Wine">Wine</option>
                        </select>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onSave(formData)}
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
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
                {/* Main Admin View */}
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
                                {wines.map(wine => (
                                    <div key={wine.id} className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition">
                                        <div>
                                            <h3 className="font-semibold text-lg text-black">{wine.name}</h3>
                                            <p className="text-gray-600">₹{wine.price} - {wine.category}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingWine(wine); setShowWineForm(true); }}
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

                        {/* Shop Selection for Main Admin */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">View Shop Inventory</h2>
                            <select
                                value={activeShop || ''}
                                onChange={(e) => setActiveShop(e.target.value)}
                                className="w-full border-2 text-black border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="">Select a shop to view inventory</option>
                                {shops.map(shop => (
                                    <option key={shop.id} value={shop.id}>{shop.name} ({shop.id})</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {/* Inventory View */}
                {activeShop && (
                    <div className="bg-white rounded-xl shadow-md p-6 mt-6">
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Inventory - {shops.find(s => s.id === activeShop)?.name}
                            </h2>
                            <div className="flex items-center gap-4 flex-wrap">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value);
                                        loadInventoryForDate(e.target.value);
                                    }}
                                    className="border-2 text-black border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <button
                                    onClick={saveInventory}
                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                                >
                                    <Save size={20} />
                                    Save
                                </button>
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    <FileSpreadsheet size={20} />
                                    Export to Excel
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-purple-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Particulars</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rate</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Opening Stock</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Receipts</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sales</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Closing Stock</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                                </tr>
                                </thead>
                                <tbody>
                                {wines.map(wine => {
                                    const key = `${activeShop}_${wine.id}`;
                                    const data = inventory[key] || {};
                                    const closingStock = calculateClosingStock(activeShop, wine.id);
                                    const sold = data.sold || 0;
                                    const amount = sold * wine.price;
                                    const canEdit = currentUser.type === 'sub' && currentUser.shopId === activeShop;

                                    return (
                                        <tr key={wine.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-black">{wine.name}</td>
                                            <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            {wine.category}
                          </span>
                                            </td>
                                            <td className="px-4 py-3 text-black">₹{wine.price}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={data.openingStock || 0}
                                                    onChange={(e) => updateInventory(activeShop, wine.id, 'openingStock', e.target.value)}
                                                    disabled={!canEdit}
                                                    className="w-24 border border-gray-300 rounded px-2 py-1 text-black disabled:bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={data.purchased || 0}
                                                    onChange={(e) => updateInventory(activeShop, wine.id, 'purchased', e.target.value)}
                                                    disabled={!canEdit}
                                                    className="w-24 border text-black border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={data.sold || 0}
                                                    onChange={(e) => updateInventory(activeShop, wine.id, 'sold', e.target.value)}
                                                    disabled={!canEdit}
                                                    className="w-24 border text-black border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-purple-600">{closingStock}</span>
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
                    onCancel={() => { setShowWineForm(false); setEditingWine(null); }}
                />
            )}
        </div>
    );
};

export default Home;
