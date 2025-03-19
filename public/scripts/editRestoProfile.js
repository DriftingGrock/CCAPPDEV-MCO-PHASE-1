// Get DOM elements
const editButton = document.querySelector('.edit-resto-button');
const editModal = document.getElementById('editRestoProfileModal');
const editForm = document.getElementById('editRestoProfileForm');
const cancelButton = document.querySelector('#editRestoProfileModal .cancel-button');
const restoName = document.querySelector('.resto-name');
const restoDescription = document.querySelector('.establishment-desc');

// Show modal when edit button is clicked
editButton.addEventListener('click', () => {
    // Pre-fill the form with current values
    document.getElementById('editRestoName').value = restoName.textContent.trim();
    document.getElementById('editRestoDescription').value = restoDescription.textContent.trim();
    editModal.style.display = 'block';
});

// Hide modal when cancel is clicked
cancelButton.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Handle form submission
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get the establishment ID from the hidden input
    const establishmentId = document.getElementById('establishmentId').value;
    
    // Get new values
    const newName = document.getElementById('editRestoName').value;
    const newDescription = document.getElementById('editRestoDescription').value;
    const bannerFile = document.getElementById('editRestoBanner').files[0]; // Get the uploaded banner file

    // Prepare form data
    const formData = new FormData();
    formData.append('name', newName);
    formData.append('description', newDescription);
    if (bannerFile) {
        formData.append('banner', bannerFile); // Attach the banner file if selected
    }

    // Send data to the server
    try {
        const response = await fetch(`/restoProfile/${establishmentId}/edit`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            // Update the UI
            restoName.textContent = newName;
            restoDescription.textContent = newDescription;
            if (result.bannerUrl) {
                document.querySelector('.resto-banner').style.backgroundImage = `url('${result.bannerUrl}')`;
            }
            alert('Restaurant profile updated successfully!');
            editModal.style.display = 'none';
        } else {
            alert('Error updating restaurant profile: ' + result.message);
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