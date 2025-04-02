function handleVote(reviewId, voteType) {
    if (!window.isLoggedIn) {
        document.getElementById('profileModal').style.display = 'flex';
        return;
    }

    // Disable all related vote buttons to prevent multiple clicks
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

                if (upvoteBtn) upvoteBtn.classList.remove('active');
                if (downvoteBtn) downvoteBtn.classList.remove('active');

                if (data.userVote === 'up' && upvoteBtn) {
                    upvoteBtn.classList.add('active');
                    console.log("Set upvote to active!");
                } else if (data.userVote === 'down' && downvoteBtn) {
                    downvoteBtn.classList.add('active');
                    console.log("Set downvote to active!");
                }
            }

            // Log the current state
            console.log(`Vote updated for review ${reviewId}: ${data.userVote}`);
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
}
