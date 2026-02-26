'use client';

import { useState, useEffect } from 'react';
import { SupabaseDataStore } from '@/data/supabaseData';
import { ShopItem, UserPurchase, User, Strike } from '@/core/types';
import Navbar from '@/ui/components/Navbar';
import ProfileModal from '@/ui/components/ProfileModal';
import LogoLoader from '@/ui/components/LogoLoader';
import { getTodayString } from '@/core/utils/dateUtils';
import { VacationService } from '@/core/services/VacationService';
import { toast } from 'sonner';
import '../dashboard/dashboard.css';
import './tienda.css';

// ── Coming Soon Placeholders ──
const COMING_SOON_ITEMS = [
    {
        name: 'El VAR',
        description: 'Pedí prueba de cualquier actividad registrada por un rival. Si no la justifica, perdés las sendas.',
        icon: '📹',
        type: 'attack' as const,
        cost: 15000,
    },
];

type ShopCategory = 'utility' | 'cosmetic' | 'offensive' | 'defensive';

export default function TiendaPage() {
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const [purchases, setPurchases] = useState<UserPurchase[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<{ id: string, username: string, level: number }[]>([]);
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);
    const [ownedCosmetics, setOwnedCosmetics] = useState<string[]>([]);
    const [activePowers, setActivePowers] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<ShopCategory>('utility');

    // Amnistía-specific state
    const [amnistiaInfo, setAmnistiaInfo] = useState<{
        currentCost: number;
        cooldownEnds: string | null;
        purchaseCount: number;
    }>({ currentCost: 25000, cooldownEnds: null, purchaseCount: 0 });

    // Confirm modal
    const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [targetUserId, setTargetUserId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            setCurrentUser(user);

            const [items, userPurchases, userStrikes, vacations, amnistia, cosmetics] = await Promise.all([
                SupabaseDataStore.getShopItems(),
                SupabaseDataStore.getUserPurchases(),
                SupabaseDataStore.getStrikes(),
                SupabaseDataStore.getVacationPeriods(),
                SupabaseDataStore.getAmnistiaInfo(),
                SupabaseDataStore.getUserCosmetics(),
            ]);

            setShopItems(items);
            setPurchases(userPurchases);
            setStrikes(userStrikes);
            setAmnistiaInfo(amnistia);
            setOwnedCosmetics(cosmetics);

            if (user) {
                const [userBalance, activePws, usersList] = await Promise.all([
                    SupabaseDataStore.getUserBalance(user.id),
                    SupabaseDataStore.getUserActivePowers(user.id),
                    SupabaseDataStore.getAllUsers()
                ]);
                setBalance(Math.floor(userBalance));
                setActivePowers(activePws);
                setAllUsers(usersList.filter(u => u.id !== user.id)); // Remove self from targets
            }

            const today = getTodayString();
            const activeVacation = VacationService.getActiveVacation(vacations, today);
            setIsOnVacation(!!activeVacation);
        } catch (error) {
            console.error('Error loading shop:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!confirmItem) return;
        setIsPurchasing(true);

        try {
            if (confirmItem.name === 'Amnistía') {
                const result = await SupabaseDataStore.purchaseAmnistia();
                if (result.success) {
                    toast.success('¡Amnistía aplicada!', {
                        description: `Strike eliminado. -${result.costPaid?.toLocaleString()} sendas`,
                    });
                    await loadData();
                } else handlePurchaseError(result.error);
            } else if (confirmItem.metadata?.category === 'cosmetic') {
                const result = await SupabaseDataStore.purchaseCosmetic(confirmItem.id);
                if (result.success) {
                    toast.success('¡Cosmético adquirido!', { description: 'Ya podés verlo en tu perfil.' });
                    await loadData();
                } else handlePurchaseError(result.error);
            } else if (confirmItem.metadata?.category === 'defensive') {
                const result = await SupabaseDataStore.purchaseDefensivePower(confirmItem.id);
                if (result.success) {
                    toast.success('¡Poder defensivo activado!', { description: 'Tus defensas están listas.' });
                    await loadData();
                } else handlePurchaseError(result.error);
            } else if (confirmItem.metadata?.category === 'offensive') {
                if (!targetUserId) {
                    toast.error('Error', { description: 'Debes seleccionar un rival.' });
                    setIsPurchasing(false);
                    return;
                }
                const result = await SupabaseDataStore.purchaseOffensivePower(confirmItem.id, targetUserId);
                if (result.success) {
                    toast.success('¡Ataque ejecutado!', { description: 'El rival ha sido afectado.' });
                    await loadData();
                } else handlePurchaseError(result.error);
            }
        } catch (error) {
            console.error('Purchase error:', error);
            toast.error('Error inesperado al procesar la compra');
        } finally {
            setIsPurchasing(false);
            setConfirmItem(null);
            setTargetUserId('');
        }
    };

    const handlePurchaseError = (error: string | undefined) => {
        switch (error) {
            case 'INSUFFICIENT_BALANCE':
                toast.error('Saldo insuficiente');
                break;
            case 'NO_STRIKES':
                toast.error('Sin strikes', { description: '¡No tenés ningún strike que borrar!' });
                break;
            case 'COOLDOWN_ACTIVE':
                toast.error('Enfriamiento activo');
                break;
            case 'ALREADY_ACTIVE':
            case 'ALREADY_ACTIVE_ON_TARGET':
                toast.error('Poder ya activo', { description: 'Este poder ya está surtiendo efecto.' });
                break;
            case 'TARGET_ALREADY_UNDER_ATTACK':
                toast.error('Objetivo bajo ataque', { description: 'Este jugador ya está sufriendo un efecto negativo.' });
                break;
            default:
                toast.error('Error en la compra', { description: error || 'Desconocido' });
        }
    };

    const getCooldownText = () => {
        if (!amnistiaInfo.cooldownEnds) return null;
        const diffMs = new Date(amnistiaInfo.cooldownEnds).getTime() - new Date().getTime();
        if (diffMs <= 0) return null;
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return `Disponible en ${days} día${days !== 1 ? 's' : ''}`;
    };

    if (isLoading) return <LogoLoader />;

    // Filter items by tab
    const filteredItems = shopItems.filter(item => {
        if (activeTab === 'utility') return !item.metadata?.category || item.metadata?.category === 'utility' || item.name === 'Amnistía';
        return item.metadata?.category === activeTab;
    });

    const renderCardAction = (item: ShopItem) => {
        if (item.name === 'Amnistía') {
            const isAmnistiaDisabled = balance < amnistiaInfo.currentCost || strikes.length === 0 || !!getCooldownText();
            return (
                <button
                    className="shop-card__buy-btn"
                    disabled={isAmnistiaDisabled}
                    onClick={() => setConfirmItem(item)}
                >
                    {strikes.length === 0 ? 'SIN STRIKES' : balance < amnistiaInfo.currentCost ? 'SALDO INSUFICIENTE' : getCooldownText() ? 'EN ENFRIAMIENTO' : 'COMPRAR'}
                </button>
            );
        }

        if (item.metadata?.category === 'cosmetic') {
            const isOwned = ownedCosmetics.includes(item.metadata.cosmetic_value);
            return (
                <button
                    className={`shop-card__buy-btn ${isOwned ? 'btn-owned' : ''}`}
                    disabled={isOwned || balance < item.cost}
                    onClick={() => setConfirmItem(item)}
                >
                    {isOwned ? 'YA OBTENIDO' : balance < item.cost ? 'SALDO INSUFICIENTE' : 'COMPRAR'}
                </button>
            );
        }

        if (item.metadata?.category === 'defensive') {
            const isActive = activePowers.some(p => p.power_type === item.metadata?.power_type);
            return (
                <button
                    className="shop-card__buy-btn"
                    disabled={isActive || balance < item.cost}
                    onClick={() => setConfirmItem(item)}
                >
                    {isActive ? 'ACTIVO' : balance < item.cost ? 'SALDO INSUFICIENTE' : 'ACTIVAR'}
                </button>
            );
        }

        return (
            <button
                className="shop-card__buy-btn"
                disabled={balance < item.cost}
                onClick={() => setConfirmItem(item)}
            >
                {balance < item.cost ? 'SALDO INSUFICIENTE' : 'COMPRAR'}
            </button>
        );
    };

    return (
        <main className="dashboard">
            <div className="dashboard-container-new">
                <Navbar
                    currentUser={currentUser}
                    userLevel={currentUser ? { level: currentUser.level, xp: currentUser.xp } : undefined}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                />

                <div className="shop-header">
                    <h1 className="shop-title">Tienda</h1>
                    <p className="shop-subtitle">Adquirí ventajas y cosméticos legendarios</p>
                </div>

                <div className="shop-balance-banner">
                    <span className="balance-icon" style={{ display: 'flex', marginLeft: '-10px' }}><img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--lg" style={{ transform: 'scale(1.4)' }} /></span>
                    <div className="balance-info">
                        <span className="balance-label">Tu saldo actual</span>
                        <span className="balance-amount">{balance.toLocaleString()}</span>
                    </div>
                </div>

                {/* TABS */}
                <div className="shop-tabs">
                    <button className={`shop-tab-btn ${activeTab === 'utility' ? 'active' : ''}`} onClick={() => setActiveTab('utility')}>🛠️ Utilidades</button>
                    <button className={`shop-tab-btn ${activeTab === 'cosmetic' ? 'active' : ''}`} onClick={() => setActiveTab('cosmetic')}>✨ Cosméticos</button>
                    <button className={`shop-tab-btn ${activeTab === 'offensive' ? 'active' : ''}`} onClick={() => setActiveTab('offensive')}>⚔️ Ataque</button>
                    <button className={`shop-tab-btn ${activeTab === 'defensive' ? 'active' : ''}`} onClick={() => setActiveTab('defensive')}>🛡️ Defensa</button>
                </div>

                <div className="shop-grid">
                    {filteredItems.map(item => (
                        <div key={item.id} className={`shop-card card--${item.type}`}>
                            <div className="shop-card__glow-bar" />
                            <div className="shop-card__body">
                                <div className="shop-card__icon-wrap">
                                    {item.metadata?.cosmetic_type === 'name_color' ? (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: item.metadata.cosmetic_value, boxShadow: `0 0 15px ${item.metadata.cosmetic_value}` }} />
                                    ) : (
                                        item.icon
                                    )}
                                </div>
                                <h3 className="shop-card__name" style={item.metadata?.cosmetic_type === 'name_color' ? { color: item.metadata.cosmetic_value } : {}}>{item.name}</h3>
                                <p className="shop-card__desc">{item.description}</p>

                                <div className="shop-card__price-tag">
                                    <span className="shop-card__price-icon" style={{ display: 'flex', marginRight: '6px' }}><img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" style={{ transform: 'scale(1.4)' }} /></span>
                                    <span className="shop-card__price-value">
                                        {item.name === 'Amnistía' ? amnistiaInfo.currentCost.toLocaleString() : item.cost.toLocaleString()}
                                    </span>
                                </div>

                                {item.name === 'Amnistía' && getCooldownText() && <div className="shop-card__cooldown shop-card__cooldown--active">⏳ {getCooldownText()}</div>}
                                {renderCardAction(item)}
                            </div>
                        </div>
                    ))}

                    {/* Coming Soon logic only on Utilities/Offensive for now */}
                    {activeTab === 'offensive' && COMING_SOON_ITEMS.map((item, idx) => (
                        <div key={idx} className={`shop-card card--${item.type} card--coming-soon`}>
                            <div className="shop-card__glow-bar" />
                            <div className="shop-card__coming-soon-badge">PRÓXIMAMENTE</div>
                            <div className="shop-card__body">
                                <div className="shop-card__icon-wrap">{item.icon}</div>
                                <h3 className="shop-card__name">{item.name}</h3>
                                <p className="shop-card__desc">{item.description}</p>
                                <button className="shop-card__buy-btn" disabled>BLOQUEADO</button>
                            </div>
                        </div>
                    ))}
                </div>

                {purchases.length > 0 && (
                    <div className="shop-history-section">
                        <h3 className="shop-history-title">Historial de Compras</h3>
                        <div className="shop-history-list">
                            {purchases.slice(0, 15).map(p => (
                                <div key={p.id} className="shop-history-item">
                                    <span className="shop-history-item__icon">
                                        {p.metadata?.type === 'cosmetic' ? '✨' : p.metadata?.type === 'offensive' ? '⚔️' : p.metadata?.type === 'defensive' ? '🛡️' : '🕊️'}
                                    </span>
                                    <div className="shop-history-item__details">
                                        <div className="shop-history-item__name">
                                            {p.metadata?.strike_date ? `Amnistía — Strike ${p.metadata.strike_date}` :
                                                p.metadata?.cosmetic_value ? `Cosmético: ${p.metadata.cosmetic_value}` :
                                                    p.metadata?.power_type ? `Poder: ${p.metadata.power_type}${p.metadata.target_name ? ` a ${p.metadata.target_name}` : ''}${p.metadata.damage ? ` (-${p.metadata.damage} pts)` : ''}` : 'Compra'}
                                        </div>
                                        <div className="shop-history-item__date">
                                            {new Date(p.purchasedAt).toLocaleDateString('es-AR', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                    <span className="shop-history-item__cost">-{p.costPaid.toLocaleString()} sendas</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Purchase Modal */}
            {confirmItem && (
                <div className="shop-confirm-overlay" onClick={() => !isPurchasing && setConfirmItem(null)}>
                    <div className="shop-confirm-card" onClick={e => e.stopPropagation()}>
                        <span className="shop-confirm-icon">{confirmItem.icon}</span>
                        <h3 className="shop-confirm-title">¿Confirmar compra?</h3>
                        <p className="shop-confirm-desc">{confirmItem.description}</p>

                        {confirmItem.metadata?.category === 'offensive' && (
                            <div className="rival-selector-container">
                                <label className="rival-selector-label">Seleccionar Objetivo:</label>
                                <select
                                    className="rival-selector"
                                    value={targetUserId}
                                    onChange={(e) => setTargetUserId(e.target.value)}
                                >
                                    <option value="" disabled>Elegir un rival...</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.username} (Nivel {u.level})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {confirmItem.metadata?.category === 'defensive' && activePowers.some(p => ['sabotaje', 'parasito_agresivo', 'parasito_lento'].includes(p.power_type)) && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'rgba(244, 63, 94, 0.1)',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                borderRadius: '8px',
                                color: '#f43f5e',
                                fontSize: '0.85rem',
                                textAlign: 'left',
                                lineHeight: '1.4'
                            }}>
                                <strong>⚠️ Advertencia:</strong> Ya estás bajo los efectos de un ataque. Esta defensa no curará tu estado actual, solo te protegerá de ataques <strong>futuros</strong>.
                            </div>
                        )}

                        <div className="shop-confirm-cost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', fontSize: '1.25rem', marginTop: '20px' }}>
                            <img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--lg" style={{ transform: 'scale(1.5)' }} />
                            <span>
                                {confirmItem.name === 'Amnistía' ? amnistiaInfo.currentCost.toLocaleString() : confirmItem.cost.toLocaleString()} <span style={{ fontSize: '0.8em', opacity: 0.8 }}>sendas</span>
                            </span>
                        </div>
                        <div className="shop-confirm-actions">
                            <button className="btn-confirm-cancel" onClick={() => { setConfirmItem(null); setTargetUserId(''); }} disabled={isPurchasing}>CANCELAR</button>
                            <button className="btn-confirm-buy" onClick={handlePurchase} disabled={isPurchasing || (confirmItem.metadata?.category === 'offensive' && !targetUserId)}>
                                {isPurchasing ? 'PROCESANDO...' : 'COMPRAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {currentUser && (
                <ProfileModal
                    user={currentUser}
                    isOpen={isProfileModalOpen}
                    isOnVacation={isOnVacation}
                    onClose={() => setIsProfileModalOpen(false)}
                    onUpdate={() => loadData()}
                />
            )}
        </main>
    );
}
