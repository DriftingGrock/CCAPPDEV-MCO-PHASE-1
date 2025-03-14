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
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get new values
    const newName = document.getElementById('editName').value;
    const newBio = document.getElementById('editBio').value;
    const avatarFile = document.getElementById('editAvatar').files[0]; // Get the uploaded file

    // Prepare form data
    const formData = new FormData();
    formData.append('name', newName);
    formData.append('bio', newBio);
    if (avatarFile) {
        formData.append('avatar', avatarFile); // Attach the avatar file if selected
    }

    // Send data to the server
    try {
        const response = await fetch(`/userProfile/${userId}/edit`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            // Update the UI
            profileName.textContent = newName;
            profileBio.textContent = newBio;
            if (result.avatarUrl) {
                document.querySelector('.profile-picture').style.backgroundImage = `url('${result.avatarUrl}')`;
            }
            alert('Profile updated successfully!');
            editModal.style.display = 'none';
        } else {
            alert('Error updating profile: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Server error. Please try again.');
    }
});


// Close modal if clicking outside
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.style.display = 'none';
    }
});