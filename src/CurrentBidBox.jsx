// CurrentBidBox.jsx
import React from 'react';

function CurrentBidBox({ currentBid, teams }) {
  const isInactive =
    !currentBid ||
    !currentBid.playerId || // ⬅ ensures meaningful bid info
    currentBid.playerId === '';

  return (
    <div style={{ backgroundColor: '#ffdddd', border: '1px solid red', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
      {isInactive ? (
        <h2 style={{ margin: 0 }}>No bidding at the moment</h2>
      ) : (
        <>
          <h2>Currently Bidding:</h2>
          <p><strong>Player:</strong> {currentBid.name} ({currentBid.type})</p>
          <p><strong>Current Bid:</strong> ${currentBid.currentBid}</p>
          <p><strong>Highest Bidder:</strong> {teams.find(t => t.id === currentBid.highestBidder)?.Owner || 'No Team'}</p>
        </>
      )}
    </div>
  );
}


export default CurrentBidBox;


{/* <div style={{ backgroundColor: '#ffdddd', border: '1px solid red', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        {currentBid ? (
          <>
            <h2>Currently Bidding:</h2>
            <p><strong>Player:</strong> {currentBid.name} ({currentBid.type})</p>
            <p><strong>Current Bid:</strong> ${currentBid.currentBid}</p>
            <p><strong>Highest Bidder:</strong> {teams.find(t => t.id === currentBid.highestBidder)?.Owner || 'No Team'}</p>
          </>
        ) : (
          <h2 style={{ margin: 0 }}>No bidding at the moment</h2>
        )}
      </div> */}
