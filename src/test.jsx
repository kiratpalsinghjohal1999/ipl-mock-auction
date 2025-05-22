import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

function TeamView() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentBid, setCurrentBid] = useState(null);

  useEffect(() => {
    const unsubscribeTeams = onSnapshot(collection(db, 'Teams'), (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamList);
    });

    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const playerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playerList);
    });

    const unsubscribeBid = onSnapshot(doc(db, 'auction', 'currentBid'), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentBid(docSnap.data());
      }
    });

    return () => {
      unsubscribeTeams();
      unsubscribePlayers();
      unsubscribeBid();
    };
  }, []);

  const increaseBid = async (teamId, amount) => {
    if (!currentBid) return;
    const newBid = currentBid.currentBid + amount;
    await updateDoc(doc(db, 'auction', 'currentBid'), {
      currentBid: newBid,
      highestBidder: teamId
    });
  };

  const categorize = (list) => {
    return {
      batsmen: list.filter(p => p.type.toLowerCase() === 'batsman'),
      bowlers: list.filter(p => p.type.toLowerCase() === 'bowler'),
      allrounders: list.filter(p => p.type.toLowerCase().includes('all-rounder')),
    };
  };

  const unsoldPlayers = players.filter(p => !p.sold && p.bidded);
  const pendingPlayers = players.filter(p => !p.bidded);

  const colors = [
    { backgroundColor: '#d1e7dd', color: '#0f5132' },
    { backgroundColor: '#fff3cd', color: '#664d03' },
    { backgroundColor: '#f8d7da', color: '#842029' },
    { backgroundColor: '#fce4ec', color: '#880e4f' },
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <Link to="/">← Back to Auction Panel</Link>
      <h1 style={{ textAlign: 'center' }}>Team Overview</h1>

      {currentBid && (
        <div style={{ backgroundColor: '#e3f2fd', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Current Player on Bid: {currentBid.name} (${currentBid.currentBid})</h3>
          <p>Highest Bidder: {teams.find(t => t.id === currentBid.highestBidder)?.Owner || 'None'}</p>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {teams.map((team, index) => {
          const { batsmen, bowlers, allrounders } = categorize(team.players || []);
          const colorStyle = colors[index % colors.length];
          return (
            <div
              key={team.id}
              style={{
                ...colorStyle,
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                maxHeight: '320px',
                overflowY: 'auto'
              }}
            >
              <h2>{team.Owner}</h2>
              <p><strong>Remaining Purse:</strong> ${team.Purse?.toLocaleString() || 0}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '15px' }}>
                <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                  <h4>Batsmen</h4>
                  {batsmen.map((p, i) => (
                    <div key={i}>{p.name} (${p.basePrice})</div>
                  ))}
                </div>
                <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                  <h4>Bowlers</h4>
                  {bowlers.map((p, i) => (
                    <div key={i}>{p.name} (${p.basePrice})</div>
                  ))}
                </div>
                <div style={{ flex: 1, paddingLeft: '10px' }}>
                  <h4>All-rounders</h4>
                  {allrounders.map((p, i) => (
                    <div key={i}>{p.name} (${p.basePrice})</div>
                  ))}
                </div>
              </div>
              {currentBid && (
                <div style={{ marginTop: '10px' }}>
                  <h4>Bid on {currentBid.name}</h4>
                  {[1, 2, 5, 10, 15, 20, 25, 30, 40, 50].map(val => (
                    <button key={val} onClick={() => increaseBid(team.id, val)} style={{ margin: '3px', padding: '5px 10px' }}>+${val}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TeamView;
