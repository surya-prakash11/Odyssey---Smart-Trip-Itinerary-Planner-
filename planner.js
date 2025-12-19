document.addEventListener('DOMContentLoaded', () => {
    
    // --- START: MODIFIED SECTION ---
    // The main logic is now wrapped in an async function to handle fetching the JSON data.
    async function initializeApp() {

        // Fetch the city data from the external data.json file
        const CITIES_DATA = await fetchCitiesData();

        // If data fails to load, stop the app from running to prevent errors.
        if (!CITIES_DATA) {
            console.error("Failed to load city data. App cannot start.");
            alert("Error: Could not load city information. Please try again later.");
            return;
        }
        // --- END: MODIFIED SECTION ---

        // --- GRAB DOM ELEMENTS ---
        const tripTitle = document.getElementById('trip-destination-title');
        const totalBudgetEl = document.getElementById('total-budget');
        const amountSpentEl = document.getElementById('amount-spent');
        const budgetRemainingEl = document.getElementById('budget-remaining');
        const addItemBtn = document.getElementById('add-item-btn');
        const itineraryList = document.getElementById('itinerary-list');
        const suggestionsContainer = document.getElementById('suggestions-container');
        const budgetProgressBar = document.getElementById('budget-progress-bar');
        const budgetProgressText = document.getElementById('budget-progress-text');
        const daysProgressBar = document.getElementById('days-progress-bar');
        const daysProgressText = document.getElementById('days-progress-text');
        
        // --- INPUT FIELDS ---
        const placeInput = document.getElementById('place-name');
        const dateInput = document.getElementById('item-date');
        const costInput = document.getElementById('item-cost');
        const notesInput = document.getElementById('item-notes');

        const tripDetails = JSON.parse(localStorage.getItem('tripDetails'));

        if (!tripDetails) {
            alert("No trip data found! Redirecting to homepage.");
            window.location.href = 'index.html';
            return;
        }

        let itineraryItems = JSON.parse(localStorage.getItem(`itineraryItems_${tripDetails.destination}`)) || [];
        let totalSpent = 0;

        // --- PRIMARY FUNCTIONS ---

        function updateSummary() {
            totalSpent = itineraryItems.reduce((acc, item) => acc + item.cost, 0);
            const remaining = tripDetails.budget - totalSpent;

            totalBudgetEl.textContent = `₹${tripDetails.budget.toLocaleString()}`;
            amountSpentEl.textContent = `₹${totalSpent.toLocaleString()}`;
            budgetRemainingEl.textContent = `₹${remaining.toLocaleString()}`;

            let budgetPercent = (totalSpent / tripDetails.budget) * 100;
            budgetProgressBar.style.backgroundColor = budgetPercent > 100 ? 'var(--warning-color)' : 'var(--primary-color)';
            budgetPercent = Math.min(budgetPercent, 100);
            
            budgetProgressBar.style.width = `${budgetPercent}%`;
            budgetProgressText.textContent = `${Math.round(budgetPercent)}% Spent`;

            budgetRemainingEl.className = remaining < 0 ? 'spent' : 'remaining';
        }

        function updateDaysProgress() {
            const startDate = new Date(tripDetails.startDate);
            const today = new Date();
            startDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            
            const totalDuration = tripDetails.duration;
            const diffTime = today - startDate;
            let daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (daysElapsed < 1) daysElapsed = 1;
            if (daysElapsed > totalDuration) daysElapsed = totalDuration;

            const daysPercent = (daysElapsed / totalDuration) * 100;
            
            daysProgressBar.style.width = `${daysPercent}%`;
            daysProgressText.textContent = `Day ${daysElapsed} of ${totalDuration}`;
        }

        function renderItinerary() {
            itineraryList.innerHTML = '';
            if (itineraryItems.length === 0) {
                itineraryList.innerHTML = `<p class="empty-state">Your itinerary is empty. Add an item to get started!</p>`;
                return;
            }
            itineraryItems.sort((a, b) => new Date(a.date) - new Date(b.date));
            itineraryItems.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.classList.add('itinerary-item');
                const formattedDate = new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                itemEl.innerHTML = `
                    <div class="item-header">
                        <div class="item-place-date"><h3>${item.place}</h3><span>${formattedDate}</span></div>
                        <div class="item-actions">
                            <span class="item-cost">₹${item.cost.toLocaleString()}</span>
                            <button class="remove-item-btn" data-id="${item.id}" title="Remove item">&times;</button>
                        </div>
                    </div>
                    <div class="item-notes"><p>${item.notes}</p></div>`;
                itineraryList.appendChild(itemEl);
            });
        }
        
        function handleAddItem() {
            const place = placeInput.value, date = dateInput.value, cost = parseInt(costInput.value), notes = notesInput.value;
            if (!place || !date || isNaN(cost)) {
                alert("Please fill in the place, date, and cost.");
                return;
            }
            itineraryItems.push({ id: Date.now(), place, date, cost, notes });
            localStorage.setItem(`itineraryItems_${tripDetails.destination}`, JSON.stringify(itineraryItems));
            updateSummary();
            renderItinerary();
            placeInput.value = ''; dateInput.value = ''; costInput.value = ''; notesInput.value = '';
        }

        function handleRemoveItem(itemId) {
            const idToRemove = parseInt(itemId, 10);
            itineraryItems = itineraryItems.filter(item => item.id !== idToRemove);
            localStorage.setItem(`itineraryItems_${tripDetails.destination}`, JSON.stringify(itineraryItems));
            updateSummary();
            renderItinerary();
        }
        
        function renderSuggestions(cityData) {
            if (!cityData || !cityData.places) {
                suggestionsContainer.innerHTML = `<p class="empty-state">No suggestions available for this city yet.</p>`;
                return;
            }
            suggestionsContainer.innerHTML = '';
            cityData.places.forEach(place => {
                const card = document.createElement('div');
                card.className = 'suggestion-card';
                card.innerHTML = `
                    <h4>${place.name} <span class="place-type">${place.type}</span></h4>
                    <p>${place.description}</p>
                    <div class="suggestion-footer">
                        <span>Est. Cost: <b>₹${place.estimatedCost}</b></span>
                        <button class="add-suggestion-btn" 
                                data-name="${place.name}" 
                                data-cost="${place.estimatedCost}">Add</button>
                    </div>
                `;
                suggestionsContainer.appendChild(card);
            });
        }
        
        function generateSampleItinerary(cityData) {
            if (itineraryItems.length > 0 || !cityData || !cityData.places) {
                return;
            }
            
            const budgetPerDay = tripDetails.budget / tripDetails.duration;
            let dailyBudget = budgetPerDay;
            let dayCounter = 1;

            const affordablePlaces = cityData.places.filter(p => p.estimatedCost < (budgetPerDay * 0.4));
            
            for (let i = 0; i < affordablePlaces.length; i++) {
                if (dayCounter > tripDetails.duration) break;
                
                const place = affordablePlaces[i];
                if (dailyBudget >= place.estimatedCost) {
                    const itemDate = new Date(tripDetails.startDate);
                    itemDate.setDate(itemDate.getDate() + dayCounter - 1);

                    itineraryItems.push({
                        id: Date.now() + i,
                        place: place.name,
                        date: itemDate.toISOString().split('T')[0],
                        cost: place.estimatedCost,
                        notes: "Suggested activity."
                    });
                    dailyBudget -= place.estimatedCost;
                }

                if (i % 2 !== 0) { 
                    dayCounter++;
                    dailyBudget = budgetPerDay;
                }
            }
            renderItinerary();
        }

        // --- INITIALIZE THE PAGE ---
        tripTitle.textContent = `Your Trip to ${tripDetails.destination}`;

        // --- START: MODIFIED SECTION ---
        // Find the correct city data from the fetched JSON, ignoring case sensitivity.
        const cityKey = Object.keys(CITIES_DATA).find(k => k.toLowerCase() === tripDetails.destination.toLowerCase());
        const cityData = cityKey ? CITIES_DATA[cityKey] : null;
        // --- END: MODIFIED SECTION ---

        renderSuggestions(cityData);
        generateSampleItinerary(cityData);
        updateSummary();
        updateDaysProgress();

        // --- EVENT LISTENERS ---
        addItemBtn.addEventListener('click', handleAddItem);

        suggestionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-suggestion-btn')) {
                placeInput.value = e.target.dataset.name;
                costInput.value = e.target.dataset.cost;
                notesInput.focus();
            }
        });

        itineraryList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn')) {
                const itemId = e.target.dataset.id;
                if (confirm('Are you sure you want to remove this item?')) {
                    handleRemoveItem(itemId);
                }
            }
        });
    }

    // --- START: NEW FUNCTION TO FETCH DATA ---
    // This async function fetches and parses the data.json file.
    async function fetchCitiesData() {
        try {
            const response = await fetch('data.json');
            // Check if the request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Could not fetch city data:", error);
            return null; // Return null if there's an error
        }
    }
    // --- END: NEW FUNCTION TO FETCH DATA ---

    initializeApp(); // Call the main function to run the application
});