document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    let userId = window.location.pathname.split('/').pop();
    const editButton = document.querySelector('.edit-profile-button');
    const editModal = document.getElementById('editProfileModal');
    const editForm = document.getElementById('editProfileForm');
    const cancelButton = document.getElementById('cancelProfileEdit');
    const profileName = document.querySelector('.profile-name');
    const profileBio = document.querySelector('.profile-bio');
    const avatarPreview = document.querySelector('.profile-picture');
    const editNameInput = document.getElementById('editName');
    const editBioInput = document.getElementById('editBio');
    const editAvatarInput = document.getElementById('editAvatar');

    // Debug elements
    console.log('Edit button found:', !!editButton);
    console.log('Modal found:', !!editModal);
    console.log('Form found:', !!editForm);
    console.log('Cancel button found:', !!cancelButton);

    // Check if elements exist before adding event listeners
    if (editButton && editModal && editForm) {
        // Show modal when edit button is clicked
        editButton.addEventListener('click', function() {
            console.log('Edit button clicked');
            // Pre-fill the form with current values
            editNameInput.value = profileName.textContent.trim();
            editBioInput.value = profileBio.textContent.trim();
            editModal.style.display = 'block';
        });

        // Hide modal when cancel button is clicked
        if (cancelButton) {
            cancelButton.addEventListener('click', function() {
                console.log('Cancel button clicked');
                editModal.style.display = 'none';
            });
        }
		
		document.querySelector('#editProfileModal .cancel-button').addEventListener('click', function() {
			document.getElementById('editProfileModal').style.display = 'none';
		});

        // Handle form submission
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Form submitted');

            // Get new values
            const newName = editNameInput.value.trim();
            const newBio = editBioInput.value.trim();
            const avatarFile = editAvatarInput.files[0]; // Get the uploaded file

            // Prepare form data
            const formData = new FormData();
            formData.append('name', newName);
            formData.append('bio', newBio);
            if (avatarFile) {
                formData.append('avatar', avatarFile);
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
                    // Reload page to show updates
                    window.location.reload();
                } else {
                    alert('Error updating profile: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Server error. Please try again.');
            }
        });

        // Close modal if clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === editModal) {
                editModal.style.display = 'none';
            }
        });
    } else {
        console.error("Edit profile button or modal not found. Check userProfile.hbs.");
    }
});