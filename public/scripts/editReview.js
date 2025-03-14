document.addEventListener("DOMContentLoaded", function () {
    const editReviewModal = document.getElementById("editReviewModal");
    const editReviewForm = document.getElementById("editReviewForm");
    const editReviewId = document.getElementById("editReviewId");
    const editTitle = document.getElementById("editTitle");
    const editReviewText = document.getElementById("editReviewText");
    const editRating = document.getElementById("editRating");
    const cancelReviewButton = editReviewModal?.querySelector(".cancel-button");

    if (!editReviewModal || !editReviewForm) {
        console.error("Edit Review modal or form not found. Make sure it's included in userProfile.hbs.");
        return;
    }

    // Open Edit Review Modal
    document.querySelectorAll(".edit-review-btn").forEach(button => {
        button.addEventListener("click", function () {
            editReviewId.value = button.dataset.id;
            editTitle.value = button.dataset.title;
            editReviewText.value = button.dataset.body;
            editRating.value = button.dataset.rating;
            editReviewModal.style.display = "block";
        });
    });

    // Close Edit Review Modal when clicking Cancel
    if (cancelReviewButton) {
        cancelReviewButton.addEventListener("click", function () {
            editReviewModal.style.display = "none";
        });
    }

    // Close modal when clicking outside
    window.addEventListener("click", function (event) {
        if (event.target === editReviewModal) {
            editReviewModal.style.display = "none";
        }
    });

    // Handle Edit Review Submission
    editReviewForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const reviewId = editReviewId.value;

        const response = await fetch(`/edit-review/${reviewId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: editTitle.value,
                body: editReviewText.value,
                rating: editRating.value
            })
        });

        if (response.ok) {
            const updatedReview = await response.json();
            const reviewContainer = document.querySelector(`.edit-review-btn[data-id="${reviewId}"]`)?.closest(".review-container");

            if (reviewContainer) {
                reviewContainer.querySelector(".heading").textContent = updatedReview.title;
                reviewContainer.querySelector(".description").textContent = updatedReview.body;
                reviewContainer.querySelector(".star-rating").innerHTML = `<img class="star-icon-review" src="/icons/star.png" alt="star icon"> ${updatedReview.rating}`;

                if (!reviewContainer.querySelector(".edit-tag")) {
                    const editTag = document.createElement("div");
                    editTag.className = "edit-tag";
                    editTag.textContent = "edited";
                    reviewContainer.appendChild(editTag);
                }
            }

            editReviewModal.style.display = "none"; // Close modal
        } else {
            alert("Error updating review.");
        }
    });

    // Handle Delete Review
    document.querySelectorAll(".delete-review-btn").forEach(button => {
        button.addEventListener("click", async function () {
            const reviewId = button.dataset.id;
            if (!confirm("Are you sure you want to delete this review?")) return;

            const response = await fetch(`/delete-review/${reviewId}`, { method: "DELETE" });

            if (response.ok) {
                document.querySelector(`.delete-review-btn[data-id="${reviewId}"]`)?.closest(".review-container").remove();
            } else {
                alert("Error deleting review.");
            }
        });
    });
});
