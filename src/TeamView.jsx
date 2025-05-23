import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import CurrentBidBox from './CurrentBidBox';


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
  } else {
    setCurrentBid(null);
  }
    });


    return () => {
      unsubscribeTeams();
      unsubscribePlayers();
      unsubscribeBid();
    };
  }, []);

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
    { backgroundColor: '#d1e7dd', color: '#000000' },
    { backgroundColor: '#fff3cd', color: '#000000' },
    { backgroundColor: '#f8d7da', color: '#000000' },
    { backgroundColor: '#e8c9ff', color: '#000000' },
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <Link to="/">← Back to Auction Panel</Link>

      <CurrentBidBox currentBid={currentBid} teams={teams} />

      <h1 style={{ textAlign: 'center' }}>Team Overview</h1>

      

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
                maxHeight: '350px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <h2>{team.Owner}</h2>
              <p><strong>Remaining Purse:</strong> ${team.Purse?.toLocaleString() || 0}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '15px', flexGrow: 1 }}>
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
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2>Pending Players</h2>
        {(() => {
          const { batsmen, bowlers, allrounders } = categorize(pendingPlayers);
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Batsmen</h4>
                {batsmen.map(p => (
                  <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>
                ))}
              </div>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Bowlers</h4>
                {bowlers.map(p => (
                  <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>
                ))}
              </div>
              <div style={{ flex: 1, paddingLeft: '10px' }}>
                <h4>All-rounders</h4>
                {allrounders.map(p => (
                  <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>
                ))}
              </div>
            </div>
          );
        })()}

        <h2 style={{ marginTop: '30px' }}>Unsold Players</h2>
        {(() => {
          const { batsmen, bowlers, allrounders } = categorize(unsoldPlayers);
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Batsmen</h4>
                {batsmen.map(p => (
                  <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>
                ))}
              </div>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Bowlers</h4>
                {bowlers.map(p => (
                  <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>
                ))}
              </div>
              <div style={{ flex: 1, paddingLeft: '10px' }}>
                <h4>All-rounders</h4>
                {allrounders.map(p => (
                  <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default TeamView;
