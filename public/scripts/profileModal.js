/*
let profileModal = document.getElementById("profileModal");
let profileBtn = document.getElementById("profileBtn");

profileBtn.onclick = function() {
    // Show the modal when profile button is clicked
    profileModal.style.display = "flex";
}

window.onclick = function(event) {
    // Hide the modal if the click is outside of it
    if (event.target === profileModal) {
        profileModal.style.display = "none";
    }
}
*/

// Replace the content of CCAPPDEV-MCO-PHASE-1/public/scripts/profileModal.js with this:

const profileModal = document.getElementById("profileModal");
const profileBtn = document.getElementById("profileBtn");
const loginBtn = document.getElementById("loginBtn"); // Get login button
const usernameInput = document.getElementById("username"); // Get username input
const passwordInput = document.getElementById("password"); // Get password input
const loginForm = document.getElementById('loginForm'); // Get the form itself

// --- Function to show the modal ---
if (profileBtn) { // Check if the button exists (it might not on all pages)
    profileBtn.onclick = function() {
        profileModal.style.display = "flex";
        // Clear previous error messages if any
        const errorP = profileModal.querySelector('.error-message');
        if (errorP) {
            errorP.remove();
        }
        // Clear input fields
        if(usernameInput) usernameInput.value = '';
        if(passwordInput) passwordInput.value = '';
    }
}


// --- Function to hide the modal on outside click ---
window.onclick = function(event) {
    if (event.target === profileModal) {
        profileModal.style.display = "none";
    }
}

// --- Function to handle login button click ---
// Check if the login button exists before adding listener
if (loginBtn) {
    loginBtn.onclick = async function() { // Changed from form submit to button click
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value.trim() : '';

        // Clear previous errors
        clearError();

        // Basic validation
        if (!username || !password) {
            displayError("Please enter both username and password.");
            return;
        }

        try {
            const response = await fetch('/login', { // Target the POST /login route
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }), // Send as JSON
            });

            const result = await response.json(); // Expect JSON response

            if (result.success) {
                // Login successful - redirect to user profile
                // Redirect to the user's profile page
                 window.location.href = `/userProfile/${result.userId}`;
            } else {
                // Login failed - display error message
                displayError(result.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login Fetch Error:', error);
            displayError('An error occurred during login. Please try again later.');
        }
    };
}


// --- Helper function to display errors in the modal ---
function displayError(message) {
    clearError(); // Clear existing error first

    const errorP = document.createElement('p');
    errorP.textContent = message;
    errorP.style.color = 'red';
    errorP.style.marginTop = '10px';
    errorP.style.textAlign = 'center'; // Center the error
    errorP.classList.add('error-message');

    // Insert error message before the login button
    const modalContent = profileModal.querySelector('.modal-content');
    if (modalContent && loginBtn) {
         modalContent.insertBefore(errorP, loginBtn);
    } else if (modalContent) {
         modalContent.appendChild(errorP); // Fallback append if button not found
    }
}

// --- Helper function to clear error messages ---
function clearError() {
    const existingError = profileModal.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
}