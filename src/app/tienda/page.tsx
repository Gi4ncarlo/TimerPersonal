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
        description: 'Pedí prueba de cualquier actividad registrada por un rival. Si no la justifica, perdés los puntos.',
        icon: '📹',
        type: 'attack' as const,
        cost: 15000,
    },
    {
        name: 'Rayo de Júpiter',
        description: 'Lanzá un rayo que le quita entre 500 y 7,500 puntos a un rival al azar.',
        icon: '⚡',
        type: 'attack' as const,
        cost: 3000,
    },
    {
        name: 'Escudo Pretoriano',
        description: 'Activá un escudo que refleja el próximo ataque que recibas. Dura 24 horas.',
        icon: '🛡️',
        type: 'defense' as const,
        cost: 2500,
    },
];

export default function TiendaPage() {
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const [purchases, setPurchases] = useState<UserPurchase[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

    // Amnistía-specific state
    const [amnistiaInfo, setAmnistiaInfo] = useState<{
        currentCost: number;
        cooldownEnds: string | null;
        purchaseCount: number;
    }>({ currentCost: 25000, cooldownEnds: null, purchaseCount: 0 });

    // Confirm modal
    const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            setCurrentUser(user);

            const [items, userPurchases, userStrikes, vacations, amnistia] = await Promise.all([
                SupabaseDataStore.getShopItems(),
                SupabaseDataStore.getUserPurchases(),
                SupabaseDataStore.getStrikes(),
                SupabaseDataStore.getVacationPeriods(),
                SupabaseDataStore.getAmnistiaInfo(),
            ]);

            setShopItems(items);
            setPurchases(userPurchases);
            setStrikes(userStrikes);
            setAmnistiaInfo(amnistia);

            // Calculate balance
            if (user) {
                const userBalance = await SupabaseDataStore.getUserBalance(user.id);
                setBalance(Math.floor(userBalance));
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
                        description: `Strike del ${result.strikeRemoved} eliminado. -${result.costPaid?.toLocaleString()} pts`,
                    });
                    await loadData();
                } else {
                    switch (result.error) {
                        case 'INSUFFICIENT_BALANCE':
                            toast.error('Saldo insuficiente', {
                                description: `Necesitás ${result.cost?.toLocaleString()} pts. Tenés ${result.balance?.toLocaleString()}.`,
                            });
                            break;
                        case 'NO_STRIKES':
                            toast.error('Sin strikes', {
                                description: '¡No tenés ningún strike que borrar!',
                            });
                            break;
                        case 'COOLDOWN_ACTIVE':
                            toast.error('Enfriamiento activo', {
                                description: `Podés volver a comprar el ${new Date(result.nextAvailable!).toLocaleDateString()}.`,
                            });
                            break;
                        default:
                            toast.error('Error en la compra', { description: result.error });
                    }
                }
            }
        } catch (error) {
            console.error('Purchase error:', error);
            toast.error('Error inesperado al procesar la compra');
        } finally {
            setIsPurchasing(false);
            setConfirmItem(null);
        }
    };

    const getCooldownText = () => {
        if (!amnistiaInfo.cooldownEnds) return null;
        const end = new Date(amnistiaInfo.cooldownEnds);
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        if (diffMs <= 0) return null;
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return `Disponible en ${days} día${days !== 1 ? 's' : ''}`;
    };

    const isAmnistiaDisabled = () => {
        return (
            balance < amnistiaInfo.currentCost ||
            strikes.length === 0 ||
            !!getCooldownText()
        );
    };

    if (isLoading) return <LogoLoader />;

    const cooldownText = getCooldownText();

    return (
        <main className="dashboard">
            <div className="dashboard-container-new">
                <Navbar
                    currentUser={currentUser}
                    userLevel={currentUser ? { level: currentUser.level, xp: currentUser.xp } : undefined}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                />

                {/* ── Header ── */}
                <div className="shop-header">
                    <h1 className="shop-title">Tienda</h1>
                    <p className="shop-subtitle">Gastá tus puntos en ventajas estratégicas</p>
                </div>

                {/* ── Balance Banner ── */}
                <div className="shop-balance-banner">
                    <span className="balance-icon">💰</span>
                    <div className="balance-info">
                        <span className="balance-label">Tu saldo actual</span>
                        <span className="balance-amount">{balance.toLocaleString()} pts</span>
                    </div>
                </div>

                {/* ── Shop Grid ── */}
                <div className="shop-grid">
                    {/* Real Items */}
                    {shopItems.map(item => (
                        <div
                            key={item.id}
                            className={`shop-card card--${item.type} ${isAmnistiaDisabled() && item.name === 'Amnistía' ? '' : ''}`}
                        >
                            <div className="shop-card__glow-bar" />
                            <div className="shop-card__body">
                                <div className="shop-card__icon-wrap">
                                    {item.icon}
                                </div>
                                <h3 className="shop-card__name">{item.name}</h3>
                                <p className="shop-card__desc">{item.description}</p>

                                <div className="shop-card__price-tag">
                                    <span className="shop-card__price-icon">🪙</span>
                                    <span className="shop-card__price-value">
                                        {item.name === 'Amnistía'
                                            ? amnistiaInfo.currentCost.toLocaleString()
                                            : item.cost.toLocaleString()}
                                    </span>
                                    <span className="shop-card__price-label">pts</span>
                                </div>

                                {/* Cooldown indicator */}
                                {item.name === 'Amnistía' && cooldownText && (
                                    <div className="shop-card__cooldown shop-card__cooldown--active">
                                        ⏳ {cooldownText}
                                    </div>
                                )}

                                {/* Strike count info */}
                                {item.name === 'Amnistía' && (
                                    <div className="shop-card__cooldown">
                                        ⚠️ Strikes activos: {strikes.length}
                                    </div>
                                )}

                                {/* Escalation info */}
                                {item.name === 'Amnistía' && amnistiaInfo.purchaseCount > 0 && (
                                    <div className="shop-card__cooldown">
                                        📈 Compra #{amnistiaInfo.purchaseCount + 1} — precio escalado
                                    </div>
                                )}

                                <button
                                    className="shop-card__buy-btn"
                                    disabled={item.name === 'Amnistía' ? isAmnistiaDisabled() : true}
                                    onClick={() => setConfirmItem(item)}
                                >
                                    {item.name === 'Amnistía' && strikes.length === 0
                                        ? 'SIN STRIKES'
                                        : item.name === 'Amnistía' && balance < amnistiaInfo.currentCost
                                            ? 'SALDO INSUFICIENTE'
                                            : item.name === 'Amnistía' && cooldownText
                                                ? 'EN ENFRIAMIENTO'
                                                : 'COMPRAR'}
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Coming Soon Cards */}
                    {COMING_SOON_ITEMS.map((item, idx) => (
                        <div key={idx} className={`shop-card card--${item.type} card--coming-soon`}>
                            <div className="shop-card__glow-bar" />
                            <div className="shop-card__coming-soon-badge">PRÓXIMAMENTE</div>
                            <div className="shop-card__body">
                                <div className="shop-card__icon-wrap">
                                    {item.icon}
                                </div>
                                <h3 className="shop-card__name">{item.name}</h3>
                                <p className="shop-card__desc">{item.description}</p>
                                <div className="shop-card__price-tag">
                                    <span className="shop-card__price-icon">🪙</span>
                                    <span className="shop-card__price-value">
                                        {item.cost.toLocaleString()}
                                    </span>
                                    <span className="shop-card__price-label">pts</span>
                                </div>
                                <button className="shop-card__buy-btn" disabled>
                                    BLOQUEADO
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Purchase History ── */}
                {purchases.length > 0 && (
                    <div className="shop-history-section">
                        <h3 className="shop-history-title">Historial de Compras</h3>
                        <div className="shop-history-list">
                            {purchases.map(p => (
                                <div key={p.id} className="shop-history-item">
                                    <span className="shop-history-item__icon">🕊️</span>
                                    <div className="shop-history-item__details">
                                        <div className="shop-history-item__name">
                                            Amnistía — Strike {p.metadata?.strike_date || ''}
                                        </div>
                                        <div className="shop-history-item__date">
                                            {new Date(p.purchasedAt).toLocaleDateString('es-AR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                    <span className="shop-history-item__cost">
                                        -{p.costPaid.toLocaleString()} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {shopItems.length === 0 && COMING_SOON_ITEMS.length === 0 && (
                    <div className="shop-empty-state">
                        <span className="shop-empty-state__icon">🏪</span>
                        <p>La tienda está vacía por ahora. ¡Próximamente nuevos ítems!</p>
                    </div>
                )}
            </div>

            {/* ── Confirm Purchase Modal ── */}
            {confirmItem && (
                <div className="shop-confirm-overlay" onClick={() => !isPurchasing && setConfirmItem(null)}>
                    <div className="shop-confirm-card" onClick={e => e.stopPropagation()}>
                        <span className="shop-confirm-icon">{confirmItem.icon}</span>
                        <h3 className="shop-confirm-title">¿Confirmar compra?</h3>
                        <p className="shop-confirm-desc">{confirmItem.description}</p>
                        <div className="shop-confirm-cost">
                            🪙 {confirmItem.name === 'Amnistía'
                                ? amnistiaInfo.currentCost.toLocaleString()
                                : confirmItem.cost.toLocaleString()} pts
                        </div>
                        <div className="shop-confirm-actions">
                            <button
                                className="btn-confirm-cancel"
                                onClick={() => setConfirmItem(null)}
                                disabled={isPurchasing}
                            >
                                CANCELAR
                            </button>
                            <button
                                className="btn-confirm-buy"
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                            >
                                {isPurchasing ? 'PROCESANDO...' : 'COMPRAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Profile Modal ── */}
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
