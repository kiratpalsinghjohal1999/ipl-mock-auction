import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';

function TeamView() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);

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

    return () => {
      unsubscribeTeams();
      unsubscribePlayers();
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <Link to="/">← Back to Auction Panel</Link>
      <h1 style={{ textAlign: 'center' }}>Team Overview</h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {teams.map(team => {
          const { batsmen, bowlers, allrounders } = categorize(team.players || []);
          return (
            <div key={team.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px' }}>
              <h2>{team.Owner}</h2>
              <p><strong>Remaining Purse:</strong> ${team.Purse?.toLocaleString() || 0}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                  <h4>Batsmen</h4>
                  <ul>{batsmen.map((p, i) => (
                    <li key={i}>{p.name} — ${p.basePrice}</li>
                  ))}</ul>
                </div>
                <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                  <h4>Bowlers</h4>
                  <ul>{bowlers.map((p, i) => (
                    <li key={i}>{p.name} — ${p.basePrice}</li>
                  ))}</ul>
                </div>
                <div style={{ flex: 1, paddingLeft: '10px' }}>
                  <h4>All-rounders</h4>
                  <ul>{allrounders.map((p, i) => (
                    <li key={i}>{p.name} — ${p.basePrice}</li>
                  ))}</ul>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Batsmen</h4>
                <ul>{batsmen.map(p => (
                  <li key={p.id}><strong>{p.name}</strong> - ${p.basePrice}</li>
                ))}</ul>
              </div>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Bowlers</h4>
                <ul>{bowlers.map(p => (
                  <li key={p.id}><strong>{p.name}</strong> - ${p.basePrice}</li>
                ))}</ul>
              </div>
              <div style={{ flex: 1, paddingLeft: '10px' }}>
                <h4>All-rounders</h4>
                <ul>{allrounders.map(p => (
                  <li key={p.id}><strong>{p.name}</strong> - ${p.basePrice}</li>
                ))}</ul>
              </div>
            </div>
          );
        })()}

        <h2 style={{ marginTop: '30px' }}>Unsold Players</h2>
        {(() => {
          const { batsmen, bowlers, allrounders } = categorize(unsoldPlayers);
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Batsmen</h4>
                <ul>{batsmen.map(p => (
                  <li key={p.id}><strong>{p.name}</strong> - ${p.basePrice}</li>
                ))}</ul>
              </div>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', paddingRight: '10px' }}>
                <h4>Bowlers</h4>
                <ul>{bowlers.map(p => (
                  <li key={p.id}><strong>{p.name}</strong> - ${p.basePrice}</li>
                ))}</ul>
              </div>
              <div style={{ flex: 1, paddingLeft: '10px' }}>
                <h4>All-rounders</h4>
                <ul>{allrounders.map(p => (
                  <li key={p.id}><strong>{p.name}</strong> - ${p.basePrice}</li>
                ))}</ul>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default TeamView;
