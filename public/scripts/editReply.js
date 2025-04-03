document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.edit-reply-btn').forEach(button => {
        button.addEventListener('click', function() {
            const replyId = this.getAttribute('data-id');
            const replyBody = this.getAttribute('data-body');
            console.log(replyBody); // Debugging: Ensure the reply body is correct

            // Populate the edit modal with the reply data
            document.getElementById('editReplyId').value = replyId;
            quillEditReply.root.innerHTML = replyBody; // Populate Quill editor with the reply body

            // Show the edit modal
            document.getElementById('editReplyModal').style.display = 'block';
        });
    });

    // Handle Delete Reply Button
    document.querySelectorAll('.delete-reply-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const replyId = this.getAttribute('data-id');

            if (confirm('Are you sure you want to delete this reply?')) {
                try {
                    const response = await fetch(`/delete-reply/${replyId}`, {
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
                    alert('An error occurred while deleting the reply');
                }
            }
        });
    });
});

// Initialize Quill Editor for Edit Reply Modal
const quillEditReply = new Quill('#quill-edit-reply-editor', {
    theme: 'snow',
    placeholder: 'Edit your reply...',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    }
});

// Handle Edit Reply Form Submission
document.getElementById('editReplyForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const replyId = document.getElementById('editReplyId').value;
    const sanitizedContent = DOMPurify.sanitize(quillEditReply.root.innerHTML);
    
    // Set the hidden input value (this was missing)
    document.getElementById('editReplyBody').value = sanitizedContent;

    try {
        const response = await fetch(`/edit-reply/${replyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: sanitizedContent
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
        alert('An error occurred while updating the reply');
    }
});

// Close Edit Reply Modal
function closeEditReplyModal() {
    document.getElementById('editReplyModal').style.display = 'none';
}