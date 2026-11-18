import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Briefcase, 
  Plus, 
  Trash2, 
  Settings, 
  TrendingUp, 
  ShieldCheck, 
  Coins, 
  Loader2, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Check, 
  X, 
  Sparkles, 
  Building2, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  Crown
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  getDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

interface Organization {
  orgId: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  maxSeats: number;
  assignedSeats: number;
  teamLimits: {
    monthlyPoints: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

interface OrgMember {
  uid: string;
  orgId: string;
  email: string;
  displayName: string;
  role: 'owner' | 'admin' | 'member';
  pointsLimit: number;
  pointsUsed: number;
  addedAt?: any;
}

export default function EnterpriseView() {
  const { currentUser, userProfile } = useAuth();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manage Org Name Modal / Control
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [editOrgNameVal, setEditOrgNameVal] = useState('');

  // Add Member form/modal states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'admin'>('member');
  const [newMemberPoints, setNewMemberPoints] = useState(500);

  // Editing points limits state
  const [editingMemberUid, setEditingMemberUid] = useState<string | null>(null);
  const [tempPointsLimit, setTempPointsLimit] = useState<number>(0);

  // Derive Admin Access
  useEffect(() => {
    if (!currentUser?.email) return;
    const email = currentUser.email.toLowerCase();
    const isAdmin = email === 'lin076976528@gmail.com' || 
                    email === 'lin6976528@gmail.com' || 
                    email === 'admin@cocollab.com' || 
                    email.startsWith('admin');
    setIsSystemAdmin(isAdmin);
  }, [currentUser]);

  // Load Organization data
  const loadOrganizationData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const orgQuery = query(collection(db, 'organizations'));
      const orgSnap = await getDocs(orgQuery);
      const fetchedOrgs: Organization[] = [];
      orgSnap.forEach(docSnap => {
        fetchedOrgs.push(docSnap.data() as Organization);
      });

      // Find organization owned by current user or filter for administrators
      let activeOrg: Organization | null = null;
      
      const email = currentUser.email?.toLowerCase() || '';
      const isAdmin = email === 'lin076976528@gmail.com' || 
                      email === 'lin6976528@gmail.com' || 
                      email === 'admin@cocollab.com' || 
                      email.startsWith('admin');

      const myOrg = fetchedOrgs.find(org => org.ownerId === currentUser.uid);

      if (myOrg) {
        activeOrg = myOrg;
      } else if (!isAdmin) {
        // If current user is subscription tier Advanced/Ultra/Max/Super, bootstrap an organization
        const userTier = userProfile?.preferences?.tier || userProfile?.tier || 'Free';
        const isEnterpriseCategory = ['Advanced', 'Ultra', 'Max', 'Super'].includes(userTier);
        
        if (isEnterpriseCategory) {
          // Let's bootstrap it!
          let seats = 5;
          if (userTier === 'Ultra') seats = 10;
          if (userTier === 'Max') seats = 25;
          if (userTier === 'Super') seats = 100;

          const newOrg: Organization = {
            orgId: `org_${currentUser.uid}`,
            name: `${userProfile?.displayName || 'My'} Company Organization`,
            ownerId: currentUser.uid,
            ownerEmail: currentUser.email || '',
            maxSeats: seats,
            assignedSeats: 1, // Includes the owner themselves
            teamLimits: {
              monthlyPoints: seats * 2000
            },
            createdAt: new Date().toISOString()
          };

          const orgDocRef = doc(db, 'organizations', newOrg.orgId);
          await setDoc(orgDocRef, newOrg);
          fetchedOrgs.push(newOrg);
          activeOrg = newOrg;

          // Also seed original owner as member
          const ownerMember: OrgMember = {
            uid: currentUser.uid,
            orgId: newOrg.orgId,
            email: currentUser.email || '',
            displayName: userProfile?.displayName || 'Owner',
            role: 'owner',
            pointsLimit: 2000,
            pointsUsed: 120,
            addedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'organizations', newOrg.orgId, 'members', ownerMember.uid), ownerMember);
        }
      }

      setOrganizations(fetchedOrgs);

      if (activeOrg) {
        setSelectedOrg(activeOrg);
        await loadMembers(activeOrg.orgId);
      } else if (isAdmin && fetchedOrgs.length > 0) {
        setSelectedOrg(fetchedOrgs[0]);
        await loadMembers(fetchedOrgs[0].orgId);
      } else if (isAdmin) {
        // System administrator with no orgs created yet, let's create a template Admin Org
        const templateOrg: Organization = {
          orgId: 'org_admin_template',
          name: 'CoCollab Enterprise Root',
          ownerId: currentUser.uid,
          ownerEmail: currentUser.email || 'admin@cocollab.com',
          maxSeats: 100,
          assignedSeats: 1,
          teamLimits: {
            monthlyPoints: 50000
          },
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'organizations', templateOrg.orgId), templateOrg);
        
        const ownerMember: OrgMember = {
          uid: currentUser.uid,
          orgId: templateOrg.orgId,
          email: currentUser.email || 'admin@cocollab.com',
          displayName: 'System Admin',
          role: 'owner',
          pointsLimit: 10000,
          pointsUsed: 0,
          addedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'organizations', templateOrg.orgId, 'members', ownerMember.uid), ownerMember);

        setOrganizations([templateOrg]);
        setSelectedOrg(templateOrg);
        await loadMembers(templateOrg.orgId);
      }
    } catch (error: any) {
      console.error('Error loading enterprise layout:', error);
      setErrorMessage('Failed to connect to corporate workspace directories. Please ensure Firestore is enabled.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    try {
      const snap = await getDocs(collection(db, 'organizations', orgId, 'members'));
      const list: OrgMember[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as OrgMember);
      });

      // If newly seeded, let's have at least 2 team members for interactive premium showcase
      if (list.length <= 1) {
        const seededMembers: OrgMember[] = [
          {
            uid: `mock_${orgId}_1`,
            orgId: orgId,
            email: 'jane.designer@corporate.com',
            displayName: 'Jane Doe (Lead Designer)',
            role: 'member',
            pointsLimit: 1200,
            pointsUsed: 420,
            addedAt: new Date().toISOString()
          },
          {
            uid: `mock_${orgId}_2`,
            orgId: orgId,
            email: 'alex.dev@corporate.com',
            displayName: 'Alex Smith (API Dev)',
            role: 'member',
            pointsLimit: 1500,
            pointsUsed: 890,
            addedAt: new Date().toISOString()
          }
        ];

        // Batch save mock members
        for (const m of seededMembers) {
          await setDoc(doc(db, 'organizations', orgId, 'members', m.uid), m);
          list.push(m);
        }

        // Update assigned seats counter
        await updateDoc(doc(db, 'organizations', orgId), {
          assignedSeats: list.length
        });

        // Sync local selectedOrg state
        setSelectedOrg(prev => prev ? { ...prev, assignedSeats: list.length } : null);
      }

      setMembers(list);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  useEffect(() => {
    loadOrganizationData();
  }, [currentUser, userProfile]);

  // Quick helper to show notification
  const triggerNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Change Organization name
  const handleSaveOrgName = async () => {
    if (!selectedOrg || !editOrgNameVal.trim()) return;
    setIsSaving(true);
    try {
      const orgRef = doc(db, 'organizations', selectedOrg.orgId);
      await updateDoc(orgRef, {
        name: editOrgNameVal.trim(),
        updatedAt: serverTimestamp()
      });
      setSelectedOrg(prev => prev ? { ...prev, name: editOrgNameVal.trim() } : null);
      setOrganizations(prev => prev.map(o => o.orgId === selectedOrg.orgId ? { ...o, name: editOrgNameVal.trim() } : o));
      setIsEditingOrgName(false);
      triggerNotification('success', 'Organization name updated successfully!');
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', 'Failed to rename organization.');
    } finally {
      setIsSaving(false);
    }
  };

  // Assign a membership seat
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    if (!newMemberEmail.trim()) {
      triggerNotification('error', 'Please provide a valid entry email.');
      return;
    }

    if (members.length >= selectedOrg.maxSeats) {
      triggerNotification('error', `Seat limit reached! Your plan is capped at ${selectedOrg.maxSeats} team seats. Upgrade your tier to allocate more.`);
      return;
    }

    if (members.some(m => m.email.toLowerCase() === newMemberEmail.trim().toLowerCase())) {
      triggerNotification('error', 'User already assigned to a team seat!');
      return;
    }

    setIsSaving(true);
    try {
      const memberUid = `member_${Date.now()}`;
      const newMember: OrgMember = {
        uid: memberUid,
        orgId: selectedOrg.orgId,
        email: newMemberEmail.trim().toLowerCase(),
        displayName: newMemberName.trim() || newMemberEmail.split('@')[0],
        role: newMemberRole,
        pointsLimit: newMemberPoints,
        pointsUsed: 0,
        addedAt: new Date().toISOString()
      };

      const memberRef = doc(db, 'organizations', selectedOrg.orgId, 'members', memberUid);
      await setDoc(memberRef, newMember);

      // Increment seat counter
      const orgRef = doc(db, 'organizations', selectedOrg.orgId);
      const newSeatCount = members.length + 1;
      await updateDoc(orgRef, {
        assignedSeats: newSeatCount,
        updatedAt: serverTimestamp()
      });

      setSelectedOrg(prev => prev ? { ...prev, assignedSeats: newSeatCount } : null);
      setMembers(prev => [...prev, newMember]);
      
      // Reset form
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberPoints(500);
      setIsAddMemberOpen(false);
      triggerNotification('success', `Assigned member seat to ${newMember.displayName} successfully!`);
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', 'Could not assign seat. Validate permissions structure.');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove/Revoke a seat member
  const handleRemoveMember = async (targetUid: string) => {
    if (!selectedOrg) return;
    const targetMember = members.find(m => m.uid === targetUid);
    if (!targetMember) return;

    if (targetMember.role === 'owner') {
      triggerNotification('error', 'The Organization founder/owner seat cannot be revoked.');
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke the team seat from ${targetMember.displayName}?`)) {
      return;
    }

    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'organizations', selectedOrg.orgId, 'members', targetUid));

      // Decrement seats allocation
      const newSeatCount = Math.max(1, members.length - 1);
      await updateDoc(doc(db, 'organizations', selectedOrg.orgId), {
        assignedSeats: newSeatCount,
        updatedAt: serverTimestamp()
      });

      setSelectedOrg(prev => prev ? { ...prev, assignedSeats: newSeatCount } : null);
      setMembers(prev => prev.filter(m => m.uid !== targetUid));
      triggerNotification('success', `Team seat successfully returned to licensing pool.`);
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', 'Failed to remove member seat.');
    } finally {
      setIsSaving(false);
    }
  };

  // Modify individual consumption budget / points allocation
  const handleSavePointsLimit = async (uid: string) => {
    if (!selectedOrg) return;
    if (tempPointsLimit < 0) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'organizations', selectedOrg.orgId, 'members', uid), {
        pointsLimit: tempPointsLimit
      });

      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, pointsLimit: tempPointsLimit } : m));
      setEditingMemberUid(null);
      triggerNotification('success', 'CoCoin monthly budget updated!');
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', 'Failed to save point limits.');
    } finally {
      setIsSaving(false);
    }
  };

  // Modify overall team-wide usage limits
  const handleSaveUniversalLimit = async (newLimitMax: number) => {
    if (!selectedOrg || newLimitMax < 100) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'organizations', selectedOrg.orgId), {
        'teamLimits.monthlyPoints': newLimitMax
      });
      setSelectedOrg(prev => prev ? { ...prev, teamLimits: { ...prev.teamLimits, monthlyPoints: newLimitMax } } : null);
      triggerNotification('success', 'Organization universal points limit saved!');
    } catch (err) {
      console.error(err);
      triggerNotification('error', 'Failed to update organizational ceiling limit.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate stats
  const totalPointsUsedByOrg = useMemo(() => {
    return members.reduce((sum, m) => sum + (m.pointsUsed || 0), 0);
  }, [members]);

  const totalPointsCapacity = useMemo(() => {
    return selectedOrg?.teamLimits?.monthlyPoints || 10000;
  }, [selectedOrg]);

  const activeSeatsText = useMemo(() => {
    if (!selectedOrg) return '0/0';
    return `${selectedOrg.assignedSeats} / ${selectedOrg.maxSeats}`;
  }, [selectedOrg]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-zinc-500/5 rounded-3xl border border-zinc-200/40 dark:border-zinc-800/40">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={36} />
        <p className="text-zinc-550 dark:text-zinc-400 font-light text-sm">Synchronizing Enterprise Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-sm font-medium"
          >
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span>{successMessage}</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm font-medium"
          >
            <AlertTriangle size={18} className="text-rose-500" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin picker option */}
      {isSystemAdmin && organizations.length > 1 && (
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/55 dark:border-zinc-800/55 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Crown size={16} className="text-indigo-500" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">System Admin Super-View</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Pick Organization:</span>
            <select
              value={selectedOrg?.orgId || ''}
              onChange={async (e) => {
                const target = organizations.find(o => o.orgId === e.target.value);
                if (target) {
                  setSelectedOrg(target);
                  await loadMembers(target.orgId);
                }
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              {organizations.map(o => (
                <option key={o.orgId} value={o.orgId}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedOrg && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Organizational Metrics Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Organization Info Box */}
            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/55 dark:border-zinc-800/55 rounded-3xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Building2 size={120} />
              </div>
              
              <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider font-mono bg-indigo-500/10 text-indigo-500 uppercase rounded-full mb-2">
                    <Briefcase size={10} /> Enterprise Tier Corporate Workspace
                  </span>
                  
                  {isEditingOrgName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="text" 
                        value={editOrgNameVal}
                        onChange={(e) => setEditOrgNameVal(e.target.value)}
                        className="px-3 py-1 px-3 text-lg font-bold border rounded-xl border-zinc-200 bg-white dark:bg-zinc-950 focus:ring-1 focus:ring-indigo-500 outline-none"
                        autoFocus
                      />
                      <button onClick={handleSaveOrgName} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setIsEditingOrgName(false)} className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl hover:bg-zinc-300 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group mt-1">
                      <h2 className="text-2xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">{selectedOrg.name}</h2>
                      <button 
                        onClick={() => {
                          setEditOrgNameVal(selectedOrg.name);
                          setIsEditingOrgName(true);
                        }} 
                        className="p-1 text-zinc-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Edit organization name"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-zinc-400 mt-1 font-mono">
                    Owner: {selectedOrg.ownerEmail} • Registered Workspace #{selectedOrg.orgId}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setIsAddMemberOpen(true);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold bg-indigo-600 border border-indigo-500/20 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all duration-300 flex items-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Assign Team Seat</span>
                </button>
              </div>

              {/* Seats Allocator Dashboard Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                
                {/* Seats Quota */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5"><Users size={14} /> Allocation Seats Utilized</span>
                    <span className="text-xs font-bold font-mono text-indigo-500">{activeSeatsText} Seats</span>
                  </div>
                  
                  {/* Gauge bar */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-850 h-2.5 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (selectedOrg.assignedSeats / selectedOrg.maxSeats) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 font-light">
                    Assigning teammates automatically registers their personal logs under team-wide governance rules.
                  </p>
                </div>

                {/* Corporate Team Ceiling Multi points limit */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Coins size={14} /> Organizational CoCoins Cap
                    </span>
                    <span className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300">
                      {totalPointsUsedByOrg} / {totalPointsCapacity} CoCoins
                    </span>
                  </div>

                  {/* Ceiling bar */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-850 h-2.5 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-amber-550 dark:bg-amber-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalPointsUsedByOrg / totalPointsCapacity) * 100)}%` }}
                    />
                  </div>
                  
                  {/* Limit config inline controller */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                    <span>Ceiling Limit is dynamically set.</span>
                    <button 
                      onClick={() => {
                        const targetValStr = window.prompt("Set target corporate cap monthly points ceiling:", String(totalPointsCapacity));
                        if (targetValStr) {
                          const num = parseInt(targetValStr);
                          if (!isNaN(num) && num >= 1000) {
                            handleSaveUniversalLimit(num);
                          } else {
                            alert("Corporate caps must be at least 1,000 CoCoins.");
                          }
                        }
                      }}
                      className="text-indigo-500 hover:underline font-semibold"
                    >
                      Set CEILING
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Allocation Roster Table */}
            <div className="glass-panel p-6 rounded-3xl border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Teammate License Roster</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">Manage and distribute limits per assigned seat.</p>
                </div>
                <div className="text-xs font-mono px-3 py-1 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-zinc-500">
                  {members.length} seats assigned
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-850 text-zinc-400 font-medium">
                      <th className="py-3 px-2">Member Teammate</th>
                      <th className="py-3 px-2">Identity Role</th>
                      <th className="py-3 px-2 text-right">Points Limit Allocation (Monthly)</th>
                      <th className="py-3 px-2 text-right">Used Stats</th>
                      <th className="py-3 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => {
                      const percentUsed = Math.min(100, Math.round(((member.pointsUsed || 0) / (member.pointsLimit || 1000)) * 100));
                      
                      return (
                        <tr key={member.uid} className="border-b border-zinc-100/50 dark:border-zinc-850 hover:bg-zinc-100/10 transition-colors">
                          <td className="py-3.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs uppercase">
                                {member.displayName.slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">{member.displayName}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${
                              member.role === 'owner' 
                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' 
                                : member.role === 'admin'
                                ? 'bg-amber-500/10 text-amber-550 dark:text-amber-400 border border-amber-500/25'
                                : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500'
                            }`}>
                              {member.role === 'owner' && <Crown size={10} />}
                              {member.role}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {editingMemberUid === member.uid ? (
                              <div className="flex items-center justify-end gap-1">
                                <input 
                                  type="number"
                                  value={tempPointsLimit}
                                  onChange={(e) => setTempPointsLimit(parseInt(e.target.value) || 0)}
                                  className="w-16 px-1.5 py-1 text-xs border rounded bg-white dark:bg-zinc-950 text-right font-mono"
                                />
                                <button 
                                  onClick={() => handleSavePointsLimit(member.uid)}
                                  className="p-1 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600"
                                >
                                  <Check size={12} />
                                </button>
                                <button 
                                  onClick={() => setEditingMemberUid(null)}
                                  className="p-1 bg-zinc-200 dark:bg-zinc-800 rounded text-xs hover:bg-zinc-300"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{member.pointsLimit}</span>
                                {member.role !== 'owner' && (
                                  <button 
                                    onClick={() => {
                                      setEditingMemberUid(member.uid);
                                      setTempPointsLimit(member.pointsLimit);
                                    }}
                                    className="p-1 text-zinc-400 hover:text-indigo-500 transition-colors"
                                    title="Edit budget allocation"
                                  >
                                    <Edit size={10} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div>
                              <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{member.pointsUsed} CoCoins</span>
                              <div className="w-16 bg-zinc-150 dark:bg-zinc-800 h-1 rounded-full overflow-hidden ml-auto mt-1">
                                <div 
                                  className={`h-full ${percentUsed > 85 ? 'bg-rose-500' : percentUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${percentUsed}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {member.role !== 'owner' ? (
                              <button 
                                onClick={() => handleRemoveMember(member.uid)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all"
                                title="Revoke assigned seat license"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-mono italic">Primary Founder</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Quick Stats sidebar cards */}
          <div className="space-y-6">
            
            {/* Realtime seat license board */}
            <div className="p-5 bg-zinc-500/5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50">
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Award size={14} className="text-indigo-500" /> Interactive Seat Map
              </h3>
              
              <div className="grid grid-cols-5 gap-3">
                {selectedOrg && Array.from({ length: selectedOrg.maxSeats }).map((_, idx) => {
                  const isAssigned = idx < selectedOrg.assignedSeats;
                  const memberMatched = isAssigned ? members[idx] : null;
                  
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.08 }}
                      className={`aspect-square rounded-xl flex items-center justify-center font-bold text-xs relative ${
                        isAssigned 
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10' 
                          : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-400 border-dashed animate-pulse'
                      }`}
                      title={memberMatched ? `${memberMatched.displayName} (${memberMatched.email})` : 'Available Unassigned Seat'}
                    >
                      {isAssigned ? (
                        memberMatched?.role === 'owner' ? <Crown size={12} /> : `${idx + 1}`
                      ) : (
                        <Plus size={12} className="opacity-40" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/50 text-[10px] text-zinc-500 leading-relaxed font-light">
                * Solid blocks indicate licenses assigned to your corporate teammates. Dotted slots indicates available seed seats.
              </div>
            </div>

            {/* Strategic Advisory details */}
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
              <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Corporate Governance Rulebook</h4>
              <ul className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-2.5 font-light">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                  <span><strong>Global Points Limits</strong> govern individual teammate CoCoin spend profiles dynamically monthly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                  <span>Administrators of organizations retain rights to monitor prompt inputs and execution status logs for billing compliance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                  <span>Teammate activity is consolidated inside corporate metrics reports, providing zero-knowledge privacy for individual personal content fields.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* Add Seat Member Drawer / Modal overlay */}
      <AnimatePresence>
        {isAddMemberOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 bg-white dark:bg-zinc-900 border border-zinc-205 dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                  <UserPlus size={18} className="text-indigo-500" /> Assign Team Seat License
                </h3>
                <button onClick={() => setIsAddMemberOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Teammate Corporate Email *</label>
                  <input
                    required
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full px-3.5 py-2 text-xs border rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">DisplayName / Department</label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. John Doe (Data Analyst)"
                    className="w-full px-3.5 py-2 text-xs border rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Identity Role</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border rounded-xl border-zinc-200 dark:border-zinc-800 dark:bg-zinc-955 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Monthly CoCoins budget</label>
                    <input
                      type="number"
                      value={newMemberPoints}
                      onChange={(e) => setNewMemberPoints(parseInt(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 text-xs border rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2 text-xs border rounded-xl border-zinc-200 dark:border-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl shadow-sm hover:indigo-700 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSaving && <Loader2 className="animate-spin" size={12} />}
                    <span>Assign Seat</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
