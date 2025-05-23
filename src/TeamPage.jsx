import { useEffect, useState } from 'react';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { useParams, Link } from 'react-router-dom';
import CurrentBidBox from './CurrentBidBox';

function TeamPage() {
  const { owner } = useParams();

  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentBid, setCurrentBid] = useState(null);

  // Fetch stored password
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

  // Real-time listeners
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

  // Show password prompt if not authenticated
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
      <Link to="/teams">← Back to Team Overview</Link>
      <h1 style={{ textAlign: 'center' }}>Your Team: {team?.Owner}</h1>

      <CurrentBidBox currentBid={currentBid} teams={teams} />

      {/* Bid Buttons */}
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

      {/* Team Roster & Purse Info */}
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

      {/* Pending & Unsold */}
      <div style={{ marginTop: '40px' }}>
        <h2>Pending Players</h2>
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
          {pendingPlayers.map(p => <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>)}
        </div>

        <h2>Unsold Players</h2>
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
          {unsoldPlayers.map(p => <div key={p.id}><strong>{p.name}</strong> (${p.basePrice})</div>)}
        </div>
      </div>
    </div>
  );
}

export default TeamPage;
