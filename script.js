/**
 * Unix Timestamp Clock with Rotating Milestone Wheel
 * Enhanced with scroll-driven animation and CSS-based visual spacing
 */

class UnixClock {
    constructor() {
        // DOM Element References
        this.unixTimestampElement = document.getElementById('unix-timestamp');
        this.utcDateTimeElement = document.getElementById('utc-datetime');
        this.topMilestoneContainer = document.getElementById('milestone-container-top');
        this.bottomMilestoneContainer = document.getElementById('milestone-container-bottom');
        
        // State Management
        this.state = {
            currentTimestamp: 0,
            currentDateTime: null,
            allMilestones: [],
            visibleMilestones: {
                top: [],
                bottom: []
            },
            milestoneOffset: 0,
            isRunning: false,
            updateInterval: null
        };
        
        // Configuration
        this.config = {
            updateFrequency: 1000, // 1 second
            milestoneDataPath: './data/milestones.json',
            maxMilestones: 20, // Maximum milestones to display
            milestonesPerSection: 3 // Number of milestones to show in each section
        };
        
        // Bound event handlers for proper cleanup
        this.boundHandleVisibilityChange = () => this.handleVisibilityChange();
        this.boundHandleWheel = (e) => this.handleWheel(e);
        this.boundHandleKeyboard = (e) => this.handleKeyboard(e);
    }
    
    /**
     * Initialize the clock application
     */
    async init() {
        try {
            console.log('Initializing Unix Timestamp Clock with Split Milestones...');
            
            // Load milestone data
            await this.loadMilestones();
            
            // Set up initial clock state
            this.updateClock();
            
            // Initialize milestone display
            this.initializeMilestoneDisplay();
            
            // Initialize scroll and keyboard handlers
            this.initializeScrollHandlers();
            
            // Initialize accessibility features
            this.initializeAccessibility();
            
            // Start real-time updates
            this.startClock();
            
            // Handle browser tab visibility changes
            document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
            
            console.log('Unix Timestamp Clock initialized successfully');
        } catch (error) {
            console.error('Failed to initialize clock:', error);
            // Continue with basic clock functionality even if milestones fail
            this.updateClock();
            this.startClock();
        }
    }
    
    /**
     * Format timestamp (plain number, visual spacing handled by CSS)
     */
    formatTimestamp(timestamp) {
        return timestamp.toString();
    }

    /**
     * Create spaced version for visual display with thin spaces
     */
    createSpacedTimestamp(timestamp) {
        const timestampStr = timestamp.toString();
        // Use thin space (U+2009) for better visual appearance
        return timestampStr.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
    }
    
    /**
     * Show loading state while initializing
     */
    showLoadingState() {
        if (this.unixTimestampElement) {
            this.unixTimestampElement.innerHTML = '<div class="loading-spinner"></div>';
        }
        if (this.utcDateTimeElement) {
            this.utcDateTimeElement.textContent = 'Loading...';
        }
    }

    /**
     * Enhanced error handling with user feedback
     */
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Create or update error message element
        let errorElement = document.getElementById('error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'error-message';
            errorElement.className = 'error-message sr-only'; // Start hidden for screen readers
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'assertive');
            document.body.appendChild(errorElement);
        }
        
        const errorMessage = `Error in ${context}: ${error.message || error}`;
        errorElement.textContent = errorMessage;
        
        // Briefly show error to screen readers, then hide
        errorElement.classList.remove('sr-only');
        setTimeout(() => {
            errorElement.classList.add('sr-only');
        }, 3000);
    }

    /**
     * Validate milestone data structure
     */
    validateMilestoneData(data) {
        if (!data || !Array.isArray(data.milestones)) {
            throw new Error('Invalid milestone data: Expected array of milestones');
        }
        
        const validMilestones = data.milestones.filter(milestone => {
            if (!milestone || typeof milestone !== 'object') return false;
            if (typeof milestone.timestamp !== 'number' || milestone.timestamp < 0) return false;
            if (typeof milestone.description !== 'string' || milestone.description.trim() === '') return false;
            return true;
        });
        
        if (validMilestones.length === 0) {
            throw new Error('No valid milestones found in data');
        }
        
        return { milestones: validMilestones };
    }

    /**
     * Enhanced milestone loading with better error handling
     */
    async loadMilestones() {
        try {
            console.log('Loading milestone data...');
            this.showLoadingState();
            
            const response = await fetch(this.config.milestoneDataPath);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch milestones: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const validatedData = this.validateMilestoneData(data);
            
            // Store validated milestone data
            this.state.allMilestones = validatedData.milestones
                .slice(0, this.config.maxMilestones) // Limit number of milestones
                .sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically
            
            console.log(`Loaded ${this.state.allMilestones.length} valid milestones`);
            
        } catch (error) {
            this.handleError(error, 'milestone loading');
            
            // Set fallback milestone data
            this.state.allMilestones = this.getFallbackMilestones();
            console.warn('Using fallback milestone data');
        }
    }

    /**
     * Provide fallback milestone data if loading fails
     */
    getFallbackMilestones() {
        return [
            {
                timestamp: 1000000000,
                description: "Unix timestamp reached 1 billion",
                significance: "Billionth second since epoch - September 9, 2001"
            },
            {
                timestamp: 2000000000,
                description: "Unix timestamp reaches 2 billion",
                significance: "Future milestone - May 18, 2033"
            },
            {
                timestamp: 2147483647,
                description: "32-bit signed integer limit",
                significance: "Y2038 problem boundary - January 19, 2038"
            }
        ];
    }
    
    /**
     * Update the main clock display with current timestamp
     */
    updateClock() {
        // Calculate current Unix timestamp
        const now = new Date();
        this.state.currentTimestamp = Math.floor(now.getTime() / 1000);
        this.state.currentDateTime = now;
        
        // Update DOM elements (display spaced content directly)
        if (this.unixTimestampElement) {
            const spacedTimestamp = this.createSpacedTimestamp(this.state.currentTimestamp);
            
            this.unixTimestampElement.textContent = spacedTimestamp;
            this.unixTimestampElement.setAttribute('data-raw', this.state.currentTimestamp.toString());
            this.unixTimestampElement.setAttribute('datetime', now.toISOString());
        }
        
        if (this.utcDateTimeElement) {
            const utcString = now.toUTCString();
            this.utcDateTimeElement.textContent = utcString;
            this.utcDateTimeElement.setAttribute('datetime', now.toISOString());
        }
        
        // Update milestone states if needed
        this.updateMilestoneStates();
    }
    
    /**
     * Initialize the milestone display with top and bottom sections
     */
    initializeMilestoneDisplay() {
        if (!this.topMilestoneContainer || !this.bottomMilestoneContainer || this.state.allMilestones.length === 0) {
            return;
        }
        
        // Sort milestones by timestamp
        const sortedMilestones = [...this.state.allMilestones].sort((a, b) => a.timestamp - b.timestamp);
        this.state.allMilestones = sortedMilestones;
        
        // Reset scroll offset
        this.state.milestoneOffset = 0;
        
        // Update visible milestones
        this.updateVisibleMilestones();
        
        // Render initial milestone sections
        this.renderMilestoneSection('top');
        this.renderMilestoneSection('bottom');
        
        // Update accessibility after rendering
        setTimeout(() => this.updateMilestoneAccessibility(), 0);
    }

    /**
     * Update which milestones are visible based on current time and scroll offset
     * Format: 3 milestones above clock, 3 milestones below clock
     * Scrolling shifts the 6-milestone window through all available milestones in a circular fashion
     */
    updateVisibleMilestones() {
        const totalMilestones = this.state.allMilestones.length;
        if (totalMilestones === 0) {
            this.state.visibleMilestones.top = [];
            this.state.visibleMilestones.bottom = [];
            return;
        }
        
        const currentTimestamp = this.state.currentTimestamp;
        
        // Create chronologically sorted array
        const allMilestones = [...this.state.allMilestones].sort((a, b) => a.timestamp - b.timestamp);
        
        // Find boundary between past and future
        const firstFutureIndex = allMilestones.findIndex(m => m.timestamp > currentTimestamp);
        const pastCount = firstFutureIndex === -1 ? allMilestones.length : firstFutureIndex;
        
        // Calculate default starting position
        // Default: show 3 most recent past milestones above clock
        let baseStartIndex;
        if (pastCount >= 3) {
            baseStartIndex = pastCount - 3;
        } else {
            baseStartIndex = Math.max(0, pastCount - 3);
        }
        
        // Apply scroll offset
        let startIndex = baseStartIndex + this.state.milestoneOffset;
        
        // Create visible milestones array with circular wrapping
        const visibleMilestones = [];
        for (let i = 0; i < Math.min(6, totalMilestones); i++) {
            // Calculate index with proper modulo for negative numbers
            let index = ((startIndex + i) % totalMilestones + totalMilestones) % totalMilestones;
            visibleMilestones.push(allMilestones[index]);
        }
        
        // Handle case where we have fewer than 6 milestones
        if (totalMilestones < 6) {
            // Fill with available milestones, no wrapping needed
            this.state.visibleMilestones.top = visibleMilestones.slice(0, Math.min(3, visibleMilestones.length));
            this.state.visibleMilestones.bottom = visibleMilestones.slice(3, visibleMilestones.length);
        } else {
            // Normal case: exactly 6 milestones visible
            this.state.visibleMilestones.top = visibleMilestones.slice(0, 3);
            this.state.visibleMilestones.bottom = visibleMilestones.slice(3, 6);
        }
    }

    /**
     * Render milestone section (top or bottom)
     */
    renderMilestoneSection(section) {
        const container = section === 'top' ? this.topMilestoneContainer : this.bottomMilestoneContainer;
        const milestones = this.state.visibleMilestones[section];
        
        if (!container || !milestones) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create cards for each milestone
        milestones.forEach((milestone) => {
            const milestoneCard = this.createMilestoneCard(milestone);
            container.appendChild(milestoneCard);
        });
    }

    /**
     * Initialize scroll and keyboard handlers for milestone navigation
     */
    initializeScrollHandlers() {
        // Add wheel event listener for milestone scrolling
        document.addEventListener('wheel', this.boundHandleWheel, { passive: false });
        
        // Add keyboard navigation
        document.addEventListener('keydown', this.boundHandleKeyboard);
    }

    /**
     * Handle wheel events for milestone scrolling
     */
    handleWheel(event) {
        // Only handle wheel events when not over the main clock
        const clockElement = document.querySelector('.main-clock');
        if (clockElement && clockElement.contains(event.target)) {
            return;
        }
        
        event.preventDefault();
        
        // Determine scroll direction
        const delta = Math.sign(event.deltaY);
        this.scrollMilestones(delta);
    }

    /**
     * Handle keyboard navigation for milestones
     */
    handleKeyboard(event) {
        if (event.target !== document.body && !event.target.classList.contains('milestone-card')) {
            return;
        }
        
        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault();
                this.scrollMilestones(-1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.scrollMilestones(1);
                break;
            case 'Space':
                event.preventDefault();
                this.announceCurrentTime();
                break;
        }
    }

    /**
     * Scroll milestones in the specified direction
     * Positive direction = scroll down (show later milestones)
     * Negative direction = scroll up (show earlier milestones)
     */
    scrollMilestones(direction) {
        const totalMilestones = this.state.allMilestones.length;
        if (totalMilestones <= 6) {
            // If we have 6 or fewer milestones, no scrolling needed
            return;
        }
        
        // Update offset (direction is already +1 or -1)
        this.state.milestoneOffset += direction;
        
        // The wrapping/cycling logic is handled in updateVisibleMilestones()
        // Update visible milestones and re-render
        this.updateVisibleMilestones();
        this.renderMilestoneSection('top');
        this.renderMilestoneSection('bottom');
        
        // Update accessibility
        this.updateMilestoneAccessibility();
    }
    
    /**
     * Create a milestone card element
     */
    createMilestoneCard(milestone) {
        const card = document.createElement('div');
        card.className = 'milestone-card';
        
        // Determine if past or future
        const isPast = milestone.timestamp <= this.state.currentTimestamp;
        card.classList.add(isPast ? 'past' : 'future');
        
        // Create content
        const timestampSection = document.createElement('div');
        timestampSection.className = 'milestone-timestamp-section';
        
        const timestamp = document.createElement('time');
        timestamp.className = 'milestone-timestamp';
        const spacedTimestamp = this.createSpacedTimestamp(milestone.timestamp);
        
        timestamp.textContent = spacedTimestamp;
        timestamp.setAttribute('data-raw', milestone.timestamp.toString());
        timestamp.setAttribute('datetime', new Date(milestone.timestamp * 1000).toISOString());
        
        const date = document.createElement('div');
        date.className = 'milestone-date';
        date.textContent = new Date(milestone.timestamp * 1000).toUTCString().slice(0, 16);
        
        timestampSection.appendChild(timestamp);
        timestampSection.appendChild(date);
        
        const details = document.createElement('div');
        details.className = 'milestone-details';
        
        const description = document.createElement('div');
        description.className = 'milestone-description';
        description.textContent = milestone.description;
        
        const significance = document.createElement('div');
        significance.className = 'milestone-significance';
        significance.textContent = milestone.significance || '';
        
        details.appendChild(description);
        if (milestone.significance) {
            details.appendChild(significance);
        }
        
        card.appendChild(timestampSection);
        card.appendChild(details);
        
        return card;
    }
    
    /**
     * Initialize accessibility features and keyboard navigation
     */
    initializeAccessibility() {
        // Add keyboard navigation for milestone wheel (simplified)
        document.addEventListener('keydown', (event) => {
            if (event.target === document.body || event.target.classList.contains('milestone-card')) {
                switch (event.key) {
                    case 'Space':
                        event.preventDefault();
                        this.announceCurrentTime();
                        break;
                }
            }
        });

        // Add ARIA live region for time announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'time-announcements';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);

        // Make milestone cards focusable and add ARIA labels
        this.updateMilestoneAccessibility();
    }

    /**
     * Announce current time for screen readers
     */
    announceCurrentTime() {
        const liveRegion = document.getElementById('time-announcements');
        if (liveRegion) {
            const timestamp = this.state.currentTimestamp;
            const date = this.state.currentDateTime;
            const announcement = `Current Unix timestamp is ${timestamp.toLocaleString()}. The time is ${date.toLocaleString()}`;
            liveRegion.textContent = announcement;
        }
    }

    /**
     * Update accessibility attributes for milestone cards
     */
    updateMilestoneAccessibility() {
        const milestoneCards = document.querySelectorAll('.milestone-card');
        
        milestoneCards.forEach((card, index) => {
            const timestampElement = card.querySelector('.milestone-timestamp');
            const descriptionElement = card.querySelector('.milestone-description');
            const significanceElement = card.querySelector('.milestone-significance');
            
            if (!timestampElement || !descriptionElement) return;
            
            const timestamp = parseInt(timestampElement.getAttribute('data-raw'));
            const description = descriptionElement.textContent;
            const significance = significanceElement?.textContent || '';
            
            // Make cards focusable
            card.setAttribute('tabindex', '0');
            
            // Add comprehensive ARIA labels
            const isPast = timestamp <= this.state.currentTimestamp;
            const status = isPast ? 'past' : 'future';
            const date = new Date(timestamp * 1000);
            
            card.setAttribute('aria-label', 
                `${status} milestone: ${description}. ` +
                `Timestamp ${timestamp.toLocaleString()}. ` +
                `Date ${date.toLocaleDateString()}. ` +
                `${significance}`
            );
            
            card.setAttribute('role', 'button');
            card.setAttribute('aria-describedby', `milestone-${index}-details`);
            
            // Remove existing event listeners to avoid duplicates
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // Add click/enter handler for milestone details
            newCard.addEventListener('click', () => this.focusMilestone({ timestamp, description, significance }));
            newCard.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.focusMilestone({ timestamp, description, significance });
                }
            });
        });
    }

    /**
     * Focus and announce milestone details
     */
    focusMilestone(milestone) {
        const liveRegion = document.getElementById('time-announcements');
        if (liveRegion) {
            const date = new Date(milestone.timestamp * 1000);
            const isPast = milestone.timestamp <= this.state.currentTimestamp;
            const status = isPast ? 'This milestone has passed' : 'This milestone is in the future';
            
            const announcement = `Focused milestone: ${milestone.description}. ` +
                               `Unix timestamp ${milestone.timestamp.toLocaleString()}. ` +
                               `Date ${date.toLocaleString()}. ` +
                               `${milestone.significance || ''}. ${status}.`;
                               
            liveRegion.textContent = announcement;
        }
    }

    /**
     * Update the milestone states (past/future classification)
     */
    updateMilestoneStates() {
        const milestoneCards = document.querySelectorAll('.milestone-card');
        
        milestoneCards.forEach((card) => {
            const timestampAttr = card.querySelector('.milestone-timestamp')?.getAttribute('data-raw');
            if (!timestampAttr) return;
            
            const timestamp = parseInt(timestampAttr);
            const isPast = timestamp <= this.state.currentTimestamp;
            
            // Update classes if state changed
            if (isPast && !card.classList.contains('past')) {
                card.classList.remove('future');
                card.classList.add('past');
            } else if (!isPast && !card.classList.contains('future')) {
                card.classList.remove('past');
                card.classList.add('future');
            }
        });
    }
    
    /**
     * Start the real-time clock updates
     */
    startClock() {
        if (this.state.isRunning) return;
        
        console.log('Starting real-time clock updates...');
        this.state.isRunning = true;
        
        // Use setInterval for consistent timing
        this.state.updateInterval = setInterval(() => this.updateClock(), this.config.updateFrequency);
    }
    
    /**
     * Stop the real-time clock updates
     */
    stopClock() {
        if (!this.state.isRunning) return;
        
        console.log('Stopping clock updates...');
        this.state.isRunning = false;
        
        if (this.state.updateInterval) {
            clearInterval(this.state.updateInterval);
            this.state.updateInterval = null;
        }
    }
    
    /**
     * Handle browser tab visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Tab is hidden, stop updates to save resources
            this.stopClock();
        } else {
            // Tab is visible, resume updates and sync time
            this.updateClock(); // Immediate update to sync
            this.startClock();
        }
    }
    
    /**
     * Performance Utilities
     */
    
    /**
     * Throttle function to limit execution frequency
     */
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
    
    /**
     * Request animation frame with fallback
     */
    requestAnimFrame(fn) {
        return (window.requestAnimationFrame ||
               window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame ||
               function(callback) {
                   window.setTimeout(callback, 1000 / 60);
               })(fn);
    }
    
    /**
     * Check if user prefers reduced motion
     */
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Clean up resources and event listeners
     */
    destroy() {
        console.log('Destroying Unix Timestamp Clock...');
        
        this.stopClock();
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
        document.removeEventListener('wheel', this.boundHandleWheel);
        document.removeEventListener('keydown', this.boundHandleKeyboard);
        
        // Cancel animation frame if running
        if (this.state.animationFrameId) {
            cancelAnimationFrame(this.state.animationFrameId);
        }
        
        // Reset state
        this.state = {
            currentTimestamp: 0,
            currentDateTime: null,
            allMilestones: [],
            visibleMilestones: {
                top: [],
                bottom: []
            },
            milestoneOffset: 0,
            isRunning: false,
            updateInterval: null
        };
    }
}

// Initialize the clock when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const clock = new UnixClock();
    clock.init();
    
    // Make clock globally accessible for debugging
    window.unixClock = clock;
});

// Handle page unload cleanup
window.addEventListener('beforeunload', () => {
    if (window.unixClock) {
        window.unixClock.destroy();
    }
});
