// Matchmaking utility functions

export const findBestMatch = (myRating, queueUsers) => {
    if (!queueUsers || queueUsers.length === 0) return null;

    // Filter within 200 points
    const closeMatches = queueUsers.filter(u =>
        Math.abs(u.rating - myRating) <= 200
    );

    if (closeMatches.length > 0) {
        // Return closest match within threshold
        return closeMatches.reduce((closest, user) =>
            Math.abs(user.rating - myRating) < Math.abs(closest.rating - myRating)
                ? user : closest
        );
    }

    // No close matches, return absolute closest
    return queueUsers.reduce((closest, user) =>
        Math.abs(user.rating - myRating) < Math.abs(closest.rating - myRating)
            ? user : closest
    );
};

export const isHigherRated = (myRating, oppRating) => {
    return myRating >= oppRating;
};
