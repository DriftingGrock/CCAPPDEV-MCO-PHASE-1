// Get DOM elements
let userId;
const editButton = document.querySelector('.edit-button');
const editModal = document.getElementById('editProfileModal'); // Make sure this exists in userProfile.hbs
const editForm = document.getElementById('editProfileForm');
const cancelButton = document.querySelector('#cancelProfileEdit');
const profileName = document.querySelector('.profile-name');
const profileBio = document.querySelector('.profile-bio');
const avatarPreview = document.querySelector('.profile-picture'); // To update avatar
const editNameInput = document.getElementById('editName');
const editBioInput = document.getElementById('editBio');
const editAvatarInput = document.getElementById('editAvatar');

// Ensure we get the user ID from URL or profile data
userId = window.location.pathname.split('/').pop();

// Check if edit modal exists before adding event listeners
if (editButton && editModal && editForm) {
    // Show modal when edit button is clicked
    editButton.addEventListener('click', () => {
        // Pre-fill the form with current values
        editNameInput.value = profileName.textContent.trim();
        editBioInput.value = profileBio.textContent.trim();
        editModal.style.display = 'block';
    });

    // Hide modal when cancel button is clicked
    cancelButton.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // Handle form submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get new values
        const newName = editNameInput.value.trim();
        const newBio = editBioInput.value.trim();
        const avatarFile = editAvatarInput.files[0]; // Get the uploaded file

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
                    avatarPreview.style.backgroundImage = `url('${result.avatarUrl}')`;
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
} else {
    console.error("Edit profile button or modal not found. Check userProfile.hbs.");
}
