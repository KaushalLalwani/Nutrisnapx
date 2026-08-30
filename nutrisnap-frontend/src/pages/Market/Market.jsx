import React, { useState, useEffect, useRef } from 'react';
import './Market.css';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const fetchMarket = async (path, options) => {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) {
        let detail = `Market request failed (${res.status})`;
        try {
            const error = await res.json();
            detail = error.detail || detail;
        } catch {
        }
        throw new Error(detail);
    }
    return res.json();
};

export default function Market() {
const [activeTab, setActiveTab] = useState('search');
    const [location, setLocation] = useState({ lat: 26.4861, lon: 80.2857, address: "Sharda Nagar, Kanpur, Uttar Pradesh, India" });
    const [locInput, setLocInput] = useState(location.address);
    const [locResults, setLocResults] = useState([]);
    const [showLocDropdown, setShowLocDropdown] = useState(false);

    const [categories, setCategories] = useState([]);
    const [currentCategory, setCurrentCategory] = useState('');
    const [categoryData, setCategoryData] = useState({ rows: [], subcatResults: null, status: 'Loading...', error: false });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ products: [], status: '', error: false });

    const [basketItems, setBasketItems] = useState(() => JSON.parse(localStorage.getItem('market-basket-items') || '[]'));

    const locSearchTimer = useRef(null);

    // --- Initialization ---
    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (categories.length > 0 && !currentCategory) {
            setCurrentCategory(categories[0].slug);
        }
    }, [categories]);

    useEffect(() => {
    if (currentCategory && categories.length > 0) loadCategoryHome();
}, [currentCategory, categories]);

    useEffect(() => {
        localStorage.setItem('market-basket-items', JSON.stringify(basketItems));
    }, [basketItems]);

    // --- Location Handlers ---
    const handleLocChange = (e) => {
        const val = e.target.value;
        setLocInput(val);
        clearTimeout(locSearchTimer.current);
        if (val.length < 3) {
            setShowLocDropdown(false);
            return;
        }
        locSearchTimer.current = setTimeout(() => runLocSearch(val), 500);
    };

    const runLocSearch = async (q) => {
        try {
            const data = await fetchMarket(`/api/geocode/search?q=${encodeURIComponent(q)}`);
            setLocResults(data.results || []);
            setShowLocDropdown(true);
        } catch (err) {
            setLocResults([]);
        }
    };

    const selectLocation = (lat, lon, address) => {
        setLocation({ lat, lon, address });
        setLocInput(address);
        setShowLocDropdown(false);
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return alert('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                const data = await fetchMarket(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
                selectLocation(latitude, longitude, data.address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            } catch (err) {
                selectLocation(latitude, longitude, `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            }
        });
    };

    // --- Category Handlers ---
    const fetchCategories = async () => {
        try {
            const data = await fetchMarket('/api/categories');
            setCategories(data.categories || []);
        } catch (err) {
            console.error("Failed to load categories", err);
        }
    };

    const loadCategoryHome = () => {
    setCategoryData(prev => ({ ...prev, status: '', error: false }));
    const cat = categories.find(c => c.slug === currentCategory);
    
    if (cat && cat.items) {
        // Load the items into the sidebar, but DO NOT automatically trigger loadSubcategory()
        setCategoryData({ rows: cat.items, subcatResults: null, status: '', error: false });
    }
};

    const loadSubcategory = async (itemName) => {
        setCategoryData(prev => ({ ...prev, status: `Searching for "${itemName}"...`, subcatResults: null, error: false }));
        try {
            const data = await fetchMarket(`/api/search?query=${encodeURIComponent(itemName)}&lat=${location.lat}&lon=${location.lon}&address=${encodeURIComponent(location.address)}`);
            setCategoryData(prev => ({ ...prev, status: '', subcatResults: data, error: false }));
        } catch (err) {
            setCategoryData(prev => ({ ...prev, status: err.message, error: true }));
        }
    };

    // --- Search Handlers ---
    const runSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearchResults({ products: [], status: 'Searching...', error: false });
        try {
            const data = await fetchMarket(`/api/search?query=${encodeURIComponent(searchQuery)}&lat=${location.lat}&lon=${location.lon}&address=${encodeURIComponent(location.address)}`);
            setSearchResults({ products: data.products || [], status: '', error: false });
        } catch (err) {
            setSearchResults({ products: [], status: err.message, error: true });
        }
    };

    // --- Basket Handlers ---
    const toggleBasketItem = (product) => {
        const itemId = `${product.name}|${product.quantity || ''}`;
        setBasketItems(prev => {
            const exists = prev.find(i => i.id === itemId);
            if (exists) return prev.filter(i => i.id !== itemId);
            return [...prev, { ...product, id: itemId }];
        });
    };

    // --- Render Helpers ---
    const renderPriceCell = (platformLabel, productObj, isCheapest, unavailableReason, cached) => {
        if (unavailableReason || !productObj || !productObj.in_stock) {
            return (
                <div className="price-cell unavailable">
                    <span className="platform-tag">{platformLabel}</span>
                    <span className="price">{unavailableReason ? 'unavailable' : !productObj ? 'no match' : 'out of stock'}</span>
                </div>
            );
        }
        return (
            <div className={`price-cell ${isCheapest ? 'cheapest' : ''}`}>
                {isCheapest && <span className="stamp">cheapest</span>}
                <span className="platform-tag">
                    {platformLabel} {cached && <span className="tag cached" style={{ marginLeft: '3px' }}>cached</span>}
                </span>
                <span className="price">₹{productObj.price?.toFixed(2) ?? '—'}</span>
                {productObj.unit_price && <div className="unit-price">{productObj.unit_price.label} {productObj.unit_price.value}</div>}
            </div>
        );
    };

    const renderProductRow = (g, platformStatus) => {
        const itemId = `${g.name}|${g.quantity || ''}`;
        const isAdded = basketItems.some(item => item.id === itemId);
        const shown = `${g.name}${g.quantity ? ' · ' + g.quantity : ''}`;

        return (
            <div className="row product-row" key={itemId}>
                <div className="product-main">
                    {g.image_url && <img className="product-image" src={g.image_url} alt={shown} loading="lazy" />}
                    <div className="item-name">
                        {shown}
                        {g.matched_by === 'llm' && <div className="badges"><span className="tag ai">AI matched</span></div>}
                    </div>
                </div>
                {renderPriceCell('Blinkit', g.blinkit, g.cheapest_platform === 'blinkit', platformStatus?.blinkit?.ok ? null : platformStatus?.blinkit?.error, platformStatus?.blinkit?.cached)}
                {renderPriceCell('Instamart', g.instamart, g.cheapest_platform === 'instamart', platformStatus?.instamart?.ok ? null : platformStatus?.instamart?.error, platformStatus?.instamart?.cached)}
                <button className={`add-btn ${isAdded ? 'added' : ''}`} onClick={() => toggleBasketItem(g)}>
                    {isAdded ? '✓ Added' : '+ Basket'}
                </button>
            </div>
        );
    };

    // --- Main Render ---
    return (
                <div className="market-page">
                    <div className="market-container wrap">
            <span className="pill">🛒 Quick-commerce market</span>
            <h1>Compare Grocery Prices</h1>
            <p className="subtitle">Search products and price a smart basket across Blinkit and Instamart.</p>

            <div className="layout">
                {/* LEFT COLUMN */}
                <div>
                    <div className="card">
                        <div className="card-title">📍 Delivery Location</div>
                        <div className="loc-search">
                            <input type="text" placeholder="Search address…" value={locInput} onChange={handleLocChange} />
                            {showLocDropdown && locResults.length > 0 && (
                                <div className="loc-dropdown open">
                                    {locResults.map((r, i) => (
                                        <div key={i} className="loc-option" onClick={() => selectLocation(r.lat, r.lon, r.display_name)}>
                                            {r.display_name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="loc-actions">
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => runLocSearch(locInput)}>Search</button>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={useCurrentLocation}>Use current</button>
                        </div>
                        <div className="selected-loc">
                            <div className="label">Selected</div>
                            <div className="addr">{location.address}</div>
                            <div className="coords">{location.lat.toFixed(4)}, {location.lon.toFixed(4)}</div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-title">🗂 Categories</div>
                        <div className="cat-grid">
                            {categories.map(c => (
                                <div key={c.slug} className={`cat-chip ${currentCategory === c.slug ? 'active' : ''}`} onClick={() => setCurrentCategory(c.slug)}>
                                    <span className="emoji">{c.icon}</span> {c.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div>
                    <div className="tabs">
                        <button className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Browser</button>
                        <button className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>Search</button>
                        <button className={`tab-btn ${activeTab === 'basket' ? 'active' : ''}`} onClick={() => setActiveTab('basket')}>Smart Basket ({basketItems.length})</button>
                    </div>

                    {/* BROWSER TAB */}
                    {activeTab === 'home' && (
                        <div className="tab-panel active">
                            {categoryData.status && <div className={`status-line ${categoryData.error ? 'error-line' : ''}`}>{categoryData.status}</div>}
                            {categoryData.rows.length > 0 && (
                                <div className="category-browser">
                                    <div className="category-sidebar">
                                        {categoryData.rows.map((item, idx) => (
                                            <button key={idx} className="subcat-btn" onClick={() => loadSubcategory(item)}>
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="category-main">
                                        {categoryData.subcatResults && (
                                            <div className="receipt">
                                                <div className="receipt-title">Results</div>
                                                {categoryData.subcatResults.products.map(g => renderProductRow(g, {
                                                    blinkit: { ok: categoryData.subcatResults.blinkit.available, error: categoryData.subcatResults.blinkit.error, cached: categoryData.subcatResults.blinkit.cached },
                                                    instamart: { ok: categoryData.subcatResults.instamart.available, error: categoryData.subcatResults.instamart.error, cached: categoryData.subcatResults.instamart.cached }
                                                }))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SEARCH TAB */}
                    {activeTab === 'search' && (
                        <div className="tab-panel active">
                            <div className="search-row">
                                <input type="text" placeholder="e.g. coca-cola, amul milk" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
                                <button className="btn" onClick={runSearch}>Compare</button>
                            </div>
                            {searchResults.status && <div className={`status-line ${searchResults.error ? 'error-line' : ''}`}>{searchResults.status}</div>}
                            {searchResults.products.length > 0 && (
                                <div className="receipt">
                                    <div className="receipt-title">Results for "{searchQuery}"</div>
                                    {searchResults.products.map(g => renderProductRow(g, { blinkit: { ok: true }, instamart: { ok: true } }))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* BASKET TAB */}
                    {activeTab === 'basket' && (
                        <div className="tab-panel active">
                            {basketItems.length === 0 ? (
                                <div className="receipt"><div className="empty-basket">Your Smart Basket is empty.</div></div>
                            ) : (
                                <div className="receipt">
                                    <div className="receipt-title">
                                        <span>Your Smart Basket ({basketItems.length} items)</span>
                                        <button className="btn-danger" onClick={() => setBasketItems([])}>Clear All</button>
                                    </div>
                                    {basketItems.map(p => (
                                        <div className="row" key={p.id}>
                                            <div className="product-main">
                                                {p.image_url && <img className="product-image" src={p.image_url} alt={p.name} />}
                                                <div className="item-name">{p.name}</div>
                                            </div>
                                            {renderPriceCell('Blinkit', p.blinkit, p.cheapest_platform === 'blinkit', null, false)}
                                            {renderPriceCell('Instamart', p.instamart, p.cheapest_platform === 'instamart', null, false)}
                                            <button className="btn-danger" onClick={() => toggleBasketItem(p)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
                    </div>
                </div>
    );
}