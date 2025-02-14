// Get DOM elements
const editButton = document.querySelector('.edit-button');
const editModal = document.getElementById('editProfileModal');
const editForm = document.getElementById('editProfileForm');
const cancelButton = document.querySelector('.cancel-button');
const profileName = document.querySelector('.profile-name');
const profileBio = document.querySelector('.profile-bio');

// Show modal when edit button is clicked
editButton.addEventListener('click', () => {
    // Pre-fill the form with current values
    document.getElementById('editName').value = profileName.textContent;
    document.getElementById('editBio').value = profileBio.textContent;
    editModal.style.display = 'block';
});

// Hide modal when cancel is clicked
cancelButton.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Handle form submission
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get new values
    const newName = document.getElementById('editName').value;
    const newBio = document.getElementById('editBio').value;
    
    // Update the profile content
    profileName.textContent = newName;
    profileBio.textContent = newBio;
    
    // Close the modal
    editModal.style.display = 'none';
    
    // In a real application, you would also send these changes to a server
    // saveToServer({ name: newName, bio: newBio });
});

// Close modal if clicking outside
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.style.display = 'none';
    }
});