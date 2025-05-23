import AnnouncementBanner from './AnnouncementBanner';

import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Footer from './Footer';


import { useEffect, useState } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  arrayUnion,
  getDocs
} from 'firebase/firestore';

import { Link } from 'react-router-dom';
import CurrentBidBox from './CurrentBidBox';

function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [storedAdminPassword, setStoredAdminPassword] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', basePrice: '', type: '' });
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [currentBid, setCurrentBid] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [selectedCreditTeamId, setSelectedCreditTeamId] = useState('');

  useEffect(() => {
    const fetchAdminPassword = async () => {
      const docRef = doc(db, 'adminSettings', 'access');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setStoredAdminPassword(snap.data().adminPassword || '');
      }
    };

    const alreadyLoggedIn = sessionStorage.getItem('admin-authenticated') === 'true';
    if (alreadyLoggedIn) {
      setAuthenticated(true);
    }

    fetchAdminPassword();

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

    const unsubscribeBid = onSnapshot(doc(db, 'auction', 'currentBid'), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentBid(docSnap.data());
      } else {
        setCurrentBid(null);
      }
    });

    return () => {
      unsubscribePlayers();
      unsubscribeTeams();
      unsubscribeBid();
    };
  }, []);

  useEffect(() => {
  const unsubscribe = onSnapshot(doc(db, 'auction', 'announcement'), (docSnap) => {
    if (docSnap.exists()) {
      const msg = docSnap.data().text || '';
      if (msg) {
        setAnnouncement(msg);
        setShowAnnouncement(true);

        // Auto-hide and clear message after 5 seconds
        setTimeout(async () => {
          setShowAnnouncement(false);
          await setDoc(doc(db, 'auction', 'announcement'), { text: '' });
        }, 2000);
      }
    }
  });

  return () => unsubscribe();
}, []);


  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (event) => {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const players = XLSX.utils.sheet_to_json(sheet);

      const batchAdd = players.map(async (row) => {
        const { Name, Type, BasePrice } = row;
        if (!Name || !Type || !BasePrice) return;

        await setDoc(doc(db, 'players', Name), {
          name: Name,
          type: Type,
          basePrice: Number(BasePrice),
          sold: false,
          bidded: false,
        });
      });

      await Promise.all(batchAdd);
      alert('Players uploaded successfully!');
    } catch (error) {
      console.error('Error uploading players:', error);
      alert('Failed to upload players.');
    }
  };

  reader.readAsArrayBuffer(file);
};

const handleRandomPlayer = () => {
  const pending = players.filter(p => !p.bidded);
  if (pending.length === 0) {
    alert("No pending players left.");
    return;
  }

  const random = pending[Math.floor(Math.random() * pending.length)];
  setSelectedPlayerId(random.id);
  setBidAmount(random.basePrice); // Auto fill base price
};


  const handleAddPlayer = async () => {
    try {
      await setDoc(doc(db, 'players', newPlayer.name), {
  name: newPlayer.name,
  basePrice: Number(newPlayer.basePrice),
  type: newPlayer.type,
  sold: false,
  bidded: false
});
      setNewPlayer({ name: '', basePrice: '', type: '' });
      alert('Player added!');
    } catch (error) {
      console.error("Error adding player:", error);
    }
  };

  const assignPlayerToTeam = async () => {
  if (!currentBid || !currentBid.playerId || !currentBid.highestBidder) {
    alert("No active bidding or highest bidder not set.");
    return;
  }

  try {
    const playerRef = doc(db, 'players', currentBid.playerId);
    const teamRef = doc(db, 'Teams', currentBid.highestBidder);

    const playerSnap = await getDoc(playerRef);
    const teamSnap = await getDoc(teamRef);

    if (!playerSnap.exists() || !teamSnap.exists()) {
      alert("Player or team not found.");
      return;
    }

    const player = playerSnap.data();
    const team = teamSnap.data();

    if (team.Purse < currentBid.currentBid) {
      alert("Team does not have enough purse.");
      return;
    }

    // Update team
    await updateDoc(teamRef, {
      Purse: team.Purse - currentBid.currentBid,
      players: arrayUnion({
        name: player.name,
        basePrice: currentBid.currentBid,
        type: player.type
      })
    });

    await setDoc(doc(db, 'auction', 'announcement'), {
  text: ` ${player.name} was sold to ${team.Owner} for $${currentBid.currentBid}`
});



    // Update player status
    await updateDoc(playerRef, {
      sold: true,
      bidded: true
    });

    await deleteDoc(doc(db, 'auction', 'currentBid')); // ❌ clear the doc fully


    alert(`Player ${player.name} was bought by ${team.Owner} for $${currentBid.currentBid}`);
  } catch (error) {
    console.error("Error assigning player from bid:", error);
  }
};


  const startBidding = async () => {
  if (!selectedPlayerId || !bidAmount) {
    alert("Select a player and enter a bid amount.");
    return;
  }

  const player = players.find(p => p.id === selectedPlayerId);
  if (!player) {
    alert("Player not found.");
    return;
  }

  try {
    await setDoc(doc(db, 'auction', 'currentBid'), {
      playerId: player.id,
      name: player.name,
      type: player.type,
      currentBid: Number(bidAmount),
      highestBidder: ''
    });

    await setDoc(doc(db, 'auction', 'announcement'), {
      text: `Bidding started for ${player.name}`
    });

    alert(`Bidding started for ${player.name} at $${bidAmount}`);
    setSelectedPlayerId('');
    setBidAmount('');
  } catch (error) {
    console.error("Failed to start bidding:", error);
  }
};

const handleStartRound2 = async () => {
  const unsoldPlayers = players.filter(p => !p.sold && p.bidded);

  if (unsoldPlayers.length === 0) {
    alert("No unsold players to move to Round 2.");
    return;
  }

  try {
    const updates = unsoldPlayers.map(p =>
      updateDoc(doc(db, 'players', p.id), {
        bidded: false // ✅ Reset only bidded
      })
    );
    await Promise.all(updates);
    alert('Round 2 started: Unsold players moved back to pending.');
  } catch (error) {
    console.error("Error starting Round 2:", error);
  }
};
 

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
      return (
        type.includes('all-rounder') ||
        type.includes('batting all-rounder') ||
        type.includes('bowling all-rounder')
      );
    }),
  };
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
  if (!currentBid || !currentBid.playerId) {
    alert("No player is currently being bid on.");
    return;
  }

  try {
    const playerRef = doc(db, 'players', currentBid.playerId);
    const playerSnap = await getDoc(playerRef);

    if (!playerSnap.exists()) {
      alert("Player not found.");
      return;
    }

    // Mark as unsold but bidded
    await updateDoc(playerRef, {
      sold: false,
      bidded: true
    });

    // Clear the auction bid
    await setDoc(doc(db, 'auction', 'currentBid'), {
      playerId: '',
      name: '',
      type: '',
      currentBid: 0,
      highestBidder: ''
    });
    await setDoc(doc(db, 'auction', 'announcement'), {
  text: `Player ${playerSnap.data().name} went unsold`
});


    alert(`Player ${playerSnap.data().name} marked as unsold.`);
  } catch (error) {
    console.error("Error marking player as unsold:", error);
  }
};

const generateAuctionReport = () => {
  const rows = [];

  teams.forEach(team => {
    const players = team.players || [];
    const totalSpent = players.reduce((sum, p) => sum + (p.basePrice || 0), 0);
    const remainingPurse = team.Purse || 0;
    const extra = team.extraCredits || 0;

    // Push team header
    rows.push([`Team: ${team.Owner}`, '', '', '', '']);
    rows.push(['Player Name', 'Type', 'Price', '', '']);

    players.forEach(player => {
      rows.push([player.name, player.type, player.basePrice]);
    });

    rows.push(['', '', '']);
    rows.push(['Total Spent', '', totalSpent]);
    rows.push(['Remaining Purse', '', remainingPurse]);
    rows.push(['Extra Credits', '', extra]);
    rows.push([]); // Empty line between teams
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'auction-report.csv');
};


      const giveExtraCredits = async () => {
  if (!selectedCreditTeamId || !creditAmount) {
    alert("Select a team and enter credit amount.");
    return;
  }

  const teamRef = doc(db, 'Teams', selectedCreditTeamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) {
    alert("Team not found.");
    return;
  }

  const team = teamSnap.data();
  const extra = Number(creditAmount);

  const updatedPurse = team.Purse + extra;
  const updatedCredits = (team.extraCredits || 0) + extra;

  await updateDoc(teamRef, {
    Purse: updatedPurse,
    extraCredits: updatedCredits
  });

  alert(`${extra} credits added to ${team.Owner}.`);
  setCreditAmount('');
  setSelectedCreditTeamId('');
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

      const teamUpdates = teamSnapshot.docs.map(docSnap => {
  const teamData = docSnap.data();
  const initialPurse = teamData.initialPurse || 250; // fallback if missing
  return updateDoc(doc(db, 'Teams', docSnap.id), {
    Purse: initialPurse,
    players: [],
    extraCredits: 0
  });
});



      await Promise.all([...playerUpdates, ...teamUpdates]);

      await deleteDoc(doc(db, 'auction', 'currentBid'));

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
        if (passwordInput === storedAdminPassword) {
          setAuthenticated(true);
          sessionStorage.setItem('admin-authenticated', 'true');
        } else {
          alert('Incorrect password.');
        }
      }}>
        Enter
      </button>
    </div>
  );
}
  const pendingPlayers = players.filter(p => !p.bidded);
  const soldPlayers = players.filter(p => p.bidded && p.sold);
  const unsoldPlayers = players.filter(p => p.bidded && !p.sold);



  return (
    <div style={{ paddingTop: "50px" }}>
      <Footer/>
    <AnnouncementBanner
  message={announcement}
  visible={showAnnouncement}
  onHide={() => setShowAnnouncement(false)}
/>

    

    <div style={{ padding: '20px', fontFamily: 'Arial', display: 'flex', flexDirection: 'column', gap: '30px' }}>
    
     <CurrentBidBox currentBid={currentBid} teams={teams} />


        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <h2>Auction Control Panel</h2>
          <select
  value={selectedPlayerId}
  onChange={e => {
    const selectedId = e.target.value;
    setSelectedPlayerId(selectedId);

    const selected = players.find(p => p.id === selectedId);
    if (selected) {
      setBidAmount(selected.basePrice); // auto-set bid amount
    } else {
      setBidAmount('');
    }
  }}
  style={{ padding: '8px', fontSize: '16px', marginBottom: '8px' }}
>
  <option value="">-- Select a Player --</option>
  {players.map(player => (
    <option key={player.id} value={player.id}>
      {player.name} {player.sold ? "(Sold)" : ""}
    </option>
  ))}
</select>

          <input type="number" placeholder="Bid Amount" value={bidAmount} onChange={e => setBidAmount(e.target.value)} style={{ padding: '8px', fontSize: '16px', marginBottom: '8px' }} />
          <br /><br />
          <button
  onClick={handleRandomPlayer}
  style={{ backgroundColor: '#17a2b8', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}
>
  Pick Random Player
</button>

          <button
            onClick={startBidding}
            style={{ marginLeft: '5px', backgroundColor: 'purple', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}>Start Bidding
        </button>
          <button onClick={assignPlayerToTeam} style={{ padding: '10px 16px', fontSize: '16px', fontWeight: 'bold',backgroundColor: 'green', color: 'white' }}>Sell Player</button>
          <button onClick={markPlayerAsUnsold} style={{ marginLeft: '5px', backgroundColor: 'orange', color: 'white', padding: '10px 16px', fontSize: '16px',fontWeight: 'bold' }}>Mark as Unsold</button>
          <button onClick={undoSold} style={{ marginLeft: '5px', backgroundColor: 'blue', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}>Undo Sold</button>
          <button
  onClick={handleStartRound2}
  style={{ backgroundColor: '#6c757d', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}
>
  Start Round 2
</button>

          <button
  onClick={generateAuctionReport}
  style={{
    marginTop: '20px',
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 16px',
    fontSize: '16px',
    fontWeight: 'bold'
  }}
>
  Generate Auction Report
</button>

          <button onClick={resetAuction} style={{ marginLeft: '5px', backgroundColor: 'red', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}>Reset Auction</button>
        </div>



      
        <div style={{  gap: '20px', flexWrap: 'wrap' }}>
  
 <div style={{ }}> <h2 style={{ marginBottom: '10px', color:'Red' }}>Pending Players (Not Yet Bid)</h2></div>
<div style={{ display: 'flex', marginTop: '10px', justifyContent: 'space-between', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
  {(() => {
    const { batsmen, bowlers, allrounders } = categorize(pendingPlayers);
    return (
      <>
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
      </>
    );
  })()}
</div>
<div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
 </div>

</div>
      
  






<div style={{  gap: '20px', flexWrap: 'wrap' }}>

  <h2 style={{ marginBottom: '10px', color:'Green' }}>Sold Players</h2>
<div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
  {(() => {
    const { batsmen, bowlers, allrounders } = categorize(soldPlayers);
    return (
      <>
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
      </>
    );
  })()}
</div>
<div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
 </div>

</div>


<div style={{ gap: '20px', flexWrap: 'wrap' }}>

  <h2 style={{ marginBottom: '10px', color:'#FFA500' }}>Unsold Players </h2>
<div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
  {(() => {
    const { batsmen, bowlers, allrounders } = categorize(unsoldPlayers);
    return (
      <>
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
      </>
    );
  })()}
</div>
<div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
 </div>

</div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2>Add New Player</h2>
          <input type="text" placeholder="Name" value={newPlayer.name} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} />
          <input type="number" placeholder="Base Price" value={newPlayer.basePrice} onChange={e => setNewPlayer({ ...newPlayer, basePrice: e.target.value })} />
          <select
  value={newPlayer.type}
  onChange={e => setNewPlayer({ ...newPlayer, type: e.target.value })}
  style={{ padding: '8px', fontSize: '16px', marginTop: '8px' }}
>
  <option value="">-- Select Type --</option>
  <option value="Batsman">Batsman</option>
  <option value="Batsman">Batsman/Wicket-Keeper</option>
  <option value="Bowler">Bowler</option>
  <option value="Bowler">Bowler/Wicket-Keeper</option>
  <option value="All-rounder">All-rounder</option>
  <option value="Batting All-rounder">Batting All-rounder</option>
  <option value="Bowling All-rounder">Bowling All-rounder</option>
</select>

          <button onClick={handleAddPlayer} style={{ padding: '10px 16px', fontSize: '16px', marginTop: '10px' }}>Add Player</button>

       <h3>Upload Players from Excel</h3>
<input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />




          <h2>Add Extra Credits to Team</h2>
  <select
    value={selectedCreditTeamId}
    onChange={e => setSelectedCreditTeamId(e.target.value)}
    style={{ padding: '8px', fontSize: '16px', marginBottom: '8px' }}
  >
    <option value="">-- Select a Team --</option>
    {teams.map(team => (
      <option key={team.id} value={team.id}>
        {team.Owner} (${team.Purse} purse, +${team.extraCredits || 0} credited)
      </option>
    ))}
  </select>
  <input
    type="number"
    placeholder="Amount to Credit"
    value={creditAmount}
    onChange={e => setCreditAmount(e.target.value)}
    style={{ padding: '8px', fontSize: '16px', marginBottom: '8px' }}
  />
  <br />
  <button
    onClick={giveExtraCredits}
    style={{ backgroundColor: '#6200ee', color: 'white', padding: '10px 16px', fontSize: '16px', fontWeight: 'bold' }}
  >
    Credit Team
  </button>

          <br /><br />
          <Link to="/teams">Go to Team View</Link>
        </div>
        
        
      </div>
      </div>
    </div>
  );

  return null;
}

export default Admin;
