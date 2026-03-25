export const INVENTORY_ITEMS = [
    {
        id: 'aura_purple',
        type: 'aura',
        name: 'Shadow Monarch Aura',
        description: 'A powerful purple pulse surrounding your profile.',
        requirement: 'Reach Level 50',
        unlockCheck: (profile) => (profile.level || 1) >= 50,
    },
    {
        id: 'aura_red',
        type: 'aura',
        name: 'Crimson Berserker Aura',
        description: 'An aggressive red pulse for high-tier hunters.',
        requirement: 'Clear Rank A Dungeon',
        unlockCheck: (profile) => profile.activeDungeon === 'dungeon_advanced' && profile.totalXP >= 10000,
    },
    {
        id: 'aura_black',
        type: 'aura',
        name: 'Eternal Void Pulse',
        description: 'A dark, consuming digital void.',
        requirement: 'Reach Level 100',
        unlockCheck: (profile) => (profile.level || 1) >= 100,
    },
    {
        id: 'border_gold',
        type: 'border',
        name: 'Imperial Golden Frame',
        description: 'A prestigious golden border for your hunter file.',
        requirement: 'Maintain a 10-day training streak',
        unlockCheck: (profile) => (profile.streak || 0) >= 10,
    },
    {
        id: 'border_neon',
        type: 'border',
        name: 'Neon Stealth Frame',
        description: 'A sleek cyan neon border for high-level hunters.',
        requirement: 'Reach Level 30',
        unlockCheck: (profile) => (profile.level || 1) >= 30,
    },
    {
        id: 'title_slayer',
        type: 'title',
        name: 'Dungeon Slayer',
        description: 'A title given to those who clear dungeons.',
        requirement: 'Log 50 total workouts',
        unlockCheck: (profile, workouts) => (workouts || []).length >= 50,
    },
    {
        id: 'title_iron_will',
        type: 'title',
        name: 'Iron Will',
        description: 'Your determination is absolute.',
        requirement: '30-day training streak',
        unlockCheck: (profile) => (profile.streak || 0) >= 30,
    },
    {
        id: 'title_overcomer',
        type: 'title',
        name: 'The One Who Overcomes',
        description: 'Achieved by those who push past their limits.',
        requirement: 'Reach Level 10',
        unlockCheck: (profile) => (profile.level || 1) >= 10,
    },
    {
        id: 'aura_blue',
        type: 'aura',
        name: 'System Blue Pulse',
        description: 'A clean blue digital pulse.',
        requirement: 'Reach Level 20',
        unlockCheck: (profile) => (profile.level || 1) >= 20,
    },
    {
        id: 'title_candidate',
        type: 'title',
        name: 'Hunter Candidate',
        description: 'You have just awakened to the system.',
        requirement: 'Initial Registration',
        unlockCheck: () => true, 
        preUnlocked: true, // Standard issue title
    },
    {
        id: 'title_scrapper',
        type: 'title',
        name: 'E-Rank Scrapper',
        description: 'Surviving your first few raids.',
        requirement: 'Reach Level 2',
        unlockCheck: (profile) => (profile.level || 1) >= 2,
    },
    {
        id: 'title_hungry',
        type: 'title',
        name: 'Hungry for Growth',
        description: 'A hunter who never misses a session.',
        requirement: 'Maintain a 3-day streak',
        unlockCheck: (profile) => (profile.streak || 0) >= 3,
    },
    {
        id: 'aura_faint',
        type: 'aura',
        name: 'Faint Awakening Aura',
        description: 'A subtle white glow indicating a new presence.',
        requirement: 'Reach Level 5',
        unlockCheck: (profile) => (profile.level || 1) >= 5,
    },
    {
        id: 'border_carbon',
        type: 'border',
        name: 'Reinforced Carbon Frame',
        description: 'A standard-issue durable frame.',
        requirement: 'Complete 5 Raids',
        unlockCheck: (profile, workouts) => (workouts || []).length >= 5,
    }
];

export const InventoryService = {
    /**
     * Check all requirements and return new items to grant.
     */
    checkUnlocks(profile, workouts) {
        const currentItems = new Set(profile.inventory || []);
        const newItems = [];

        INVENTORY_ITEMS.forEach(item => {
            if (!currentItems.has(item.id) && item.unlockCheck(profile, workouts)) {
                newItems.push(item.id);
            }
        });

        return newItems;
    },

    getItem(id) {
        return INVENTORY_ITEMS.find(i => i.id === id);
    }
};
