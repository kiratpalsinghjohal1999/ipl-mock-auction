import { useEffect, useState } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
  arrayUnion,
  getDocs
} from 'firebase/firestore';
import { Link } from 'react-router-dom';

function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const correctPassword = 'auction123';

  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', basePrice: '', type: '' });
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const playerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playerList);
    });

    const unsubscribeTeams = onSnapshot(collection(db, 'Teams'), (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamList);
    });

    return () => {
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, []);

  const handleAddPlayer = async () => {
    try {
      await addDoc(collection(db, 'players'), {
        name: newPlayer.name,
        basePrice: Number(newPlayer.basePrice),
        sold: false,
        bidded: false,
        type: newPlayer.type
      });
      setNewPlayer({ name: '', basePrice: '', type: '' });
      alert('Player added!');
    } catch (error) {
      console.error("Error adding player:", error);
    }
  };

  const assignPlayerToTeam = async () => {
    try {
      if (!selectedPlayerId || !selectedTeamId || !bidAmount) {
        alert("Select a player, team, and enter bid amount.");
        return;
      }

      const player = players.find(p => p.id === selectedPlayerId);
      if (!player) {
        alert("Player not found.");
        return;
      }

      const bid = Number(bidAmount);
      const teamRef = doc(db, 'Teams', selectedTeamId);
      const teamSnap = await getDoc(teamRef);

      if (!teamSnap.exists()) {
        alert("Team not found!");
        return;
      }

      const team = teamSnap.data();
      const remainingPurse = team.Purse - bid;
      if (remainingPurse < 0) {
        alert("Not enough purse!");
        return;
      }

      await updateDoc(teamRef, {
        Purse: remainingPurse,
        players: arrayUnion({ name: player.name, basePrice: bid, type: player.type })
      });
      await updateDoc(doc(db, 'players', player.id), { sold: true, bidded: true });

      alert(`Assigned ${player.name} to ${team.Owner} for $${bid}`);
      setSelectedPlayerId('');
      setSelectedTeamId('');
      setBidAmount('');
    } catch (error) {
      console.error("Error assigning player:", error);
    }
  };

  const resetSelection = () => {
    setSelectedPlayerId('');
    setSelectedTeamId('');
    setBidAmount('');
  };

  const undoSold = async () => {
    if (!selectedPlayerId) {
      alert("Select a player to undo.");
      return;
    }
    try {
      const player = players.find(p => p.id === selectedPlayerId);
      if (!player) {
        alert("Player not found.");
        return;
      }

      let updatedTeamId = null;
      let updatedPlayer = null;

      for (const team of teams) {
        const matchedPlayer = (team.players || []).find(p => p.name === player.name);
        if (matchedPlayer) {
          updatedTeamId = team.id;
          updatedPlayer = matchedPlayer;
          break;
        }
      }

      if (!updatedTeamId || !updatedPlayer) {
        alert("Player not found in any team roster.");
        return;
      }

      const teamRef = doc(db, 'Teams', updatedTeamId);
      const teamSnap = await getDoc(teamRef);
      const team = teamSnap.data();

      const updatedPlayerList = (team.players || []).filter(p => p.name !== player.name);
      const refundedPurse = team.Purse + updatedPlayer.basePrice;

      await updateDoc(teamRef, {
        Purse: refundedPurse,
        players: updatedPlayerList
      });

      await updateDoc(doc(db, 'players', player.id), {
        sold: false,
        bidded: false
      });

      alert("Player moved to pending and removed from team.");
    } catch (error) {
      console.error("Error undoing sold status:", error);
    }
  };

  const markPlayerAsUnsold = async () => {
    if (!selectedPlayerId) {
      alert("Select a player to mark as unsold.");
      return;
    }
    try {
      await updateDoc(doc(db, 'players', selectedPlayerId), {
        sold: false,
        bidded: true
      });
      alert("Player marked as unsold.");
    } catch (error) {
      console.error("Error marking player as unsold:", error);
    }
  };

  const resetAuction = async () => {
    const confirm1 = window.confirm("Are you sure you want to reset the auction?");
    if (!confirm1) return;
    const confirm2 = window.confirm("This will clear all team rosters and reset all players. Continue?");
    if (!confirm2) return;
    try {
      const playerSnapshot = await getDocs(collection(db, 'players'));
      const teamSnapshot = await getDocs(collection(db, 'Teams'));

      const playerUpdates = playerSnapshot.docs.map(docSnap =>
        updateDoc(doc(db, 'players', docSnap.id), {
          sold: false,
          bidded: false
        })
      );

      const teamUpdates = teamSnapshot.docs.map(docSnap =>
        updateDoc(doc(db, 'Teams', docSnap.id), {
          Purse: 200,
          players: []
        })
      );

      await Promise.all([...playerUpdates, ...teamUpdates]);
      alert('Auction has been reset. All players and teams have been reset.');
    } catch (error) {
      console.error("Error resetting auction:", error);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Arial', textAlign: 'center' }}>
        <h2>Enter Admin Password</h2>
        <input
          type="password"
          placeholder="Password"
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
        <br /><br />
        <button onClick={() => {
          if (passwordInput === correctPassword) {
            setAuthenticated(true);
          } else {
            alert('Incorrect password.');
          }
        }}>
          Enter
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {['Pending Players (Not Yet Bid)', 'Sold Players', 'Unsold Players'].map((category, i) => {
          const list = i === 0
            ? players.filter(p => !p.bidded)
            : i === 1
              ? players.filter(p => p.sold && p.bidded)
              : players.filter(p => !p.sold && p.bidded);
          return (
            <div key={category} style={{ flex: 1, minWidth: '250px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
              <h2>{category}</h2>
              <ul>
                {list.map(player => (
                  <li key={player.id}><strong>{player.name}</strong> - ${player.basePrice} - {player.type}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2>Add New Player</h2>
          <input type="text" placeholder="Name" value={newPlayer.name} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} />
          <input type="number" placeholder="Base Price" value={newPlayer.basePrice} onChange={e => setNewPlayer({ ...newPlayer, basePrice: e.target.value })} />
          <input type="text" placeholder="Type (e.g., Batsman)" value={newPlayer.type} onChange={e => setNewPlayer({ ...newPlayer, type: e.target.value })} />
          <button onClick={handleAddPlayer} style={{ padding: '10px 16px', fontSize: '16px', marginTop: '10px' }}>Add Player</button>

          <br /><br />
          <Link to="/teams">Go to Team View</Link> | <Link to="/round2">Go to Round 2</Link>
        </div>

        <div style={{ flex: 1 }}>
          <h2>Auction Control Panel</h2>
          <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} style={{ padding: '8px', fontSize: '16px', marginBottom: '8px' }}>
            <option value="">-- Select a Player --</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>{player.name} {player.sold ? "(Sold)" : ""}</option>
            ))}
          </select>
          <input type="number" placeholder="Bid Amount" value={bidAmount} onChange={e => setBidAmount(e.target.value)} style={{ padding: '8px', fontSize: '16px', marginBottom: '8px' }} />
          <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} style={{ padding: '8px', fontSize: '16px', marginBottom: '8px' }}>
            <option value="">-- Select a Team --</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.Owner} (${Number(team.Purse || 0).toLocaleString()})</option>
            ))}
          </select>
          <br /><br />
          <button onClick={assignPlayerToTeam} style={{ padding: '10px 16px', fontSize: '16px', fontWeight: 'bold',backgroundColor: 'green', color: 'white' }}>Assign Player to Team</button>
          <button onClick={resetSelection} style={{ marginLeft: '5px', padding: '10px 16px', fontSize: '16px',fontWeight: 'bold' }}>Reset</button>
          <button onClick={markPlayerAsUnsold} style={{ marginLeft: '5px', backgroundColor: 'orange', color: 'white', padding: '10px 16px', fontSize: '16px',fontWeight: 'bold' }}>Mark as Unsold</button>
          <button onClick={undoSold} style={{ marginLeft: '5px', backgroundColor: 'blue', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}>Undo Sold</button>
          <button onClick={resetAuction} style={{ marginLeft: '5px', backgroundColor: 'red', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}>Reset Auction</button>
        </div>
      </div>
    </div>
  );
}

export default Admin;
