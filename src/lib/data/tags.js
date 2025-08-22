// Advertising content tags organized by categories
export const ADVERTISING_TAGS = {
    // Industry Sectors
    industry: [
        'automotive',
        'technology',
        'healthcare',
        'finance',
        'retail',
        'food-beverage',
        'travel',
        'real-estate',
        'education',
        'entertainment',
        'fashion',
        'sports',
        'gaming',
        'beauty',
        'home-garden'
    ],

    // Ad Formats
    format: [
        'video-ad',
        'display-banner',
        'social-media',
        'pre-roll',
        'mid-roll',
        'post-roll',
        'overlay',
        'interactive',
        'native-ad',
        'sponsored-content',
        'product-placement',
        'testimonial',
        'demo',
        'tutorial'
    ],

    // Target Demographics
    demographics: [
        'millennials',
        'gen-z',
        'gen-x',
        'baby-boomers',
        'families',
        'professionals',
        'students',
        'entrepreneurs',
        'parents',
        'seniors',
        'young-adults',
        'teens'
    ],

    // Geographic Targeting
    geography: [
        'global',
        'north-america',
        'europe',
        'asia-pacific',
        'latin-america',
        'middle-east',
        'africa',
        'urban',
        'suburban',
        'rural',
        'metropolitan'
    ],

    // Campaign Objectives
    objectives: [
        'brand-awareness',
        'lead-generation',
        'sales-conversion',
        'website-traffic',
        'app-downloads',
        'engagement',
        'retargeting',
        'customer-retention',
        'product-launch',
        'seasonal-promotion',
        'event-promotion',
        'brand-recall'
    ],

    // Content Style
    style: [
        'professional',
        'casual',
        'humorous',
        'emotional',
        'informative',
        'lifestyle',
        'testimonial',
        'behind-scenes',
        'animated',
        'live-action',
        'documentary',
        'cinematic',
        'minimalist',
        'bold',
        'elegant'
    ],

    // Budget Range
    budget: [
        'micro-budget',
        'small-budget',
        'medium-budget',
        'large-budget',
        'premium-budget',
        'cost-effective',
        'high-roi',
        'performance-based',
        'brand-investment'
    ],

    // Platform Targeting
    platform: [
        'social-media',
        'youtube',
        'facebook',
        'instagram',
        'tiktok',
        'linkedin',
        'twitter',
        'streaming-services',
        'connected-tv',
        'mobile-apps',
        'websites',
        'digital-billboards'
    ],

    // Campaign Duration
    duration: [
        'short-term',
        'medium-term',
        'long-term',
        'seasonal',
        'evergreen',
        'limited-time',
        'ongoing',
        'flash-campaign',
        'quarterly',
        'annual'
    ],

    // Production Quality
    quality: [
        'hd',
        '4k',
        'ultra-hd',
        'professional-grade',
        'broadcast-quality',
        'studio-produced',
        'high-production',
        'premium-quality',
        'standard-definition',
        'mobile-optimized'
    ],

    // Special Categories
    special: [
        'award-winning',
        'trending',
        'viral-potential',
        'case-study',
        'success-story',
        'innovative',
        'creative',
        'data-driven',
        'research-backed',
        'customer-favorite',
        'editor-choice',
        'featured'
    ]
};

// Flatten all tags into a single array for easy searching
export const ALL_TAGS = Object.values(ADVERTISING_TAGS).flat().sort();

// Get tags by category
export function getTagsByCategory(category) {
    return ADVERTISING_TAGS[category] || [];
}

// Get all categories
export function getCategories() {
    return Object.keys(ADVERTISING_TAGS);
}

// Search tags
export function searchTags(searchTerm) {
    if (!searchTerm) return [];
    
    const term = searchTerm.toLowerCase();
    return ALL_TAGS.filter(tag => 
        tag.toLowerCase().includes(term)
    );
}

// Validate tag
export function isValidTag(tag) {
    return ALL_TAGS.includes(tag.toLowerCase());
}

// Get category for a tag
export function getCategoryForTag(tag) {
    const lowerTag = tag.toLowerCase();
    for (const [category, tags] of Object.entries(ADVERTISING_TAGS)) {
        if (tags.includes(lowerTag)) {
            return category;
        }
    }
    return null;
}

// Format tag for display
export function formatTag(tag) {
    return tag
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get popular tags (most commonly used)
export const POPULAR_TAGS = [
    'brand-awareness',
    'professional',
    'video-ad',
    'social-media',
    'hd',
    'technology',
    'retail',
    'millennials',
    'lead-generation',
    'mobile-optimized',
    'global',
    'short-term',
    'cost-effective',
    'engaging',
    'innovative'
];

// Content rating system
export const CONTENT_RATINGS = {
    FAMILY_FRIENDLY: 'family-friendly',
    GENERAL_AUDIENCE: 'general-audience',
    MATURE_CONTENT: 'mature-content'
};

// Get suggested tags based on existing tags
export function getSuggestedTags(existingTags, limit = 10) {
    const existing = existingTags.map(tag => tag.toLowerCase());
    const suggestions = [];

    // Add popular tags that aren't already selected
    for (const tag of POPULAR_TAGS) {
        if (!existing.includes(tag) && suggestions.length < limit) {
            suggestions.push(tag);
        }
    }

    // Fill remaining slots with random tags
    const remainingSlots = limit - suggestions.length;
    if (remainingSlots > 0) {
        const availableTags = ALL_TAGS.filter(tag => 
            !existing.includes(tag) && !suggestions.includes(tag)
        );
        
        for (let i = 0; i < remainingSlots && i < availableTags.length; i++) {
            const randomIndex = Math.floor(Math.random() * availableTags.length);
            suggestions.push(availableTags.splice(randomIndex, 1)[0]);
        }
    }

    return suggestions;
}
