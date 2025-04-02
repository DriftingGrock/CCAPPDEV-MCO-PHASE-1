function handleVote(reviewId, voteType) {
    if (!window.isLoggedIn) {
        document.getElementById('profileModal').style.display = 'flex';
        return;
    }

    const buttons = document.querySelectorAll(`.review-container[data-review-id="${reviewId}"] .upvote, .review-container[data-review-id="${reviewId}"] .downvote`);
    buttons.forEach(button => button.disabled = true);

    fetch('/api/vote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            reviewId,
            voteType,
            userId: window.currentUserId
        }),
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update counts and active states
                const reviewContainer = document.querySelector(`.review-container[data-review-id="${reviewId}"]`);
                if (reviewContainer) {
                    // Update vote counts
                    const upvoteCountEl = reviewContainer.querySelector('.upvote-count');
                    const downvoteCountEl = reviewContainer.querySelector('.downvote-count');

                    if (upvoteCountEl) upvoteCountEl.textContent = data.upvoteCount || 0;
                    if (downvoteCountEl) downvoteCountEl.textContent = data.downvoteCount || 0;

                    // Update active states
                    const upvoteBtn = reviewContainer.querySelector('.upvote');
                    const downvoteBtn = reviewContainer.querySelector('.downvote');

                    upvoteBtn.classList.remove('active');
                    downvoteBtn.classList.remove('active');

                    if (data.userVote === 'up') {
                        upvoteBtn.classList.add('active');
                    } else if (data.userVote === 'down') {
                        downvoteBtn.classList.add('active');
                    }
                }
            } else {
                console.error('Vote failed:', data.message);
                alert('Vote failed: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while processing your vote.');
        })
        .finally(() => {
            buttons.forEach(button => button.disabled = false);
        });
		
		// Add this to the bottom of public/scripts/updownVote.js
		if (typeof io !== 'undefined') {
			const socket = io();
			
			socket.on('voteUpdated', (data) => {
				// Refresh vote counts for the specific review if it's on the page
				const reviewContainer = document.querySelector(`.review-container[data-review-id="${data.reviewId}"]`);
				if (reviewContainer) {
					// This provides a real-time update without full page refresh
					// Could fetch updated counts via AJAX or just reload the page
					// For simplicity, we'll just reload the container
					location.reload();
				}
			});
		}
}