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
        this.boundHandleTouchStart = (e) => this.handleTouchStart(e);
        this.boundHandleTouchMove = (e) => this.handleTouchMove(e);
        this.boundHandleTouchEnd = (e) => this.handleTouchEnd(e);
        this.debouncedScrollFeedback = this.createDebouncedScrollHandler();
        
        // Touch state tracking
        this.touchState = {
            startY: null,
            startTime: null,
            isScrolling: false,
            threshold: 50 // Minimum distance for scroll action
        };
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
     * Create timestamp with CSS-based visual separation
     * Returns HTML with spans for each digit group
     */
    createSpacedTimestamp(timestamp) {
        const timestampStr = timestamp.toString();
        // Split into groups of 3 digits from right to left
        const groups = [];
        let str = timestampStr;
        
        while (str.length > 0) {
            if (str.length <= 3) {
                groups.unshift(str);
                break;
            } else {
                groups.unshift(str.slice(-3));
                str = str.slice(0, -3);
            }
        }
        
        // Create spans for each group to enable CSS styling
        return groups.map((group, index) => 
            `<span class="digit-group" data-group="${index}">${group}</span>`
        ).join('');
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
            
            this.unixTimestampElement.innerHTML = spacedTimestamp;
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
        
        // Update countdown timers
        this.updateCountdownTimers();
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
        
        // Milestone rendering complete
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
     * Render milestone section with instant transitions (no fade)
     */
    renderMilestoneSectionWithAnimation(section) {
        const container = section === 'top' ? this.topMilestoneContainer : this.bottomMilestoneContainer;
        const milestones = this.state.visibleMilestones[section];
        
        if (!container || !milestones) return;
        
        // Clear and add new cards immediately (no fade animation)
        container.innerHTML = '';
        
        // Create and add new cards instantly
        milestones.forEach((milestone) => {
            const milestoneCard = this.createMilestoneCard(milestone);
            container.appendChild(milestoneCard);
        });
    }

    /**
     * Add timestamp update animation
     */
    animateTimestampUpdate() {
        if (this.unixTimestampElement) {
            this.unixTimestampElement.classList.add('updating');
            setTimeout(() => {
                this.unixTimestampElement.classList.remove('updating');
            }, 1000);
        }
    }

    /**
     * Initialize scroll and keyboard handlers for milestone navigation
     */
    initializeScrollHandlers() {
        // Add wheel event listener for milestone scrolling (desktop)
        document.addEventListener('wheel', this.boundHandleWheel, { passive: false });
        
        // Add touch event listeners for mobile scrolling
        document.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
        document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundHandleTouchEnd, { passive: false });
        
        // Add keyboard navigation
        document.addEventListener('keydown', this.boundHandleKeyboard);
    }

    /**
     * Handle wheel events for milestone scrolling
     */
    handleWheel(event) {
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
        }
    }

    /**
     * Handle touch start events for mobile scrolling
     */
    handleTouchStart(event) {
        this.touchState.startY = event.touches[0].clientY;
        this.touchState.startTime = Date.now();
        this.touchState.isScrolling = false;
    }

    /**
     * Handle touch move events for mobile scrolling
     */
    handleTouchMove(event) {
        if (!this.touchState.startY) return;
        
        const currentY = event.touches[0].clientY;
        const deltaY = this.touchState.startY - currentY;
        const absDeltaY = Math.abs(deltaY);
        
        // Check if we've moved enough to trigger scrolling
        if (absDeltaY > this.touchState.threshold && !this.touchState.isScrolling) {
            event.preventDefault();
            this.touchState.isScrolling = true;
            
            // Determine scroll direction
            const direction = deltaY > 0 ? 1 : -1; // Positive = scroll down
            this.scrollMilestones(direction);
        }
    }

    /**
     * Handle touch end events for mobile scrolling
     */
    handleTouchEnd() {
        // Reset touch state
        this.touchState.startY = null;
        this.touchState.startTime = null;
        this.touchState.isScrolling = false;
    }

    /**
     * Scroll milestones in the specified direction with simple transitions
     * Positive direction = scroll down (show later milestones)
     * Negative direction = scroll up (show earlier milestones)
     */
    scrollMilestones(direction) {
        const totalMilestones = this.state.allMilestones.length;
        if (totalMilestones <= 6) {
            // If we have 6 or fewer milestones, no scrolling needed
            return;
        }
        
        // Add simple scrolling animation classes
        this.addScrollAnimationClasses(direction);
        
        // Update offset (direction is already +1 or -1)
        this.state.milestoneOffset += direction;
        
        // Update visible milestones and re-render
        this.updateVisibleMilestones();
        this.renderMilestoneSectionWithAnimation('top');
        this.renderMilestoneSectionWithAnimation('bottom');
    }

    /**
     * Add animation classes to milestone containers for smooth scrolling
     */
    addScrollAnimationClasses() {
        const containers = [this.topMilestoneContainer, this.bottomMilestoneContainer];
        
        containers.forEach(container => {
            if (!container) return;
            
            // Add simple scrolling class
            container.classList.add('scrolling');
            
            // Remove animation class after transition completes
            setTimeout(() => {
                container.classList.remove('scrolling');
            }, 400);
        });
    }

    /**
     * Add visual scroll feedback
     */
    addScrollFeedback() {
        // Add ripple effect to indicate scrolling
        const containers = [this.topMilestoneContainer, this.bottomMilestoneContainer];
        
        containers.forEach(container => {
            if (!container) return;
            
            // Create temporary ripple element
            const ripple = document.createElement('div');
            ripple.className = 'scroll-ripple';
            ripple.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 0;
                height: 0;
                border: 2px solid rgba(0, 123, 255, 0.5);
                border-radius: 50%;
                animation: scrollRipple 0.6s ease-out;
                pointer-events: none;
                z-index: 100;
            `;
            
            container.style.position = 'relative';
            container.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => {
                if (ripple.parentNode === container) {
                    container.removeChild(ripple);
                }
            }, 600);
        });
    }

    /**
     * Debounced scroll handler to prevent too frequent updates
     */
    createDebouncedScrollHandler() {
        let scrollTimeout;
        
        return () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.addScrollFeedback();
            }, 100);
        };
    }
    
    /**
     * Show scroll indicators briefly
     */
    showScrollIndicators() {
        const indicators = document.querySelectorAll('.scroll-indicator');
        indicators.forEach(indicator => {
            indicator.classList.add('visible');
            setTimeout(() => {
                indicator.classList.remove('visible');
            }, 2000);
        });
    }
    
    /**
     * Create a milestone card element with no animations
     */
    createMilestoneCard(milestone) {
        const card = document.createElement('div');
        card.className = 'milestone-card';
        
        // Determine if past or future
        const isPast = milestone.timestamp <= this.state.currentTimestamp;
        card.classList.add(isPast ? 'past' : 'future');
        
        // No entrance animations - removed to prevent blinking
        
        // Create countdown column (leftmost)
        const countdownColumn = document.createElement('div');
        countdownColumn.className = 'milestone-countdown-column';
        
        const countdownData = this.calculateCountdown(milestone.timestamp, this.state.currentTimestamp);
        const formattedCountdown = this.formatCountdownUnix(countdownData);
        
        const countdown = document.createElement('div');
        countdown.className = 'milestone-countdown';
        countdown.setAttribute('aria-live', 'polite');
        countdown.setAttribute('aria-label', `${formattedCountdown.seconds} seconds ${formattedCountdown.direction}`);
        
        const countdownValue = document.createElement('div');
        countdownValue.className = 'countdown-value';
        countdownValue.innerHTML = formattedCountdown.seconds;
        
        const countdownLabel = document.createElement('div');
        countdownLabel.className = 'countdown-label';
        countdownLabel.textContent = formattedCountdown.direction;
        
        countdown.appendChild(countdownValue);
        countdown.appendChild(countdownLabel);
        countdownColumn.appendChild(countdown);
        
        // Create timestamp section (middle)
        const timestampSection = document.createElement('div');
        timestampSection.className = 'milestone-timestamp-section';
        
        const timestamp = document.createElement('time');
        timestamp.className = 'milestone-timestamp';
        const spacedTimestamp = this.createSpacedTimestamp(milestone.timestamp);
        
        timestamp.innerHTML = spacedTimestamp;
        timestamp.setAttribute('data-raw', milestone.timestamp.toString());
        timestamp.setAttribute('datetime', new Date(milestone.timestamp * 1000).toISOString());
        
        const date = document.createElement('div');
        date.className = 'milestone-date';
        date.textContent = new Date(milestone.timestamp * 1000).toUTCString().slice(0, 16);
        
        timestampSection.appendChild(timestamp);
        timestampSection.appendChild(date);
        
        // Create details section (rightmost)
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
        
        // Assemble card in order: countdown, timestamp, details
        card.appendChild(countdownColumn);
        card.appendChild(timestampSection);
        card.appendChild(details);
        
        return card;    }

    /**
     * Calculate time difference and format as countdown
     */
    calculateCountdown(milestoneTimestamp, currentTimestamp) {
        const timeDiff = Math.abs(milestoneTimestamp - currentTimestamp);
        const isPast = milestoneTimestamp <= currentTimestamp;
        
        // Calculate time units
        const years = Math.floor(timeDiff / (365.25 * 24 * 3600));
        const days = Math.floor((timeDiff % (365.25 * 24 * 3600)) / (24 * 3600));
        const hours = Math.floor((timeDiff % (24 * 3600)) / 3600);
        const minutes = Math.floor((timeDiff % 3600) / 60);
        const seconds = timeDiff % 60;
        
        return {
            isPast,
            years,
            days,
            hours,
            minutes,
            seconds,
            totalSeconds: timeDiff
        };
    }

    /**
     * Format countdown display with appropriate units
     */
    formatCountdown(countdown) {
        const { isPast, years, days, hours, minutes, seconds, totalSeconds } = countdown;
        
        // For very small differences (under 1 minute), show seconds
        if (totalSeconds < 60) {
            return {
                primary: `${seconds}s`,
                secondary: isPast ? 'ago' : 'from now',
                compact: `${seconds}s`
            };
        }
        
        // For under 1 hour, show minutes and seconds
        if (totalSeconds < 3600) {
            return {
                primary: `${minutes}m ${seconds}s`,
                secondary: isPast ? 'ago' : 'from now',
                compact: `${minutes}m`
            };
        }
        
        // For under 1 day, show hours and minutes
        if (totalSeconds < 86400) {
            return {
                primary: `${hours}h ${minutes}m`,
                secondary: isPast ? 'ago' : 'from now',
                compact: `${hours}h`
            };
        }
        
        // For under 1 year, show days and hours
        if (totalSeconds < 31557600) { // 365.25 * 24 * 3600
            return {
                primary: `${days}d ${hours}h`,
                secondary: isPast ? 'ago' : 'from now',
                compact: `${days}d`
            };
        }
        
        // For longer periods, show years and days
        return {
            primary: `${years}y ${days}d`,
            secondary: isPast ? 'ago' : 'from now',
            compact: `${years}y`
        };
    }

    /**
     * Format countdown display as Unix seconds with direction
     */
    formatCountdownUnix(countdown) {
        const { isPast, totalSeconds } = countdown;
        
        return {
            seconds: this.createSpacedTimestamp(totalSeconds),
            direction: isPast ? 'ago' : 'from now'
        };
    }

    /**
     * Update all countdown timers in milestone cards
     */
    updateCountdownTimers() {
        const currentTimestamp = this.state.currentTimestamp;
        const milestoneCards = document.querySelectorAll('.milestone-card');
        
        milestoneCards.forEach((card) => {
            const timestampAttr = card.querySelector('.milestone-timestamp')?.getAttribute('data-raw');
            if (!timestampAttr) return;
            
            const milestoneTimestamp = parseInt(timestampAttr);
            const countdown = this.calculateCountdown(milestoneTimestamp, currentTimestamp);
            const formatted = this.formatCountdownUnix(countdown);
            
            // Update countdown display
            const countdownElement = card.querySelector('.milestone-countdown');
            if (countdownElement) {
                const countdownValue = countdownElement.querySelector('.countdown-value');
                const countdownLabel = countdownElement.querySelector('.countdown-label');
                
                if (countdownValue && countdownLabel) {
                    // Only update if the content has changed
                    const newValue = formatted.seconds;
                    if (countdownValue.innerHTML !== newValue) {
                        countdownValue.innerHTML = newValue;
                    }
                    if (countdownLabel.textContent !== formatted.direction) {
                        countdownLabel.textContent = formatted.direction;
                    }
                    
                    // Update accessibility attributes (extract raw number for aria-label)
                    const rawSeconds = countdown.totalSeconds;
                    const ariaLabel = `${rawSeconds} seconds ${formatted.direction}`;
                    if (countdownElement.getAttribute('aria-label') !== ariaLabel) {
                        countdownElement.setAttribute('aria-label', ariaLabel);
                    }
                }
            }
        });
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
        // Stop the clock
        this.stopClock();
        
        // Remove all event listeners
        document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
        document.removeEventListener('wheel', this.boundHandleWheel);
        document.removeEventListener('keydown', this.boundHandleKeyboard);
        document.removeEventListener('touchstart', this.boundHandleTouchStart);
        document.removeEventListener('touchmove', this.boundHandleTouchMove);
        document.removeEventListener('touchend', this.boundHandleTouchEnd);
        
        // Clear state
        this.state.allMilestones = [];
        this.state.visibleMilestones = { top: [], bottom: [] };
        
        console.log('Unix Clock destroyed and cleaned up');
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
