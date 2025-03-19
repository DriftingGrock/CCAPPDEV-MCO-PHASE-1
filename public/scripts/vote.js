function voteOwnerResponse(reviewId, voteType) {
    fetch('/api/vote-owner-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, userId: currentUserId, voteType })
    })
        .then(response => response.json())
        .then(data => {
            document.querySelector(`[data-review-id="${reviewId}"] .upvote-count`).innerText = data.upvotes;
            document.querySelector(`[data-review-id="${reviewId}"] .downvote-count`).innerText = data.downvotes;
        })
        .catch(error => console.error('Error:', error));
}