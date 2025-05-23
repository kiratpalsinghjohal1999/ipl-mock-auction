import { useEffect, useState } from 'react';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { useParams, Link } from 'react-router-dom';
import CurrentBidBox from './CurrentBidBox';
import AnnouncementBanner from './AnnouncementBanner';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';
import Footer from './Footer';

function TeamPage() {
  const { owner } = useParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentBid, setCurrentBid] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const { width, height } = useWindowSize(); // ✅ This is now inside the component
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
    const fetchPassword = async () => {
      const snapshot = await getDocs(collection(db, 'Teams'));
      const matchingTeam = snapshot.docs.find(doc =>
        doc.data().Owner?.toLowerCase() === owner.toLowerCase()
      );
      if (matchingTeam) {
        setStoredPassword(matchingTeam.data().password || '');
      }
    };
    const alreadyLoggedIn = sessionStorage.getItem(`auth-${owner.toLowerCase()}`) === 'true';
    if (alreadyLoggedIn) {
      setAuthenticated(true);
    }
    fetchPassword();
  }, [owner]);

  useEffect(() => {
    const unsubscribeTeams = onSnapshot(collection(db, 'Teams'), (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamList);
    });
    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const playerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        const type = p.type?.toLowerCase() || '';
        return type.includes('batsman') && !type.includes('all-rounder');
      }),
      bowlers: list.filter(p => {
        const type = p.type?.toLowerCase() || '';
        return type.includes('bowler') && !type.includes('all-rounder');
      }),
      allrounders: list.filter(p => {
        const type = p.type?.toLowerCase() || '';
        return type.includes('all-rounder') || type.includes('batting all-rounder') || type.includes('bowling all-rounder');
      }),
    };
  };

  const team = teams.find(t => t.Owner?.toLowerCase() === owner?.toLowerCase());
  const { batsmen, bowlers, allrounders } = categorize(team?.players || []);
  const unsoldPlayers = players.filter(p => !p.sold && p.bidded);
  const pendingPlayers = players.filter(p => !p.bidded);

  const incrementBid = async (amount) => {
  if (!currentBid || !team?.id) return;
  const newBid = currentBid.currentBid + amount;
  const playerId = currentBid.playerId;

  await updateDoc(doc(db, 'auction', 'currentBid'), {
    currentBid: newBid,
    highestBidder: team.id,
    playerId: playerId,
    name: currentBid.name,
    type: currentBid.type
  });

  // Show announcement
  await setDoc(doc(db, 'auction', 'announcement'), {
  text: `${team.Owner} increased the bid to $${newBid} for ${currentBid.name}`
});

};


  const finalizeBid = async () => {
    if (!currentBid) return;
    const playerId = currentBid.playerId;
    const highestBidderId = currentBid.highestBidder;
    const finalPrice = currentBid.currentBid;
    const teamRef = doc(db, 'Teams', highestBidderId);
    const teamSnap = await getDoc(teamRef);
    const teamData = teamSnap.data();
    if (!teamData || teamData.Purse < finalPrice) {
      alert("Team does not have enough purse or team not found.");
      return;
    }
    await updateDoc(teamRef, {
      Purse: teamData.Purse - finalPrice,
      players: [...(teamData.players || []), {
        name: currentBid.name,
        basePrice: finalPrice,
        type: currentBid.type
      }]
    });
    await updateDoc(doc(db, 'players', playerId), {
      sold: true,
      bidded: true
    });
    await updateDoc(doc(db, 'auction', 'currentBid'), {
      currentBid: 0,
      highestBidder: '',
      name: '',
      type: '',
      playerId: ''
    });
    alert(`Player ${currentBid.name} sold to ${teamData.Owner} for $${finalPrice}`);
  };

  if (!authenticated) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Enter Team Password</h2>
        <input
          type="password"
          placeholder="Password"
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
        <br /><br />
        <button
          onClick={() => {
            if (passwordInput === storedPassword) {
              setAuthenticated(true);
              sessionStorage.setItem(`auth-${owner.toLowerCase()}`, 'true');
            } else {
              alert('Incorrect password.');
            }
          }}
        >
          Enter
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <Footer/>

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

<div style={{ marginTop: '10px',padding: '10px' }}> <Link  to="/teams">← Back to Team Overview</Link></div>
     
      <h1 style={{ textAlign: 'center' }}>Team: {team?.Owner}</h1>

      <CurrentBidBox currentBid={currentBid} teams={teams} />

      {currentBid?.playerId && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {(() => {
            const bid = currentBid?.currentBid || 0;
            const maxAllowed = team?.Purse || 0;
            const increments = bid < 25 ? [5] : [2, 3, 4, 5];

            return increments.map(amount => {
              const notEnough = (bid + amount) > maxAllowed;
              return (
                <button
                  key={amount}
                  onClick={() => {
                    if (notEnough) {
                      alert("Not enough purse to place this bid.");
                      return;
                    }
                    incrementBid(amount);
                  }}
                  style={{
                    padding: '10px',
                    minWidth: '40px',
                    fontSize: '16px',
                    opacity: notEnough ? 0.5 : 1,
                    cursor: notEnough ? 'not-allowed' : 'pointer'
                  }}
                >
                  +{amount}
                </button>
              );
            });
          })()}
        </div>
      )}

      <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '8px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
        <p>
          <strong>Remaining Purse:</strong> ${team?.Purse?.toLocaleString() || 0}
          {team?.extraCredits ? (
            <span style={{ color: 'green', fontSize: '14px' }}> (includes +${team.extraCredits} credits)</span>
          ) : null}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '15px' }}>
          <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
            <h4>Batsmen</h4>
            {batsmen.map((p, i) => <div key={i}>{p.name} (${p.basePrice})</div>)}
          </div>
          <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
            <h4>Bowlers</h4>
            {bowlers.map((p, i) => <div key={i}>{p.name} (${p.basePrice})</div>)}
          </div>
          <div style={{ flex: 1, paddingRight: '10px' }}>
            <h4>All-rounders</h4>
            {allrounders.map((p, i) => <div key={i}>{p.name} (${p.basePrice})</div>)}
          </div>
        </div>
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

        <h2 style={{ marginTop: '30px' }}>Unsold Players</h2>
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

    ///////

          

    //////

    
  );
}

export default TeamPage;
