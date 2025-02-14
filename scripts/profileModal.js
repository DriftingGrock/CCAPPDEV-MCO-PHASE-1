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
