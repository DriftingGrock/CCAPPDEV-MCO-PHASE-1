// Function to open the reply modal
function openReplyModal(reviewId) {
    console.log('Opening reply modal for review:', reviewId); // Debugging
    document.getElementById('reviewId').value = reviewId;
    document.getElementById('replyModal').style.display = 'block';
}

// Function to close the reply modal
function closeReplyModal() {
    console.log('Closing reply modal'); // Debugging
    document.getElementById('replyModal').style.display = 'none';
}

// Handle form submission for replying to a review
document.getElementById('replyForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const reviewId = document.getElementById('reviewId').value;
    const quillContent = quillReply.root.innerHTML; // Get HTML content from Quill editor
    const sanitizedContent = DOMPurify.sanitize(quillContent); // Sanitize the content
    const body = sanitizedContent;

    try {
        const response = await fetch(`/api/reviews/${reviewId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ body }),
        });

        if (response.ok) {
            alert('Reply submitted successfully!');
            location.reload();
        } else {
            alert('Failed to submit reply.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});