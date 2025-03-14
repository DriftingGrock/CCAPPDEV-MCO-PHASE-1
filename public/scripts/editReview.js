document.addEventListener('DOMContentLoaded', function() {
    // Initialize Quill editor
    const editQuill = new Quill('#edit-quill-editor', {
        theme: 'snow',
        placeholder: 'Edit your review...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });
    
    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-review-btn').forEach(button => {
        button.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-id');
            const title = this.getAttribute('data-title');
            const body = this.getAttribute('data-body');
            const rating = this.getAttribute('data-rating');
            
            // Populate the form
            document.getElementById('editReviewId').value = reviewId;
            document.getElementById('editTitle').value = title;
            editQuill.root.innerHTML = body;
            document.getElementById('editRating').value = rating;
            
            // Show the modal
            document.getElementById('editReviewModal').style.display = 'block';
        });
    });
    
    // Handle form submission
    document.getElementById('editReviewForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get values from form
        const reviewId = document.getElementById('editReviewId').value;
        const title = document.getElementById('editTitle').value;
        
        // Get and sanitize Quill content
        const quillContent = editQuill.root.innerHTML;
        const sanitizedContent = DOMPurify.sanitize(quillContent);
        
        // Get rating
        const rating = document.getElementById('editRating').value;
        
        try {
            const response = await fetch(`/edit-review/${reviewId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    body: sanitizedContent,
                    rating
                })
            });
            
            if (response.ok) {
                // Success, refresh the page
                location.reload();
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while updating the review');
        }
    });
    
    // Close modal when cancel button is clicked
    document.querySelector('#editReviewModal .cancel-button').addEventListener('click', function() {
        document.getElementById('editReviewModal').style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    
    // Handle delete buttons
    document.querySelectorAll('.delete-review-btn').forEach(button => {
        button.addEventListener('click', async function() {
            if (confirm('Are you sure you want to delete this review?')) {
                const reviewId = this.getAttribute('data-id');
                
                try {
                    const response = await fetch(`/delete-review/${reviewId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        // Success, refresh the page
                        location.reload();
                    } else {
                        const errorData = await response.json();
                        alert(`Error: ${errorData.error}`);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('An error occurred while deleting the review');
                }
            }
        });
    });
});