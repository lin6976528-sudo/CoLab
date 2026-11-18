import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Tier } from '../types';
import { useAuth } from './AuthContext';
import CelebrationOverlay from '../components/CelebrationOverlay';

interface SubscriptionContextType {
  tier: Tier;
  isAdmin: boolean;
  usageCount: Record<string, number>;
  pointsUsed: number;
  pointsLimit: number;
  isPricingModalOpen: boolean;
  isTrialActive: boolean;
  trialTier: Tier | null;
  trialDaysRemaining: number;
  setTier: (tier: Tier) => void;
  startTrial: (tier: Tier) => void;
  cancelTrial: () => void;
  incrementUsage: (featureId: string) => boolean;
  getLimit: (featureId: string) => number;
  checkAccess: (featureId: string) => boolean;
  getFeatureCost: (featureId: string) => number;
  setIsPricingModalOpen: (isOpen: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const TIER_LIMITS: Record<Tier, number> = {
  Free: 5,
  Plus: 15,
  Go: 30,
  Pro: 50,
  One: 65,
  Advanced: 80,
  Ultra: Infinity,
  Max: Infinity,
  Super: Infinity,
};

export const TIER_POINTS_LIMIT: Record<Tier, number> = {
  Free: 300,
  Plus: 1500,
  Go: 3000,
  Pro: 4500,
  One: 5500,
  Advanced: 6500,
  Ultra: 9000,
  Max: 12000,
  Super: 26000,
};

export const FEATURE_POINTS_COST: Record<string, number> = {
  'video-gen': 750,
  'youtube-gen': 1200,
  'animate-image': 450,
  'music-gen': 225,
  'image-gen': 150,
  'edit-image': 150,
  'image-understand': 75,
  'video-understand': 300,
  'chat': 15,
  'fast-chat': 15,
  'live-audio': 225,
  'agent': 375,
  'batch-process': 150,
  'tts': 30,
  'transcribe': 75,
  'search': 30,
  'maps': 30,
};

export const FEATURE_LIMITS: Record<Tier, Partial<Record<string, number>>> = {
  Free: {
    'video-gen': 0,
    'image-gen': 0,
    'youtube-gen': 0,
    'animate-image': 0,
    'agent': 0,
    'batch-process': 0,
    'video-understand': 0,
    'live-audio': 0,
  },
  Plus: {
    'video-gen': 1,
    'image-gen': 5,
    'youtube-gen': 0,
    'animate-image': 1,
    'agent': 2,
    'batch-process': 0,
    'video-understand': 0,
    'live-audio': 0,
  },
  Go: {
    'video-gen': 2,
    'image-gen': 15,
    'youtube-gen': 1,
    'animate-image': 2,
    'agent': 5,
    'batch-process': 1,
    'video-understand': 0,
    'live-audio': 0,
  },
  Pro: {
    'video-gen': 5,
    'youtube-gen': 5,
    'animate-image': 5,
    'live-audio': 0,
    'video-understand': 0,
  },
  One: {
    'video-gen': 7,
    'youtube-gen': 6,
    'animate-image': 6,
    'live-audio': 1,
    'video-understand': 1,
  },
  Advanced: {
    'video-gen': 10,
    'youtube-gen': 8,
    'animate-image': 8,
    'live-audio': 2,
    'video-understand': 3,
  },
  Ultra: {
    'video-gen': Infinity,
    'youtube-gen': Infinity,
    'animate-image': Infinity,
    'live-audio': Infinity,
    'video-understand': Infinity,
  },
  Max: {
    'video-gen': Infinity,
    'youtube-gen': Infinity,
    'animate-image': Infinity,
    'live-audio': Infinity,
    'video-understand': Infinity,
  },
  Super: {
    'video-gen': Infinity,
    'youtube-gen': Infinity,
    'animate-image': Infinity,
    'live-audio': Infinity,
    'video-understand': Infinity,
  }
};

export const TIER_LEVELS: Record<Tier, number> = {
  Free: 0,
  Plus: 1,
  Go: 2,
  Pro: 3,
  One: 4,
  Advanced: 5,
  Ultra: 6,
  Max: 7,
  Super: 8,
};

export const hasAccess = (userTier: Tier, requiredTier: Tier) => {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
};

const ADMIN_EMAILS = ['lin076976528@gmail.com', 'lin6976528@gmail.com'];

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile } = useAuth();

  const effectiveEmail = (userProfile?.email || currentUser?.email || '').toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(effectiveEmail) || (currentUser?.email ? ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) : false);

  const resolveBaseTier = useCallback((): Tier => {
    if (isAdmin) {
      const prefTier = (userProfile?.preferences?.tier || userProfile?.tier) as Tier | undefined;
      if (prefTier && prefTier in TIER_LEVELS && TIER_LEVELS[prefTier] >= TIER_LEVELS.Ultra) {
        return prefTier;
      }
      return 'Ultra';
    }
    const prefTier = (userProfile?.preferences?.tier || userProfile?.tier) as Tier | undefined;
    if (prefTier && prefTier in TIER_LEVELS) {
      return prefTier;
    }
    return 'Free';
  }, [isAdmin, userProfile]);

  const [tier, setTierState] = useState<Tier>(() => resolveBaseTier());
  const [usageCount, setUsageCount] = useState<Record<string, number>>({});
  const [pointsUsed, setPointsUsed] = useState<number>(0);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // 7-day free trial states
  const [isTrialActive, setIsTrialActive] = useState<boolean>(() => {
    return localStorage.getItem('colab_trial_active') === 'true';
  });
  const [trialTier, setTrialTier] = useState<Tier | null>(() => {
    return localStorage.getItem('colab_trial_tier') as Tier | null;
  });
  const [trialDaysRemaining] = useState<number>(7);

  // Success Celebration Overlay state
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState<Tier | null>(null);

  const setTier = useCallback((nextTier: Tier) => {
    if (isAdmin && TIER_LEVELS[nextTier] < TIER_LEVELS.Ultra) {
      setTierState(resolveBaseTier());
      return;
    }
    setTierState(nextTier);
  }, [isAdmin, resolveBaseTier]);

  const startTrial = useCallback((selectedTier: Tier) => {
    setIsTrialActive(true);
    setTrialTier(selectedTier);
    localStorage.setItem('colab_trial_active', 'true');
    localStorage.setItem('colab_trial_tier', selectedTier);
    const baseTier = resolveBaseTier();
    if (isAdmin && TIER_LEVELS[selectedTier] < TIER_LEVELS[baseTier]) {
      setTierState(baseTier);
    } else {
      setTierState(selectedTier);
    }
    
    // Trigger celebration success animation
    setCelebrationTier(selectedTier);
    setIsCelebrationOpen(true);
  }, [isAdmin, resolveBaseTier]);

  const cancelTrial = useCallback(() => {
    setIsTrialActive(false);
    setTrialTier(null);
    localStorage.removeItem('colab_trial_active');
    localStorage.removeItem('colab_trial_tier');
    setTierState(resolveBaseTier());
  }, [resolveBaseTier]);

  useEffect(() => {
    const baseTier = resolveBaseTier();
    if (isTrialActive && trialTier && trialTier in TIER_LEVELS) {
      if (isAdmin && TIER_LEVELS[trialTier] < TIER_LEVELS[baseTier]) {
        setTierState(baseTier);
      } else {
        setTierState(trialTier);
      }
    } else {
      setTierState(baseTier);
    }
  }, [resolveBaseTier, isAdmin, isTrialActive, trialTier]);

  // Reset usage when tier changes
  useEffect(() => {
    setUsageCount({});
    setPointsUsed(0);
  }, [tier]);

  const pointsLimit = isAdmin ? Infinity : (!currentUser ? 100 : TIER_POINTS_LIMIT[tier]);

  const getLimit = useCallback((featureId: string) => {
    if (!currentUser || isAdmin) {
      // Unblock all AI functions for unlogged-in users and admins
      return Infinity;
    }
    const featureLimit = FEATURE_LIMITS[tier]?.[featureId];
    if (featureLimit !== undefined) {
      return featureLimit;
    }
    return TIER_LIMITS[tier];
  }, [currentUser, isAdmin, tier]);

  const getFeatureCost = useCallback((featureId: string) => {
    return FEATURE_POINTS_COST[featureId] || 1;
  }, []);

  const checkAccess = useCallback((featureId: string) => {
    const currentUsage = usageCount[featureId] || 0;
    const limit = getLimit(featureId);
    
    if (limit === 0 || currentUsage >= limit) return false;
    
    // Check points
    const cost = getFeatureCost(featureId);
    if (pointsLimit !== Infinity && pointsUsed + cost > pointsLimit) return false;

    return true;
  }, [usageCount, getLimit, getFeatureCost, pointsLimit, pointsUsed]);

  const incrementUsage = useCallback((featureId: string) => {
    if (!checkAccess(featureId)) {
      return false;
    }
    
    const cost = getFeatureCost(featureId);
    
    setUsageCount(prev => ({
      ...prev,
      [featureId]: (prev[featureId] || 0) + 1
    }));
    setPointsUsed(prev => prev + cost);
    
    return true;
  }, [checkAccess, getFeatureCost]);

  const value = useMemo(() => ({
    tier,
    isAdmin,
    usageCount,
    pointsUsed,
    pointsLimit,
    isPricingModalOpen,
    isTrialActive,
    trialTier,
    trialDaysRemaining,
    setTier,
    startTrial,
    cancelTrial,
    incrementUsage,
    getLimit,
    checkAccess,
    getFeatureCost,
    setIsPricingModalOpen,
  }), [
    tier,
    isAdmin,
    usageCount,
    pointsUsed,
    pointsLimit,
    isPricingModalOpen,
    isTrialActive,
    trialTier,
    trialDaysRemaining,
    setTier,
    startTrial,
    cancelTrial,
    incrementUsage,
    getLimit,
    checkAccess,
    getFeatureCost,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <CelebrationOverlay 
        isOpen={isCelebrationOpen} 
        onClose={() => setIsCelebrationOpen(false)} 
        tier={celebrationTier} 
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
