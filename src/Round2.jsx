// This will be a duplicate of App.jsx with all auction management logic
// We will adapt it for Round 2 usage (e.g. separate player collection or tag)

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

function Round2() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const playerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Only include unsold players that were bidded (Round 1 participants who remained unsold)
      setPlayers(playerList.filter(p => !p.sold && p.bidded));
    });

    const unsubscribeTeams = onSnapshot(collection(db, 'Teams'), (snapshot) => {
      const teamList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamList);
    });

    return () => {
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, []);

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
      await updateDoc(doc(db, 'players', player.id), { sold: true });

      alert(`Assigned ${player.name} to ${team.Owner} for $${bid}`);
      setSelectedPlayerId('');
      setSelectedTeamId('');
      setBidAmount('');
    } catch (error) {
      console.error("Error assigning player:", error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Round 2 - Unsold Player Auction</h1>
    <h2>Pending Unsold Players</h2>
      <ul>
        {players.map(player => (
          <li key={player.id}>
            <strong>{player.name}</strong> - ${player.basePrice} - {player.type}
          </li>
        ))}
      </ul>

      <h2>Assign Player</h2>
      <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)}>
        <option value="">-- Select a Player --</option>
        {players.map(player => (
          <option key={player.id} value={player.id}>{player.name}</option>
        ))}
      </select>
      <input type="number" placeholder="Bid Amount" value={bidAmount} onChange={e => setBidAmount(e.target.value)} />
      <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
        <option value="">-- Select a Team --</option>
        {teams.map(team => (
          <option key={team.id} value={team.id}>{team.Owner} (${Number(team.Purse || 0).toLocaleString()})</option>
        ))}
      </select>
      <br /><br />
      <button onClick={assignPlayerToTeam}>Assign Player to Team</button>

      <br /><br />
      <Link to="/">Back to Round 1</Link>
    </div>
  );
}

export default Round2;
