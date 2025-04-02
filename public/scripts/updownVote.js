function handleVote(reviewId, voteType) {
    if (!window.isLoggedIn) {
        document.getElementById('profileModal').style.display = 'flex';
        return;
    }

    fetch('/api/vote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            reviewId,
            voteType,
            userId: window.currentUserId  // Include userId from session
        }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Vote recorded" ||
                data.message === "Vote updated" ||
                data.message === "Vote removed") {
                location.reload();
            }
        })
        .catch(error => console.error('Error:', error));
}