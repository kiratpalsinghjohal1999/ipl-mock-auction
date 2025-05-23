import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc,setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import CurrentBidBox from './CurrentBidBox';
import AnnouncementBanner from './AnnouncementBanner';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';




function TeamView() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentBid, setCurrentBid] = useState(null);
  const [width, height] = useWindowSize();
  const [announcement, setAnnouncement] = useState('');
const [showAnnouncement, setShowAnnouncement] = useState(false);
const [showConfetti, setShowConfetti] = useState(false);

useEffect(() => {
  const unsubscribe = onSnapshot(doc(db, 'auction', 'announcement'), (docSnap) => {
    if (docSnap.exists()) {
      const msg = docSnap.data().text || '';
      if (msg) {
        setAnnouncement(msg);
        setShowAnnouncement(true);
          // Show confetti only if it's a 'was sold' message
        if (msg.includes("was sold")) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3500);
        }

        // Auto-hide and clear from Firestore after 5 seconds
        setTimeout(async () => {
          setShowAnnouncement(false);
          await setDoc(doc(db, 'auction', 'announcement'), { text: '' }); // Clear message in DB
        }, 4000);
      }
    }
  });

  return () => unsubscribe();
}, []);




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
    batsmen: list.filter(p => {
      const type = p.type.toLowerCase();
      return type.includes('batsman') && !type.includes('all-rounder');
    }),
    bowlers: list.filter(p => {
      const type = p.type.toLowerCase();
      return type.includes('bowler') && !type.includes('all-rounder');
    }),
    allrounders: list.filter(p => {
      const type = p.type.toLowerCase();
      return (
        type.includes('all-rounder') ||
        type.includes('batting all-rounder') ||
        type.includes('bowling all-rounder')
      );
    }),
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


      {showConfetti && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 99999, // highest layer
      pointerEvents: 'none'
    }}
  >
    <Confetti width={width} height={height} numberOfPieces={300} />
  </div>
)}


    <AnnouncementBanner
      message={announcement}
      visible={showAnnouncement}
      onHide={() => setShowAnnouncement(false)}
    />
    {showAnnouncement && announcement.includes("was sold") && (
  <Confetti width={width} height={height} numberOfPieces={300} />
)}


    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
    
    

      <CurrentBidBox currentBid={currentBid} teams={teams} />

      <h1 style={{ textAlign: 'center' }}>BPL 3.0 Auction 2025</h1>

      

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
              <h2><Link to={`/team/${encodeURIComponent(team.Owner)}`} style={{ textDecoration: 'none', color: 'inherit' }}>{team.Owner}</Link>
              </h2>

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
        <h2 style={{  color:'Red' }}>Upcoming Players </h2>
        {(() => {
          const { batsmen, bowlers, allrounders } = categorize(pendingPlayers);
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Batsmen</h4>
                {batsmen.map(p => (
                  <div key={p.id}>
  <strong>{p.name}</strong> (${p.basePrice})
  {p.type?.toLowerCase().includes('wicket-keeper') && (
    <span style={{ color: '#555', fontStyle: 'italic' }}> - {p.type}</span>
  )}
</div>


                ))}
              </div>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Bowlers</h4>
                {bowlers.map(p => (
                  <div key={p.id}>
  <strong>{p.name}</strong> (${p.basePrice})
  {p.type?.toLowerCase().includes('wicket-keeper') && (
    <span style={{ color: '#555', fontStyle: 'italic' }}> - {p.type}</span>
  )}
</div>


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
        <h2 style={{  marginTop: '30px',color:'#FFA500' }}>Unsold Players</h2>
      
        {(() => {
          const { batsmen, bowlers, allrounders } = categorize(unsoldPlayers);
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Batsmen</h4>
                {batsmen.map(p => (
                  <div key={p.id}>
  <strong>{p.name}</strong> (${p.basePrice})
  {p.type?.toLowerCase().includes('wicket-keeper') && (
    <span style={{ color: '#555', fontStyle: 'italic' }}> - {p.type}</span>
  )}
</div>


                ))}
              </div>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Bowlers</h4>
                {bowlers.map(p => (
                  <div key={p.id}>
  <strong>{p.name}</strong> (${p.basePrice})
  {p.type?.toLowerCase().includes('wicket-keeper') && (
    <span style={{ color: '#555', fontStyle: 'italic' }}> - {p.type}</span>
  )}
</div>


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
    </div>
  );
}

export default TeamView;
